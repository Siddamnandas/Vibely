'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, PanInfo, useReducedMotion } from 'framer-motion';
import { 
  ChevronDown, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Share2,
  Heart
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlayback } from '@/context/playback-context';
import { useRegen } from '@/context/regen-context';
import { track as trackEvent } from '@/lib/analytics';

export function FullPlayer({ onClose, isVisible }: { onClose: () => void; isVisible: boolean }) {
  const { current, isPlaying, togglePlay, next, previous, progress, duration, setRepeat, seek, currentIndex, queue, currentPlaylistId } = usePlayback();
  const { jobs } = useRegen();
  const prefersReduced = useReducedMotion();
  const [displayCover, setDisplayCover] = useState<string | null>(null);
  const lastTrackId = useRef<string | null>(null);
  useEffect(() => {
    if (!current) return;
    if (lastTrackId.current !== current.id) {
      const updated = currentPlaylistId ? jobs[currentPlaylistId]?.rows[current.id]?.newCoverUrl : undefined;
      setDisplayCover(updated ?? current.coverUrl);
      lastTrackId.current = current.id;
    }
  }, [current, currentPlaylistId, jobs]);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isLiked, setIsLiked] = useState(false);

  // keep provider's repeat in sync
  const handleRepeatCycle = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
    setRepeat(nextMode);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSwipe = (event: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      if (info.offset.x > 0) {
        const fromId = queue[currentIndex]?.id;
        const toIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
        const toId = queue[toIndex]?.id;
        trackEvent('full_player_swiped', { direction: 'prev', from_track_id: fromId, to_track_id: toId });
        previous();
      } else {
        const fromId = queue[currentIndex]?.id;
        const toIndex = (currentIndex + 1) % queue.length;
        const toId = queue[toIndex]?.id;
        trackEvent('full_player_swiped', { direction: 'next', from_track_id: fromId, to_track_id: toId });
        next();
      }
    }
  };

  const handleShare = () => {
    trackEvent('share_opened', { track_id: current?.id, playlist_id: currentPlaylistId });
    // Simulate immediate completion via system share
    trackEvent('share_completed', { track_id: current?.id, playlist_id: currentPlaylistId, destination: 'system' });
  };

  const handleProgressChange = (value: number[]) => {
    seek(value[0]);
  };

  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isVisible, onClose]);

  if (!current || !isVisible) return null;

  const sheetMotion = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18 } }
    : { initial: { y: '100%', opacity: 0.9, scale: 0.98 }, animate: { y: 0, opacity: 1, scale: 1 }, exit: { y: '100%', opacity: 0.9, scale: 0.98 }, transition: { type: 'spring', stiffness: 320, damping: 32 } };

  const backdropMotion = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { type: 'spring', stiffness: 320, damping: 32 } };

  return (
    <>
      {/* Dimmed/blurred backdrop */}
      <motion.div
        {...backdropMotion}
        className="full-player-backdrop fixed inset-0 z-[59]"
        style={{ background: 'rgba(0,0,0,var(--backdrop-alpha, 0.35))', backdropFilter: 'blur(var(--backdrop-blur, 6px))' }}
        onClick={onClose}
      />

      <motion.div
        {...sheetMotion}
        className="fixed inset-0 bg-[#0E0F12] z-[60] overflow-hidden"
      >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          <ChevronDown size={24} />
        </Button>
        <div className="text-center">
          <p className="text-white/70 text-sm">Playing from</p>
          <p className="text-white font-medium">Playlist</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          className="text-white hover:bg-white/10"
        >
          <Share2 size={20} />
        </Button>
      </div>

      {/* Main Content - Swipeable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleSwipe}
        dragElastic={0.2}
        className="flex-1 flex flex-col items-center justify-center p-8"
      >
        {/* Large AI Cover */}
        <div className="relative w-80 h-80 rounded-3xl overflow-hidden shadow-2xl mb-8">
          <Image src={displayCover || current.coverUrl} alt={current.title} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* Song Info */}
        <div className="text-center mb-8 max-w-sm">
          <h1 className="text-2xl font-black text-white mb-2 truncate">{current.title}</h1>
          <p className="text-white/70 text-lg truncate">{current.artist}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-sm mb-2">
          <Slider
            value={[progress]}
            onValueChange={handleProgressChange}
            max={duration}
            step={1}
            className="w-full"
          />
        </div>

        {/* Time Display */}
        <div className="flex justify-between w-full max-w-sm text-white/60 text-sm mb-8">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-8 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={previous}
            aria-label="Previous track"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <SkipBack size={32} />
          </Button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="bg-white text-black rounded-full p-4 hover:bg-white/90 transition-colors shadow-xl"
          >
            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
          </motion.button>

          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            aria-label="Next track"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <SkipForward size={32} />
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-between w-full max-w-xs">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsShuffleOn(!isShuffleOn)}
            aria-label="Toggle shuffle"
            className={`${
              isShuffleOn ? 'text-[#9FFFA2]' : 'text-white/50'
            } hover:text-white`}
          >
            <Shuffle size={20} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsLiked(!isLiked)}
            aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
            className={`${
              isLiked ? 'text-red-500' : 'text-white/50'
            } hover:text-red-400`}
          >
            <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRepeatCycle}
            aria-label="Cycle repeat mode"
            className={`${
              repeatMode !== 'off' ? 'text-[#9FFFA2]' : 'text-white/50'
            } hover:text-white relative`}
          >
            <Repeat size={20} />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[10px] bg-[#9FFFA2] text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">
                1
              </span>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Swipe Hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-sm">
        Swipe left or right to change tracks
      </div>
    </motion.div>
    </>
  );
}
