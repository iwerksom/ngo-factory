# Day 13: running `pr-gate-check` in fresh sessions

The skill is `.claude/skills/pr-gate-check/` (issue 41). Each run below was a **new `claude -p` process** started in the project folder, with only the slash command as its prompt. It had no part of the conversation that wrote the skill. The init record of each run listed `pr-gate-check` among the session's skills, and the agent's first tool call was the skill's script, so the skill was loaded and used. Date: 18 Nov 2026. Agent: Claude Code 2.1.284, skill directory `.claude/skills/pr-gate-check` (project skill).

Invocation, all three runs (only the PR number and the allowed-tools list are shown; the list names the `gh` reads, the script, `Write` and the one Qodo tool):

```bash
claude -p "/pr-gate-check 40" --output-format stream-json --verbose --allowedTools "Bash(gh pr view:*)" ...
```

## Run 1: PR 40 (head `6be208f`, the Day 11 config)

Actions: `pr-state.sh 40`, `get-pr-review-findings`, `gh pr checks 40`, `grep "Quality gate" AGENTS.md`, wrote `.agent-runs/gate-check-40.md`.

Check output: `head=6be208f…`, `ci=passed`, `required_checks=verify`, `low_findings_comments=0`; Qodo reviewed the same commit, `review_complete` true, one open finding (informational, so Low).
Result: **NOT DONE**, because the one Low finding had no "Low findings for the owner" comment. That is the right answer under the gate.

**What the agent did wrong:** its first call chained `; echo "exit=$?"` to the script. The permission for the script does not cover a chained command, so the call was refused and it had to retry. Cost: one wasted call.
**Change:** step 1 of `SKILL.md` now says to run the script as one command with nothing chained, and why. (Before: "Run `.claude/skills/pr-gate-check/scripts/pr-state.sh <PR>` from the repo root. It prints". After: "…from the repo root, as one command with nothing chained to it (no `;`, `&&`, `echo $?`): a chained command is not covered by the permission for this script and is refused. The tool result shows a non-zero exit code. It prints".)

## Run 2: PR 35 (head `13c4364`), after that change

The agent ran the script first, with no chaining. The wasted call did not happen again. It reported **NOT DONE with 9 open High or Medium findings**. Six of them were wrong: Qodo returns `attribution_status: "implemented"` for a finding closed with `pr-review-mark-implemented`, and the skill's list of closed statuses did not contain it, so the rule "any other status counts as open" made closed findings open. The agent said so under "Unclear" and did not guess, which is what the skill asks for. The skill was wrong, not the agent.
**Change:** `implemented` is now in the closed list, with a spec line that pins it. Any other unknown status still counts as open and goes under "Unclear".

## Run 3: PR 35 again, after that change

Result: **NOT DONE, 3 open Medium findings**, all raised on the current head (`Owners can receive duplicate Low lists`, `Prose can replace the owner's Low list`, `Failed rounds can publish an old Low list`). The six closed findings were no longer counted, "Unclear" was empty. These three are real: they are in a PR that another session is still working on, and nothing was changed from here.

## What was and was not verified

- Checked: the skill loads in a fresh process, the script runs, the Qodo tool is called, the head sha equals Qodo's reviewed sha, and the verdict follows the gate on real PRs. The script has a spec with a fake `gh` (a mutation of the unknown-state guard fails it).
- Not checked: a PR where the answer is **DONE**. No open PR was in that state during the runs.
- The agent saw no `Quality gate` section in `AGENTS.md` (it is in PR 35, not on `main`) and used the four lines in the skill, as the skill says.
- Cost of the three runs was about 1.2 USD in Claude usage (run 1: 0.45).
