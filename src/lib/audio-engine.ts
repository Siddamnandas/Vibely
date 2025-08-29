import { VibelyTrack } from "./data";
import type { BatteryAwareAudioSettings } from "@/hooks/use-battery-aware-audio";

// Types for audio engine
export interface AudioEngineTrack {
  id: string;
  title: string;
  artist: string;
  uri: string; // Spotify URI or Apple Music ID
  duration: number;
  preview_url?: string;
  provider: "spotify" | "apple-music" | "preview";
}

export interface AudioEngineState {
  isPlaying: boolean;
  currentTrack: AudioEngineTrack | null;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  batteryOptimized?: boolean;
  currentQuality?: "high" | "medium" | "low";
}

export interface AudioEngineEvents {
  stateChange: (state: AudioEngineState) => void;
  trackEnd: () => void;
  trackChange: (track: AudioEngineTrack) => void;
  error: (error: Error) => void;
  ready: () => void;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify: any;
    MusicKit: any;
  }
}

export class AudioEngine {
  private spotifyPlayer: any = null;
  private appleMusicPlayer: any = null;
  private currentProvider: "spotify" | "apple-music" | "preview" | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private state: AudioEngineState;
  private listeners: Partial<AudioEngineEvents> = {};
  private deviceId: string | null = null;
  private isSpotifySDKReady = false;
  private isAppleMusicReady = false;
  private batteryAwareSettings: BatteryAwareAudioSettings | null = null;
  private preloadedTracks: Map<string, HTMLAudioElement> = new Map();

  private isInitialized = false;

  constructor() {
    this.state = {
      isPlaying: false,
      currentTrack: null,
      position: 0,
      duration: 0,
      volume: 0.8,
      shuffle: false,
      repeat: "off",
      batteryOptimized: false,
      currentQuality: "high",
    };

    // Don't initialize immediately - wait for first use
  }

  /**
   * Initialize a specific provider directly (used by tests and runtime)
   */
  async initializeProvider(
    provider: "spotify" | "apple-music" | "preview",
    token?: string,
  ): Promise<boolean> {
    // Ensure we mark initialized for JSDOM/test environments too
    this.isInitialized = true;

    try {
      if (provider === "spotify") {
        const SpotifyGlobal = (globalThis as any).Spotify;
        if (!SpotifyGlobal || !SpotifyGlobal.Player) {
          console.warn("Spotify SDK not available");
          return false;
        }

        // Build player using provided token callback (tests pass a token)
        this.spotifyPlayer = new SpotifyGlobal.Player({
          name: "Vibely Player",
          getOAuthToken: (cb: (t: string) => void) => {
            if (token) cb(token);
            else cb(localStorage.getItem("spotify_access_token") || "");
          },
          volume: this.state.volume,
        });

        this.setupSpotifyEvents();
        this.isSpotifySDKReady = true;
        this.currentProvider = "spotify";
        try {
          const connected: boolean = await this.spotifyPlayer.connect();
          return !!connected;
        } catch (e) {
          console.error("Failed to connect Spotify player", e);
          return false;
        }
      }

      if (provider === "apple-music") {
        const MusicKitGlobal = (globalThis as any).MusicKit;
        if (!MusicKitGlobal) {
          console.warn("MusicKit not available");
          return false;
        }

        // In tests MusicKit.getInstance is mocked
        this.appleMusicPlayer = MusicKitGlobal.getInstance?.() ?? MusicKitGlobal.player;
        this.setupAppleMusicEvents();
        this.isAppleMusicReady = true;
        this.currentProvider = "apple-music";
        return true;
      }

      if (provider === "preview") {
        // Ensure audio element exists
        if (!this.audioElement) {
          try {
            this.audioElement = new Audio();
            this.setupAudioElementEvents();
          } catch (e) {
            console.error("Failed creating Audio element", e);
            return false;
          }
        }
        this.currentProvider = "preview";
        return true;
      }

      return false;
    } catch (error) {
      console.error("initializeProvider error", error);
      return false;
    }
  }

  /** Get currently active provider */
  getActiveProvider(): "spotify" | "apple-music" | "preview" | null {
    return this.currentProvider;
  }

  /** Resume playback (alias of play) */
  async resume(): Promise<void> {
    return this.play();
  }

