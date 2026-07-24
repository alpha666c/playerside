from __future__ import annotations

import fnmatch
import json
import mimetypes
import os
from pathlib import Path
from typing import Annotated

from agent_framework import Agent, tool
from agent_framework.foundry import FoundryChatClient
from agent_framework_foundry_hosting import ResponsesHostServer
from azure.identity import DefaultAzureCredential
from dotenv import load_dotenv
from pydantic import Field

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parents[1]
BLOCKED_SEGMENTS = {
    ".git",
    ".next",
    "node_modules",
    "playwright-report",
    "test-results",
    ".venv",
    "__pycache__",
}
TEXT_EXTENSIONS = {
    ".md",
    ".txt",
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".mjs",
    ".cjs",
    ".yml",
    ".yaml",
    ".css",
    ".env",
}
DEFAULT_FILE_LIMIT = 80
DEFAULT_SEARCH_LIMIT = 20
MAX_FILE_BYTES = 128_000
MAX_LINES = 250


def _is_blocked(path: Path) -> bool:
    return any(part in BLOCKED_SEGMENTS for part in path.parts)


def _resolve_repo_path(relative_path: str) -> Path:
    candidate = (REPO_ROOT / relative_path).resolve()
    try:
        candidate.relative_to(REPO_ROOT)
    except ValueError as exc:
        raise ValueError("Path must stay inside the repository.") from exc
    return candidate


def _is_text_file(path: Path) -> bool:
    if not path.is_file() or _is_blocked(path):
        return False
    if path.suffix.lower() in TEXT_EXTENSIONS:
        return True
    mime_type, _ = mimetypes.guess_type(path.name)
    return bool(mime_type and mime_type.startswith("text/"))


def _read_text(path: Path) -> str:
    if path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError(f"File is too large to inspect safely: {path.relative_to(REPO_ROOT)}")
    return path.read_text(encoding="utf-8", errors="ignore")


def _iter_repo_files(file_glob: str = "**/*"):
    for path in sorted(REPO_ROOT.rglob("*")):
        if _is_blocked(path):
            continue
        if not _is_text_file(path):
            continue
        rel = path.relative_to(REPO_ROOT).as_posix()
        if fnmatch.fnmatch(rel, file_glob):
            yield path


def _line_window(content: str, start_line: int, end_line: int) -> str:
    lines = content.splitlines()
    if start_line < 1:
        start_line = 1
    if end_line < start_line:
        end_line = start_line
    end_line = min(end_line, start_line + MAX_LINES - 1, len(lines))
    selected = lines[start_line - 1 : end_line]
    numbered = [f"{idx}: {line}" for idx, line in enumerate(selected, start=start_line)]
    return "\n".join(numbered) if numbered else "<empty>"


@tool(approval_mode="never_require")
def get_project_snapshot() -> str:
    """Return a concise snapshot of the Playerside repository and its governance docs."""
    package_json = json.loads(_read_text(REPO_ROOT / "package.json"))
    root_entries = sorted(
        entry.name for entry in REPO_ROOT.iterdir() if entry.name not in {".git", "node_modules", ".next"}
    )
    summary = {
        "project": package_json.get("name"),
        "stack": {
            "framework": "Next.js",
            "cms": "Payload CMS",
            "language": "TypeScript",
        },
        "important_paths": {
            "governance": [
                "docs/review-system/SOURCE-OF-TRUTH.md",
                "docs/review-system/MASTER-BLUEPRINT.md",
            ],
            "review_roles": "docs/review-agents/",
            "existing_agents": "src/agents/",
            "tests": "tests/",
        },
        "scripts": package_json.get("scripts", {}),
        "root_entries": root_entries[:30],
    }
    return json.dumps(summary, indent=2)


