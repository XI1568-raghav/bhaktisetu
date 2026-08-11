# apps\web\components\YouTubeEmbed.tsx

- YouTubeEmbedProps · interface · L1-L4 — Defines the embed inputs: the YouTube URL to validate and an optional title for the iframe's accessible label.
- getYouTubeId · function · L10-L21 — Extracts the 11-character video ID from watch, youtu.be, or embed YouTube URLs and rejects anything that does not match those shapes.
- YouTubeEmbed · function · L23-L42 — Renders a responsive privacy-enhanced YouTube iframe when the URL yields a video ID, otherwise it renders nothing.
