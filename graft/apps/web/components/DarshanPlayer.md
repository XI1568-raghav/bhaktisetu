# apps\web\components\DarshanPlayer.tsx

- DarshanPlayerProps · interface · L15-L27 — Props contract describing everything the player needs to decide which stream state to show: stream URL, live/premium flags, scheduling, and temple display metadata.
- isYouTubeEmbed · function · L32-L34 — Guard that recognizes YouTube embed URLs so the player only iframes sources it can control via autoplay/mute query params.
- DarshanPlayer · function · L36-L276 — Renders the darshan viewing experience by branching across premium-locked, scheduled-soon, offline, and live states, embedding the YouTube stream muted until the user taps to unmute.
- toggleFullscreen · function · L52-L54 — Flips the player between inline and fixed full-viewport layout.
