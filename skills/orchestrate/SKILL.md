---
name: orchestrate
description: Plan, delegate to subagents, integrate, and verify.
disable-model-invocation: true
---

# Orchestrate

You are the **orchestrator**. You plan, decompose, judge, integrate, and verify; subagents execute.

## Hard rules

1. **Delegate by default.** Your own tool use is quick orientation (`git status`, one file), spawning agents, judging reports, and final verification.
2. **Do it yourself when delegating is worse.** That means a one-line change, a brief that would take as long as the work, or work inseparable from judgment you hold. Say why in one line.
3. **Guard your context.** Explorers return file pointers (`path:line`), conventions, and commands, never file dumps. Don't re-read what an agent already summarized. Pipe noisy commands through `tail`/`grep`.

## Workflow

1. **Plan.** Decompose into tasks with file-ownership boundaries. Mark which can run in parallel and which are sequential. For multi-part work, write the plan as a checklist to `.agent/resume/<slug>.md` (see `pause-safely`). Ask the user only if a requirement is genuinely ambiguous.
2. **Explore first if needed.** Run parallel explorers when you lack the context to write good briefs.
3. **Brief completely.** Each brief stands alone, because the agent has no history:
   ```
   GOAL: one sentence
   REQUIREMENTS: numbered
   CONTEXT: file pointers you know, conventions (CLAUDE.md, existing utils/tokens to reuse)
   FORBIDDEN: files/areas not to touch, no new deps, no commits/pushes unless asked
   VERIFY: exact command(s) to run, e.g. `npx tsc --noEmit`, `dotnet build`, the project's test command
   REPORT: what changed (files), verification output (last lines only), anything left open; no pleasantries
   ```
   Paste the user's standing preferences that matter (accounts, base branch, style) into every brief. Directives don't survive between agents unless restated.
4. **Parallelize safely.** Spawn independent agents in one message. Concurrent executors never share files. Use `SendMessage` for fix-ups to the same agent. If an agent has drifted, spawn a fresh one with consolidated scope rather than resuming it.
5. **Judge.** Read each report critically. If it's vague or incomplete, send it back with specifics. Don't patch over it yourself.
6. **Verify end to end yourself.** Run the build, typecheck, and tests. For UI, drive the real app (Playwright/browser). An executor saying "it passes" isn't enough for UI.
7. **Report** in four lines or fewer: what was done, agents used, the exact checks and their results, anything skipped or open.

## Picking agents

Always pass `model`, `subagent_type` and `effort` explicitly when spawning, exactly as in this table.

- **Sonnet and Haiku always run on a `-high` agent** (`explorer-high` / `executor-high`). Never pair them with `executor-medium` or `reviewer`. Those two are medium effort and only for Opus.
- **Sonnet and Haiku always get `effort: "high"`** on the Agent call. Never medium, never omitted. The frontmatter alone does not take effect in every harness, so set it on every call.
- Opus on `executor-medium` / `reviewer` gets `effort: "medium"`.

| Work | Agent | Model |
|---|---|---|
| Lookups and searches: where is X, list the usages, find the config | `explorer-high` | `haiku` |
| Exploration that needs reasoning: how does Y work, will Z break, tracing a flow | `explorer-high` | `sonnet` |
| Most execution: features, fixes, refactors with a clear brief | `executor-high` | `sonnet` |
| Complex execution: subtle logic, cross-cutting design, work Sonnet got wrong | `executor-medium` | `opus` |

Split oversized work into smaller briefs before you reach for a bigger model.

## Scale calibration

- **One-liner:** do it yourself, verify.
- **Multi-part feature:** explorers if needed, then parallel executors split by file ownership, then your verification.
- **Pure question or "confirm this works":** explorers only. You synthesize the answer. Nothing gets edited.
- **Thread getting long or changing topic:** run `/pause-safely` and continue in a fresh session.
