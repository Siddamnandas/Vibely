import { VibelyTrack } from "./data";

interface AppleMusicConfig {
  developerToken: string;
  musicUserToken?: string;
}

interface AppleMusicTrack {
  id: string;
  type: "songs";
  attributes: {
    albumName: string;
    artistName: string;
    artwork: {
      url: string;
      width: number;
      height: number;
    };
    composerName?: string;
    durationInMillis: number;
    genreNames: string[];
    name: string;
    playParams?: {
      id: string;
      kind: string;
    };
    releaseDate: string;
    trackNumber: number;
    url: string;
  };
}

interface AppleMusicPlaylist {
  id: string;
  type: "playlists";
  attributes: {
    artwork?: {
      url: string;
      width: number;
      height: number;
    };
    curatorName?: string;
    description?: {
      short: string;
      standard: string;
    };
    lastModifiedDate: string;
    name: string;
    playParams: {
      id: string;
      kind: string;
    };
    playlistType: string;
    trackCount: number;
    url: string;
  };
  relationships?: {
    tracks: {
      data: AppleMusicTrack[];
    };
  };
}

interface AppleMusicAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface AppleMusicUserProfile {
  id: string;
  type: "users";
  attributes: {
    handle: string;
    name: string;
  };
}

class AppleMusicService {
  private config: AppleMusicConfig;
  private baseUrl = "https://api.music.apple.com/v1";

  constructor(config: AppleMusicConfig) {
    this.config = config;
  }

