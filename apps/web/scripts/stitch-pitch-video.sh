#!/usr/bin/env bash
# Stitch the 11 Playwright-captured pitch webms + 1 still (07-panchang)
# into a single 1920x1080 H.264 MP4 demo reel.
#
# Output: apps/web/public/pitch/video/darshya-demo-reel.mp4
#
# Why H.264 MP4: universal browser/Slack/Twitter playback. Source webms
# are VP8 — not all investor email clients render those inline.
#
# Usage:
#   ./apps/web/scripts/stitch-pitch-video.sh
#
# Requires ffmpeg on PATH (or set FFMPEG env var to full path).

set -euo pipefail

FFMPEG="${FFMPEG:-ffmpeg}"
SRC_DIR="apps/web/public/pitch/video"
IMG_DIR="apps/web/public/pitch/img"
OUT="$SRC_DIR/darshya-demo-reel.mp4"
WORK=$(mktemp -d)
trap "rm -rf $WORK" EXIT

# 1. Generate a 4-second silent video clip from the panchang still so the
#    final reel includes all 12 portal screens, not 11.
"$FFMPEG" -y -loop 1 -t 4 -i "$IMG_DIR/07-panchang.png" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \
  -c:v libx264 -pix_fmt yuv420p -r 25 -t 4 \
  "$WORK/07-panchang.mp4"
# 2. Transcode each webm to H.264 with consistent params so concat demuxer
#    works without re-encoding the joined output.
for f in "$SRC_DIR"/*.webm; do
  name=$(basename "$f" .webm)
  "$FFMPEG" -y -i "$f" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \
    -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -r 25 \
    -an \
    "$WORK/$name.mp4"
done

# 3. Build concat list in chapter order. 07-panchang inserted between 06 and 08.
#    Use bare filenames + cd into WORK so mingw path translation doesn't
#    rewrite our absolute paths into Windows-incompatible C:/tmp/... forms
#    that ffmpeg cannot resolve.
{
  for n in 01-home-hero 02-temples-list 03-temple-slug-jsonld 04-pujas-list \
           05-puja-booking-start 06-darshan-live 07-panchang 08-astrology \
           09-gaushala 10-store 11-yatra 12-ai-chat; do
    echo "file '$n.mp4'"
  done
} > "$WORK/concat.txt"

OUT_ABS=$(realpath "$OUT" 2>/dev/null || echo "$(pwd)/$OUT")
# 4. Concat without re-encoding (all parts share params from step 2).
(cd "$WORK" && "$FFMPEG" -y -f concat -safe 0 -i concat.txt -c copy "$OUT_ABS")
DURATION=$("$FFMPEG" -i "$OUT" 2>&1 | grep -oE "Duration: [0-9:.]+" | sed 's/Duration: //')
SIZE=$(du -h "$OUT" | cut -f1)
echo "✓ Stitched: $OUT"
echo "  Duration: $DURATION"
echo "  Size:     $SIZE"
