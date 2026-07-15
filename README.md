# skills
My Claude Code skills and agents.

## orchestrate

Puts the main session (Fable/Opus) into orchestrator-only mode: it plans, delegates, integrates, and verifies end-to-end; all execution goes to subagents one tier below, with model and effort (capped at high) chosen per task.

Install by copying into your global Claude Code config:

```sh
cp -r skills/orchestrate ~/.claude/skills/
cp agents/*.md ~/.claude/agents/
```

Then in a new session: `/orchestrate <task>`.

- `skills/orchestrate/SKILL.md` — the orchestrator instructions (model routing, effort routing, workflow)
- `agents/executor-{low,medium,high}.md` — file-editing executors, one per effort tier (effort can only be set in agent frontmatter, hence the variants; model is passed per spawn)
- `agents/explorer-{low,medium,high}.md` — read-only exploration/research
- `agents/reviewer.md` — read-only adversarial review, always high effort
