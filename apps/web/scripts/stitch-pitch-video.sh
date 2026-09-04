#!/usr/bin/env bash
# Build investor-grade 60s PAS pitch reel:
#   - Edge TTS voice-over (en-IN-NeerjaExpressiveNeural, -5%)
#   - Tanpura-like procedural ambient pad ducked under VO
#   - Brand-aligned cream lower-thirds (#f5f3ef bg) with saffron-ink text
#   - 0.4s xfade crossfades; PAS arc: Problem → Agitation → Solution
#   - Brand intro card (cream + saffron flame) + outro CTA
#   - Ken-burns zoom on the 07-panchang still
#   - Target duration: 60s ± 1s
#
# Output: apps/web/public/pitch/video/darshya-demo-reel.mp4
# Requires: ffmpeg 6+, edge-tts (pip install edge-tts)
# Run from monorepo root: bash apps/web/scripts/stitch-pitch-video.sh

set -euo pipefail

FFMPEG="${FFMPEG:-ffmpeg}"
SRC="apps/web/public/pitch/video"
IMG="apps/web/public/pitch/img"
WORK=$(mktemp -d)
OUT="$SRC/darshya-demo-reel.mp4"
FONT_ESC="C\\:/Windows/Fonts/arialbd.ttf"

# Brand palette (must match apps/web/app/globals.css)
SAFFRON="0xb87333"      # primary
SAFFRON_DEEP="0x943B19"
INK="0x2a2520"
CREAM="0xf5f3ef"

echo ">>> work dir: $WORK"

# --- TC-01: the Section 80G honesty gate -----------------------------------
# Two make_clip captions below are burned into the pixels of
# apps/web/public/pitch/video/darshya-demo-reel.mp4 and cannot be edited once
# the reel ships. They promised an 80G receipt. Darshya holds no Section 80G
# registration: apps/web/lib/company.ts HAS_80G_VERIFIED is false with pan and
# eightyGNumber both null, and apps/api/src/lib/pdf-receipt.ts is80GEligible()
# needs a donee 80G number AND PAN read from gaushala_profiles columns that no
# route writes. Read the flag rather than mirroring it, so this cannot drift.
COMPANY_TS="apps/web/lib/company.ts"
if grep -qE 'HAS_80G_VERIFIED:[[:space:]]*true' "$COMPANY_TS"; then
  CAP_BOOKING="Sankalp - Video proof - 80G receipt"
  CAP_GAUSHALA="Gaushala adoption with 80G."
elif grep -qE 'HAS_80G_VERIFIED:[[:space:]]*false' "$COMPANY_TS"; then
  CAP_BOOKING="Sankalp - Video proof - numbered receipt"
  CAP_GAUSHALA="Gaushala adoption. Receipted giving."
else
  echo "!!! HAS_80G_VERIFIED not found in $COMPANY_TS - refusing to burn a tax claim into video" >&2
  exit 1
fi


# --- 0. Voice-over ----------------------------------------------------------
VO="apps/web/scripts/build/vo.mp3"
if [ ! -f "$VO" ]; then
  echo ">>> generating VO via edge-tts"
  python -m edge_tts \
    --voice en-IN-NeerjaExpressiveNeural \
    --rate=-5% \
    --file apps/web/scripts/pitch-vo-script.txt \
    --write-media "$VO"
fi

# --- helper: trim + scale + brand-cream lower-third ------------------------
# Args: input start dur caption out
make_clip() {
  local input="$1" start="$2" dur="$3" cap="$4" out="$5"
  "$FFMPEG" -y -ss "$start" -t "$dur" -i "$input" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:${INK},setsar=1,drawtext=fontfile='$FONT_ESC':text='$cap':fontcolor=${INK}:fontsize=44:box=1:boxcolor=${CREAM}@0.94:boxborderw=28:x=80:y=h-180" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 25 -an \
    "$out"
}

