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
# Env: AGENT_REPO (default iwerksom/ngo-factory), GH (the gh binary, for tests).
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

ci=$("$GH" pr view "$PR" -R "$REPO" --json statusCheckRollup --jq "$CI_FILTER") || die "cannot read the checks"
case "$ci" in none | pending | failed | passed) ;; *) die "unknown check state '$ci'" ;; esac

required=$("$GH" api "repos/$REPO/rules/branches/main" \
	--jq '[.[] | select(.type == "required_status_checks") | .parameters.required_status_checks[].context] | join(",")') ||
	die "cannot read the required checks"

# How many comments carry the Low-findings list the Quality gate asks for.
low=$("$GH" pr view "$PR" -R "$REPO" --json comments \
	--jq '[.comments[] | select(.body | test("Low findings for the owner"))] | length') || die "cannot read the comments"
[[ "$low" =~ ^[0-9]+$ ]] || die "comment count is not a number: '$low'"

echo "pr=$PR"
echo "state=$state"
echo "head=$head"
echo "ci=$ci"
echo "required_checks=$required"
echo "low_findings_comments=$low"
