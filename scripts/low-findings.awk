# Prints the "Low findings for the owner" section of an agent's final answer: the heading line
# and everything after it, up to (not including) the closing `RESULT:` line. Prints nothing when
# the heading is missing, so the caller can say the list is missing instead of claiming there
# are none (AGENTS.md, Quality gate: the owner gets every Low finding; rule 7, fail closed).
#
# The heading may carry Markdown the agent adds on its own: leading #, *, _, > or - and spaces
# ("## Low findings for the owner", "**Low findings for the owner**"), in any letter case. A
# sentence that merely mentions the words ("The Low findings for the owner are...") is not a heading.
#
# Used by scripts/agent-poller.sh; tested in scripts/quality-gate.spec.ts.
#   awk -f scripts/low-findings.awk "$out"
/^[[:space:]]*RESULT: / { if (on) exit }
tolower($0) ~ /^[[:space:]#*_>-]*low findings for the owner/ { on = 1 }
on { print }
