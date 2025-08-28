/**
 * @jest-environment jsdom
 */

import { useSpotifyAuth, useSpotifyData } from "@/hooks/use-spotify-auth";
import { useAppleMusicAuth } from "@/hooks/use-apple-music-auth";
import { renderHook, act } from "@testing-library/react";

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock window.location
delete (window as any).location;
window.location = { href: "", assign: jest.fn() } as any;

describe("Authentication Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Spotify Authentication", () => {
    it("should initialize with loading state", () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useSpotifyAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should handle successful authentication", async () => {
      const mockTokens = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockTokens));

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "user123",
            display_name: "Test User",
            email: "test@example.com",
          }),
      });

      const { result } = renderHook(() => useSpotifyAuth());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.userProfile).toMatchObject({
        id: "user123",
        display_name: "Test User",
      });
    });

    it("should handle authorization code exchange", async () => {
      const mockTokenResponse = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { result } = renderHook(() => useSpotifyAuth());

      await act(async () => {
        const success = await result.current.handleAuthCallback("auth-code-123");
        expect(success).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith("/api/auth/spotify/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "auth-code-123" }),
      });
    });

    it("should redirect to Spotify authorization", () => {
      const { result } = renderHook(() => useSpotifyAuth());

      act(() => {
        result.current.login();
      });

      expect(window.location.href).toContain("accounts.spotify.com/authorize");
    });

    it("should handle logout correctly", () => {
      const { result } = renderHook(() => useSpotifyAuth());

      act(() => {
        result.current.logout();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("spotify_tokens");
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.userProfile).toBeNull();
    });
  });

  describe("Spotify Data Fetching", () => {
    it("should fetch user playlists", async () => {
      const mockPlaylists = {
        items: [
          {
            id: "playlist1",
            name: "My Playlist",
            description: "Test playlist",
            images: [{ url: "https://example.com/image.jpg" }],
            tracks: { total: 10 },
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPlaylists),
      });

      const { result } = renderHook(() => useSpotifyData());

      await act(async () => {
        await result.current.fetchUserPlaylists();
      });

      expect(result.current.playlists).toHaveLength(1);
      expect(result.current.playlists[0]).toMatchObject({
        id: "playlist1",
        name: "My Playlist",
      });
    });

    it("should fetch top tracks with audio features", async () => {
      const mockTracks = {
        items: [
          {
            id: "track1",
            name: "Test Song",
            artists: [{ name: "Test Artist" }],
            album: {
              name: "Test Album",
              images: [{ url: "https://example.com/cover.jpg" }],
            },
          },
        ],
      };

      const mockAudioFeatures = {
        audio_features: [
          {
            id: "track1",
            danceability: 0.8,
            energy: 0.9,
            valence: 0.7,
            tempo: 120,
          },
        ],
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTracks),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAudioFeatures),
        });

      const { result } = renderHook(() => useSpotifyData());

      await act(async () => {
        await result.current.fetchTopTracks("short_term");
      });

      expect(result.current.topTracks).toHaveLength(1);
      expect(result.current.audioFeatures["track1"]).toMatchObject({
        id: "track1",
        tempo: 120,
        energy: 0.9,
      });
    });
  });

  describe("Apple Music Authentication", () => {
    it("should handle Apple Music authorization", async () => {
      const mockTokenResponse = {
        access_token: "apple-access-token",
        token_type: "Bearer",
        expires_in: 3600,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const { result } = renderHook(() => useAppleMusicAuth());

      await act(async () => {
        const success = await result.current.handleAuthCallback("apple-auth-code");
        expect(success).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith("/api/auth/apple-music/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "apple-auth-code" }),
      });
    });

    it("should handle token refresh for Apple Music", async () => {
      const mockRefreshResponse = {
        access_token: "new-apple-token",
        expires_in: 3600,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRefreshResponse),
      });

      const { result } = renderHook(() => useAppleMusicAuth());

      // Mock existing tokens
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          access_token: "old-token",
          refresh_token: "refresh-token",
        }),
      );

      await act(async () => {
        const success = await result.current.refreshToken();
        expect(success).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith("/api/auth/apple-music/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: "refresh-token" }),
      });
    });
  });

  describe("Authentication Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useSpotifyAuth());

      await act(async () => {
        const success = await result.current.handleAuthCallback("test-code");
        expect(success).toBe(false);
      });

      expect(result.current.error).toContain("Network error");
    });

    it("should handle invalid authorization codes", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "invalid_grant" }),
      });

      const { result } = renderHook(() => useSpotifyAuth());

      await act(async () => {
        const success = await result.current.handleAuthCallback("invalid-code");
        expect(success).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it("should handle expired tokens", async () => {
      const expiredTokens = {
        access_token: "expired-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        created_at: Date.now() - 7200000, // 2 hours ago
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredTokens));

      // Mock refresh token success
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "new-token",
            expires_in: 3600,
          }),
      });

      const { result } = renderHook(() => useSpotifyAuth());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/refresh"), expect.any(Object));
    });
  });
});