# --- 1. PAS-arc clips with brand captions ----------------------------------
# Problem (0-9s)
make_clip "$SRC/01-home-hero.webm"          0   4 "Rs 4,00,000 crore a year. Zero proof." "$WORK/01.mp4"
make_clip "$SRC/02-temples-list.webm"       0   4 "20 verified temples. Real priests."     "$WORK/02.mp4"

# Solution discovery (9-32s)
make_clip "$SRC/04-pujas-list.webm"         0   4 "Book any puja. Any deity."             "$WORK/03.mp4"
make_clip "$SRC/05-puja-booking-start.webm" 0   6 "$CAP_BOOKING"                          "$WORK/04.mp4"
make_clip "$SRC/06-darshan-live.webm"       0   6 "Live darshan. Sub-second latency."      "$WORK/05.mp4"

# Panchang ken-burns
"$FFMPEG" -y -loop 1 -t 4 -i "$IMG/07-panchang.png" \
  -vf "scale=2304:1296:force_original_aspect_ratio=increase,zoompan=z='min(zoom+0.0010,1.18)':d=100:s=1920x1080,setsar=1,drawtext=fontfile='$FONT_ESC':text='Daily panchang. Daily habit.':fontcolor=${INK}:fontsize=44:box=1:boxcolor=${CREAM}@0.94:boxborderw=28:x=80:y=h-180" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 25 -t 4 \
  "$WORK/06.mp4"

make_clip "$SRC/08-astrology.webm"          0   4 "AI panditji. 1500 tokens/sec."          "$WORK/07.mp4"
make_clip "$SRC/12-ai-chat.webm"            2   5 "Llama 3 panditji on Groq."              "$WORK/08.mp4"

# Surface area (32-50s)
make_clip "$SRC/09-gaushala.webm"           0   4 "$CAP_GAUSHALA"                         "$WORK/09.mp4"
make_clip "$SRC/11-yatra.webm"              0   4 "Pilgrimage planning. End-to-end."       "$WORK/10.mp4"
make_clip "$SRC/10-store.webm"              0   4 "Devotional commerce. Built-in."         "$WORK/11.mp4"
make_clip "$SRC/03-temple-slug-jsonld.webm" 8   4 "Structured data. Google ranks us."     "$WORK/12.mp4"

# --- 2. Intro + Outro: brand-aligned cream + saffron -----------------------
# Intro (5s): cream bg, "DARSHYA" saffron, "Devotion. Verified." ink
"$FFMPEG" -y -f lavfi -t 5 -i color=c=${CREAM}:s=1920x1080:r=25 \
  -vf "drawtext=fontfile='$FONT_ESC':text='DARSHYA':fontcolor=${SAFFRON}:fontsize=180:x=(w-text_w)/2:y=(h-text_h)/2-60:alpha='if(lt(t,0.7),t/0.7,1)',drawtext=fontfile='$FONT_ESC':text='Devotion. Verified.':fontcolor=${INK}:fontsize=52:x=(w-text_w)/2:y=(h-text_h)/2+110:alpha='if(lt(t,1.4),max(0,(t-0.7)/0.7),1)'" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 25 \
  "$WORK/00-intro.mp4"

# Outro (8s): cream bg, "darshya.online" saffron, "Seed round open" subtle
"$FFMPEG" -y -f lavfi -t 8 -i color=c=${CREAM}:s=1920x1080:r=25 \
  -vf "drawtext=fontfile='$FONT_ESC':text='darshya.online':fontcolor=${SAFFRON}:fontsize=120:x=(w-text_w)/2:y=(h-text_h)/2-70:alpha='if(lt(t,0.7),t/0.7,1)',drawtext=fontfile='$FONT_ESC':text='Seed round open. Email founder@darshya.online':fontcolor=${INK}:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2+70:alpha='if(lt(t,1.4),max(0,(t-0.7)/0.7),1)',drawtext=fontfile='$FONT_ESC':text='Devotion. Verified.':fontcolor=${SAFFRON_DEEP}:fontsize=32:x=(w-text_w)/2:y=(h-text_h)/2+150:alpha='if(lt(t,2.0),max(0,(t-1.4)/0.6),1)'" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 25 \
  "$WORK/13-outro.mp4"

