import axios from "axios";

// Spotify API Configuration
const SPOTIFY_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "",
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
  redirectUri:
    process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ||
    "http://127.0.0.1:3002/auth/success?provider=spotify",
  scopes: [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-top-read",
    "user-library-read",
    "streaming",
  ].join(" "),
};

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
    release_date?: string;
    genres?: string[];
  };
  preview_url: string | null;
  duration_ms: number;
  popularity: number;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string; height: number; width: number }>;
  tracks: {
    total: number;
    items: Array<{
      track: SpotifyTrack;
    }>;
  };
  owner: {
    display_name: string;
  };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
}

export interface SpotifyAudioFeatures {
  id: string;
  valence: number; // 0.0 to 1.0 (positivity)
  energy: number; // 0.0 to 1.0 (intensity)
  danceability: number; // 0.0 to 1.0 (danceability)
  tempo: number; // BPM
  acousticness: number; // 0.0 to 1.0 (acoustic)
  instrumentalness: number; // 0.0 to 1.0 (instrumental)
  liveness: number; // 0.0 to 1.0 (live performance)
  speechiness: number; // 0.0 to 1.0 (speech content)
  loudness: number; // dB (-60 to 0)
  mode: number; // 0 = minor, 1 = major
}

class SpotifyAPIService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    // Load tokens from localStorage if available
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("spotify_access_token");
      this.refreshToken = localStorage.getItem("spotify_refresh_token");
      const expiry = localStorage.getItem("spotify_token_expiry");
      this.tokenExpiry = expiry ? new Date(expiry) : null;
    }
  }

  /**
   * Get Spotify authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.clientId,
      response_type: "code",
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      scope: SPOTIFY_CONFIG.scopes,
      state: Math.random().toString(36).substring(7),
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<boolean> {
    try {
      // Use our API route for token exchange
      const response = await fetch("/api/auth/spotify/exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        // Try to get detailed error from response
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // If response isn't JSON, use response text
          const errorText = await response.text();
          errorData = {
            error: "Token exchange failed",
            status: response.status,
            statusText: response.statusText,
            rawError: errorText,
          };
        }
        console.error("Token exchange failed:", errorData);
        return false;
      }

      const { access_token, refresh_token, expires_in } = await response.json();

      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      this.tokenExpiry = new Date(Date.now() + expires_in * 1000);

      // Store in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("spotify_access_token", access_token);
        localStorage.setItem("spotify_refresh_token", refresh_token);
        localStorage.setItem("spotify_token_expiry", this.tokenExpiry.toISOString());
      }

      return true;
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      // Use our API route for token refresh
      const response = await fetch("/api/auth/spotify/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Token refresh failed:", errorData);
        return false;
      }

      const { access_token, refresh_token, expires_in } = await response.json();

      this.accessToken = access_token;
      if (refresh_token) {
        this.refreshToken = refresh_token;
      }
      this.tokenExpiry = new Date(Date.now() + expires_in * 1000);

      // Update localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("spotify_access_token", access_token);
        if (refresh_token) {
          localStorage.setItem("spotify_refresh_token", refresh_token);
        }
        localStorage.setItem("spotify_token_expiry", this.tokenExpiry.toISOString());
      }

      return true;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return false;
    }
  }

  /**
   * Check if user is authenticated and token is valid
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.accessToken) return false;

    if (this.tokenExpiry && this.tokenExpiry < new Date()) {
      return await this.refreshAccessToken();
    }

    return true;
  }

  /**
   * Make authenticated request to Spotify API
   */
  private async makeRequest<T>(endpoint: string): Promise<T | null> {
    if (!(await this.isAuthenticated())) {
      throw new Error("Not authenticated with Spotify");
    }

    try {
      const response = await axios.get(`https://api.spotify.com/v1${endpoint}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Spotify API request failed:", error);
      return null;
    }
  }

  /**
   * Get user's playlists
   */
  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    const data = await this.makeRequest<{ items: SpotifyPlaylist[] }>("/me/playlists?limit=50");
    return data?.items || [];
  }

  /**
   * Get user's saved tracks (liked songs)
   */
  async getUserSavedTracks(limit: number = 50): Promise<SpotifyTrack[]> {
    const data = await this.makeRequest<{ items: Array<{ track: SpotifyTrack }> }>(
      `/me/tracks?limit=${limit}`,
    );
    return data?.items.map((item) => item.track) || [];
  }

  /**
   * Get playlist tracks
   */
  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    const data = await this.makeRequest<SpotifyPlaylist>(
      `/playlists/${playlistId}?fields=tracks.items(track(id,name,artists,album,preview_url,duration_ms,popularity,external_urls))`,
    );
    return data?.tracks.items.map((item) => item.track) || [];
  }

  /**
   * Get user's top tracks
   */
  async getUserTopTracks(
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  ): Promise<SpotifyTrack[]> {
    const data = await this.makeRequest<{ items: SpotifyTrack[] }>(
      `/me/top/tracks?time_range=${timeRange}&limit=50`,
    );
    return data?.items || [];
  }

  /**
   * Get audio features for tracks
   */
  async getAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
    if (trackIds.length === 0) return [];

    const ids = trackIds.join(",");
    const data = await this.makeRequest<{ audio_features: SpotifyAudioFeatures[] }>(
      `/audio-features?ids=${ids}`,
    );
    return data?.audio_features || [];
  }

  /**
   * Get artist metadata (including genres) for multiple artists
   */
  async getArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
    if (artistIds.length === 0) return [];
    const unique = Array.from(new Set(artistIds));
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 50) {
      chunks.push(unique.slice(i, i + 50));
    }

    const results: SpotifyArtist[] = [];
    for (const chunk of chunks) {
      const ids = chunk.join(",");
      const data = await this.makeRequest<{ artists: SpotifyArtist[] }>(`/artists?ids=${ids}`);
      if (data?.artists) results.push(...data.artists);
    }
    return results;
  }

  /**
   * Get user profile
   */
  async getUserProfile() {
    return await this.makeRequest<{
      id: string;
      display_name: string;
      email: string;
      images: Array<{ url: string }>;
      product: string; // "premium", "free", etc.
    }>("/me");
  }

  /**
   * Check if user has Spotify Premium
   */
  async isUserPremium(): Promise<boolean> {
    try {
      // First check if we're authenticated
      if (!(await this.isAuthenticated())) {
        return false;
      }

      const profile = await this.getUserProfile();
      return profile?.product === "premium";
    } catch (error) {
      console.error("Error checking Premium status:", error);
      // If we can't determine Premium status, assume they're not Premium
      return false;
    }
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
    const data = await this.makeRequest<{ tracks: { items: SpotifyTrack[] } }>(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
    );
    return data?.tracks.items || [];
  }

  /**
   * Logout - clear stored tokens
   */
  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    if (typeof window !== "undefined") {
      localStorage.removeItem("spotify_access_token");
      localStorage.removeItem("spotify_refresh_token");
      localStorage.removeItem("spotify_token_expiry");
    }
  }
}

// Export singleton instance
export const spotifyAPI = new SpotifyAPIService();

// Helper functions
export const getMoodFromAudioFeatures = (features: SpotifyAudioFeatures): string => {
  if (features.valence > 0.7 && features.energy > 0.6) return "Happy";
  if (features.valence < 0.4 && features.energy < 0.5) return "Sad";
  if (features.energy > 0.7 && features.danceability > 0.6) return "Energetic";
  return "Chill";
};

export const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
