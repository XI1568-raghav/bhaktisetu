'use client';
export default function YouTubeDarshanPlayer({
  videoId,
  channelId,
  attribution,
}: { videoId?: string | null; channelId?: string | null; attribution?: string | null }) {
  const src = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&controls=1&rel=0`
    : channelId
    ? `https://www.youtube.com/embed/live_stream?channel=${channelId}`
    : null;
  if (!src) return <div className="aspect-video bg-surface-100 flex items-center justify-center text-surface-400">Stream offline</div>;
  return (
    <div className="space-y-2">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={src}
          className="w-full h-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Live darshan"
        />
      </div>
      {attribution && (
        <p className="text-xs text-surface-500">Live source: {attribution}. Operated by temple trust.</p>
      )}
    </div>
  );
}
