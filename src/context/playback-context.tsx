"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { track as trackEvent } from "@/lib/analytics";
import { songs as baseSongs } from "@/lib/data";
import { getAudioEngine, AudioEngineTrack, AudioEngineState } from "@/lib/audio-engine";
import { useAuth } from "@/hooks/use-auth";
import { useStreamingAuth } from "@/hooks/use-streaming-auth";
import { spotifyPlayer } from "@/lib/spotify-player";
import { spotifyAPI } from "@/lib/spotify";
import {
  useBatteryAwareAudio,
  type BatteryAwareAudioSettings,
  type BatteryStatus,
} from "@/hooks/use-battery-aware-audio";
import { useAudioOptimization } from "@/hooks/use-audio-optimization";
import type { AudioOptimizationProfile } from "@/hooks/use-audio-optimization";

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
  isSpotifyReady: boolean;
  isSpotifyPremium: boolean;
  checkSpotifyPremium: () => Promise<boolean>;
  error: string | null;
  clearError: () => void;
  // Battery-aware audio properties
  batteryStatus: BatteryStatus;
  audioSettings: BatteryAwareAudioSettings;
  isBatterySaveMode: boolean;
  // Audio optimization properties
  optimizationProfile: AudioOptimizationProfile;
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
  // Battery-aware audio methods
  enableBatterySaveMode: () => void;
  disableBatterySaveMode: () => void;
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
  const [isSpotifyReady, setIsSpotifyReady] = useState<boolean>(false);
  const [isSpotifyPremium, setIsSpotifyPremium] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const { isAuthenticated: isSpotifyAuthenticated } = useStreamingAuth();

  // Battery-aware audio integration
  const { batteryStatus, audioSettings, enableBatterySaveMode, disableBatterySaveMode } =
    useBatteryAwareAudio();

  // Audio optimization integration
  const { optimizationProfile, applyOptimizations, getEngineOptimizationStatus } =
    useAudioOptimization();

  const isBatterySaveMode = audioSettings.autoSaveMode;

  const current = useMemo(() => queue[currentIndex] ?? null, [queue, currentIndex]);

  // Apply audio optimizations when dependencies change
  useEffect(() => {
    applyOptimizations();
  }, [applyOptimizations]);

  // Set up audio engine event listeners
  const handleNextInternal = useCallback(() => {
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
  }, [queue, repeat, currentPlaylistId]);

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
      setError(`Playback error: ${error.message}`);
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
      engine.removeEventListener("stateChange", handleStateChange);
      engine.removeEventListener("trackEnd", handleTrackEnd);
      engine.removeEventListener("ready", handleReady);
      engine.removeEventListener("error", handleError);
    };
  }, [handleNextInternal]);

  // Initialize Spotify player when authenticated
  useEffect(() => {
    if (isSpotifyAuthenticated) {
      // Get access token from cookies
      const accessToken =
        typeof window !== "undefined"
          ? document.cookie
              .split("; ")
              .find((row) => row.startsWith("sp_access="))
              ?.split("=")[1]
          : null;

      if (accessToken) {
        // Check if user has Spotify Premium
        spotifyAPI
          .isUserPremium()
          .then((isPremium) => {
            setIsSpotifyPremium(isPremium);

            if (isPremium) {
              spotifyPlayer
                .initializePlayer(accessToken, (state: any) => {
                  if (state) {
                    setIsPlaying(!state.paused);
                    setProgress(state.position / 1000); // Convert to seconds
                    setDuration(state.duration / 1000);

                    if (state.track_window?.current_track) {
                      const track = state.track_window.current_track;
                      // Update current track if needed
                    }
                  }
                })
                .then((connected) => {
                  if (connected) {
                    setIsSpotifyReady(true);
                    spotifyPlayer.transferPlayback();
                  } else {
                    setError("Failed to connect to Spotify. Please try again.");
                  }
                })
                .catch((error) => {
                  console.error("Spotify player initialization error:", error);
                  setError("Failed to initialize Spotify player. Please try again.");
                });
            } else {
              // User is not Premium, but we still want to show the player
              setIsSpotifyReady(true);
            }
          })
          .catch((error) => {
            console.error("Error checking Spotify Premium status:", error);
            setError("Failed to verify Spotify account status. Please try again.");
          });
      }
    }

    return () => {
      spotifyPlayer.disconnect();
    };
  }, [isSpotifyAuthenticated]);

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
  }, [current, isReady, isPlaying, duration]);

  // Cleanup interval (keeping for potential fallback)
  useEffect(() => {
    const id = intervalRef.current;
    return () => {
      if (id) clearInterval(id as any);
    };
  }, []);

  // Apply battery optimizations to audio engine
  useEffect(() => {
    if (!isReady) return;

    const audioEngine = getAudioEngine();
    audioEngine.applyBatteryOptimizations(audioSettings);

    // Preload next track if settings allow
    if (audioSettings.preloadNext && !audioSettings.shouldReduceQuality) {
      const nextTrack = queue[currentIndex + 1];
      if (nextTrack) {
        const engineTrack: AudioEngineTrack = {
          id: nextTrack.id,
          title: nextTrack.title,
          artist: nextTrack.artist,
          uri: nextTrack.uri || `preview:${nextTrack.id}`,
          duration: nextTrack.duration || 180,
          provider: nextTrack.provider || "preview",
          preview_url: nextTrack.preview_url,
        };
        audioEngine.preloadTrack(engineTrack);
      }
    }
  }, [audioSettings, isReady, currentIndex, queue]);

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
      // If Spotify is ready and track has Spotify URI, use Spotify player
      if (isSpotifyReady && isSpotifyPremium && current.provider === "spotify" && current.uri) {
        const success = await spotifyPlayer.playTrack(current.uri);
        if (success) {
          setIsPlaying(true);
          return;
        }
      }

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
      // If Spotify is ready and user has Premium, use Spotify player
      if (isSpotifyReady && isSpotifyPremium) {
        await spotifyPlayer.resume();
      } else {
        await getAudioEngine().play();
      }
      setIsPlaying(true);
    }
  };

  const pause = async () => {
    if (!isReady) return;

    // If Spotify is ready and user has Premium, use Spotify player
    if (isSpotifyReady && isSpotifyPremium) {
      await spotifyPlayer.pause();
    } else {
      await getAudioEngine().pause();
    }
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

  // handleNextInternal is defined above with useCallback

  const next = async () => {
    // If Spotify is ready and user has Premium, use Spotify player
    if (isSpotifyReady && isSpotifyPremium) {
      await spotifyPlayer.nextTrack();
    }

    handleNextInternal();
  };

  const previous = async () => {
    setProgress(0);

    // If Spotify is ready and user has Premium, use Spotify player
    if (isSpotifyReady && isSpotifyPremium) {
      await spotifyPlayer.previousTrack();
    }

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

    // If Spotify is ready and user has Premium, use Spotify player
    if (isSpotifyReady && isSpotifyPremium) {
      await spotifyPlayer.seek(clamped * 1000); // Convert to milliseconds
    } else {
      await getAudioEngine().seek(clamped);
    }

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

    // If Spotify is ready, use Spotify player
    if (isSpotifyReady) {
      await spotifyPlayer.setVolume(clampedVolume);
    } else {
      await getAudioEngine().setVolume(clampedVolume);
    }

    setVolumeState(clampedVolume);
  };

  const playTrackAt = async (index: number, tracks?: Track[]) => {
    if (tracks) setQueueState(tracks);
    setCurrentIndex(index);
    setProgress(0);

    const targetTrack = (tracks ?? queue)[index];
    if (targetTrack && isReady) {
      // If Spotify is ready and user has Premium and track has Spotify URI, use Spotify player
      if (
        isSpotifyReady &&
        isSpotifyPremium &&
        targetTrack.provider === "spotify" &&
        targetTrack.uri
      ) {
        const success = await spotifyPlayer.playTrack(targetTrack.uri);
        if (success) {
          setIsPlaying(true);
          return;
        }
      }

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

  const checkSpotifyPremium = async (): Promise<boolean> => {
    try {
      const isPremium = await spotifyAPI.isUserPremium();
      setIsSpotifyPremium(isPremium);
      return isPremium;
    } catch (error) {
      console.error("Error checking Spotify Premium status:", error);
      return false;
    }
  };

  const clearError = () => {
    setError(null);
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
    isSpotifyReady,
    isSpotifyPremium,
    checkSpotifyPremium,
    error,
    clearError,
    // Battery-aware audio properties
    batteryStatus,
    audioSettings,
    isBatterySaveMode,
    // Audio optimization properties
    optimizationProfile,
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
    // Battery-aware audio methods
    enableBatterySaveMode,
    disableBatterySaveMode,
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("usePlayback must be used within PlaybackProvider");
  return ctx;
}
