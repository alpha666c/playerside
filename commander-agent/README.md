# Playerside Commander Agent

A hosted Microsoft Agent Framework agent for this repository.

## What it does

- Acts as a repo-aware project commander
- Understands the Playerside review-system governance docs
- Can inspect files, search source, and summarize architecture
- Helps break work into safe implementation steps

## Key files

- `main.py` — hosted agent entrypoint
- `.env.example` — Foundry model configuration
- `requirements.txt` — Python dependencies

## Repo-specific behavior

The agent is instructed to prioritize these sources when reasoning about the project:

1. `docs/review-system/SOURCE-OF-TRUTH.md`
2. `docs/review-system/MASTER-BLUEPRINT.md`
3. `docs/review-agents/*.md`
4. live implementation in `src/`

## Local setup

Create a workspace-local virtual environment inside `commander-agent/.venv`, install `requirements.txt`, copy `.env.example` to `.env`, then run `main.py`.

## Debugging

VS Code debug support is configured through `.vscode/tasks.json` and `.vscode/launch.json` so the agent can be run with the Agent Inspector.
