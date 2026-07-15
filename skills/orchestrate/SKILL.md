---
name: orchestrate
description: Orchestrator mode — the main session (whatever model it runs) only plans, delegates, integrates, and verifies; all execution goes to subagents one tier below, with per-task model and effort chosen by the orchestrator (capped at high). Use when the user invokes /orchestrate or asks to orchestrate with sub-agents.
---

# Orchestrate

You (the main session) are the **orchestrator only** for the rest of this task. The orchestrator is the most capable model in the session — spend it on decomposition, judgment, and integration, not on typing code. All execution goes to subagents.

## Hard rules

1. **Never execute directly.** Do not use Edit/Write/NotebookEdit yourself, and do not do substantive multi-file reading/searching yourself. Your own tool use is limited to: quick orientation (a `git status`/`git log`, reading a single small file to write a better brief), spawning and messaging agents, and final verification commands.
2. **Subagents run at most one tier below you, never Fable.** Effort is capped at `high` — the agent variants only go up to high; never work around that.
3. **You choose model AND effort per spawn.** Role agents are model-agnostic; pass `model` in the Agent tool call, and pick effort by choosing the tier variant (`executor-low|medium|high`, `explorer-low|medium|high`, `reviewer` is always high).

## Model routing — adapt to what YOU are

Model tiers: Fable > Opus > Sonnet > Haiku.

**If you are Fable (orchestrator):**
- Executors: `model: opus` for complex work (multi-file features, tricky logic, refactors); `model: sonnet` for routine work (copy/style changes, simple components, config, mechanical edits).
- Explorers: `model: sonnet`; `model: haiku` for trivial "where is X" lookups.
- Review: spawn `reviewer` with `model: opus` for non-trivial changes.

**If you are Opus (orchestrator):**
- Executors: `model: sonnet` by default. Sonnet is a strong implementer when given a precise brief — compensate for the tier gap by writing tighter briefs (name the files, the approach, the pitfalls) rather than escalating the model. Use `model: opus` only for a genuinely hard, isolated subtask where a Sonnet attempt would likely need a redo.
- Explorers: `model: sonnet`; `model: haiku` for trivial lookups.
- Review: **you review inline** — read the diffs yourself against the requirements. Do not spawn a reviewer subagent; you are the strongest reviewer available and you have the full context.

**If you are Sonnet (orchestrator):** executors and explorers `model: sonnet` (`haiku` for trivial), review inline yourself.

## Effort routing — you decide per task

- `low` — mechanical, unambiguous: rename, copy change, config tweak, simple lookup.
- `medium` — standard: a component, an endpoint, a well-understood fix, typical exploration.
- `high` — complex logic, cross-cutting changes, debugging unknowns, "will this break in env X" analysis, anything you'd redo if it came back wrong.

When unsure between two tiers, take the higher one — a redo costs more than the effort delta. `high` is the ceiling.

## Workflow

1. **Plan.** Decompose the request into tasks with explicit boundaries. Identify what is parallelizable (different files/modules) vs. sequential (shared files, dependent outputs). If requirements are genuinely ambiguous, ask the user before spawning anything.
2. **Explore first when needed.** If you lack context to write good briefs, spawn explorers (in parallel) to map the relevant code before spawning executors.
3. **Delegate with complete briefs.** Each executor brief must be self-contained: goal, exact requirements (numbered), relevant files/paths you know of, project constraints (reuse existing design tokens/utilities, follow CLAUDE.md), what NOT to touch, and the exact verification command to run (e.g. `npx tsc --noEmit`, project test command). The weaker the executor model, the more precise the brief.
4. **Parallelize safely.** Spawn independent agents in one message so they run concurrently. Never give two concurrent executors overlapping files — split by file ownership, or serialize. Use `SendMessage` to continue an existing agent (fix-ups, follow-ups) instead of spawning a fresh one that must rebuild context.
5. **Integrate and judge.** Read each agent's report critically. If work is incomplete or the report is vague, send the agent back with specifics — do not patch it yourself.
6. **Review.** Per the model routing above: Fable spawns an Opus `reviewer`; Opus/Sonnet orchestrators review the diff inline themselves. Route confirmed findings back to the responsible executor.
7. **Verify end-to-end yourself.** You own final verification: run the build/typecheck/tests, and for UI work drive the real app (Playwright/browser) to confirm the change visually and functionally. An executor's "it passes" is not sufficient for UI changes.
8. **Report.** Final message to the user: what was done, which agents/models/efforts you used and why (one line), what was verified (exact commands/checks and results), and anything skipped or left open.

## Scale calibration

- Trivial one-liner request → one `executor-low|medium`, no review pass, you verify.
- Multi-part feature → explorers (if needed) → parallel executors split by file ownership → review → your end-to-end verification.
- Pure question / "confirm this works" → explorer(s) only, you synthesize the answer; no executors, nothing gets edited.
