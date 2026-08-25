---
name: rebase
description: Rebase the current branch onto an updated base branch (auto-detected default, or a branch passed as argument), walk the conflict-resolution loop, optionally clean up history with an interactive rebase, and recover safely on failure. Force-push only when explicitly asked. Use when the user says "rebase", "rebase onto main/develop", "squash my commits", "interactive rebase", "fixup", or "clean up this branch's history".
argument-hint: "[target base branch]  (omit to auto-detect the repo's default branch)"
---

# Rebase

Rebase the current branch onto a fresh base, resolve conflicts, optionally tidy history, and push only when explicitly told. Do the rebase locally; never force-push on your own.

## 0. Determine the base branch

- **Argument given** → that is the base branch. Use it verbatim.
- **No argument** → auto-detect the repo's default branch:
  ```bash
  git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@'
  ```
  If that is empty (origin/HEAD not set), fall back to the first that exists:
  ```bash
  for b in main develop master; do git show-ref --verify --quiet "refs/remotes/origin/$b" && echo "$b" && break; done
  ```
- Record the current branch: `git rev-parse --abbrev-ref HEAD`.
- **Refuse** if the current branch *is* the base, or is a protected branch (main/master/dev/develop/release/production) — you do not rewrite shared history. Tell the user and stop.

## 1. Pre-flight

1. Working tree must be clean. Check `git status --porcelain`.
   - If dirty, stash and remember to restore later: `git stash push -u -m "rebase-skill autostash"`. (Pop with `git stash pop` after the rebase finishes cleanly.)
2. Fetch the latest base tip so you rebase onto current work:
   ```bash
   git fetch origin <base>
   ```
3. Show the user the plan: current branch, base, and how far apart they are:
   ```bash
   git rev-list --left-right --count origin/<base>...HEAD   # <behind> <ahead>
   ```

## 2. Rebase onto base

Rebase onto the freshly fetched remote-tracking ref (not the local copy of the base):
```bash
git rebase origin/<base>
```

## 3. Conflict-resolution loop

On conflict, repeat until the rebase completes:
1. List conflicts: `git diff --name-only --diff-filter=U`
2. Resolve each file (edit, keep the intended changes from both sides).
3. Stage: `git add <file>`
4. Continue: `git rebase --continue`

- Do **not** `git rebase --skip` without asking the user — it drops a commit.
- When the rebase finishes, if you stashed in step 1, run `git stash pop` and resolve any pop conflicts.

## 4. Interactive cleanup (only when asked)

For squash / fixup / reword, `git rebase -i` cannot open an interactive editor in this environment. Use the non-interactive equivalents:

- **Squash the last N commits into one:**
  ```bash
  git reset --soft HEAD~N && git commit -m "combined message"
  ```
- **Autosquash fixups** — make fixup commits during work, then collapse them:
  ```bash
  git commit --fixup=<sha>
  GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash origin/<base>
  ```
- **Scripted reword/edit of the todo list** — set a sequence editor that rewrites the todo file:
  ```bash
  GIT_SEQUENCE_EDITOR='sed -i "" "s/^pick/reword/"' git rebase -i HEAD~N
  ```
  (Adjust the `sed` program to the exact transformation; on Linux drop the `""` after `-i`.)

Always show the user the resulting `git log --oneline` before any push.

## 5. Abort & recovery

- Bail out of an in-progress rebase, restoring the pre-rebase state:
  ```bash
  git rebase --abort
  ```
- Recover a branch after a rebase went wrong:
  ```bash
  git reflog                          # find the pre-rebase HEAD (or use ORIG_HEAD)
  git reset --hard ORIG_HEAD          # or: git reset --hard <reflog-sha>
  ```
- `ORIG_HEAD` points at where HEAD was before the rebase — the quickest one-step undo.

## 6. Push (only when explicitly asked)

Do **not** push as part of the normal flow. Only when the user explicitly asks to push:
```bash
git push --force-with-lease
```
- Use `--force-with-lease`, never plain `--force` (it refuses if the remote moved under you).
- A `git-push-guard.sh` PreToolUse hook may block force-pushes / protected-branch pushes. **Do not bypass or work around it.** If it blocks the push, surface the hook's message to the user and stop.

## Guardrails

- Never rewrite history on a shared or protected branch (main/master/dev/develop/release/production).
- Never force-push unless the user explicitly asks; always `--force-with-lease`.
- Never bypass the `git-push-guard.sh` hook.
- Preserve uncommitted work via stash before rebasing; restore it after.
- `git rebase --abort` is always the safe escape hatch — offer it whenever the user is unsure.
