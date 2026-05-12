#!/usr/bin/env bash
#
# Build Darshya golden-path demo MP4 for KYC reviewers (Razorpay,
# Stripe, WhatsApp Meta), Reddit organic, and investor outreach.
#
# Workflow:
#   1. Run Playwright single-session capture against prod (or local).
#   2. Find the .webm video Playwright wrote to test-results/.
#   3. ffmpeg-transcode to H.264 MP4 (LinkedIn/WhatsApp/Twitter compat).
#   4. Generate poster JPG from a mid-flow keyframe.
#   5. Copy MP4 + poster into docs/demo-video/.
#
# Requirements:
#   - ffmpeg on PATH (Windows: choco install ffmpeg, or download static build)
#   - Playwright already installed (pnpm --filter @poojly/web exec playwright install chromium)
#
# Usage:
#   bash scripts/build-demo-video.sh                # captures prod (darshya.online)
#   DEMO_BASE_URL=http://localhost:3000 bash scripts/build-demo-video.sh
#
# Output:
#   docs/demo-video/darshya-demo-YYYYMMDD.mp4
#   docs/demo-video/darshya-demo-YYYYMMDD-poster.jpg

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$REPO_ROOT/apps/web"
OUT_DIR="$REPO_ROOT/docs/demo-video"
DATE_TAG="$(date +%Y%m%d)"

mkdir -p "$OUT_DIR"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "[demo-video] ERROR: ffmpeg not found on PATH."
  echo "  Windows: choco install ffmpeg   (or grab static build from https://www.gyan.dev/ffmpeg/builds/)"
  echo "  macOS:   brew install ffmpeg"
  echo "  Linux:   apt-get install ffmpeg"
  exit 1
fi

echo "[demo-video] Step 1/4 — running Playwright capture against ${DEMO_BASE_URL:-https://darshya.online}"
cd "$REPO_ROOT"
# Clean prior test-results so we can find THE video without ambiguity.
rm -rf "$WEB_DIR/test-results/capture-demo-video-darshya-demo--ed03e-chromium" 2>/dev/null || true
rm -rf "$WEB_DIR/test-results/" 2>/dev/null || true

pnpm --filter @poojly/web exec playwright test \
  e2e/capture-demo-video.spec.ts \
  --project chromium \
  --headed

echo "[demo-video] Step 2/4 — locating Playwright .webm output"
WEBM=$(find "$WEB_DIR/test-results" -name "*.webm" -type f 2>/dev/null | head -1)
if [[ -z "${WEBM:-}" ]]; then
  echo "[demo-video] ERROR: no .webm found in $WEB_DIR/test-results — did Playwright fail?"
  exit 2
fi
echo "[demo-video]   found: $WEBM"

OUT_MP4="$OUT_DIR/darshya-demo-${DATE_TAG}.mp4"
POSTER="$OUT_DIR/darshya-demo-${DATE_TAG}-poster.jpg"

echo "[demo-video] Step 3/4 — transcoding webm -> mp4 (H.264 + AAC silent track)"
# -an would drop audio, but several uploaders (LinkedIn) reject videoless
# audio AND fully audio-stripped files. Inject a silent track for safety.
ffmpeg -y \
  -i "$WEBM" \
  -f lavfi -i anullsrc=r=44100:cl=stereo \
  -shortest \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
  -movflags +faststart \
  -c:a aac -b:a 96k \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  "$OUT_MP4"

echo "[demo-video] Step 4/4 — extracting poster frame at 8s"
ffmpeg -y -ss 00:00:08 -i "$OUT_MP4" -vframes 1 -q:v 2 "$POSTER"

echo ""
echo "[demo-video] DONE."
echo "  MP4:    $OUT_MP4"
echo "  Poster: $POSTER"
echo ""
echo "Next steps:"
echo "  - Razorpay/Stripe KYC: upload MP4 as 'product walkthrough' evidence"
echo "  - WhatsApp Meta verify: paste video URL in business profile review"
echo "  - Reddit r/IndiaInvestments / r/NRI: include MP4 in organic post"
echo "  - Investor outreach: attach to cold email thread"
