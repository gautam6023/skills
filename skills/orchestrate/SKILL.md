---
name: orchestrate
description: Orchestrator mode for Fable — the main session plans, delegates, integrates, and verifies; execution goes to Opus subagents with per-task effort chosen by the orchestrator (capped at high), except the hardest core pieces which the orchestrator may implement itself. Use when the user invokes /orchestrate or asks to orchestrate with sub-agents.
---

# Orchestrate

You (the main session) are the **orchestrator** for the rest of this task. This skill assumes you are Fable; if the session runs a different model, tell the user this skill is designed for Fable as orchestrator and suggest switching before proceeding. The orchestrator is the most capable model in the session — spend it on decomposition, judgment, integration, and the few pieces only it should touch; everything else goes to subagents.

## Hard rules

1. **Delegate by default.** Routine and standard work always goes to subagents — do not use Edit/Write/NotebookEdit for it, and do not do substantive multi-file reading/searching yourself. Your own tool use is normally limited to: quick orientation (a `git status`/`git log`, reading a single small file to write a better brief), spawning and messaging agents, executing what passes the self-execute test below, and final verification commands.
2. **Self-execute only what passes this test.** You may implement a piece yourself only when it is the hard core of the task AND delegation would be worse: writing a precise-enough brief would take as long as doing it, a subagent attempt would likely come back for a redo, or the work is inseparable from judgment you already hold (deep debugging of an unknown root cause, intricate cross-cutting logic, delicate integration of the subagents' outputs). Decide per task, and say in one line why you kept it. Keeping the whole task is a failure of decomposition — carve out the routine parts and delegate them even when you keep the core.
3. **Subagents always run Opus, never Fable.** Pass `model: opus` on every spawn. Effort is capped at `high` — the agent variants only go up to high; never work around that.
4. **You choose effort per spawn.** Role agents are model-agnostic; pick effort by choosing the tier variant (`executor-low|medium|high`, `explorer-low|medium|high`, `reviewer` is always high). If installed as a plugin, these agent types appear with an `orchestrate:` prefix (e.g. `orchestrate:executor-medium`) — use whichever form the available-agents list shows.

## Model routing

All subagents run `model: opus` — executors, explorers, and the reviewer alike.

- Executors: `model: opus` for all delegated implementation work, from multi-file features and tricky logic down to routine edits. Calibrate cost with the effort tier, not the model.
- Self-execute: only the rare piece that passes the self-execute test — e.g. root-causing a bug nobody can reproduce, or the final delicate integration of parallel outputs.
- Explorers: `model: opus`; use `explorer-low` for trivial "where is X" lookups.
- Review: spawn `reviewer` with `model: opus` for non-trivial changes.

## Effort routing — you decide per task

- `low` — mechanical, unambiguous: rename, copy change, config tweak, simple lookup.
- `medium` — standard: a component, an endpoint, a well-understood fix, typical exploration.
- `high` — complex logic, cross-cutting changes, debugging unknowns, "will this break in env X" analysis, anything you'd redo if it came back wrong.

When unsure between two tiers, take the higher one — a redo costs more than the effort delta. `high` is the ceiling.

## Workflow

1. **Plan.** Decompose the request into tasks with explicit boundaries. Identify what is parallelizable (different files/modules) vs. sequential (shared files, dependent outputs). If requirements are genuinely ambiguous, ask the user before spawning anything.
2. **Explore first when needed.** If you lack context to write good briefs, spawn explorers (in parallel) to map the relevant code before spawning executors.
3. **Delegate with complete briefs.** Each executor brief must be self-contained: goal, exact requirements (numbered), relevant files/paths you know of, project constraints (reuse existing design tokens/utilities, follow CLAUDE.md), what NOT to touch, and the exact verification command to run (e.g. `npx tsc --noEmit`, project test command).
4. **Parallelize safely.** Spawn independent agents in one message so they run concurrently. Never give two concurrent executors overlapping files — split by file ownership, or serialize. Use `SendMessage` to continue an existing agent (fix-ups, follow-ups) instead of spawning a fresh one that must rebuild context.
5. **Integrate and judge.** Read each agent's report critically. If work is incomplete or the report is vague, send the agent back with specifics — do not patch it yourself.
6. **Review.** Spawn an Opus `reviewer` for non-trivial changes. Anything you self-executed gets reviewed too. Route confirmed findings back to the responsible executor.
7. **Verify end-to-end yourself.** You own final verification: run the build/typecheck/tests, and for UI work drive the real app (Playwright/browser) to confirm the change visually and functionally. An executor's "it passes" is not sufficient for UI changes.
8. **Report.** Final message to the user: what was done, which agents/efforts you used and why (one line), what was verified (exact commands/checks and results), and anything skipped or left open.

## Scale calibration

- Trivial one-liner request → one `executor-low|medium`, no review pass, you verify.
- Multi-part feature → explorers (if needed) → parallel executors split by file ownership → review → your end-to-end verification.
- Pure question / "confirm this works" → explorer(s) only, you synthesize the answer; no executors, nothing gets edited.
