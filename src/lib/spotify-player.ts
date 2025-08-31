// Spotify Web Playback SDK utility
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify: any;
  }
}

class SpotifyPlayer {
  private player: any = null;
  private deviceId: string | null = null;
  private isReady = false;
  private accessToken: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initializeSDK();
    }
  }

  private async initializeSDK() {
    if (typeof window === "undefined") return;

    // Check if SDK is already loaded
    if (window.Spotify) {
      this.isReady = true;
      return;
    }

    // Load Spotify SDK
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;

      window.onSpotifyWebPlaybackSDKReady = () => {
        this.isReady = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error("Failed to load Spotify SDK"));
      };

      document.head.appendChild(script);
    });
  }

  async initializePlayer(accessToken: string, onStateChange?: (state: any) => void) {
    if (typeof window === "undefined") return false;

    this.accessToken = accessToken;

    // Wait for SDK to be ready
    if (!this.isReady) {
      try {
        await this.initializeSDK();
      } catch (error) {
        console.error("Failed to initialize Spotify SDK:", error);
        return false;
      }
    }

    // Create player instance
    this.player = new window.Spotify.Player({
      name: "Vibely Player",
      getOAuthToken: (cb: (token: string) => void) => {
        cb(accessToken);
      },
      volume: 0.8,
    });

    // Set up event listeners
    this.player.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("Spotify player ready with Device ID", device_id);
      this.deviceId = device_id;
    });

    this.player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
      console.log("Device ID has gone offline", device_id);
      this.deviceId = null;
    });

    this.player.addListener("player_state_changed", (state: any) => {
      if (onStateChange) {
        onStateChange(state);
      }
    });

    this.player.addListener("initialization_error", ({ message }: { message: string }) => {
      console.error("Spotify initialization error:", message);
    });

    this.player.addListener("authentication_error", ({ message }: { message: string }) => {
      console.error("Spotify authentication error:", message);
    });

    this.player.addListener("account_error", ({ message }: { message: string }) => {
      console.error("Spotify account error:", message);
    });

    this.player.addListener("playback_error", ({ message }: { message: string }) => {
      console.error("Spotify playback error:", message);
    });

    // Connect to Spotify
    const connected = await this.player.connect();
    return connected;
  }

  async playTrack(trackUri: string) {
    if (!this.player || !this.deviceId) {
      console.warn("Spotify player not ready");
      return false;
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            uris: [trackUri],
          }),
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Failed to play track:", error);
      return false;
    }
  }

  async pause() {
    if (!this.player) return false;
    return await this.player.pause();
  }

  async resume() {
    if (!this.player) return false;
    return await this.player.resume();
  }

  async nextTrack() {
    if (!this.player) return false;
    return await this.player.nextTrack();
  }

  async previousTrack() {
    if (!this.player) return false;
    return await this.player.previousTrack();
  }

  async seek(positionMs: number) {
    if (!this.player) return false;
    return await this.player.seek(positionMs);
  }

  async setVolume(volume: number) {
    if (!this.player) return false;
    return await this.player.setVolume(volume);
  }

  async transferPlayback() {
    if (!this.deviceId || !this.accessToken) return false;

    try {
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          device_ids: [this.deviceId],
          play: false,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to transfer playback:", error);
      return false;
    }
  }

  async getCurrentState() {
    if (!this.player) return null;
    return await this.player.getCurrentState();
  }

  async disconnect() {
    if (this.player) {
      await this.player.disconnect();
      this.player = null;
      this.deviceId = null;
      this.isReady = false;
    }
  }
}

// Export singleton instance
export const spotifyPlayer = new SpotifyPlayer();
