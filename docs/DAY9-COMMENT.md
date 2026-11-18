## Quality gate

Gate I saved, including finding types and severity threshold: fix every _valid_ **High or Medium** finding, whatever its type (Bug, Rule violation, Requirement gap). Leave **Low** findings unchanged and list every one for the owner. A finding is _settled_ when it is fixed (with the check that now passes) or disputed with evidence **and the owner has seen the evidence and agreed**; until then a disputed High or Medium stays open. "Done" needs all of: no valid High or Medium open; `npm run check`, `lint`, `test` and `build` pass; the latest _completed_ Qodo review covers the final code (for a PR: its commit is the PR's current head); for a PR, CI is green on that head. At most two fix rounds, then the status is **not done** with the blocker. A level that cannot be read counts as High (my rule 7: automation that decides "ready" fails closed).

Instruction file or workflow where my factory reads it: the `## Quality gate` section of [`AGENTS.md`](https://github.com/iwerksom/ngo-factory/blob/0bbdcb43385ce6a341e981994cb4579a2e858b91/AGENTS.md), which every agent reads. The unattended poller [`scripts/agent-poller.sh`](https://github.com/iwerksom/ngo-factory/blob/0bbdcb43385ce6a341e981994cb4579a2e858b91/scripts/agent-poller.sh) applies it in both its round prompts, refuses `AGENT_MAX_ROUNDS` above 2, stops a fix round that pushed nothing, and posts the Low list itself. [`scripts/quality-gate.spec.ts`](https://github.com/iwerksom/ngo-factory/blob/0bbdcb43385ce6a341e981994cb4579a2e858b91/scripts/quality-gate.spec.ts) pins the gate text and the prompts.

Task or PR link and reviewed scope: [issue 33](https://github.com/iwerksom/ngo-factory/issues/33), delivered as [PR 35](https://github.com/iwerksom/ngo-factory/pull/35) (squash-merged 18 Nov 2026 as `0bbdcb4`). Scope: `AGENTS.md`, `scripts/agent-poller.sh`, `scripts/low-findings.awk`, `scripts/quality-gate.spec.ts`. I tried the gate on the change that adds it.

Reviewer on uncommitted code or Review Resolver on a PR: neither skill; the Agentic Toolbox is not installed here. I used Qodo's MCP tools: `start-pre-pr-review` on the uncommitted diff (lite effort tier, three rounds), then Qodo's PR review of each pushed commit, read with `get-pr-review-findings` and closed with `pr-review-mark-implemented` or `pr-review-dismiss`.

## Findings and decisions

Findings that met the fix threshold, with original types and severity labels: the local review gave 2 findings in round 1 (one High Bug, one Medium), 5 Medium in round 2 and nothing new in round 3; all were valid or partly valid, and fixed before the first commit. Qodo's reviews of the PR then raised 13 more over five commits. Type is from `finding_source` (`IssueFinding` is a Bug, `ComplianceTicketRule` a Requirement gap):

| #   | Reviewed commit | Finding                                                  | Severity | Type            | Outcome                         |
| --- | --------------- | -------------------------------------------------------- | -------- | --------------- | ------------------------------- |
| 1   | `e601b20`       | Low findings can miss the owner                          | Medium   | Bug             | fixed                           |
| 2   | `e601b20`       | Review run record omits the reviewed commit              | Medium   | Requirement gap | fixed (PR description)          |
| 3   | `e601b20`       | A failed head lookup permits another round               | Medium   | Bug             | fixed                           |
| 4   | `b1819d0`       | Final round's Low list never reaches a PR comment        | Medium   | Requirement gap | fixed                           |
| 5   | `b1819d0`       | Stopped runs can hide Low findings                       | Medium   | Bug             | fixed                           |
| 6   | `b1819d0`       | Long Low-finding lists reach the owner cut short         | Medium   | Bug             | fixed                           |
| 7   | `848eb06`       | Markdown headings hide Low findings on PRs               | Medium   | Bug             | fixed                           |
| 8   | `848eb06`       | Owners receive conflicting Low-finding lists             | Medium   | Bug             | fixed                           |
| 9   | `13c4364`       | Informational Qodo findings are treated as Low, not High | High     | Requirement gap | disputed, owner decided (below) |
| 10  | `13c4364`       | Prose can replace the owner's Low list                   | Medium   | Bug             | fixed                           |
| 11  | `13c4364`       | Owners can receive duplicate Low lists                   | Medium   | Bug             | fixed                           |
| 12  | `13c4364`       | Failed rounds can publish an old Low list                | Medium   | Bug             | fixed                           |
| 13  | `75d9fc8`       | Approved disputes leave tickets stuck                    | High     | Bug             | **open**, deferred by the owner |

What the code and requirements showed: I tested every claim before acting, and each was true. Examples: with `gh` failing, the old guard `[ "$(head_sha)" != "$head_before" ]` passed (#3); a 9.5 KB Low list was cut at 5,000 bytes without a word (#6); `## Low findings for the owner` extracted nothing (#7); a sentence starting with the heading words was taken for the heading (#10). Eight of the 13 (#4 to #8, #10 to #12) sit in code I had just added to answer the previous round, so each fix round bred the next one. That is why the gate caps rounds.

Fixes and supporting code or test evidence: one commit per round (`b1819d0`, `848eb06`, `13c4364`, `75d9fc8`), each with spec cases that run the real shell functions with a fake `gh`. Mutation check: 7, 5, 11 and 4 of those cases fail against the code from the commit before. Qodo's own words on the head are in [its review comment](https://github.com/iwerksom/ngo-factory/pull/35#issuecomment-6856888919).

Disputed findings and supporting evidence: #9. Ticket 33 said "any other or unreadable level counts as High", while my table in `AGENTS.md` maps Qodo's "Informational" group to Low (read off the comment layout of earlier PRs). Qodo's [findings guide](https://docs.qodo.ai/code-review/comment-anatomy#code-review-findings-overview) defines only High, Medium and Low ("Lower-impact or informational findings" for Low) and says nothing about `action_level` values. I did not pick a side: the gate says a disputed High is settled only when the owner has seen the evidence and agreed. My product owner decided "Informational is Low"; ticket 33 now says so and I dismissed the finding as intentional.

Low findings flagged for my attention, including unchanged Low Rule violations: none. No Low-group finding appeared in any of the five PR reviews or the three local rounds. So I have still never seen a raw Low `action_level`, and the Low row in my table remains unconfirmed.

Unclear types or priorities needing my decision, if any:

- The gate allows two fix rounds, and this change needed four. Rounds three and four were my owner's yes after the limit stopped me. Whether the limit should stay at two is for the owner.
- Whether a finding in code added to fix the previous finding should count as a new round or the same one.

## Result

Checks run and results: `npm run check`, `lint`, `test` and `build` pass on the head `75d9fc8`: 176 tests pass here and 24 are skipped because `jq` is missing; CI has `jq` and its `verify` check is green ([run](https://github.com/iwerksom/ngo-factory/actions/runs/44321853042)).

Latest completed review result, after fixes if any: Qodo's review of `75d9fc8` closed the three round 4 findings and raised one new High (#13).

For a PR, the reviewed commit and current PR head: both `75d9fc8` at merge (`0bbdcb4` is the squash on `main`).

Remaining findings at or above the threshold, blockers, or incomplete verification: one High, #13. A requeued ticket whose dispute the owner approved would stop on the same finding again, because the poller cannot learn the approval. It fails closed: the agent stops and says why. It is ticket [44](https://github.com/iwerksom/ngo-factory/issues/44). Not verified: the poller has not run end to end with the new prompts (that spends API budget); the local reviews ran at the lite tier; the Informational-is-Low mapping rests on Qodo's comment layout and my owner's decision, not on a Qodo document.

Did the task meet my quality gate? Why or why not? **No.** At merge the latest completed review had an open High, so by item 1 of "done" the status was **not done**. At the two-round limit I stopped and reported exactly that; my owner approved two more rounds and then chose to merge with that High deferred to its own ticket. The gate did what it is for (it stopped me, named the blocker and handed the call to a person), but it did not make this PR clean.

Lesson: a gate needs its round limit, because every fix round added new code with new findings; and an owner's decision has to reach the agent, which is the High I merged with open.

_Written with Claude Code (Claude Sonnet 5.5) acting as developer; my product owner decided what is posted._