  /** Get current playback state in a provider-agnostic shape */
  async getCurrentState(): Promise<{
    isPlaying: boolean;
    position: number;
    duration: number;
    currentTrack: { id: string; title: string; artist: string } | null;
  }> {
    switch (this.currentProvider) {
      case "spotify":
        if (this.spotifyPlayer?.getCurrentState) {
          try {
            const s = await this.spotifyPlayer.getCurrentState();
            return {
              isPlaying: !s?.paused,
              position: (s?.position ?? 0) / 1000,
              duration: (s?.duration ?? 0) / 1000,
              currentTrack: s?.track_window?.current_track
                ? {
                    id: s.track_window.current_track.id,
                    title: s.track_window.current_track.name,
                    artist: Array.isArray(s.track_window.current_track.artists)
                      ? s.track_window.current_track.artists.map((a: any) => a.name).join(", ")
                      : "",
                  }
                : null,
            };
          } catch {
            // fall through to state snapshot
          }
        }
        break;
      case "apple-music":
        if (this.appleMusicPlayer) {
          const item = this.appleMusicPlayer.nowPlayingItem;
          return {
            isPlaying:
              this.appleMusicPlayer.playbackState === (globalThis as any).MusicKit?.PlaybackStates?.playing,
            position: this.appleMusicPlayer.currentPlaybackTime ?? this.state.position,
            duration: (item?.playbackDuration ?? 0) / 1, // already in seconds in our state
            currentTrack: item
              ? { id: item.id, title: item.title, artist: item.artistName }
              : null,
          };
        }
        break;
      case "preview":
        if (this.audioElement) {
          return {
            isPlaying: !this.audioElement.paused,
            position: this.audioElement.currentTime,
            duration: this.audioElement.duration || 0,
            currentTrack: this.state.currentTrack
              ? {
                  id: this.state.currentTrack.id,
                  title: this.state.currentTrack.title,
                  artist: this.state.currentTrack.artist,
                }
              : null,
          };
        }
        break;
    }

    // Fallback to internal state snapshot
    return {
      isPlaying: this.state.isPlaying,
      position: this.state.position,
      duration: this.state.duration,
      currentTrack: this.state.currentTrack
        ? {
            id: this.state.currentTrack.id,
            title: this.state.currentTrack.title,
            artist: this.state.currentTrack.artist,
          }
        : null,
    };
  }

  /** Simple volume getter for tests */
  getVolume(): number {
    return this.state.volume;
  }

  /** Cleanup resources and reset */
  async cleanup(): Promise<void> {
    try {
      this.disconnect();
    } finally {
      this.currentProvider = null;
      this.deviceId = null;
      this.isSpotifySDKReady = false;
      this.isAppleMusicReady = false;
      // keep audio element allocated for preview reuse
    }
  }

  /**
   * Ensure SDKs are initialized before use
   */
  private async ensureInitialized() {
    if (!this.isInitialized && typeof window !== "undefined") {
      this.isInitialized = true;
      await this.initializeSDKs();
    }
  }

  /**
   * Initialize Spotify and Apple Music SDKs
   */
  private async initializeSDKs() {
    // Only initialize on the client side
    if (typeof window === "undefined") {
      console.log("AudioEngine: Skipping initialization on server side");
      return;
    }

    console.log("AudioEngine: Initializing on client side");
    this.isInitialized = true;

    // Initialize Spotify Web Playback SDK
    await this.initializeSpotifySDK();

    // Initialize Apple MusicKit
    await this.initializeAppleMusicSDK();

    // Create HTML audio element for preview playback
    try {
      this.audioElement = new Audio();
      this.setupAudioElementEvents();
    } catch (error) {
      console.error("Failed to create Audio element:", error);
    }
  }