# --- 3. xfade chain --------------------------------------------------------
clips=(00-intro 01 02 03 04 05 06 07 08 09 10 11 12 13-outro)
dur=(5 4 4 4 6 6 4 4 5 4 4 4 4 8)
xf=0.4

inputs=""
for c in "${clips[@]}"; do
  inputs+=" -i $WORK/$c.mp4"
done

filter=""
prev="[0:v]"
acc=0
for i in $(seq 1 $((${#clips[@]}-1))); do
  acc=$(awk -v a=$acc -v d=${dur[$((i-1))]} -v x=$xf 'BEGIN{printf "%.2f", a + d - x}')
  out_label="[v$i]"
  if [ $i -eq $((${#clips[@]}-1)) ]; then out_label="[vout]"; fi
  filter+="$prev[$i:v]xfade=transition=fade:duration=$xf:offset=$acc$out_label;"
  prev="[v$i]"
done
filter="${filter%;}"

total_dur=$(awk -v xf=$xf 'BEGIN{ s=0; n=0; for(i=1;i<ARGC;i++){s+=ARGV[i]; n++} print s - (n-1)*xf }' "${dur[@]}")
echo ">>> total video duration: ${total_dur}s ($((${#clips[@]})) clips)"

# --- 4. Tanpura-style ambient pad ------------------------------------------
# Sa (D = ~146.83), Pa (A = ~220), upper Sa (D5 = ~293.66) -- detuned drone.
fadeout=$(awk -v t=$total_dur 'BEGIN{print t-2.5}')
"$FFMPEG" -y -f lavfi -t "$total_dur" -i "sine=frequency=146.83:duration=$total_dur" \
                         -f lavfi -t "$total_dur" -i "sine=frequency=220:duration=$total_dur" \
                         -f lavfi -t "$total_dur" -i "sine=frequency=293.66:duration=$total_dur" \
  -filter_complex "[0:a]volume=0.55[a0];[1:a]volume=0.40[a1];[2:a]volume=0.28[a2];[a0][a1][a2]amix=inputs=3:duration=longest,lowpass=f=850,aresample=44100,loudnorm=I=-23:TP=-2:LRA=7,afade=t=in:st=0:d=2,afade=t=out:st=${fadeout}:d=2.5[aout]" \
  -map "[aout]" -c:a aac -b:a 96k "$WORK/music.m4a"

# --- 5. Mix VO + music -----------------------------------------------------
# VO leads by 0.6s after intro reveal; music ducks ~10dB under VO.
"$FFMPEG" -y -i "$VO" -i "$WORK/music.m4a" \
  -filter_complex "[0:a]adelay=2500|2500,loudnorm=I=-16:TP=-1.5:LRA=11[vo];[1:a]volume=0.32[mus];[vo][mus]amix=inputs=2:duration=first:dropout_transition=2,atrim=0:$total_dur,asetpts=PTS-STARTPTS[aout]" \
  -map "[aout]" -c:a aac -b:a 128k "$WORK/audio-mixed.m4a"

# --- 6. Final assemble -----------------------------------------------------
"$FFMPEG" -y $inputs -i "$WORK/audio-mixed.m4a" \
  -filter_complex "$filter" \
  -map "[vout]" -map "${#clips[@]}:a" \
  -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -r 25 \
  -c:a aac -b:a 128k -movflags +faststart \
  -shortest \
  "$OUT"

DURATION=$({ "$FFMPEG" -i "$OUT" 2>&1 || true; } | grep -oE "Duration: [0-9:.]+" | sed 's/Duration: //') || true
SIZE=$(du -h "$OUT" | cut -f1)
echo ">>> done"
echo "    file:     $OUT"
echo "    duration: $DURATION"
echo "    size:     $SIZE"

rm -rf "$WORK"
