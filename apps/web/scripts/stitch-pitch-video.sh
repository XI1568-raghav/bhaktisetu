#!/usr/bin/env bash
# Build investor-grade pitch reel v2:
#   - Edge TTS voice-over (en-IN-NeerjaExpressiveNeural)
#   - Procedural ambient pad as background music, ducked under VO
#   - Lower-third caption overlays per clip
#   - 0.5s xfade crossfades between clips
#   - Title intro card + outro CTA
#   - Ken-burns zoom on the 07-panchang still
#   - Each source clip trimmed per pacing audit (90-110s total)
#
# Output: apps/web/public/pitch/video/darshya-demo-reel.mp4
# Requires: ffmpeg 6+, edge-tts (pip install edge-tts), font: Arial.
#
# Re-run: bash apps/web/scripts/stitch-pitch-video-v2.sh

set -euo pipefail

FFMPEG="${FFMPEG:-ffmpeg}"
SRC="apps/web/public/pitch/video"
IMG="apps/web/public/pitch/img"
WORK=$(mktemp -d)
OUT="$SRC/darshya-demo-reel.mp4"
FONT="C:/Windows/Fonts/arialbd.ttf"
# ffmpeg drawtext on Windows needs forward-slash + escaped colon
FONT_ESC="C\\:/Windows/Fonts/arialbd.ttf"

echo ">>> work dir: $WORK"

# --- 0. Voice-over (already generated upstream by build_vo.sh; regenerate if missing)
VO="apps/web/scripts/build/vo.mp3"
if [ ! -f "$VO" ]; then
  echo ">>> generating VO via edge-tts"
  python -m edge_tts \
    --voice en-IN-NeerjaExpressiveNeural \
    --rate=-5% \
    --file apps/web/scripts/pitch-vo-script.txt \
    --write-media "$VO"
fi

# ffmpeg with `-i` only and no output exits 1 — that's expected, swallow.
# `pipefail` plus `set -e` would otherwise kill the script here.
VO_DUR=$({ "$FFMPEG" -i "$VO" 2>&1 || true; } | grep -oE "Duration: [0-9:.]+" | sed 's/Duration: //') || true
echo ">>> VO duration: $VO_DUR"

# --- helper: trim + scale + drawtext caption ---
# Args: input  start  duration  caption_text  output
make_clip() {
  local input="$1" start="$2" dur="$3" cap="$4" out="$5"
  "$FFMPEG" -y -ss "$start" -t "$dur" -i "$input" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1,drawtext=fontfile='$FONT_ESC':text='$cap':fontcolor=white:fontsize=42:box=1:boxcolor=0x000000aa:boxborderw=24:x=80:y=h-180" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 25 -an \
    "$out"
}

# --- 1. Trimmed clips with captions (per audit recommendations) ---
# 01 home-hero — 14s → 9s, scroll moment center-cut
make_clip "$SRC/01-home-hero.webm"          0   9 "Devotion is offline. Fragmented. Untrusted." "$WORK/01.mp4"
# 02 temples-list — 8.7s keep
make_clip "$SRC/02-temples-list.webm"       0   7 "20 verified temples. Real photos. Real priests." "$WORK/02.mp4"
# 03 temple-detail — 16.5s → 8s, jump-cut from grid to detail
make_clip "$SRC/03-temple-slug-jsonld.webm" 8   8 "Structured data on every page. Google sees us." "$WORK/03.mp4"
# 04 pujas-list — 6.3s keep all
make_clip "$SRC/04-pujas-list.webm"         0   6 "Book a puja for any deity." "$WORK/04.mp4"
# 05 puja-booking — 9.5s keep
make_clip "$SRC/05-puja-booking-start.webm" 0   9 "Sankalp. NRI pricing. Mandatory video proof." "$WORK/05.mp4"
# 06 darshan-live — 12.6s → 8s
make_clip "$SRC/06-darshan-live.webm"       0   8 "Live darshan. AWS IVS. Sub-second latency." "$WORK/06.mp4"
# 07 panchang — PNG ken-burns 5s
"$FFMPEG" -y -loop 1 -t 5 -i "$IMG/07-panchang.png" \
  -vf "scale=2304:1296:force_original_aspect_ratio=increase,zoompan=z='min(zoom+0.0008,1.15)':d=125:s=1920x1080,setsar=1,drawtext=fontfile='$FONT_ESC':text='Daily panchang. Daily habit.':fontcolor=white:fontsize=42:box=1:boxcolor=0x000000aa:boxborderw=24:x=80:y=h-180" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 25 -t 5 \
  "$WORK/07.mp4"
# 08 astrology — 7.7s keep
make_clip "$SRC/08-astrology.webm"          0   7 "Astrology. Horoscope. AI panditji." "$WORK/08.mp4"
# 09 gaushala — 16s → 7s
make_clip "$SRC/09-gaushala.webm"           0   7 "Gaushala adoption with 80G receipts." "$WORK/09.mp4"
# 10 store — 12s → 8s
make_clip "$SRC/10-store.webm"              0   8 "Headless commerce. Devotional storefront." "$WORK/10.mp4"
# 11 yatra — 10s → 7s
make_clip "$SRC/11-yatra.webm"              0   7 "Yatra companion. Pilgrimage planning." "$WORK/11.mp4"
# 12 ai-chat — 13.8s → 9s, front-load typing moment
make_clip "$SRC/12-ai-chat.webm"            2   9 "Llama panditji on Groq. 1500 tokens/sec." "$WORK/12.mp4"

