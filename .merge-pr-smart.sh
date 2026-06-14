#!/bin/bash
# Smart merge: handles ship-log/index.json/dryrun queue conflicts auto.
# Usage: bash .merge-pr-smart.sh <N> <BRANCH>
N=$1
BR=$2
echo "=== PR #$N $BR ==="
git checkout main >/dev/null 2>&1
git pull --rebase origin main 2>&1 | tail -1

git checkout "$BR" 2>&1 | tail -1
git rebase origin/main 2>&1 | tail -2

# Auto-resolve conflicts loop (up to 10 iterations)
for i in 1 2 3 4 5 6 7 8 9 10; do
  if [ ! -d .git/rebase-merge ] && [ ! -d .git/rebase-apply ]; then
    break
  fi
  CONFLICTS=$(git diff --name-only --diff-filter=U)
  if [ -z "$CONFLICTS" ]; then
    git -c core.editor=true rebase --continue 2>&1 | tail -2
    continue
  fi
  echo "--- iter $i conflicts ---"
  echo "$CONFLICTS"
  RESOLVED_ALL=1
  for f in $CONFLICTS; do
    case "$f" in
      docs/roadmap/_dryrun/queue/*)
        # CRLF noise — take branch
        git checkout --theirs "$f" && git add "$f"
        ;;
      docs/roadmap/_index.json|docs/roadmap/items/*/_index.json|docs/roadmap/items/*/*/_index.json|docs/roadmap/items/*/*/*/_index.json)
        git checkout --theirs "$f" && git add "$f"
        ;;
      docs/roadmap/_ship-log-*.md)
        # Append both — combine
        python -c "
import sys, re
p = sys.argv[1]
with open(p, 'r', encoding='utf-8') as fh:
    content = fh.read()
parts = re.split(r'<<<<<<<.*?\n(.*?)=======\n(.*?)>>>>>>>.*?\n', content, flags=re.DOTALL)
out = []
i = 0
while i < len(parts):
    if i + 2 < len(parts) and i % 3 == 0:
        # parts[i] = before, parts[i+1] = ours, parts[i+2] = theirs
        out.append(parts[i])
        ours = parts[i+1]
        theirs = parts[i+2]
        # Take ours as base, append theirs table rows (lines starting with | that aren't header/sep)
        out.append(ours)
        # Find table data rows from theirs
        for line in theirs.split('\n'):
            s = line.strip()
            if s.startswith('|') and '---' not in s and not s.lower().startswith('| id '):
                out.append(line + '\n')
        i += 3
    else:
        out.append(parts[i])
        i += 1
with open(p, 'w', encoding='utf-8') as fh:
    fh.write(''.join(out))
" "$f"
        git add "$f"
        ;;
      docs/roadmap/_manual-kpis.yml)
        # Take theirs (branch); user can manually merge numerics later if needed
        git checkout --theirs "$f" && git add "$f"
        ;;
      docs/roadmap/items/Q*/**/*.md|docs/roadmap/items/Q*/*/*.md)
        git checkout --theirs "$f" && git add "$f"
        ;;
      vitest.config.ts)
        echo "MANUAL: vitest.config.ts needs union merge"
        RESOLVED_ALL=0
        ;;
      *)
        echo "MANUAL CODE MERGE: $f"
        RESOLVED_ALL=0
        ;;
    esac
  done
  if [ $RESOLVED_ALL -eq 0 ]; then
    echo "HALT — manual conflicts in PR #$N"
    git rebase --abort
    return 1 2>/dev/null || exit 1
  fi
  # If _index.json was touched, rebuild
  if echo "$CONFLICTS" | grep -q "_index.json"; then
    node scripts/agents/roadmap/_index-build.mjs 2>&1 | tail -1
    git add docs/roadmap/_index.json 2>/dev/null
  fi
  git -c core.editor=true rebase --continue 2>&1 | tail -2
done

# Verify rebase done
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
  echo "REBASE-STUCK #$N"
  git rebase --abort
  exit 1
fi

git push --force-with-lease origin "$BR" 2>&1 | tail -2
gh pr merge $N --repo XI1568-raghav/bhaktisetu --squash --delete-branch 2>&1 | tail -2
sleep 3
SHA=$(gh pr view $N --repo XI1568-raghav/bhaktisetu --json mergeCommit -q '.mergeCommit.oid' 2>/dev/null)
STATE=$(gh pr view $N --repo XI1568-raghav/bhaktisetu --json state -q '.state' 2>/dev/null)
if [ "$STATE" != "MERGED" ]; then
  echo "first merge attempt rc, retry once"
  sleep 5
  gh pr merge $N --repo XI1568-raghav/bhaktisetu --squash --delete-branch 2>&1 | tail -2
  SHA=$(gh pr view $N --repo XI1568-raghav/bhaktisetu --json mergeCommit -q '.mergeCommit.oid' 2>/dev/null)
  STATE=$(gh pr view $N --repo XI1568-raghav/bhaktisetu --json state -q '.state' 2>/dev/null)
fi
echo "RESULT #$N state=$STATE sha=$SHA"
