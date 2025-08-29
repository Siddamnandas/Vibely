"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

interface UserStats {
  coversCreated: number;
  coversThisMonth: number;
  totalViews: number;
  matchRate: number;
  favoriteGenres: string[];
  topListeningHours: number;
  streakDays: number;
  lastGeneratedAt?: Date;
}

interface UserStatsState {
  stats: UserStats;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = "vibely.userStats";

function getDefaultStats(): UserStats {
  return {
    coversCreated: 0,
    coversThisMonth: 0,
    totalViews: 0,
    matchRate: 0,
    favoriteGenres: [],
    topListeningHours: 0,
    streakDays: 0,
  };
}

function loadStatsFromStorage(): UserStats {
  if (typeof window === "undefined") return getDefaultStats();
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultStats();
    
    const parsed = JSON.parse(stored);
    return {
      ...getDefaultStats(),
      ...parsed,
      lastGeneratedAt: parsed.lastGeneratedAt ? new Date(parsed.lastGeneratedAt) : undefined,
    };
  } catch (error) {
    console.error("Failed to load user stats:", error);
    return getDefaultStats();
  }
}

function saveStatsToStorage(stats: UserStats): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error("Failed to save user stats:", error);
  }
}

export function useUserStats() {
  const { user } = useAuth();
  const [state, setState] = useState<UserStatsState>({
    stats: getDefaultStats(),
    isLoading: true,
    error: null,
  });

  // Load stats on mount
  useEffect(() => {
    setState(prev => ({
      ...prev,
      stats: loadStatsFromStorage(),
      isLoading: false,
    }));
  }, []);

  // Increment cover count when a new cover is generated
  const incrementCoverCount = useCallback(() => {
    setState(prev => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Check if we need to reset monthly count
      let coversThisMonth = prev.stats.coversThisMonth;
      if (prev.stats.lastGeneratedAt) {
        const lastMonth = prev.stats.lastGeneratedAt.getMonth();
        const lastYear = prev.stats.lastGeneratedAt.getFullYear();
        
        if (currentMonth !== lastMonth || currentYear !== lastYear) {
          coversThisMonth = 0;
        }
      }
      
      const newStats = {
        ...prev.stats,
        coversCreated: prev.stats.coversCreated + 1,
        coversThisMonth: coversThisMonth + 1,
        lastGeneratedAt: now,
      };
      
      saveStatsToStorage(newStats);
      
      return {
        ...prev,
        stats: newStats,
      };
    });
  }, []);

  // Update match rate based on user satisfaction
  const updateMatchRate = useCallback((satisfaction: number) => {
    setState(prev => {
      // Simple weighted average with previous match rate
      const currentWeight = 0.8;
      const newMatchRate = (prev.stats.matchRate * currentWeight) + (satisfaction * (1 - currentWeight));
      
      const newStats = {
        ...prev.stats,
        matchRate: Math.min(100, Math.max(0, newMatchRate)),
      };
      
      saveStatsToStorage(newStats);
      
      return {
        ...prev,
        stats: newStats,
      };
    });
  }, []);

  // Increment view count when covers are viewed/shared
  const incrementViewCount = useCallback((count: number = 1) => {
    setState(prev => {
      const newStats = {
        ...prev.stats,
        totalViews: prev.stats.totalViews + count,
      };
      
      saveStatsToStorage(newStats);
      
      return {
        ...prev,
        stats: newStats,
      };
    });
  }, []);

  // Update favorite genres based on user's music data
  const updateFavoriteGenres = useCallback((genres: string[]) => {
    setState(prev => {
      const newStats = {
        ...prev.stats,
        favoriteGenres: genres.slice(0, 3), // Keep top 3 genres
      };
      
      saveStatsToStorage(newStats);
      
      return {
        ...prev,
        stats: newStats,
      };
    });
  }, []);

  // Update listening hours from music service data
  const updateListeningHours = useCallback((hours: number) => {
    setState(prev => {
      const newStats = {
        ...prev.stats,
        topListeningHours: hours,
      };
      
      saveStatsToStorage(newStats);
      
      return {
        ...prev,
        stats: newStats,
      };
    });
  }, []);

  // Calculate streak days based on generation activity
  const updateStreak = useCallback(() => {
    setState(prev => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let streakDays = prev.stats.streakDays;
      
      if (prev.stats.lastGeneratedAt) {
        const lastGenerated = new Date(
          prev.stats.lastGeneratedAt.getFullYear(),
          prev.stats.lastGeneratedAt.getMonth(),
          prev.stats.lastGeneratedAt.getDate()
        );
        
        const diffDays = Math.floor((today.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day
          streakDays += 1;
        } else if (diffDays > 1) {
          // Streak broken
          streakDays = 1;
        }
        // If diffDays === 0, same day, don't change streak
      } else {
        // First generation
        streakDays = 1;
      }
      
      const newStats = {
        ...prev.stats,
        streakDays,
      };
      
      saveStatsToStorage(newStats);
      
      return {
        ...prev,
        stats: newStats,
      };
    });
  }, []);

  // Reset stats (for testing or user request)
  const resetStats = useCallback(() => {
    const defaultStats = getDefaultStats();
    saveStatsToStorage(defaultStats);
    
    setState(prev => ({
      ...prev,
      stats: defaultStats,
    }));
  }, []);

  return {
    ...state,
    incrementCoverCount,
    updateMatchRate,
    incrementViewCount,
    updateFavoriteGenres,
    updateListeningHours,
    updateStreak,
    resetStats,
  };
}