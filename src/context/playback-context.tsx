"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { track as trackEvent } from "@/lib/analytics";
import { songs as baseSongs } from "@/lib/data";
import { getAudioEngine, AudioEngineTrack, AudioEngineState } from "@/lib/audio-engine";
import { useAuth } from "@/hooks/use-auth";

export type Track = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  available?: boolean;
  provider?: "spotify" | "apple-music" | "preview";
  uri?: string;
  preview_url?: string;
  duration?: number;
};

type RepeatMode = "off" | "all" | "one";

type PlaybackContextType = {
  queue: Track[];
  currentIndex: number;
  current: Track | null;
  currentPlaylistId: string | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  isReady: boolean;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  setQueueWithPlaylist: (playlistId: string, tracks: Track[], startIndex?: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (to: number) => void;
  setShuffle: (on: boolean) => void;
  setRepeat: (mode: RepeatMode) => void;
  setVolume: (volume: number) => void;
  playTrackAt: (index: number, tracks?: Track[]) => void;
};

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueueState] = useState<Track[]>(
    baseSongs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: s.originalCoverUrl,
      available: true,
      provider: "preview" as const,
      preview_url: s.spotifyData?.preview_url || undefined,
      duration: s.duration || 180,
    })),
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(180);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isReady, setIsReady] = useState<boolean>(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  const current = useMemo(() => queue[currentIndex] ?? null, [queue, currentIndex]);

  // Set up audio engine event listeners
  useEffect(() => {
    const handleStateChange = (engineState: AudioEngineState) => {
      setIsPlaying(engineState.isPlaying);
      setProgress(engineState.position);
      setDuration(engineState.duration);
      setVolumeState(engineState.volume);
    };

    const handleTrackEnd = () => {
      handleNextInternal();
    };

    const handleReady = () => {
      setIsReady(true);
    };

    const handleError = (error: Error) => {
      console.error("Audio engine error:", error);
      // Fallback to next track on error
      handleNextInternal();
    };

    const audioEngine = getAudioEngine();
    
    // Only set up listeners on the client side
    if (typeof window !== "undefined") {
      audioEngine.addEventListener("stateChange", handleStateChange);
      audioEngine.addEventListener("trackEnd", handleTrackEnd);
      audioEngine.addEventListener("ready", handleReady);
      audioEngine.addEventListener("error", handleError);

      // Check if already ready
      if (audioEngine.isReady()) {
        setIsReady(true);
      }
    }

    return () => {
      const engine = getAudioEngine();
      engine.removeEventListener("stateChange");
      engine.removeEventListener("trackEnd");
      engine.removeEventListener("ready");
      engine.removeEventListener("error");
    };
  }, []);

  // Update audio engine when current track changes
  useEffect(() => {
    if (!current || !isReady) return;

    const engineTrack: AudioEngineTrack = {
      id: current.id,
      title: current.title,
      artist: current.artist,
      uri: current.uri || `preview:${current.id}`,
      duration: duration,
      provider: current.provider || "preview",
      preview_url: current.preview_url,
    };

    // Only play if we're supposed to be playing
    if (isPlaying) {
      getAudioEngine().playTrack(engineTrack);
    }
  }, [current, isReady]);

  // Cleanup interval (keeping for potential fallback)
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current as any);
    };
  }, []);

  const setQueue = (tracks: Track[], startIndex = 0) => {
    setQueueState(tracks);
    setCurrentIndex(Math.max(0, Math.min(startIndex, tracks.length - 1)));
    setProgress(0);
  };
  const setQueueWithPlaylist = (playlistId: string, tracks: Track[], startIndex = 0) => {
    setCurrentPlaylistId(playlistId);
    setQueue(tracks, startIndex);
  };

  const play = async () => {
    if (!isReady) return;

    if (current) {
      const engineTrack: AudioEngineTrack = {
        id: current.id,
        title: current.title,
        artist: current.artist,
        uri: current.uri || `preview:${current.id}`,
        duration: current.duration || 180,
        provider: current.provider || "preview",
        preview_url: current.preview_url,
      };

      const success = await getAudioEngine().playTrack(engineTrack);
      if (success) {
        setIsPlaying(true);
      }
    } else {
      await getAudioEngine().play();
      setIsPlaying(true);
    }
  };

  const pause = async () => {
    if (!isReady) return;
    await getAudioEngine().pause();
    setIsPlaying(false);
  };

  const togglePlay = async () => {
    if (!isReady) return;

    const nextState = !isPlaying;

    if (nextState) {
      await play();
    } else {
      await pause();
    }

    // Haptics: medium on play, light on pause
    try {
      navigator?.vibrate?.(nextState ? 15 : 8);
    } catch {}

    trackEvent("track_play_pressed", {
      track_id: current?.id,
      playlist_id: currentPlaylistId,
      position: currentIndex,
    });
  };

  const handleNextInternal = () => {
    setProgress(0);
    setCurrentIndex((idx) => {
      const fromId = queue[idx]?.id;
      if (repeat === "one") return idx; // loop current
      const lastIndex = queue.length - 1;
      if (idx >= lastIndex) {
        if (repeat === "all") return 0;
        setIsPlaying(false);
        return idx; // stop at end
      }
      const toIndex = idx + 1;
      const toId = queue[toIndex]?.id;
      trackEvent("track_next", {
        from_track_id: fromId,
        to_track_id: toId,
        playlist_id: currentPlaylistId,
      });
      return toIndex;
    });
  };

  const next = () => handleNextInternal();

  const previous = () => {
    setProgress(0);
    setCurrentIndex((idx) => {
      const fromId = queue[idx]?.id;
      const toIndex = idx > 0 ? idx - 1 : queue.length - 1;
      const toId = queue[toIndex]?.id;
      trackEvent("track_prev", {
        from_track_id: fromId,
        to_track_id: toId,
        playlist_id: currentPlaylistId,
      });
      return toIndex;
    });
  };

  const seek = async (to: number) => {
    if (!isReady) return;

    const clamped = Math.max(0, Math.min(duration, to));
    await getAudioEngine().seek(clamped);
    setProgress(clamped);

    trackEvent("seek", {
      track_id: current?.id,
      from_ms: progress * 1000,
      to_ms: clamped * 1000,
    });
  };

  const setVolume = async (newVolume: number) => {
    if (!isReady) return;

    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    await getAudioEngine().setVolume(clampedVolume);
    setVolumeState(clampedVolume);
  };

  const playTrackAt = async (index: number, tracks?: Track[]) => {
    if (tracks) setQueueState(tracks);
    setCurrentIndex(index);
    setProgress(0);

    const targetTrack = (tracks ?? queue)[index];
    if (targetTrack && isReady) {
      const engineTrack: AudioEngineTrack = {
        id: targetTrack.id,
        title: targetTrack.title,
        artist: targetTrack.artist,
        uri: targetTrack.uri || `preview:${targetTrack.id}`,
        duration: targetTrack.duration || 180,
        provider: targetTrack.provider || "preview",
        preview_url: targetTrack.preview_url,
      };

      const success = await getAudioEngine().playTrack(engineTrack);
      if (success) {
        setIsPlaying(true);
      }
    }

    trackEvent("track_play_pressed", {
      position: index,
      track_id: targetTrack?.id,
      playlist_id: currentPlaylistId,
    });
  };

  const value: PlaybackContextType = {
    queue,
    currentIndex,
    current,
    currentPlaylistId,
    isPlaying,
    progress,
    duration,
    shuffle,
    repeat,
    volume,
    isReady,
    setQueue,
    setQueueWithPlaylist,
    play,
    pause,
    togglePlay,
    next,
    previous,
    seek,
    setShuffle,
    setRepeat,
    setVolume,
    playTrackAt,
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("usePlayback must be used within PlaybackProvider");
  return ctx;
}
