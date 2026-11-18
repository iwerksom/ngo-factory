---
name: pr-gate-check
description: Check whether a pull request in this repo meets the Quality gate (the definition of done) and report DONE or NOT DONE with evidence. Use before merging a PR, when asked "is PR N done", "can this merge", or after fixing Qodo findings. Needs a PR number; reads GitHub and Qodo, changes nothing.
---

# pr-gate-check

Decides, with evidence, whether one PR meets this repo's Quality gate. It only reads. It never fixes, dismisses, merges or comments; say what is needed and stop.

## The gate in four lines

(Source: the "Quality gate" section of `AGENTS.md`. If that section is missing from the checkout you are in, use these lines and say so in the report.)

1. No valid High or Medium finding is open. Level comes from Qodo's `action_level`: `action_required` is High, `remediation_recommended` is Medium, `informational` is Low. **Any other value, or none, counts as High.**
2. Qodo's latest completed review names the PR's **current head** commit. A review of an older commit, a review still running, or no review counts as no review.
3. The required CI checks are green on that head.
4. The Low findings are listed for the owner in one PR comment headed "Low findings for the owner" (only needed if there are Low findings).

## Input

- A PR number (for example `40`). If none is given, or it is not a number, stop and ask for it.
- Repo: `iwerksom/ngo-factory` unless `AGENT_REPO` says otherwise.

## Steps

1. **GitHub facts.** Run `.claude/skills/pr-gate-check/scripts/pr-state.sh <PR>` from the repo root, as one command with nothing chained to it (no `;`, `&&`, `echo $?`): a chained command is not covered by the permission for this script and is refused. The tool result shows a non-zero exit code. It prints `state`, `head`, `ci`, `required_checks`, `low_findings_comments`. If it prints `error=` or exits non-zero, **stop**: report NOT DONE with that error and ask the owner to check `gh auth status`. Do not guess a value.
2. **Qodo facts.** Call the MCP tool `get-pr-review-findings` with the full PR URL `https://github.com/iwerksom/ngo-factory/pull/<PR>`. If the tool is not available, **stop** and tell the owner the Qodo MCP server is not connected (see `.mcp.json`, README "Optional: Qodo tools"); do not read the review comment instead and call it a pass. Write down `review_session.commit_sha`, `status`, `review_complete`, and every finding's `title`, `finding_source`, `action_level` and `attribution_status`.
3. **Compare, in this order, and write down each result:**
   - **Head match.** `review_session.commit_sha` must equal `head` from step 1, character for character. `review_session` null, a different sha, or `review_complete` false is a failed check (say which).
   - **Open findings.** A finding is open if `attribution_status` is `pending`, `partial_implementation`, `not_implemented` or `focus_areas_edited`; closed if `implemented` (what the tool returns for a finding closed with `pr-review-mark-implemented`; seen on PR 35), `full_implementation`, `dismissed`, `detected_after_merge` or `outdated`; any other status counts as open and goes under "Unclear". Open and High or Medium (or an unreadable level) fails the gate. Note that a finding raised on an **older** commit still counts if it is open.
   - **CI.** `ci` must be `passed`. `pending` and `none` mean not done yet; `failed` means failed. Check that the `required_checks` names are the checks that ran (`gh pr checks <PR>`).
   - **Low list.** If any open or closed finding on the head is Low, `low_findings_comments` must be at least 1.
4. **Report** with the template below. The verdict is **DONE** only if every check above passed. Otherwise **NOT DONE**, with the first failing check named and what the owner or developer must do next.
5. **Save the evidence** to `.agent-runs/gate-check-<PR>.md` (this folder is git-ignored; create it if missing): the raw `pr-state.sh` output, the Qodo fields you wrote down, and the report.

## Report template

```
PR <N> gate check: DONE | NOT DONE
Head: <sha>   Qodo reviewed: <sha> (status, review_complete)   Match: yes | no
CI: <ci> (required: <required_checks>)
Open High/Medium: <count>  (list: type, level, title, status)
Low findings: <count>  Low-list comment present: yes | no | not needed
Unclear or unreadable: <anything you could not read or map>
Next: <what is needed, from whom>
```

## Stop and ask, do not guess

- No PR number, or the PR does not exist or is not in this repo.
- `pr-state.sh` errors, or `gh` is not logged in.
- The Qodo tool is missing, errors, or returns no `review_session` (report NOT DONE: no review).
- A finding's level or status is not one listed above: treat it as High and open in the verdict, and name it under "Unclear".

## Do not

- Merge, push, comment, dismiss or mark findings implemented. Those are other steps of the workflow.
- Treat a green CI, or a comment saying "no issues", as the Qodo review result. Only `get-pr-review-findings` counts.
