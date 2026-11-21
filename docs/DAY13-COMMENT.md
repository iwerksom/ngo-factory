## My skill

Project: NGO Factory.
Recurring procedure and when it should activate: "is this PR done by the Quality gate?" Before merging a PR, or after fixing Qodo findings: Qodo reviewed the current head, no open High or Medium finding, CI green on that head, Low findings listed for the owner.
SKILL.md link or full contents (plus any required small files): [.claude/skills/pr-gate-check/SKILL.md](https://github.com/iwerksom/ngo-factory/blob/main/.claude/skills/pr-gate-check/SKILL.md) and [scripts/pr-state.sh](https://github.com/iwerksom/ngo-factory/blob/main/.claude/skills/pr-gate-check/scripts/pr-state.sh) (spec: `scripts/pr-gate-check.spec.ts`, 23 cases).
Agent used and skill directory: Claude Code 2.1.284, `.claude/skills/pr-gate-check`.
Required inputs/context and stop/request-input conditions: a PR number. It stops, reports NOT DONE and asks when: no PR number, the script errors, the Qodo tool is missing or returns no review, or a level or status is not one it knows.

## My fresh-session run

One real task and code version/commit: the gate check of PR [40](https://github.com/iwerksom/ngo-factory/pull/40) (head `6be208f`), then PR [35](https://github.com/iwerksom/ngo-factory/pull/35) (head `13c4364`), on the skill as of PR [42](https://github.com/iwerksom/ngo-factory/pull/42).
How I confirmed this was a new session without the drafting conversation: each run was a new `claude -p` process whose only prompt was the slash command; its init record listed the skill among its skills (session ids in the excerpts).
Exact invocation and evidence that the agent loaded the skill: `claude -p "/pr-gate-check 40" --output-format stream-json --verbose --allowedTools ...`; the first tool call was the skill's script.
Actions/checks actually performed (transcript excerpt, commands or screenshots): [docs/day13/TRANSCRIPT-EXCERPTS.md](https://github.com/iwerksom/ngo-factory/blob/main/docs/day13/TRANSCRIPT-EXCERPTS.md): `pr-state.sh`, `get-pr-review-findings`, `gh pr checks`, a saved report.
Expected result, actual result and saved output/artifact: PR 40, expected NOT DONE (one Low finding, no Low-list comment): got exactly that. Report saved as `.agent-runs/gate-check-40.md` (git-ignored); the report text is in the excerpts.

## What I refined

What the agent misunderstood, skipped or had to ask about: run 1 chained `echo exit=$?` to the script and was refused. Run 2 counted six closed findings as open because Qodo returns `implemented` and my skill did not list it.
Instruction changed, with before/after excerpt: step 1 now says "as one command with nothing chained to it"; the closed-status list gained `implemented` (with a spec). Full before and after in [docs/day13/FRESH-SESSION-RUNS.md](https://github.com/iwerksom/ngo-factory/blob/main/docs/day13/FRESH-SESSION-RUNS.md).
Retry of the affected step and its output: run 3 on PR 35: NOT DONE with three open Medium findings on the head, none wrongly counted.
If no change was needed, what I checked to establish that: n/a.

## My factory's verification

Qodo review result/link and reviewed code version, or blocker: PR 42, first review of `39dc919` raised eight Medium findings (all valid, all in my own work: empty required-check list, base branch, head moving between reads, a phrase passing the Low-list check, and more); all fixed in `e8908bd`, review of that commit has none open. CI green.
What I verified myself: the new guards fail their specs when removed; `check`, `lint`, `test`, `build` pass; the script ran against the real `gh`.
Complete or incomplete, and why: **complete for the run, incomplete for the skill.** No run reached DONE, because no open PR was in that state.
If blocked, stopping point and missing input: not blocked.

_Written with Claude Code (Claude Sonnet 5.5) acting as developer; my product owner decided what is posted._
