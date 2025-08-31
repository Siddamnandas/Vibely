"use client";

import { useEffect } from "react";
import { usePlayback } from "@/context/playback-context";
import { useRegen } from "@/context/regen-context";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { ErrorBanner } from "@/components/error-banner";

export function ErrorHandler() {
  const { error: playbackError, clearError: clearPlaybackError } = usePlayback();
  const { error: regenError, clearError: clearRegenError } = useRegen();
  const { error: spotifyAuthError } = useSpotifyAuth();
  const { error: pushError } = usePushNotifications();

  // Clear playback error after 5 seconds
  useEffect(() => {
    if (playbackError) {
      const timer = setTimeout(() => {
        clearPlaybackError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [playbackError, clearPlaybackError]);

  // Clear regen error after 5 seconds
  useEffect(() => {
    if (regenError) {
      const timer = setTimeout(() => {
        clearRegenError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [regenError, clearRegenError]);

  return (
    <>
      {playbackError && (
        <ErrorBanner
          type="playback"
          title="Playback Error"
          message={playbackError}
          onDismiss={clearPlaybackError}
        />
      )}

      {regenError && (
        <ErrorBanner
          type="ai"
          title="Regeneration Error"
          message={regenError}
          onDismiss={clearRegenError}
        />
      )}

      {spotifyAuthError && (
        <ErrorBanner
          type="oauth"
          title="Spotify Authentication Error"
          message={spotifyAuthError}
          autoDismiss={true}
          dismissTime={5000}
        />
      )}

      {pushError && (
        <ErrorBanner
          type="push"
          title="Push Notification Error"
          message={pushError}
          autoDismiss={true}
          dismissTime={5000}
        />
      )}
    </>
  );
}
