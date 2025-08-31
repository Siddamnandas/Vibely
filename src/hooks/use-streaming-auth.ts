"use client";

import { useCallback, useEffect, useState } from "react";

type Provider = "spotify" | "apple" | null;

type State = {
  isAuthenticated: boolean;
  provider: Provider;
  checking: boolean;
  error?: string;
};

export function useStreamingAuth() {
  const [state, setState] = useState<State>({
    isAuthenticated: false,
    provider: null,
    checking: true,
  });

  useEffect(() => {
    // Check if Spotify tokens exist in cookies
    const checkSpotifyAuth = async () => {
      try {
        // Check if we have Spotify access token cookie
        const hasSpotifyAccess = document.cookie.includes("sp_access=");
        setState({
          isAuthenticated: hasSpotifyAccess,
          provider: hasSpotifyAccess ? "spotify" : null,
          checking: false,
        });
      } catch (error) {
        setState({
          isAuthenticated: false,
          provider: null,
          checking: false,
          error: "Failed to check authentication status",
        });
      }
    };

    checkSpotifyAuth();
  }, []);

  const reconnect = useCallback(async () => {
    setState((s) => ({ ...s, checking: true, error: undefined }));

    try {
      // Redirect to Spotify authorize URL
      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
      const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
      const scopes = [
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing",
        "streaming",
      ].join(" ");

      if (clientId && redirectUri) {
        const authUrl =
          `https://accounts.spotify.com/authorize?` +
          `client_id=${clientId}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes)}`;

        window.location.href = authUrl;
      } else {
        setState((s) => ({
          ...s,
          checking: false,
          error: "Spotify client ID or redirect URI not configured",
        }));
      }
    } catch (error) {
      setState((s) => ({
        ...s,
        checking: false,
        error: error instanceof Error ? error.message : "Failed to reconnect to Spotify",
      }));
    }
  }, []);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, checking: true, error: undefined }));

    try {
      // Call the refresh endpoint
      const response = await fetch("/api/auth/spotify/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to refresh token");
      }

      const data = await response.json();
      setState({
        isAuthenticated: true,
        provider: "spotify",
        checking: false,
      });
    } catch (error) {
      setState({
        isAuthenticated: false,
        provider: null,
        checking: false,
        error: error instanceof Error ? error.message : "Failed to refresh authentication",
      });
    }
  }, []);

  return { ...state, reconnect, refresh };
}
