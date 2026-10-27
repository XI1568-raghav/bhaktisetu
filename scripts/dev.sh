#!/bin/bash
# Safe dev server launcher — kills stale processes, clears cache, starts fresh
# Usage: bash scripts/dev.sh

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

echo "🧹 Cleaning up..."

# Kill anything on port 3000/4000
for port in 3000 4000; do
  pid=$(netstat -ano 2>/dev/null | grep ":$port " | grep LISTEN | awk '{print $5}' | head -1)
  if [ -n "$pid" ]; then
    taskkill //F //PID "$pid" 2>/dev/null || kill "$pid" 2>/dev/null
    echo "  Killed PID $pid on port $port"
  fi
done

# Delete .next cache (the #1 cause of Internal Server Error)
rm -rf apps/web/.next 2>/dev/null
cmd.exe /c "rmdir /s /q \"$DIR\\apps\\web\\.next\"" 2>/dev/null
echo "  Cleared .next cache"

sleep 0.5

echo "🚀 Starting servers..."

# Start API
cd "$DIR/apps/api" && npx tsx src/server.ts &
API_PID=$!
sleep 1.5

# Start Web (no turbopack — known bug with pnpm workspaces + Next 15.5)
cd "$DIR/apps/web" && npx next dev --webpack --port 3000 &
WEB_PID=$!

echo ""
echo "✅ Poojly running:"
echo "   API: http://localhost:4000"
echo "   Web: http://localhost:3000"
echo ""
echo "   Press Ctrl+C to stop both"

wait
