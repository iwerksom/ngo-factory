## My automation

**Trigger and workflow/source link:** a ticket tag. A local poller, `scripts/agent-poller.sh` in https://github.com/iwerksom/ngo-factory, takes the oldest open issue labelled `ready-for-agent`, swaps the label to `agent-working`, and runs `claude -p` in a fresh git worktree (`npm ci` first). It can be run by hand or from cron. It needs no new secret and uses my own `gh` login, so CI and Qodo fire on its PRs like on mine. Limits: one run at a time (`flock`), $5 budget per Claude call, at most 2 fix rounds after the first PR, at most 15 minutes of waiting per round. It may not merge, force-push, push to `main`, or touch repo settings and secrets. If it cannot finish it labels the ticket `agent-stuck` and comments why. When it is done it labels the ticket `agent-review`.

**Ticket and PR:** ticket https://github.com/iwerksom/ngo-factory/issues/13 (cache the project page's GitHub label read for 60 seconds, with acceptance criteria and a failure case), PR https://github.com/iwerksom/ngo-factory/pull/14. Not merged; that is my decision.

**What happened, including checks, Qodo review and retries:**

- I added `ready-for-agent` to #13 and ran the poller. The agent read the ticket and AGENTS.md, wrote the cache in `src/lib/gates.ts` with tests that count fetch calls, updated the "known gap" in rule 6, ran `check`, `lint`, `test` (101) and `build`, and opened PR #14 that closes #13.
- Qodo's first review had two findings, and the agent confirmed both as real. (1) Overlapping requests for one issue each called GitHub, because the cache was only filled after the read finished; fixed by sharing one in-flight read. (2) A clock that moves backward made old labels look fresh; a negative age is now a miss. It added tests for both, reworded rule 6, and answered each finding in a PR comment.
- Round 2: CI green (`verify`, 49 s), Qodo on commit 08bbfa6: no open findings in any group. The run ended with PR #14 waiting for me and `agent-review` on the ticket. 2 commits, 3 files, 104 tests.
- Retries used: 1 fix round of 2 allowed.
- What the agent said it did not verify: it did not run against the real GitHub API or in a browser, and it did not run the new tests against the old code to see them fail first.
- A bug in my own poller: it asked `gh pr checks` for JSON, which this `gh` version does not support, so it always saw CI as pending and waited the full 15 minutes in both rounds (about 30 minutes lost). The result was still correct because it read the real state after the wait. Fixed by reading the status rollup from `gh pr view`.

**What still needed me, or where it stopped:** nothing during the run. Before it, I wrote the poller, created the labels and the ticket. After it, I read the log, the checks and Qodo's comments; I have not yet reviewed the diff line by line. Still manual: filing and tagging tickets, the merge, and the board updates. The agent did not check its work against live GitHub, so that is still open before a merge.
