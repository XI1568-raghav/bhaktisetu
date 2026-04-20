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

const QUALITY_OPTIONS = ['Auto', '1080p', '720p', '480p'] as const;

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
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
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

  // Live / playable state
  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-surface-900 ${
        isFullscreen ? 'fixed inset-0 z-[100] rounded-none' : 'aspect-video'
      }`}
    >
      {/* Video area placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-surface-800 to-surface-900">
        {templeImage && (
          <img
            src={templeImage}
            alt={templeName}
            className={`w-full h-full object-cover ${isPlaying ? 'opacity-80' : 'opacity-40'} transition-opacity`}
          />
        )}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setIsPlaying(true)}
              className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 hover:scale-110 transition-all backdrop-blur-sm"
              aria-label="Play stream"
            >
              <Play className="w-7 h-7 text-white ml-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* Top overlays */}
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

      {/* Current event badge */}
      {currentEvent && isLive && (
        <div className="absolute top-12 left-3">
          <span className="bg-saffron-600/80 text-white text-xs font-medium px-2.5 py-1 rounded-md backdrop-blur-sm">
            {currentEvent}
          </span>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
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
            {/* Quality selector */}
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="flex items-center gap-1 bg-black/50 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg backdrop-blur-sm hover:bg-black/70 transition-colors"
                aria-label="Quality settings"
              >
                <Settings className="w-3.5 h-3.5" />
                {selectedQuality}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-surface-800 rounded-lg border border-surface-700 overflow-hidden shadow-xl min-w-[120px]">
                  {QUALITY_OPTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setSelectedQuality(q);
                        setShowQualityMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                        selectedQuality === q
                          ? 'text-saffron-400 bg-saffron-500/10'
                          : 'text-surface-300 hover:text-white hover:bg-surface-700'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
