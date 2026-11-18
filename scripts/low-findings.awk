# Prints the "Low findings for the owner" section of an agent's final answer: the heading line
# and everything after it, up to (not including) the closing `RESULT:` line. Prints nothing when
# the heading is missing, so the caller can say the list is missing instead of claiming there
# are none (AGENTS.md, Quality gate: the owner gets every Low finding; rule 7, fail closed).
#
# Used by scripts/agent-poller.sh; tested in scripts/quality-gate.spec.ts.
#   awk -f scripts/low-findings.awk "$out"
/^[[:space:]]*RESULT: / { if (on) exit }
/^[[:space:]]*Low findings for the owner/ { on = 1 }
on { print }
