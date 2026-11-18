# Day 12: one ticket expectation, checked against PR 42 and Qodo's review

Issue 43. Date: 18 Nov 2026.

## Source and PR

- **PR:** 42, "Add the pr-gate-check skill" (merged). Reviewed commits: `39dc919` (first review, eight findings) and `e8908bd` (second review, merged head). https://github.com/iwerksom/ngo-factory/pull/42
- **Source:** issue 41, https://github.com/iwerksom/ngo-factory/issues/41 (a GitHub issue in the same repo).
- **One expectation**, from issue 41's "Test cases": _"`pr-state.sh` with a fake `gh`: ... an unknown result is not `passed` (rule 7)"_. It comes from AGENTS.md rule 7: an unknown signal must never count as a pass.

## Qodo's connection

- **Provider and setup:** GitHub Issues on a GitHub repository, existing. Qodo's docs say an issue URL or reference in the PR description is enough; no extra ticket connection was made or needed.
- **Source reference in the PR:** the description starts "Closes #41. Day 13 of the Qodo hackathon."
- **Evidence that it applies to this repo and source:** Qodo's finding `a91b88e2` on `39dc919` (type `ComplianceTicketRule`) lists `https://github.com/iwerksom/ngo-factory/issues/41` as a `ticket` source in its evidence. This is stored review data from `get-pr-review-findings` with `extended=true`, not a screenshot. (The same type was seen on PR 35, whose Qodo finding quoted ticket 33.)

## What I verified

- **Implementation:** `.claude/skills/pr-gate-check/scripts/pr-state.sh` allows only `none`, `pending`, `failed` and `passed` from the shared classifier `scripts/ci-state.jq`, and ends in `error=unknown check state '...'` with exit 1 on anything else.
- **Behaviour check:** `scripts/pr-gate-check.spec.ts`, case "does not pass on a check state it does not know", passes (`vitest`, 153 passed on `e8908bd`). **Mutation:** with the guard line deleted the case fails (1 failed, 17 passed at that time); restored, it passes. Run against the real `gh`, `pr-state.sh 42` printed `ci=passed` for a green PR.
- **Qodo review:** latest completed run 2033755 reviewed `e8908bd`, which was the PR head when merged; findings 8 of 8 shown as implemented, none open.

## What Qodo caught, missed, and what is unknown

- **Caught, from the source:** the ticket says "save the transcript excerpt and the report" for the fresh-session run. My record had only paraphrase, and Qodo's ticket-rule finding said so. That is a real requirement gap, checked against the ticket text and the code, and fixed (`docs/day13/TRANSCRIPT-EXCERPTS.md`).
- **Not about the chosen expectation:** Qodo raised no finding on, and never mentioned, "unknown result is not `passed`". Its seven other findings were from the diff itself (for example the empty required-check list and the base branch).
- **A caution on the quote:** Qodo's evidence names the ticket but its quoted text, "Run and document a fresh-session skill trial", is a paraphrase of the task, not a line in issue 41. It shows Qodo read the ticket; it does not show it matched the expectation I chose.
- **Unknown:** whether Qodo checked the unknown-result test case at all. A review with no finding on it does not prove it read it or that the requirement is complete. The spec and the mutation are what verify it.

## What changes next

- The PR template in AGENTS.md ("Pull requests") now asks for each acceptance item to name the test or check that covers it, so the check does not rest on Qodo noticing. (Added with this note.)
- No draft or test PR with a deliberate gap was used.
