"use client";

import { useState, useEffect, useCallback } from "react";
import { spotifyAPI, SpotifyTrack, SpotifyPlaylist, SpotifyAudioFeatures } from "@/lib/spotify";

interface SpotifyAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userProfile: any | null;
}

export function useSpotifyAuth() {
  const [state, setState] = useState<SpotifyAuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    userProfile: null,
  });

  const checkAuthStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Add timeout for auth check
      const authPromise = spotifyAPI.isAuthenticated();
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout')), 2000)
      );
      
      const isAuth = await Promise.race([authPromise, timeout]);

      if (isAuth) {
        const profile = await spotifyAPI.getUserProfile();
        setState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userProfile: profile,
        });
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          userProfile: null,
        });
      }
    } catch (error) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Authentication failed",
        userProfile: null,
      });
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = useCallback(() => {
    const authUrl = spotifyAPI.getAuthUrl();
    window.location.href = authUrl;
  }, []);

  const logout = useCallback(() => {
    spotifyAPI.logout();
    setState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userProfile: null,
    });
  }, []);

  const handleAuthCallback = useCallback(
    async (code: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const success = await spotifyAPI.exchangeCodeForToken(code);
        if (success) {
          await checkAuthStatus();
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "Failed to authenticate with Spotify",
          }));
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Authentication failed",
        }));
      }
    },
    [checkAuthStatus],
  );

  return {
    ...state,
    login,
    logout,
    handleAuthCallback,
    checkAuthStatus,
  };
}

// Hook for fetching Spotify data
export function useSpotifyData() {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [audioFeatures, setAudioFeatures] = useState<Record<string, SpotifyAudioFeatures>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const userPlaylists = await spotifyAPI.getUserPlaylists();
      setPlaylists(userPlaylists);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch playlists");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTopTracks = useCallback(
    async (timeRange: "short_term" | "medium_term" | "long_term" = "medium_term") => {
      setIsLoading(true);
      setError(null);

      try {
        const tracks = await spotifyAPI.getUserTopTracks(timeRange);
        setTopTracks(tracks);

        // Fetch audio features for top tracks
        const trackIds = tracks.map((track) => track.id);
        if (trackIds.length > 0) {
          const features = await spotifyAPI.getAudioFeatures(trackIds);
          const featuresMap = features.reduce(
            (acc, feature) => {
              if (feature) acc[feature.id] = feature;
              return acc;
            },
            {} as Record<string, SpotifyAudioFeatures>,
          );

          setAudioFeatures((prev) => ({ ...prev, ...featuresMap }));
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to fetch top tracks");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const fetchPlaylistTracks = useCallback(async (playlistId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const tracks = await spotifyAPI.getPlaylistTracks(playlistId);

      // Fetch audio features for playlist tracks
      const trackIds = tracks.map((track) => track.id);
      if (trackIds.length > 0) {
        const features = await spotifyAPI.getAudioFeatures(trackIds);
        const featuresMap = features.reduce(
          (acc, feature) => {
            if (feature) acc[feature.id] = feature;
            return acc;
          },
          {} as Record<string, SpotifyAudioFeatures>,
        );

        setAudioFeatures((prev) => ({ ...prev, ...featuresMap }));
      }

      return tracks;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch playlist tracks");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchTracks = useCallback(async (query: string, limit: number = 20) => {
    setIsLoading(true);
    setError(null);

    try {
      const tracks = await spotifyAPI.searchTracks(query, limit);
      return tracks;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to search tracks");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    playlists,
    topTracks,
    audioFeatures,
    isLoading,
    error,
    fetchUserPlaylists,
    fetchTopTracks,
    fetchPlaylistTracks,
    searchTracks,
  };
}