# --- 2. Intro + Outro title cards (4s each) ---
# Intro: brand reveal
"$FFMPEG" -y -f lavfi -t 4 -i color=c=0x0a0a0a:s=1920x1080:r=25 \
  -vf "drawtext=fontfile='$FONT_ESC':text='DARSHYA':fontcolor=0xff8c1a:fontsize=160:x=(w-text_w)/2:y=(h-text_h)/2-40:alpha='if(lt(t,0.6),t/0.6,1)',drawtext=fontfile='$FONT_ESC':text='Devotion. Verified.':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2+90:alpha='if(lt(t,1.2),max(0,(t-0.6)/0.6),1)'" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 25 \
  "$WORK/00-intro.mp4"

# Outro: CTA
"$FFMPEG" -y -f lavfi -t 5 -i color=c=0x0a0a0a:s=1920x1080:r=25 \
  -vf "drawtext=fontfile='$FONT_ESC':text='darshya.online':fontcolor=0xff8c1a:fontsize=110:x=(w-text_w)/2:y=(h-text_h)/2-60:alpha='if(lt(t,0.6),t/0.6,1)',drawtext=fontfile='$FONT_ESC':text='Raising seed to win the trust layer for 1B devotees.':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2+60:alpha='if(lt(t,1.2),max(0,(t-0.6)/0.6),1)'" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 25 \
  "$WORK/13-outro.mp4"

# --- 3. Concat all 14 clips with xfade (0.5s) -------------------------------
# xfade requires N-1 filter steps. Pre-build offsets list.
clips=(00-intro 01 02 03 04 05 06 07 08 09 10 11 12 13-outro)
# durations (must match -t above)
dur=(4 9 7 8 6 9 8 5 7 7 8 7 9 5)
xf=0.5

# Build complex filter for sequential xfade
inputs=""
for c in "${clips[@]}"; do
  inputs+=" -i $WORK/$c.mp4"
done

# offset cumulative: starts with first clip duration - xf
# Build filter chain: [0:v][1:v]xfade=duration=xf:offset=O[v01];[v01][2:v]xfade=...
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

echo ">>> xfade filter chain built ($((${#clips[@]})) clips)"

# Total video duration: sum(dur) - (N-1)*xf
total_dur=$(awk -v xf=$xf 'BEGIN{ s=0; n=0; for(i=1;i<ARGC;i++){s+=ARGV[i]; n++} print s - (n-1)*xf }' "${dur[@]}")
echo ">>> total video duration: ${total_dur}s"

# --- 4. Procedural music bed: 3 detuned sines, lowpassed, full-duration ---
# Output normalised to -22 LUFS so the VO above sits comfortably on top.
fadeout=$(awk -v t=$total_dur 'BEGIN{print t-2}')
"$FFMPEG" -y -f lavfi -t "$total_dur" -i "sine=frequency=110:duration=$total_dur" \
                         -f lavfi -t "$total_dur" -i "sine=frequency=164.81:duration=$total_dur" \
                         -f lavfi -t "$total_dur" -i "sine=frequency=220:duration=$total_dur" \
  -filter_complex "[0:a]volume=0.6[a0];[1:a]volume=0.4[a1];[2:a]volume=0.3[a2];[a0][a1][a2]amix=inputs=3:duration=longest,lowpass=f=900,aresample=44100,loudnorm=I=-22:TP=-2:LRA=7,afade=t=in:st=0:d=2,afade=t=out:st=${fadeout}:d=2[aout]" \
  -map "[aout]" -c:a aac -b:a 96k "$WORK/music.m4a"

# --- 5. Mix VO loud over music quiet, no sidechain (simpler + reliable) ---
# VO normalised to -16 LUFS so investor-grade loudness; music sits ~10 dB below.
"$FFMPEG" -y -i "$VO" -i "$WORK/music.m4a" \
  -filter_complex "[0:a]adelay=600|600,loudnorm=I=-16:TP=-1.5:LRA=11[vo];[1:a]volume=0.35[mus];[vo][mus]amix=inputs=2:duration=first:dropout_transition=2,atrim=0:$total_dur,asetpts=PTS-STARTPTS[aout]" \
  -map "[aout]" -c:a aac -b:a 128k "$WORK/audio-mixed.m4a"

# --- 6. Final assemble: video xfade chain + mixed audio ---
"$FFMPEG" -y $inputs -i "$WORK/audio-mixed.m4a" \
  -filter_complex "$filter" \
  -map "[vout]" -map "${#clips[@]}:a" \
  -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -r 25 \
  -c:a aac -b:a 128k -movflags +faststart \
  -shortest \
  "$OUT"

DURATION=$({ "$FFMPEG" -i "$OUT" 2>&1 || true; } | grep -oE "Duration: [0-9:.]+" | sed 's/Duration: //') || true
SIZE=$(du -h "$OUT" | cut -f1)
echo ">>> ✓ Stitched: $OUT"
echo "    Duration: $DURATION"
echo "    Size:     $SIZE"

rm -rf "$WORK"