  /**
   * Initialize Spotify Web Playback SDK
   */
  private async initializeSpotifySDK() {
    if (typeof window === "undefined") return;

    try {
      // Load Spotify SDK
      if (!window.Spotify) {
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.head.appendChild(script);

        await new Promise<void>((resolve) => {
          window.onSpotifyWebPlaybackSDKReady = () => {
            this.isSpotifySDKReady = true;
            resolve();
          };
        });
      }

      // Create Spotify player
      if (window.Spotify && this.isSpotifySDKReady) {
        const accessToken = localStorage.getItem("spotify_access_token");
        if (!accessToken) return;

        this.spotifyPlayer = new window.Spotify.Player({
          name: "Vibely Player",
          getOAuthToken: (cb: (token: string) => void) => {
            cb(accessToken);
          },
          volume: this.state.volume,
        });

        // Setup Spotify player events
        this.setupSpotifyEvents();

        // Connect to Spotify
        const success = await this.spotifyPlayer.connect();
        if (!success) {
          console.error("Failed to connect to Spotify");
        }
      }
    } catch (error) {
      console.error("Failed to initialize Spotify SDK:", error);
    }
  }

  /**
   * Initialize Apple MusicKit
   */
  private async initializeAppleMusicSDK() {
    if (typeof window === "undefined") return;

    try {
      // Load MusicKit
      if (!window.MusicKit) {
        const script = document.createElement("script");
        script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
        script.async = true;
        document.head.appendChild(script);

        await new Promise<void>((resolve) => {
          script.onload = () => resolve();
        });
      }

      if (window.MusicKit) {
        const developerToken = process.env.NEXT_PUBLIC_APPLE_MUSIC_DEVELOPER_TOKEN;

        if (!developerToken) {
          console.warn(
            "Apple Music developer token not configured. Skipping Apple Music initialization.",
          );
          return;
        }

        await window.MusicKit.configure({
          developerToken,
          app: {
            name: "Vibely",
            build: "1.0.0",
          },
        });

        this.appleMusicPlayer = window.MusicKit.getInstance();
        this.setupAppleMusicEvents();
        this.isAppleMusicReady = true;
      }
    } catch (error) {
      console.error("Failed to initialize Apple MusicKit:", error);
    }
  }

