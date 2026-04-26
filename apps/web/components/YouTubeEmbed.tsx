interface YouTubeEmbedProps {
 url: string;
 title?: string;
}

/**
 * Extract the 11-char YouTube video ID from a watch / youtu.be / embed URL.
 * Returns null if the URL doesn't look like a YouTube URL.
 */
function getYouTubeId(url: string): string | null {
 const patterns = [
 /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
 /youtu\.be\/([a-zA-Z0-9_-]{11})/,
 /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
 ];
 for (const re of patterns) {
 const m = url.match(re);
 if (m) return m[1] ?? null;
 }
 return null;
}

export function YouTubeEmbed({ url, title }: YouTubeEmbedProps) {
 const id = getYouTubeId(url);
 if (!id) return null;

 return (
 <div className="bg-white rounded-xl overflow-hidden border border-surface-100">
 <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
 <iframe
 className="absolute inset-0 w-full h-full"
 src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
 title={title ?? "YouTube video"}
 frameBorder="0"
 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
 allowFullScreen
 loading="lazy"
 />
 </div>
 </div>
 );
}
