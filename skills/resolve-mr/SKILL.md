---
name: resolve-mr
description: Fetch unresolved review comments on a GitHub PR or GitLab MR, plan and apply fixes as local changes. Only commit, push, reply to threads, or resolve threads when the user explicitly asks. Auto-detects GitHub (gh) vs GitLab (glab) from the URL. Use when the user says "resolve comments on this MR/PR", "fetch review comments and fix", or pastes a PR/MR link.
argument-hint: "<PR/MR url>  (omit to use the current branch's PR/MR)"
---

# Resolve MR / PR review comments

Loop: fetch unresolved review threads → plan → fix as **local changes**. Works for both GitHub and GitLab.

## Default scope — local changes only

**By default, STOP after applying fixes to the working tree.** Do NOT commit, do NOT push, do NOT reply to threads, and do NOT resolve threads unless the user explicitly asked for that action in their request.

- Treat commit, push, reply, and resolve as four separate opt-in actions. Only do the ones the user explicitly named.
- "resolve comments on this MR", "fix the review comments", "address the feedback" → **fixes only**, leave everything uncommitted. Then report and ask whether they want it committed/pushed/replied/resolved.
- Only when the user explicitly says e.g. "commit and push", "reply to the comments", "resolve the threads" do you run the matching step below.
- When in doubt, do less and ask. Never assume commit/push/reply/resolve is wanted just because the comments were addressed.

## 0. Pick the platform (do this first)

Decide the CLI from the URL the user gave:

- Host contains `github.com` (or no URL but `git remote get-url origin` points at github) → **GitHub**, use `gh`.
- Host contains `gitlab` or `git.coates.io` (or any self-hosted GitLab) → **GitLab**, use `glab`.
- No URL provided → infer from the current repo's `origin` remote host, and target the PR/MR for the current branch.

If the host is ambiguous or unreachable, ask the user which platform before continuing. Never guess between `gh` and `glab` silently.

Confirm the CLI is authenticated (`gh auth status` / `glab auth status`); if not, tell the user to run the login (e.g. `! gh auth login` / `! glab auth login`) and stop.

## 1. Fetch unresolved threads

Always pull the latest first: `git fetch` and check out / confirm you are on the MR's source branch.

### GitHub (`gh`)
- PR metadata: `gh pr view <url-or-number> --json number,headRefName,baseRefName,url,title`
- Review threads (unresolved only) via GraphQL — REST does not expose resolution state. Query `repository.pullRequest.reviewThreads` and keep threads where `isResolved == false`. For each keep: thread id, file `path`, `line`, and the comment body/author. Example:
  ```bash
  gh api graphql -f query='
    query($owner:String!,$name:String!,$number:Int!){
      repository(owner:$owner,name:$name){
        pullRequest(number:$number){
          reviewThreads(first:100){nodes{
            id isResolved isOutdated
            comments(first:20){nodes{author{login} body path line}}
          }}
        }
      }
    }' -F owner=OWNER -F name=REPO -F number=NUM
  ```
- Also fetch top-level review bodies and issue comments if the user mentioned "AI reviewer" / bot feedback: `gh pr view <n> --comments`.

### GitLab (`glab`)
- MR metadata: `glab mr view <url-or-number>`
- Unresolved discussions via API (glab proxies the REST API):
  ```bash
  glab api "projects/:id/merge_requests/<iid>/discussions?per_page=100"
  ```
  Keep discussions where any note has `"resolvable": true` and `"resolved": false`. Capture: discussion `id`, note `id`, file `position.new_path` + `new_line`, and body/author.

Summarise the unresolved threads to the user as a short numbered list (file:line — gist of the ask) before changing code.

## 2. Plan

Group the comments into concrete fixes. For more than ~3 non-trivial threads, write a short plan (or use plan mode) and list which file each change touches. Flag any comment that is a question rather than a change request — those get a reply, not a code edit.

## 3. Apply fixes

Make the edits. Match surrounding style. After edits, run the repo's typecheck/lint/test from its CLAUDE.md (e.g. `npm run build` / `./gradlew lint` / `xcodebuild ... test`) so you don't push something broken.

## 4. Commit & push — ONLY if the user explicitly asked

Skip this entire step unless the user explicitly requested a commit and/or push. Apply only what they named: if they said "commit" but not "push", commit and stop; do not push.

- Branch safety: confirm you are on the MR/PR source branch, **not** `main`/`dev`, before committing. Reject if HEAD is detached or on a protected branch.
- Commit with a clear message grouping the addressed comments.
- **Per-repo attribution rule:** some repos (e.g. soravibe-backend) forbid AI attribution in commits/PRs — check the repo's CLAUDE.md. If forbidden, omit any `Co-Authored-By`/AI line. Otherwise follow the global commit convention.
- `git push` to the same source branch.

## 5. Reply to and resolve each thread — ONLY if the user explicitly asked

Skip this entire step unless the user explicitly requested replying and/or resolving. Reply and resolve are separate opt-ins — if they said "reply to the comments" but not "resolve", reply only and leave threads unresolved.

For every thread you addressed, post a brief reply saying what you changed (reference the commit if useful), then resolve it.

### GitHub (`gh`)
- Reply to a thread: `gh api graphql` mutation `addPullRequestReviewThreadReply` with the thread id, or REST `gh api repos/OWNER/REPO/pulls/comments/<id>/replies -f body=...`.
- Resolve: `gh api graphql` mutation:
  ```bash
  gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -F id=THREAD_ID
  ```

### GitLab (`glab`)
- Reply: `glab api -X POST "projects/:id/merge_requests/<iid>/discussions/<discussion_id>/notes" -f body="..."`
- Resolve: `glab api -X PUT "projects/:id/merge_requests/<iid>/discussions/<discussion_id>?resolved=true"`

## 6. Report

Tell the user which threads you addressed as local changes and any check that failed. Since commit/push/reply/resolve are skipped by default, end by offering them as next steps (e.g. "Changes are local and uncommitted — want me to commit, push, reply, or resolve?"). Only report a commit/push/reply/resolve as done if the user asked for it and the call actually succeeded. Do not claim a thread is resolved unless the resolve call succeeded.

## Guardrails
- Default to local changes only. Commit, push, reply, and resolve are each opt-in and happen ONLY when the user explicitly asks for that specific action.
- Never resolve a thread you did not actually address.
- Never force-push or rebase unless the user asks.
- If a comment is ambiguous or conflicts with another, ask rather than guess.
- Quote check failures verbatim; don't push over a red build without telling the user.
