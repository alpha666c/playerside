This project was built with the microsoft-foundry skill. Before working on or answering questions about foundry agents, read the microsoft-foundry skill first.

# Playerside Agent Notes

- The application is a `Next.js` + `Payload CMS` codebase with review-governance docs under `docs/review-system/`.
- TypeScript review-agent placeholders live in `src/agents/`.
- The hosted Python commander agent lives in `commander-agent/` and is intended to help plan, inspect, and coordinate work across this repository.

# Skill Selection & Invocation Rule

- **Automatic Skill Verification**: Before executing any task, check the list of available skills.
- **Trigger Match**: If any available skill matches the current task domain (e.g., modern web, debugging, planning, testing, database management, AI SDKs), you MUST immediately read its `SKILL.md` using `view_file` before making edits or answering questions.
- **No User Action Required**: The user does not need to manually specify which skill to load — skill selection must happen automatically on every user request.

