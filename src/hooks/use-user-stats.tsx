"use client";

import { useState, useEffect, useCallback } from "react";

interface UserStats {
  coversCreated: number;
  matchRate: number;
  coversThisMonth: number;
  streakDays: number;
}

interface UseUserStatsResult {
  stats: UserStats;
  updateFavoriteGenres: (genres: string[]) => void;
  updateStats: (newStats: Partial<UserStats>) => void;
}

export function useUserStats(): UseUserStatsResult {
  const [stats, setStats] = useState<UserStats>({
    coversCreated: 0,
    matchRate: 0,
    coversThisMonth: 0,
    streakDays: 0,
  });

  useEffect(() => {
    // Load stats from localStorage
    if (typeof window !== "undefined") {
      try {
        const storedStats = localStorage.getItem("vibely.userStats");
        if (storedStats) {
          const parsedStats = JSON.parse(storedStats) as Partial<UserStats>;
          setStats(prev => ({ ...prev, ...parsedStats }));
        } else {
          // Set default stats for new users
          setStats({
            coversCreated: 5, // Assume some usage
            matchRate: 87, // Assume good match rate
            coversThisMonth: 0,
            streakDays: 2, // Assume recent activity
          });
        }
      } catch (error) {
        console.warn("Error loading user stats:", error);
      }
    }
  }, []);

  // Save stats to localStorage when they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vibely.userStats", JSON.stringify(stats));
      } catch (error) {
        console.warn("Error saving user stats:", error);
      }
    }
  }, [stats]);

  const updateFavoriteGenres = useCallback((genres: string[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vibely.favoriteGenres", JSON.stringify(genres));
      } catch (error) {
        console.warn("Error saving favorite genres:", error);
      }
    }
  }, []);

  const updateStats = useCallback((newStats: Partial<UserStats>) => {
    setStats(prev => ({ ...prev, ...newStats }));
  }, []);

  return {
    stats,
    updateFavoriteGenres,
    updateStats,
  };
}
