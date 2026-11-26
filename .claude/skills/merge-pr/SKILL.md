---
name: merge-pr
description: Merge an approved task-management-service PR into main and confirm GitHub deleted its branch. Use only after the user's own peer review, when they invoke /merge-pr.
disable-model-invocation: true
---

# Merge PR

Run only when the user invokes `/merge-pr` (optionally with a PR number). The user has done
the peer review; this skill does the mechanical part. Stop and report on any failed check.

1. **Find the PR.** Use the number given, else the open PR whose head is the current branch.
   Read it (`pull_request_read`: `get`, `get_check_runs`, `get_reviews`, `get_review_comments`).
2. **Pre-checks. Do not merge if any of these fails**, and say which one:
   - state is `open`, not a draft, base is `main`;
   - no merge conflicts (`mergeable_state` is `clean`);
   - no check run failed or is still running (no checks at all is fine until CI exists);
   - no review with changes requested, and no unresolved review thread.
3. **Show one summary line**: `#N <title>`, head branch and short SHA, commits, checks, reviews.
4. **Merge** with `merge_pull_request`: method `squash` (one commit per phase, like #1 and #2),
   commit title `<PR title> (#N)`, and `expectedHeadSha` set to the SHA you just read, so
   nothing pushed after the review slips in. The merge hook asks the user to approve; that
   prompt is the final confirmation. If they decline, stop; do not retry or work around it.
5. **Check the branch is gone.** The repo setting "Automatically delete head branches" makes
   GitHub delete the head branch when the PR merges, so do not delete it yourself (the session's
   git access gets a 403 on deletes). Wait a few seconds, then check with `list_branches`. If the
   head branch is still listed (setting off, or a PR from a fork), say so and give the user the
   branch name to delete by hand. Never delete `main`/`master`.
6. **Clean up locally**: `git fetch origin main`, switch to `main`, `git pull --ff-only`, and
   delete the local phase branch with `git branch -D <branch>` (a squash merge makes `-d`
   refuse). Skip this where the session is pinned to its own branch.
7. **Report**: merge commit SHA, branch deleted yes/no, and the next step: the next phase in
   `docs/phases/README.md`, started with `/brainstorm`.

Never merge anything the user did not name or approve, never enable auto-merge, never touch
a branch other than the PR's head.