  /**
   * Initialize Apple Music authentication
   */
  async authorize(): Promise<string> {
    // Apple Music uses MusicKit JS for web authentication
    // This would typically involve loading MusicKit JS and requesting authorization
    const authUrl = new URL("https://authorize.music.apple.com/oauth/authorize");
    authUrl.searchParams.append("client_id", process.env.NEXT_PUBLIC_APPLE_MUSIC_CLIENT_ID || "");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append(
      "redirect_uri",
      `${window.location.origin}/api/auth/apple-music/callback`,
    );
    authUrl.searchParams.append("scope", "media-library-read");

    return authUrl.toString();
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<boolean> {
    try {
      const response = await fetch("/api/auth/apple-music/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error("Failed to exchange code for token");
      }

      const data: AppleMusicAuthResponse = await response.json();

      // Store tokens securely
      localStorage.setItem("apple_music_access_token", data.access_token);
      localStorage.setItem("apple_music_refresh_token", data.refresh_token);
      localStorage.setItem(
        "apple_music_expires_at",
        (Date.now() + data.expires_in * 1000).toString(),
      );

      this.config.musicUserToken = data.access_token;
      return true;
    } catch (error) {
      console.error("Apple Music token exchange failed:", error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem("apple_music_access_token");
    const expiresAt = localStorage.getItem("apple_music_expires_at");

    if (!token || !expiresAt) return false;

    return Date.now() < parseInt(expiresAt);
  }

  /**
   * Get user profile information
   */
  async getUserProfile(): Promise<AppleMusicUserProfile | null> {
    if (!this.isAuthenticated()) return null;

    try {
      const response = await this.makeAuthenticatedRequest("/me");
      return response.data[0] as AppleMusicUserProfile;
    } catch (error) {
      console.error("Failed to get Apple Music user profile:", error);
      return null;
    }
  }

  /**
   * Get user's playlists
   */
  async getUserPlaylists(): Promise<AppleMusicPlaylist[]> {
    if (!this.isAuthenticated()) return [];

    try {
      const response = await this.makeAuthenticatedRequest("/me/library/playlists?include=tracks");
      return response.data as AppleMusicPlaylist[];
    } catch (error) {
      console.error("Failed to get Apple Music playlists:", error);
      return [];
    }
  }

  /**
   * Get tracks from a playlist
   */
  async getPlaylistTracks(playlistId: string): Promise<AppleMusicTrack[]> {
    if (!this.isAuthenticated()) return [];

    try {
      const response = await this.makeAuthenticatedRequest(
        `/me/library/playlists/${playlistId}/tracks`,
      );
      return response.data as AppleMusicTrack[];
    } catch (error) {
      console.error("Failed to get Apple Music playlist tracks:", error);
      return [];
    }
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string, limit: number = 20): Promise<AppleMusicTrack[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await this.makeAuthenticatedRequest(
        `/search?term=${encodedQuery}&types=songs&limit=${limit}`,
      );
      return response.results?.songs?.data || [];
    } catch (error) {
      console.error("Failed to search Apple Music tracks:", error);
      return [];
    }
  }

  /**
   * Convert Apple Music track to Vibely format
   */
  convertToVibelyTrack(track: AppleMusicTrack): VibelyTrack {
    // Extract mood from genre or use default
    const mood = this.extractMoodFromGenres(track.attributes.genreNames);

    // Generate artwork URL with proper dimensions
    const artworkUrl = track.attributes.artwork.url.replace("{w}", "400").replace("{h}", "400");

    return {
      id: track.id,
      title: track.attributes.name,
      artist: track.attributes.artistName,
      album: track.attributes.albumName,
      originalCoverUrl: artworkUrl,
      mood: mood as "Happy" | "Sad" | "Energetic" | "Chill" | "Calm" | "Confident",
      tempo: 120, // Apple Music doesn't provide audio features in the same way
      audioFeatures: {
        valence: 0.5, // Default neutral values - would need additional analysis
        energy: 0.5,
        tempo: 120,
        danceability: 0.5,
      },
      duration: Math.floor(track.attributes.durationInMillis / 1000),
      genre: track.attributes.genreNames[0] || "Unknown",
      releaseDate: track.attributes.releaseDate,
      trackNumber: track.attributes.trackNumber,
      available: true,
    };
  }

  /**
   * Extract mood from genre names
   */
  private extractMoodFromGenres(genres: string[]): string {
    const genreText = genres.join(" ").toLowerCase();

    if (
      genreText.includes("electronic") ||
      genreText.includes("dance") ||
      genreText.includes("pop")
    ) {
      return "Energetic";
    } else if (
      genreText.includes("jazz") ||
      genreText.includes("blues") ||
      genreText.includes("ambient")
    ) {
      return "Chill";
    } else if (
      genreText.includes("rock") ||
      genreText.includes("metal") ||
      genreText.includes("punk")
    ) {
      return "Energetic";
    } else if (genreText.includes("classical") || genreText.includes("acoustic")) {
      return "Calm";
    } else if (genreText.includes("hip hop") || genreText.includes("rap")) {
      return "Confident";
    }

    return "Happy"; // Default mood
  }

  /**
   * Make authenticated request to Apple Music API
   */
  private async makeAuthenticatedRequest(endpoint: string): Promise<any> {
    const token = localStorage.getItem("apple_music_access_token");

    if (!token) {
      throw new Error("No Apple Music access token available");
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.config.developerToken}`,
        "Music-User-Token": token,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshToken();
        // Retry the request
        return this.makeAuthenticatedRequest(endpoint);
      }
      throw new Error(`Apple Music API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem("apple_music_refresh_token");

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch("/api/auth/apple-music/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh Apple Music token");
      }

      const data: AppleMusicAuthResponse = await response.json();

      localStorage.setItem("apple_music_access_token", data.access_token);
      localStorage.setItem(
        "apple_music_expires_at",
        (Date.now() + data.expires_in * 1000).toString(),
      );

      this.config.musicUserToken = data.access_token;
    } catch (error) {
      console.error("Apple Music token refresh failed:", error);
      this.logout();
      throw error;
    }
  }

  /**
   * Logout and clear stored tokens
   */
  logout(): void {
    localStorage.removeItem("apple_music_access_token");
    localStorage.removeItem("apple_music_refresh_token");
    localStorage.removeItem("apple_music_expires_at");
    this.config.musicUserToken = undefined;
  }
}

// Create singleton instance
const appleMusicService = new AppleMusicService({
  developerToken: process.env.NEXT_PUBLIC_APPLE_MUSIC_DEVELOPER_TOKEN || "",
});

export default appleMusicService;
export type { AppleMusicTrack, AppleMusicPlaylist, AppleMusicUserProfile };
