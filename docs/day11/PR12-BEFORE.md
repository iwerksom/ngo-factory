# Day 11, before: Qodo's review of PR 12

Saved 18 Nov 2026, before any review configuration (issue 38). PR 12, "Show estimate versus actual on delivered projects", head `356f4213c69d90eb272fba3186c541649ff43edd`. Read with `get-pr-review-findings` (run 1808807, completed, review_complete true) and from the PR's two Qodo comments.

## Setup at the time

No `.pr_agent.toml`, no `REVIEW.md`, no review preset applied by us. Qodo portal settings (display, presets, rules) were not read: they are not visible from this repo, so "defaults" is an assumption, not a record.

## Findings on the head commit

| Finding                                                                                              | Type                 | Level                 | Status  |
| ---------------------------------------------------------------------------------------------------- | -------------------- | --------------------- | ------- |
| Delivered cards promise a missing comparison (`src/routes/+page.server.ts:19`, `+page.svelte:25-27`) | Bug (`IssueFinding`) | Low (`informational`) | pending |

An earlier run (1793944, commit `a15ad14`) raised one Medium rule finding, "Spec imports skip the .js extension" (`ComplianceRule`), already implemented.

## How it was shown

The summary comment showed "Code Review by Qodo" with the one Low finding collapsed behind **View low (1)**. High and Medium were empty.

## Where it fell short

- The PR's own acceptance criteria and AGENTS.md rule 4 require simulated data to be labelled "Simulated". Qodo did not say whether the new views meet that, only that other things were wrong.
- A card that tells a visitor a comparison exists when the page cannot show it is a visitor-facing mistake. Qodo found it but ranked it Low, so under our Quality gate (AGENTS.md) it is "flag, do not fix", and it stayed unfixed after merge.
- The summary does not tie any finding to a rule number, so the owner cannot see which product decision a finding protects.