  /**
   * Setup Spotify player events
   */
  private setupSpotifyEvents() {
    if (!this.spotifyPlayer) return;

    this.spotifyPlayer.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("Spotify player ready with Device ID", device_id);
      this.deviceId = device_id;
      this.listeners.ready?.();
    });

    this.spotifyPlayer.addListener("not_ready", ({ device_id }: { device_id: string }) => {
      console.log("Device ID has gone offline", device_id);
    });

    this.spotifyPlayer.addListener("player_state_changed", (state: any) => {
      if (!state) return;

      this.state.isPlaying = !state.paused;
      this.state.position = state.position / 1000; // Convert to seconds
      this.state.duration = state.duration / 1000;

      if (state.track_window.current_track) {
        const track = state.track_window.current_track;
        this.state.currentTrack = {
          id: track.id,
          title: track.name,
          artist: track.artists.map((a: any) => a.name).join(", "),
          uri: track.uri,
          duration: track.duration_ms / 1000,
          provider: "spotify",
        };
        this.listeners.trackChange?.(this.state.currentTrack);
      }

      this.listeners.stateChange?.(this.state);
    });

    this.spotifyPlayer.addListener("initialization_error", ({ message }: { message: string }) => {
      this.listeners.error?.(new Error(`Spotify initialization error: ${message}`));
    });

    this.spotifyPlayer.addListener("authentication_error", ({ message }: { message: string }) => {
      this.listeners.error?.(new Error(`Spotify authentication error: ${message}`));
    });

    this.spotifyPlayer.addListener("account_error", ({ message }: { message: string }) => {
      this.listeners.error?.(new Error(`Spotify account error: ${message}`));
    });

    this.spotifyPlayer.addListener("playback_error", ({ message }: { message: string }) => {
      this.listeners.error?.(new Error(`Spotify playback error: ${message}`));
    });
  }

  /**
   * Setup Apple Music events
   */
  private setupAppleMusicEvents() {
    if (!this.appleMusicPlayer) return;

    this.appleMusicPlayer.addEventListener("playbackStateDidChange", () => {
      const playbackState = this.appleMusicPlayer.playbackState;
      this.state.isPlaying = playbackState === window.MusicKit.PlaybackStates.playing;

      if (this.appleMusicPlayer.nowPlayingItem) {
        const item = this.appleMusicPlayer.nowPlayingItem;
        this.state.currentTrack = {
          id: item.id,
          title: item.title,
          artist: item.artistName,
          uri: item.id,
          duration: item.playbackDuration / 1000,
          provider: "apple-music",
        };
        this.listeners.trackChange?.(this.state.currentTrack);
      }

      this.state.position = this.appleMusicPlayer.currentPlaybackTime;
      this.listeners.stateChange?.(this.state);
    });

    this.appleMusicPlayer.addEventListener("mediaItemDidChange", () => {
      if (this.appleMusicPlayer.nowPlayingItem) {
        const item = this.appleMusicPlayer.nowPlayingItem;
        this.state.currentTrack = {
          id: item.id,
          title: item.title,
          artist: item.artistName,
          uri: item.id,
          duration: item.playbackDuration / 1000,
          provider: "apple-music",
        };
        this.listeners.trackChange?.(this.state.currentTrack);
      }
    });

    this.appleMusicPlayer.addEventListener("playbackProgressDidChange", () => {
      this.state.position = this.appleMusicPlayer.currentPlaybackTime;
      this.listeners.stateChange?.(this.state);
    });
  }

  /**
   * Setup HTML audio element events for preview playback
   */
  private setupAudioElementEvents() {
    if (!this.audioElement) return;

    this.audioElement.addEventListener("loadedmetadata", () => {
      this.state.duration = this.audioElement!.duration;
      this.listeners.stateChange?.(this.state);
    });

    this.audioElement.addEventListener("timeupdate", () => {
      this.state.position = this.audioElement!.currentTime;
      this.listeners.stateChange?.(this.state);
    });

    this.audioElement.addEventListener("play", () => {
      this.state.isPlaying = true;
      this.listeners.stateChange?.(this.state);
    });

    this.audioElement.addEventListener("pause", () => {
      this.state.isPlaying = false;
      this.listeners.stateChange?.(this.state);
    });

    this.audioElement.addEventListener("ended", () => {
      this.state.isPlaying = false;
      this.listeners.trackEnd?.();
      this.listeners.stateChange?.(this.state);
    });

    this.audioElement.addEventListener("error", (e) => {
      this.listeners.error?.(new Error("Audio playback error"));
    });
  }

  /**
   * Play a track
   */
  async playTrack(track: AudioEngineTrack): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      this.currentProvider = track.provider;

      switch (track.provider) {
        case "spotify":
          return await this.playSpotifyTrack(track);
        case "apple-music":
          return await this.playAppleMusicTrack(track);
        case "preview":
          return await this.playPreviewTrack(track);
        default:
          throw new Error(`Unsupported provider: ${track.provider}`);
      }
    } catch (error) {
      console.error("Failed to play track:", error);
      this.listeners.error?.(error as Error);
      return false;
    }
  }

  /**
   * Play Spotify track
   */
  private async playSpotifyTrack(track: AudioEngineTrack): Promise<boolean> {
    if (!this.spotifyPlayer || !this.deviceId) {
      console.warn("Spotify player not ready");
      return false;
    }

    try {
      // Transfer playback to our device and start playing
      const accessToken = localStorage.getItem("spotify_access_token");
      if (!accessToken) return false;

      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          uris: [track.uri],
        }),
      });

      return true;
    } catch (error) {
      console.error("Failed to play Spotify track:", error);
      return false;
    }
  }

  /**
   * Play Apple Music track
   */
  private async playAppleMusicTrack(track: AudioEngineTrack): Promise<boolean> {
    if (!this.appleMusicPlayer || !this.isAppleMusicReady) {
      console.warn("Apple Music player not ready");
      return false;
    }

    try {
      await this.appleMusicPlayer.setQueue({ song: track.uri });
      await this.appleMusicPlayer.play();
      return true;
    } catch (error) {
      console.error("Failed to play Apple Music track:", error);
      return false;
    }
  }

  /**
   * Play preview track using HTML audio
   */
  private async playPreviewTrack(track: AudioEngineTrack): Promise<boolean> {
    if (!this.audioElement || !track.preview_url) {
      console.warn("Preview URL not available");
      return false;
    }

    try {
      this.audioElement.src = track.preview_url;
      await this.audioElement.play();

      this.state.currentTrack = track;
      this.listeners.trackChange?.(track);

      return true;
    } catch (error) {
      console.error("Failed to play preview track:", error);
      return false;
    }
  }

  /**
   * Play/pause toggle
   */
  async togglePlayback(): Promise<void> {
    if (this.state.isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  /**
   * Resume playback
   */
  async play(): Promise<void> {
    switch (this.currentProvider) {
      case "spotify":
        if (this.spotifyPlayer) {
          await this.spotifyPlayer.resume();
        }
        break;
      case "apple-music":
        if (this.appleMusicPlayer) {
          await this.appleMusicPlayer.play();
        }
        break;
      case "preview":
        if (this.audioElement) {
          await this.audioElement.play();
        }
        break;
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    switch (this.currentProvider) {
      case "spotify":
        if (this.spotifyPlayer) {
          await this.spotifyPlayer.pause();
        }
        break;
      case "apple-music":
        if (this.appleMusicPlayer) {
          await this.appleMusicPlayer.pause();
        }
        break;
      case "preview":
        if (this.audioElement) {
          this.audioElement.pause();
        }
        break;
    }
  }

  /**
   * Seek to position
   */
  async seek(position: number): Promise<void> {
    const positionMs = position * 1000;

    switch (this.currentProvider) {
      case "spotify":
        if (this.spotifyPlayer) {
          await this.spotifyPlayer.seek(positionMs);
        }
        break;
      case "apple-music":
        if (this.appleMusicPlayer) {
          this.appleMusicPlayer.seekToTime(position);
        }
        break;
      case "preview":
        if (this.audioElement) {
          this.audioElement.currentTime = position;
        }
        break;
    }
  }

  /**
   * Set volume (0-1)
   */
  async setVolume(volume: number): Promise<void> {
    this.state.volume = Math.max(0, Math.min(1, volume));

    switch (this.currentProvider) {
      case "spotify":
        if (this.spotifyPlayer) {
          await this.spotifyPlayer.setVolume(this.state.volume);
        }
        break;
      case "apple-music":
        if (this.appleMusicPlayer) {
          this.appleMusicPlayer.volume = this.state.volume;
        }
        break;
      case "preview":
        if (this.audioElement) {
          this.audioElement.volume = this.state.volume;
        }
        break;
    }
  }

  /**
   * Convert VibelyTrack to AudioEngineTrack
   */
  static convertVibelyTrack(
    track: VibelyTrack,
    provider: "spotify" | "apple-music" | "preview" = "preview",
  ): AudioEngineTrack {
    const baseTrack: AudioEngineTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      uri: "",
      duration: track.duration || 180,
      provider,
    };

    switch (provider) {
      case "spotify":
        if (track.spotifyData?.external_urls?.spotify) {
          // Convert Spotify URL to URI
          const spotifyId = track.spotifyData.external_urls.spotify
            .split("/track/")[1]
            ?.split("?")[0];
          baseTrack.uri = `spotify:track:${spotifyId}`;
        }
        baseTrack.preview_url = track.spotifyData?.preview_url || undefined;
        break;
      case "apple-music":
        // Apple Music ID would be stored in track data
        baseTrack.uri = track.id; // Assuming ID is Apple Music compatible
        break;
      case "preview":
        baseTrack.preview_url =
          track.spotifyData?.preview_url || `https://example.com/preview/${track.id}.mp3`;
        break;
    }

    return baseTrack;
  }

  /**
   * Add event listener
   */
  addEventListener<K extends keyof AudioEngineEvents>(
    event: K,
    listener: AudioEngineEvents[K],
  ): void {
    this.listeners[event] = listener;
    // Initialize on first use if we're on the client
    if (!this.isInitialized && typeof window !== "undefined") {
      this.initializeSDKs();
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener<K extends keyof AudioEngineEvents>(event: K): void {
    delete this.listeners[event];
  }

  /**
   * Get current state
   */
  getState(): AudioEngineState {
    return { ...this.state };
  }

  /**
   * Apply battery-aware audio settings
   */
  applyBatteryOptimizations(settings: BatteryAwareAudioSettings): void {
    this.batteryAwareSettings = settings;
    this.state.batteryOptimized = settings.shouldReduceQuality;
    this.state.currentQuality = settings.audioBitrate;
    
    // Apply volume limit if specified
    if (settings.volumeLimit < 1.0 && this.state.volume > settings.volumeLimit) {
      this.setVolume(settings.volumeLimit);
    }
    
    // Configure HTML audio element settings
    if (this.audioElement && this.currentProvider === "preview") {
      this.applyAudioElementOptimizations(settings);
    }
    
    // Clear preloaded tracks if battery saving is enabled
    if (settings.shouldReduceQuality || !settings.preloadNext) {
      this.clearPreloadedTracks();
    }
    
    this.listeners.stateChange?.(this.state);
  }
  
  /**
   * Apply optimizations to HTML audio element
   */
  private applyAudioElementOptimizations(settings: BatteryAwareAudioSettings): void {
    if (!this.audioElement) return;
    
    // Set preload behavior based on battery settings
    if (settings.shouldReduceQuality) {
      this.audioElement.preload = "none";
    } else if (settings.preloadNext) {
      this.audioElement.preload = "auto";
    } else {
      this.audioElement.preload = "metadata";
    }
    
    // Adjust buffer size by controlling the audio element's loading strategy
    if (settings.bufferSize === "small") {
      // For small buffer, we'll load in smaller chunks
      this.audioElement.preload = "none";
    }
  }
  
  /**
   * Preload next track based on battery settings
   */
  async preloadTrack(track: AudioEngineTrack): Promise<void> {
    if (!this.batteryAwareSettings?.preloadNext || this.batteryAwareSettings.shouldReduceQuality) {
      return; // Skip preloading to save battery
    }
    
    if (track.provider === "preview" && track.preview_url) {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.src = this.getOptimizedAudioUrl(track.preview_url);
      this.preloadedTracks.set(track.id, audio);
      
      // Limit number of preloaded tracks to manage memory
      if (this.preloadedTracks.size > 3) {
        const oldestKey = this.preloadedTracks.keys().next().value;
        if (oldestKey) {
          const oldAudio = this.preloadedTracks.get(oldestKey);
          if (oldAudio) {
            oldAudio.src = "";
            this.preloadedTracks.delete(oldestKey);
          }
        }
      }
    }
  }
  
  /**
   * Get optimized audio URL based on current quality settings
   */
  private getOptimizedAudioUrl(originalUrl: string): string {
    if (!this.batteryAwareSettings) return originalUrl;
    
    // For preview URLs, we might modify quality parameters if the service supports it
    try {
      const url = new URL(originalUrl);
      
      // Add quality parameters based on battery settings
      if (this.batteryAwareSettings.audioBitrate === "low") {
        url.searchParams.set("bitrate", "128");
      } else if (this.batteryAwareSettings.audioBitrate === "medium") {
        url.searchParams.set("bitrate", "256");
      }
      
      return url.toString();
    } catch {
      return originalUrl;
    }
  }
  
  /**
   * Clear preloaded tracks to free memory
   */
  private clearPreloadedTracks(): void {
    this.preloadedTracks.forEach((audio) => {
      audio.src = "";
    });
    this.preloadedTracks.clear();
  }
  
  /**
   * Get battery optimization status
   */
  getBatteryOptimizationStatus(): {
    isOptimized: boolean;
    currentQuality: "high" | "medium" | "low";
    settings: BatteryAwareAudioSettings | null;
  } {
    return {
      isOptimized: this.state.batteryOptimized || false,
      currentQuality: this.state.currentQuality || "high",
      settings: this.batteryAwareSettings,
    };
  }

  /**
   * Check if ready for playback
   */
  isReady(): boolean {
    // Initialize on first check if we're on the client
    if (!this.isInitialized && typeof window !== "undefined") {
      this.initializeSDKs();
    }
    return this.isSpotifySDKReady || this.isAppleMusicReady || !!this.audioElement;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.spotifyPlayer) {
      this.spotifyPlayer.disconnect();
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
    }
    this.clearPreloadedTracks();
  }
}

// Create singleton instance with lazy initialization
let _audioEngine: AudioEngine | null = null;

export const getAudioEngine = (): AudioEngine => {
  if (!_audioEngine) {
    _audioEngine = new AudioEngine();
  }
  return _audioEngine;
};

// Backward compatibility
export const audioEngine = {
  get instance() {
    return getAudioEngine();
  }
};