@tool(approval_mode="never_require")
def list_repo_files(
    relative_dir: Annotated[str, Field(description="Repo-relative directory to inspect.")] = ".",
    file_glob: Annotated[str, Field(description="Glob pattern relative to the repo root.")] = "**/*",
    limit: Annotated[int, Field(description="Maximum number of entries to return.")] = DEFAULT_FILE_LIMIT,
) -> str:
    """List text-oriented repo files so the commander can navigate the project safely."""
    directory = _resolve_repo_path(relative_dir)
    if not directory.exists() or not directory.is_dir():
        raise ValueError(f"Directory not found: {relative_dir}")

    results: list[str] = []
    for path in _iter_repo_files(file_glob=file_glob):
        try:
            path.relative_to(directory)
        except ValueError:
            continue
        results.append(path.relative_to(REPO_ROOT).as_posix())
        if len(results) >= max(1, min(limit, 200)):
            break

    return "\n".join(results) if results else "No matching files found."


@tool(approval_mode="never_require")
def read_repo_file(
    relative_path: Annotated[str, Field(description="Repo-relative path to a text file.")],
    start_line: Annotated[int, Field(description="1-based start line.")] = 1,
    end_line: Annotated[int, Field(description="1-based end line.")] = 200,
) -> str:
    """Read a safe excerpt from a repository text file with line numbers."""
    path = _resolve_repo_path(relative_path)
    if not _is_text_file(path):
        raise ValueError(f"Unsupported or missing text file: {relative_path}")
    return _line_window(_read_text(path), start_line, end_line)


@tool(approval_mode="never_require")
def search_repo_text(
    query: Annotated[str, Field(description="Case-insensitive text to search for.")],
    file_glob: Annotated[str, Field(description="Glob filter for repo files.")] = "**/*",
    limit: Annotated[int, Field(description="Maximum number of matching lines to return.")] = DEFAULT_SEARCH_LIMIT,
) -> str:
    """Search repository text to find implementation points, docs, and symbols."""
    normalized_query = query.strip().lower()
    if not normalized_query:
        raise ValueError("Query must not be empty.")

    matches: list[str] = []
    for path in _iter_repo_files(file_glob=file_glob):
        rel = path.relative_to(REPO_ROOT).as_posix()
        for line_number, line in enumerate(_read_text(path).splitlines(), start=1):
            if normalized_query in line.lower():
                matches.append(f"{rel}:{line_number}: {line.strip()}")
                if len(matches) >= max(1, min(limit, 100)):
                    return "\n".join(matches)

    return "\n".join(matches) if matches else "No matches found."


def build_instructions() -> str:
    return """
You are Playerside Commander, the repository command agent for this project.

Your job:
- explain architecture clearly
- break work into practical steps
- identify the smallest safe change set
- use repository tools before making claims
- treat governance documents as first-class constraints

Repository priorities:
1. docs/review-system/SOURCE-OF-TRUTH.md
2. docs/review-system/MASTER-BLUEPRINT.md
3. docs/review-agents/*.md
4. current implementation under src/

Behavior rules:
- Be concise, decisive, and operational.
- Call out conflicts between docs and implementation explicitly.
- Prefer read-only investigation and planning unless asked for code design.
- Ground recommendations in files, symbols, or tests whenever possible.
- When asked what to do next, return a short ordered plan.
""".strip()


def main() -> None:
    client = FoundryChatClient(
        project_endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        credential=DefaultAzureCredential(),
    )

    agent = Agent(
        name="PlayersideCommander",
        description="Repo-aware commander agent for the Playerside codebase.",
        client=client,
        instructions=build_instructions(),
        tools=[get_project_snapshot, list_repo_files, read_repo_file, search_repo_text],
        default_options={"store": False},
    )

    host = os.getenv("HOST", "127.0.0.1")
    port = os.getenv("PORT", "8088")
    print(f"Playerside Commander ready for Responses hosting on http://{host}:{port}")

    server = ResponsesHostServer(agent)
    server.run()


if __name__ == "__main__":
    main()
