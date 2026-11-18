#!/usr/bin/env bash
# pr-state.sh <pr-number>
#
# The part of the pr-gate-check skill that needs no Qodo key: what GitHub says about a PR's
# head commit, its checks and its comments. Prints one `key=value` line per fact. Qodo's
# side (reviewed commit, open findings) is read with the MCP tool, not here.
#
# Fails closed (AGENTS.md rule 7): if a fact cannot be read, it prints `error=...` and
# exits 1. An unreadable fact is never printed as a good one.
#
# Env: AGENT_REPO (default iwerksom/ngo-factory; see .env.example), GH (the gh binary, for tests).
set -uo pipefail

PR="${1:-}"
REPO="${AGENT_REPO:-iwerksom/ngo-factory}"
GH="${GH:-gh}"
# The same classifier the poller uses (none | pending | failed | passed), so the two never disagree.
CI_FILTER="$(cat "$(dirname "$0")/../../../../scripts/ci-state.jq")"

die() {
	echo "error=$*"
	exit 1
}

[[ "$PR" =~ ^[0-9]+$ ]] || die "usage: pr-state.sh <pr-number>"

head=$("$GH" pr view "$PR" -R "$REPO" --json headRefOid --jq .headRefOid) || die "cannot read the PR head"
[[ "$head" =~ ^[0-9a-f]{40}$ ]] || die "head is not a commit sha: '$head'"

state=$("$GH" pr view "$PR" -R "$REPO" --json state --jq .state) || die "cannot read the PR state"
[ -n "$state" ] || die "empty PR state"

# The rules that apply are those of the branch the PR targets, not always `main`.
base=$("$GH" pr view "$PR" -R "$REPO" --json baseRefName --jq .baseRefName) || die "cannot read the base branch"
[ -n "$base" ] || die "empty base branch"

ci=$("$GH" pr view "$PR" -R "$REPO" --json statusCheckRollup --jq "$CI_FILTER") || die "cannot read the checks"
case "$ci" in none | pending | failed | passed) ;; *) die "unknown check state '$ci'" ;; esac

required=$("$GH" api "repos/$REPO/rules/branches/$base" \
	--jq '[.[] | select(.type == "required_status_checks") | .parameters.required_status_checks[].context] | join(",")') ||
	die "cannot read the required checks"
# A ruleset that requires no check would let `ci=passed` come from unrelated checks: not a pass.
[ -n "$required" ] || die "no required status check on '$base': cannot tell which checks must pass"

# How many comments are headed "Low findings for the owner" (the Quality gate's list). The
# phrase must start the comment, so a comment that only mentions it does not count; whether the
# list is complete is for the agent to read (SKILL.md, step 3).
low=$("$GH" pr view "$PR" -R "$REPO" --json comments \
	--jq '[.comments[] | select(.body | test("^\\s*(#+\\s*)?\\**Low findings for the owner"))] | length') || die "cannot read the comments"
[[ "$low" =~ ^[0-9]+$ ]] || die "comment count is not a number: '$low'"

# A push during the reads above would pair an old head with new checks: read the head again.
head_again=$("$GH" pr view "$PR" -R "$REPO" --json headRefOid --jq .headRefOid) || die "cannot read the PR head again"
[ "$head_again" = "$head" ] || die "the PR head moved from $head to $head_again while reading; run again"

echo "pr=$PR"
echo "url=https://github.com/$REPO/pull/$PR"
echo "state=$state"
echo "base=$base"
echo "head=$head"
echo "ci=$ci"
echo "required_checks=$required"
echo "low_findings_comments=$low"
