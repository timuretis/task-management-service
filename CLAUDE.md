@AGENTS.md

## Claude Code
- For a new phase, propose a plan and wait for approval before editing.
- Default model is Sonnet; `/brainstorm` and `/to-spec` run on Opus. Keep subagents
  rare and on Sonnet - the user is on the Pro plan, so save tokens.
- Hooks in `.claude/hooks/` block commits/pushes on `main`/`master` and ask the user
  before any PR merge. Don't work around them.
