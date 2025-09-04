"use client";

import { useState, useEffect } from "react";
import type { VibelyTrack } from "@/lib/data";

interface UseMusicDataResult {
  tracks: VibelyTrack[];
  provider: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useMusicData(): UseMusicDataResult {
  const [tracks, setTracks] = useState<VibelyTrack[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored provider preference
    if (typeof window !== "undefined") {
      const storedProvider = localStorage.getItem("vibely.musicProvider");
      if (storedProvider) {
        setProvider(storedProvider);

        // Simulate loading tracks from the provider
        setIsLoading(true);
        setTimeout(() => {
          setTracks([]); // Start with empty array, will be populated by real data
          setIsLoading(false);
        }, 1000);
      }
    }
  }, []);

  return {
    tracks,
    provider,
    isLoading,
    error,
  };
}
