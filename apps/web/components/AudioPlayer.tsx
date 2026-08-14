'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
 Play,
 Pause,
 Volume2,
 VolumeX,
 Music,
 ChevronUp,
 ChevronDown,
} from 'lucide-react';

export interface AudioPlayerProps {
 title: string;
 artist?: string;
 audioUrl: string | null;
 imageUrl?: string | null;
 duration: number; // seconds
 deity?: string | null;
 type?: string;
 onEnded?: () => void;
}

function formatTime(seconds: number): string {
 if (!seconds || isNaN(seconds)) return '0:00';
 const m = Math.floor(seconds / 60);
 const s = Math.floor(seconds % 60);
 return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
 title,
 artist,
 audioUrl,
 imageUrl,
 duration,
 deity,
 type,
 onEnded,
}: AudioPlayerProps) {
 const audioRef = useRef<HTMLAudioElement | null>(null);
 const progressRef = useRef<HTMLDivElement>(null);

 const [isPlaying, setIsPlaying] = useState(false);
 const [currentTime, setCurrentTime] = useState(0);
 const [audioDuration, setAudioDuration] = useState(duration);
 const [volume, setVolume] = useState(0.75);
 const [isMuted, setIsMuted] = useState(false);
 const [isExpanded, setIsExpanded] = useState(true);

 // Waveform bar heights for CSS visualization
 const barCount = 32;
 const [barHeights] = useState(() =>
 Array.from({ length: barCount }, () => 20 + Math.random() * 80)
 );

 useEffect(() => {
 if (!audioUrl) return;
 const audio = new Audio(audioUrl);
 audioRef.current = audio;

 audio.volume = volume;

 const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
 const handleLoadedMetadata = () => {
 if (audio.duration && isFinite(audio.duration)) {
 setAudioDuration(audio.duration);
 }
 };
 const handleEnded = () => {
 setIsPlaying(false);
 setCurrentTime(0);
 onEnded?.();
 };

 audio.addEventListener('timeupdate', handleTimeUpdate);
 audio.addEventListener('loadedmetadata', handleLoadedMetadata);
 audio.addEventListener('ended', handleEnded);

 return () => {
 audio.pause();
 audio.removeEventListener('timeupdate', handleTimeUpdate);
 audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
 audio.removeEventListener('ended', handleEnded);
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [audioUrl]);

 useEffect(() => {
 if (audioRef.current) {
 audioRef.current.volume = isMuted ? 0 : volume;
 }
 }, [volume, isMuted]);

 const togglePlay = useCallback(() => {
 if (!audioRef.current) return;
 if (isPlaying) {
 audioRef.current.pause();
 } else {
 audioRef.current.play().catch(() => {});
 }
 setIsPlaying(!isPlaying);
 }, [isPlaying]);

 const handleSeek = useCallback(
 (e: React.MouseEvent<HTMLDivElement>) => {
 if (!progressRef.current || !audioRef.current) return;
 const rect = progressRef.current.getBoundingClientRect();
 const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
 const seekTime = ratio * audioDuration;
 audioRef.current.currentTime = seekTime;
 setCurrentTime(seekTime);
 },
 [audioDuration]
 );

 const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

 // No audio URL — placeholder
 if (!audioUrl) {
 return (
 <div className="bg-gradient-to-r from-saffron-50 to-amber-50 rounded-2xl p-6 border border-saffron-100">
 <div className="flex items-center gap-4">
 <div className="w-16 h-16 rounded-xl bg-saffron-100 flex items-center justify-center shrink-0">
 <Music className="w-7 h-7 text-saffron-400" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 {type && (
 <span className="text-xs font-semibold text-saffron-600 bg-saffron-100 px-2 py-0.5 rounded-full">
 {type}
 </span>
 )}
 {deity && (
 <span className="text-xs text-surface-400">{deity}</span>
 )}
 </div>
 <h3 className="font-bold text-surface-900 truncate">{title}</h3>
 {artist && <p className="text-sm text-surface-500">{artist}</p>}
 </div>
 </div>
 <div className="mt-4 flex items-center justify-center gap-2 text-saffron-500 bg-white/60 rounded-xl py-3">
 <Music className="w-4 h-4" />
 <span className="text-sm font-medium">Audio coming soon</span>
 </div>
 </div>
 );
 }

 return (
 <div className="bg-white rounded-2xl border border-surface-100 shadow-sm overflow-hidden">
 {/* Expand/collapse toggle */}
 <button
 onClick={() => setIsExpanded(!isExpanded)}
 className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-50 transition-colors"
 aria-label={isExpanded ? 'Collapse player' : 'Expand player'}
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-saffron-200 to-amber-100 flex items-center justify-center shrink-0">
 {imageUrl ? (
 <img
 src={imageUrl}
 alt={title}
 className="w-full h-full object-cover rounded-lg"
 />
 ) : (
 <Music className="w-5 h-5 text-saffron-400" />
 )}
 </div>
 <div className="text-left min-w-0">
 <div className="text-sm font-semibold text-surface-900 truncate">
 {title}
 </div>
 <div className="text-xs text-surface-500 truncate">
 {artist}
 {deity ? ` \u00b7 ${deity}` : ''}
 </div>
 </div>
 </div>
 {isExpanded ? (
 <ChevronDown className="w-4 h-4 text-surface-400 shrink-0" />
 ) : (
 <ChevronUp className="w-4 h-4 text-surface-400 shrink-0" />
 )}
 </button>

 {isExpanded && (
 <div className="px-5 pb-5 space-y-4">
 {/* Type badge */}
 {type && (
 <div className="flex items-center gap-2">
 <span className="text-xs font-semibold text-saffron-600 bg-saffron-50 px-2 py-0.5 rounded-full">
 {type}
 </span>
 {deity && (
 <span className="text-xs text-surface-400">{deity}</span>
 )}
 </div>
 )}

 {/* Waveform visualization */}
 <div className="flex items-end justify-center gap-[2px] h-16 px-2">
 {barHeights.map((h, i) => {
 const barProgress = (i / barCount) * 100;
 const isPast = barProgress < progress;
 return (
 <div
 key={i}
 className={`w-1.5 rounded-full transition-all duration-150 ${
 isPast
 ? 'bg-gradient-to-t from-saffron-600 to-saffron-400'
 : 'bg-surface-200'
 } ${isPlaying && isPast ? 'animate-pulse' : ''}`}
 style={{
 height: `${h}%`,
 animationDelay: isPlaying ? `${i * 50}ms` : undefined,
 animationDuration: isPlaying ? '600ms' : undefined,
 }}
 />
 );
 })}
 </div>

 {/* Play button (large, center) */}
 <div className="flex justify-center">
 <button
 onClick={togglePlay}
 className="w-14 h-14 rounded-full bg-gradient-to-br from-saffron-500 to-saffron-600 text-white flex items-center justify-center hover:from-saffron-600 hover:to-saffron-700 transition-all shadow-lg shadow-saffron-200 active:scale-95"
 aria-label={isPlaying ? 'Pause' : 'Play'}
 >
 {isPlaying ? (
 <Pause className="w-6 h-6" />
 ) : (
 <Play className="w-6 h-6 ml-0.5" />
 )}
 </button>
 </div>

 {/* Progress bar */}
 <div className="space-y-1">
 <div
 ref={progressRef}
 onClick={handleSeek}
 className="group h-2 bg-surface-100 rounded-full cursor-pointer relative overflow-hidden"
 role="slider"
 aria-label="Audio progress"
 aria-valuemin={0}
 aria-valuemax={audioDuration}
 aria-valuenow={currentTime}
 >
 <div
 className="absolute inset-y-0 left-0 bg-gradient-to-r from-saffron-500 to-saffron-400 rounded-full transition-[width] duration-100"
 style={{ width: `${progress}%` }}
 />
 <div
 className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-saffron-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
 style={{ left: `calc(${progress}% - 7px)` }}
 />
 </div>
 <div className="flex justify-between text-xs text-surface-400 tabular-nums">
 <span>{formatTime(currentTime)}</span>
 <span>{formatTime(audioDuration)}</span>
 </div>
 </div>

 {/* Volume control */}
 <div className="flex items-center gap-2">
 <button
 onClick={() => setIsMuted(!isMuted)}
 className="text-surface-400 hover:text-saffron-600 transition-colors"
 aria-label={isMuted ? 'Unmute' : 'Mute'}
 >
 {isMuted || volume === 0 ? (
 <VolumeX className="w-4 h-4" />
 ) : (
 <Volume2 className="w-4 h-4" />
 )}
 </button>
 <input
 type="range"
 min={0}
 max={1}
 step={0.01}
 value={isMuted ? 0 : volume}
 onChange={(e) => {
 setVolume(parseFloat(e.target.value));
 if (isMuted) setIsMuted(false);
 }}
 className="w-24 h-1.5 accent-saffron-500 rounded-full cursor-pointer"
 aria-label="Volume"
 />
 </div>
 </div>
 )}

 {/* Mini mode (collapsed) — thin progress bar */}
 {!isExpanded && (
 <div className="px-5 pb-3 flex items-center gap-3">
 <button
 onClick={togglePlay}
 className="w-8 h-8 rounded-full bg-gradient-to-br from-saffron-500 to-saffron-600 text-white flex items-center justify-center shrink-0 active:scale-95"
 aria-label={isPlaying ? 'Pause' : 'Play'}
 >
 {isPlaying ? (
 <Pause className="w-3.5 h-3.5" />
 ) : (
 <Play className="w-3.5 h-3.5 ml-0.5" />
 )}
 </button>
 <div
 ref={progressRef}
 onClick={handleSeek}
 className="flex-1 h-1.5 bg-surface-100 rounded-full cursor-pointer overflow-hidden"
 >
 <div
 className="h-full bg-saffron-600 rounded-full transition-[width] duration-100"
 style={{ width: `${progress}%` }}
 />
 </div>
 <span className="text-xs text-surface-400 tabular-nums shrink-0">
 {formatTime(currentTime)} / {formatTime(audioDuration)}
 </span>
 </div>
 )}
 </div>
 );
}
