# skills
My Claude Code skills and agents.

## orchestrate

Puts the main session (Fable or Opus) into orchestrator mode: it plans, delegates, integrates, and verifies end-to-end. Execution goes to subagents one tier below, with model and effort (capped at high) chosen per task — except the genuinely hard core pieces, which the orchestrator may implement itself (an Opus orchestrator decides per task what it keeps vs hands to Sonnet).

### Install as a plugin (recommended)

This repo is a Claude Code plugin and its own marketplace — one install brings the skill and all agents together:

```
/plugin marketplace add gautam6023/skills
/plugin install orchestrate@gautam-skills
```

### Install manually

Copy into your global Claude Code config:

```sh
cp -r skills/orchestrate ~/.claude/skills/
cp agents/*.md ~/.claude/agents/
```

(Use one method or the other, not both, or the skill and agents will be registered twice.)

Then in a new session: `/orchestrate <task>`.

- `skills/orchestrate/SKILL.md` — the orchestrator instructions (model routing, effort routing, workflow)
- `agents/executor-{low,medium,high}.md` — file-editing executors, one per effort tier (effort can only be set in agent frontmatter, hence the variants; model is passed per spawn)
- `agents/explorer-{low,medium,high}.md` — read-only exploration/research
- `agents/reviewer.md` — read-only adversarial review, always high effort
