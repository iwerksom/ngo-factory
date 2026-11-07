# Classifies a PR's checks for scripts/agent-poller.sh. Input: the JSON of
# `gh pr view --json statusCheckRollup`. Output: one of
#   none     no check has been reported yet (keep waiting)
#   pending  at least one check is still running (keep waiting)
#   failed   every check finished, and at least one did not end in a known pass
#   passed   every check finished with SUCCESS, NEUTRAL or SKIPPED
#
# Fails closed (AGENTS.md rule 7): only a known passing result counts as a pass.
# A missing or unknown result is "failed", never "passed". A check run has
# status + conclusion; a commit status has only state, so a missing status means
# "finished" and the result is read from conclusion, then state.
.statusCheckRollup as $c
| if ($c | length) == 0 then "none"
  elif any($c[]; (.status // "COMPLETED") != "COMPLETED" or ((.state // "") | IN("PENDING", "EXPECTED"))) then "pending"
  elif all($c[]; (.conclusion // .state // "") | IN("SUCCESS", "NEUTRAL", "SKIPPED")) then "passed"
  else "failed"
  end
