'use client';

import { useState } from 'react';
import {
  Play,
  Maximize,
  Minimize,
  Settings,
  Eye,
  Lock,
  Clock,
  Video,
  MapPin,
  ChevronDown,
} from 'lucide-react';

export interface DarshanPlayerProps {
  streamUrl: string | null;
  templeName: string;
  templeSlug: string;
  isLive: boolean;
  viewerCount: number;
  isPremium?: boolean;
  currentEvent?: string;
  scheduledStart?: string | null;
  templeCity?: string;
  templeDeity?: string;
  templeImage?: string | null;
}

/**
 * Detect if a URL is a YouTube embed URL.
 */
function isYouTubeEmbed(url: string): boolean {
  return url.includes('youtube.com/embed') || url.includes('youtube-nocookie.com/embed');
}

export default function DarshanPlayer({
  streamUrl,
  templeName,
  templeSlug,
  isLive,
  viewerCount,
  isPremium = false,
  currentEvent,
  scheduledStart,
  templeCity,
  templeDeity,
  templeImage,
}: DarshanPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Premium lock overlay
  if (isPremium) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-surface-900 aspect-video">
        {/* Background placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface-800 to-surface-900">
          {templeImage && (
            <img
              src={templeImage}
              alt={templeName}
              className="w-full h-full object-cover opacity-30 blur-sm"
            />
          )}
        </div>

        {/* Premium lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-temple-gold/20 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-temple-gold" />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">Premium Darshan</h3>
          <p className="text-surface-400 text-sm text-center max-w-xs mb-4">
            Upgrade to Poojly Premium for exclusive HD darshan from{' '}
            {templeName}
          </p>
          <a
            href="/pricing"
            className="px-6 py-2.5 bg-gradient-to-r from-temple-gold to-saffron-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Upgrade to Premium
          </a>
        </div>

        {/* Temple name at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-semibold text-sm">{templeName}</h4>
              {templeCity && (
                <p className="text-surface-400 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {templeCity}
                </p>
              )}
            </div>
            <span className="text-xs font-bold text-temple-gold bg-temple-gold/10 px-2 py-1 rounded-full">
              PREMIUM
            </span>
          </div>
        </div>
      </div>
    );
  }

  // "Stream starting soon" state
  if (!isLive && scheduledStart) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-surface-900 aspect-video">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-800 to-surface-900" />

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-saffron-500/10 flex items-center justify-center mb-4 animate-pulse">
            <Clock className="w-8 h-8 text-saffron-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">Stream Starting Soon</h3>
          <p className="text-surface-400 text-sm text-center mb-2">
            {templeName}
          </p>
          <div className="flex items-center gap-2 text-saffron-400 font-semibold text-sm">
            <Clock className="w-4 h-4" />
            Scheduled: {scheduledStart}
          </div>
          {currentEvent && (
            <span className="mt-3 bg-saffron-600/20 text-saffron-300 text-xs font-medium px-3 py-1 rounded-full">
              {currentEvent}
            </span>
          )}
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-semibold text-sm">{templeName}</h4>
              {templeCity && (
                <p className="text-surface-400 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {templeCity}
                </p>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 bg-surface-700 text-surface-200 text-xs font-bold px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              {scheduledStart}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Live / playable state — YouTube iframe or fallback
  const hasYouTubeStream = streamUrl && isYouTubeEmbed(streamUrl);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-surface-900 ${
        isFullscreen ? 'fixed inset-0 z-[100] rounded-none' : 'aspect-video'
      }`}
    >
      {/* YouTube iframe player */}
      {hasYouTubeStream && isPlaying ? (
        <iframe
          src={`${streamUrl}&autoplay=1&mute=0`}
          title={`Live Darshan - ${templeName}`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          frameBorder="0"
        />
      ) : (
        /* Video area placeholder / pre-play state */
        <div className="absolute inset-0 bg-gradient-to-br from-surface-800 to-surface-900">
          {templeImage && (
            <img
              src={templeImage}
              alt={templeName}
              className="w-full h-full object-cover opacity-40 transition-opacity"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setIsPlaying(true)}
              className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 hover:scale-110 transition-all backdrop-blur-sm group"
              aria-label="Play live darshan stream"
            >
              <Play className="w-8 h-8 text-white ml-1 group-hover:text-saffron-300 transition-colors" />
            </button>
          </div>
          {/* "Click to watch" hint */}
          {streamUrl && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
              <span className="text-white/70 text-sm font-medium bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm">
                Click to watch live darshan
              </span>
            </div>
          )}
        </div>
      )}

      {/* Top overlays — only show when not playing YouTube */}
      {!(hasYouTubeStream && isPlaying) && (
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
          {/* Live badge */}
          {isLive && (
            <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-red-600/30">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}

          {/* Viewer count */}
          {isLive && viewerCount > 0 && (
            <div className="flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
              <Eye className="w-3.5 h-3.5" />
              {viewerCount.toLocaleString('en-IN')} watching
            </div>
          )}
        </div>
      )}

      {/* Current event badge — only show when not playing YouTube */}
      {!(hasYouTubeStream && isPlaying) && currentEvent && isLive && (
        <div className="absolute top-12 left-3">
          <span className="bg-saffron-600/80 text-white text-xs font-medium px-2.5 py-1 rounded-md backdrop-blur-sm">
            {currentEvent}
          </span>
        </div>
      )}

      {/* Bottom controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 ${hasYouTubeStream && isPlaying ? 'opacity-0 hover:opacity-100 transition-opacity' : ''}`}>
        <div className="flex items-end justify-between">
          {/* Temple info */}
          <div>
            <h4 className="text-white font-semibold">{templeName}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              {templeCity && (
                <p className="text-surface-300 text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {templeCity}
                </p>
              )}
              {templeDeity && (
                <span className="text-xs text-surface-400">
                  {templeDeity}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="bg-black/50 text-white p-1.5 rounded-lg backdrop-blur-sm hover:bg-black/70 transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
