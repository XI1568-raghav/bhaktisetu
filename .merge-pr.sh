#!/bin/bash
# Single PR merge helper for round-2.
# Usage: bash .merge-pr.sh <N> <BRANCH>
N=$1
BR=$2
echo "=== PR #$N $BR ==="
git checkout main >/dev/null 2>&1
git pull --rebase origin main 2>&1 | tail -1
git checkout "$BR" 2>&1 | tail -1
git rebase origin/main 2>&1 | tail -2
RC=$?
if [ $RC -ne 0 ]; then
  echo "REBASE-FAIL #$N rc=$RC"
  echo "--- conflict files ---"
  git diff --name-only --diff-filter=U
  exit 1
fi
git push --force-with-lease origin "$BR" 2>&1 | tail -2
gh pr merge $N --repo XI1568-raghav/bhaktisetu --squash --delete-branch 2>&1 | tail -3
MRC=$?
if [ $MRC -ne 0 ]; then
  echo "first merge attempt rc=$MRC, retry once"
  sleep 3
  gh pr merge $N --repo XI1568-raghav/bhaktisetu --squash --delete-branch 2>&1 | tail -3
fi
SHA=$(gh pr view $N --repo XI1568-raghav/bhaktisetu --json mergeCommit -q '.mergeCommit.oid' 2>/dev/null)
STATE=$(gh pr view $N --repo XI1568-raghav/bhaktisetu --json state -q '.state' 2>/dev/null)
echo "RESULT #$N state=$STATE sha=$SHA"
