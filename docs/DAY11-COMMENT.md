## My project

Project and PR: NGO Factory, PR [12](https://github.com/iwerksom/ngo-factory/pull/12) (head `356f421`), estimate versus actual on delivered projects.
Product decision I want review to respect: anything shown from simulated data says so, and a visitor-facing claim must match what the page it points to shows.
What I wanted review to help me catch: a delivered-project card that promises a comparison its page cannot show.
Where the original review fell short: it did find the card bug, but rated it Low (informational), so under my quality gate it is "flag, do not fix" and it stayed unfixed after merge. It also did not say which rule a finding protects. Saved in [docs/day11/PR12-BEFORE.md](https://github.com/iwerksom/ngo-factory/blob/main/docs/day11/PR12-BEFORE.md).

## My setup

Configuration or context changed, with before and after values: before, no repo config file (Qodo portal settings were not visible to me). After, [`.pr_agent.toml`](https://github.com/iwerksom/ngo-factory/blob/main/.pr_agent.toml) with `[review_agent]` `issues_user_guidelines` and `compliance_user_guidelines` taken from AGENTS.md; no display settings changed. PR [40](https://github.com/iwerksom/ngo-factory/pull/40), merged after my owner approved it.
Where it applies and how I checked that: the repo root of the default branch, which Qodo's docs say it reads. I could **not** confirm that the file was read: nothing in the rerun cites it.

## The comparison

Original review: run 1808807, 5 Nov, effort lite.
New review of the same unchanged PR code: runs 2034133 (`/agentic_review`) and 2034202 (the same with an override rating that finding Medium), same commit, 18 Nov. Saved in [docs/day11/PR12-AFTER.md](https://github.com/iwerksom/ngo-factory/blob/main/docs/day11/PR12-AFTER.md).
Anything else that changed between runs: review effort, lite then standard.
One concrete example checked against the code: "Delivered cards promise a missing comparison" (`src/routes/+page.server.ts:19`) is a real bug and is still rated Low after both reruns; I opened ticket [39](https://github.com/iwerksom/ngo-factory/issues/39) for it.
Did the feedback change, its display change, or both? Neither.
Anything still unhelpful or useful feedback lost: nothing lost. Qodo keeps earlier findings on a rerun, so a rerun cannot re-rate one; this experiment cannot show whether the guidelines work.

## My decision

Keep, adjust, or undo, and why: keep the file (harmless, approved) and call its effect unproven. Next test: a fresh PR with a new finding, the fix for ticket 39. If its review does not change, look at which Qodo portal setting wins over the repo file before writing more guidelines.
If blocked, the intended setup and what stopped me: not blocked, but the question needs a fresh PR.

_Written with Claude Code (Claude Sonnet 5.5) acting as developer; my product owner decided what is posted._
