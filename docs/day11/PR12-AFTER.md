# Day 11, after: the same PR 12, reviewed with the repo config

`.pr_agent.toml` was merged to `main` on 18 Nov 2026 (PR 40, issue 38). Then `/agentic_review` was commented on PR 12, whose code did not change (head `356f4213c69d90eb272fba3186c541649ff43edd`, the same as before).

## Runs

| Run              | Trigger                                                                                   | Commit    | Effort    |
| ---------------- | ----------------------------------------------------------------------------------------- | --------- | --------- |
| 1808807 (before) | PR open, 5 Nov                                                                            | `356f421` | lite      |
| 2034133          | `/agentic_review`, after the merge                                                        | `356f421` | standard  |
| 2034202          | `/agentic_review --review_agent.issues_user_guidelines="…report it as Medium, never Low"` | `356f421` | not shown |

## What changed

Nothing in the findings. After both reruns `get-pr-review-findings` still returns the same two findings with the same ids, levels and statuses: the `.js` import one (Medium, implemented) and "Delivered cards promise a missing comparison" (**informational, still Low**, pending). The per-run override, which said in so many words to report that card finding as Medium, did not change it either. The summary comment's text looked the same.

**Anything else that changed between runs:** the review effort was `lite` for the original and `standard` for the first rerun. That is a second change, so even a different result would not have proved the config was the cause.

## Why the experiment cannot answer the question

Qodo's docs say a rerun does not clear earlier findings. The Low finding was created in run 1808807 and later runs keep it as it is, so a rule about how to rate it cannot touch it. A rerun on an old PR can show new findings; it cannot re-rate an existing one. Two things stay unknown: whether the repo file was read at all (nothing in the rerun cites it), and whether the TOML keys are right (they come from Qodo's docs as summarised by a fetch tool). That the override did nothing is consistent with the finding being fixed in place, and also with the key being ignored.

## Display or feedback?

Neither changed. No display setting was touched, and no finding was gained or lost.

## Decision: keep, and test on a fresh PR

Keep the file: it is harmless, it was approved, and AGENTS.md remains the source. Mark its effect **unproven**. The test that can work is a new PR with a new finding: ticket 39 (the same card bug) is the planned one, and its review will show whether the card gap is rated Medium and whether simulated-data labelling is mentioned. If Qodo's review of that PR does not change, the next step is to look for the reason in Qodo's portal (which settings win over the repo file), not to write more guidelines.
