"use client";

import { track as trackEvent } from "@/lib/analytics";

interface AppShortcut {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  category: "generator" | "library" | "utility" | "capture";
}

interface ShortcutUsageStats {
  totalUsage: number;
  lastUsed: Date | null;
  favoriteShortcut: string | null;
  usageByShortcut: Record<string, number>;
}

class AppShortcutsService {
  private static instance: AppShortcutsService;
  private shortcuts: AppShortcut[] = [];
  private usageStats: ShortcutUsageStats = {
    totalUsage: 0,
    lastUsed: null,
    favoriteShortcut: null,
    usageByShortcut: {},
  };

  static getInstance(): AppShortcutsService {
    if (!AppShortcutsService.instance) {
      AppShortcutsService.instance = new AppShortcutsService();
    }
    return AppShortcutsService.instance;
  }

  constructor() {
    this.initializeShortcuts();
    this.loadUsageStats();
    this.setupUrlParameterTracking();
  }

  private initializeShortcuts() {
    this.shortcuts = [
      {
        id: "generate-cover",
        name: "Generate Cover",
        description: "Create a new AI album cover",
        url: "/generator?source=shortcut",
        icon: "/icons/shortcut-generate.png",
        category: "generator",
      },
      {
        id: "my-library",
        name: "My Library",
        description: "View your saved covers",
        url: "/library?source=shortcut",
        icon: "/icons/shortcut-library.png",
        category: "library",
      },
      {
        id: "stories-archive",
        name: "Stories Archive",
        description: "Browse your story collections",
        url: "/stories?source=shortcut",
        icon: "/icons/shortcut-stories.png",
        category: "library",
      },
      {
        id: "quick-capture",
        name: "Quick Capture",
        description: "Take a photo and generate cover instantly",
        url: "/generator?mode=capture&source=shortcut",
        icon: "/icons/shortcut-camera.png",
        category: "capture",
      },
      {
        id: "offline-music",
        name: "Offline Music",
        description: "Access your cached playlists offline",
        url: "/library?view=offline&source=shortcut",
        icon: "/icons/shortcut-offline.png",
        category: "utility",
      },
    ];

    console.log("📱 App shortcuts initialized:", this.shortcuts.length);
  }

  private loadUsageStats() {
    try {
      const stored = localStorage.getItem("app-shortcuts-usage");
      if (stored) {
        const data = JSON.parse(stored);
        this.usageStats = {
          ...this.usageStats,
          ...data,
          lastUsed: data.lastUsed ? new Date(data.lastUsed) : null,
        };
      }
    } catch (error) {
      console.warn("Failed to load shortcut usage stats:", error);
    }
  }

  private saveUsageStats() {
    try {
      const data = {
        ...this.usageStats,
        lastUsed: this.usageStats.lastUsed?.toISOString(),
      };
      localStorage.setItem("app-shortcuts-usage", JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save shortcut usage stats:", error);
    }
  }

  private setupUrlParameterTracking() {
    if (typeof window === "undefined") return;

    // Check if app was opened via shortcut
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get("source");
    const mode = urlParams.get("mode");
    const view = urlParams.get("view");

    if (source === "shortcut") {
      this.handleShortcutUsage(window.location.pathname, { mode, view });
    }
  }

  private handleShortcutUsage(pathname: string, params: { mode?: string | null; view?: string | null }) {
    let shortcutId: string | null = null;

    // Determine which shortcut was used based on URL
    if (pathname === "/generator") {
      shortcutId = params.mode === "capture" ? "quick-capture" : "generate-cover";
    } else if (pathname === "/library") {
      shortcutId = params.view === "offline" ? "offline-music" : "my-library";
    } else if (pathname === "/stories") {
      shortcutId = "stories-archive";
    }

    if (shortcutId) {
      this.recordShortcutUsage(shortcutId);
    }
  }

  // Public API methods
  getShortcuts(): AppShortcut[] {
    return [...this.shortcuts];
  }

  getShortcutsByCategory(category: AppShortcut["category"]): AppShortcut[] {
    return this.shortcuts.filter(shortcut => shortcut.category === category);
  }

  getUsageStats(): ShortcutUsageStats {
    return { ...this.usageStats };
  }

  // Allow manual tracking when app is accessed via URL with ?source=shortcut
  trackShortcutUsage(): void {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get("source");
    const mode = urlParams.get("mode");
    const view = urlParams.get("view");
    if (source === "shortcut") {
      this.handleShortcutUsage(window.location.pathname, { mode, view });
    }
  }

  recordShortcutUsage(shortcutId: string): void {
    const shortcut = this.shortcuts.find(s => s.id === shortcutId);
    if (!shortcut) {
      console.warn("Unknown shortcut ID:", shortcutId);
      return;
    }

    // Update usage stats
    this.usageStats.totalUsage++;
    this.usageStats.lastUsed = new Date();
    this.usageStats.usageByShortcut[shortcutId] = 
      (this.usageStats.usageByShortcut[shortcutId] || 0) + 1;

    // Update favorite shortcut
    const mostUsedShortcut = Object.entries(this.usageStats.usageByShortcut)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (mostUsedShortcut) {
      this.usageStats.favoriteShortcut = mostUsedShortcut[0];
    }

    this.saveUsageStats();

    // Track analytics
    trackEvent("app_shortcut_used", {
      shortcut_id: shortcutId,
      shortcut_name: shortcut.name,
      shortcut_category: shortcut.category,
      total_usage: this.usageStats.totalUsage,
      shortcut_usage_count: this.usageStats.usageByShortcut[shortcutId],
    });

    console.log(`📱 Shortcut used: ${shortcut.name}`);
  }

  // Programmatic shortcut navigation
  navigateToShortcut(shortcutId: string): void {
    const shortcut = this.shortcuts.find(s => s.id === shortcutId);
    if (!shortcut) {
      console.warn("Unknown shortcut ID:", shortcutId);
      return;
    }

    this.recordShortcutUsage(shortcutId);
    
    // Navigate to the shortcut URL
    if (typeof window !== "undefined") {
      window.location.href = shortcut.url;
    }
  }

  // Dynamic shortcut creation (for PWA runtime shortcuts)
  createDynamicShortcut(shortcut: Omit<AppShortcut, "id">): string {
    const id = `dynamic-${Date.now()}`;
    const newShortcut: AppShortcut = { id, ...shortcut };
    
    this.shortcuts.push(newShortcut);
    
    trackEvent("dynamic_shortcut_created", {
      shortcut_id: id,
      shortcut_name: shortcut.name,
      shortcut_category: shortcut.category,
    });

    return id;
  }

  // Shortcut availability checking
  isShortcutSupported(): boolean {
    // Check if PWA shortcuts are supported
    return "serviceWorker" in navigator && 
           window.matchMedia && 
           window.matchMedia("(display-mode: standalone)").matches;
  }

  // Get personalized shortcut recommendations
  getRecommendedShortcuts(limit: number = 3): AppShortcut[] {
    const { usageByShortcut, favoriteShortcut } = this.usageStats;
    
    // Sort shortcuts by usage frequency
    const sortedShortcuts = this.shortcuts
      .map(shortcut => ({
        ...shortcut,
        usageCount: usageByShortcut[shortcut.id] || 0,
        isFavorite: shortcut.id === favoriteShortcut,
      }))
      .sort((a, b) => {
        // Prioritize favorite shortcut
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        
        // Then sort by usage count
        return b.usageCount - a.usageCount;
      });

    return sortedShortcuts.slice(0, limit);
  }

  // Analytics for shortcut effectiveness
  getShortcutAnalytics() {
    const analytics = {
      totalShortcuts: this.shortcuts.length,
      totalUsage: this.usageStats.totalUsage,
      averageUsagePerShortcut: this.usageStats.totalUsage / this.shortcuts.length,
      mostUsedShortcut: this.usageStats.favoriteShortcut,
      usageDistribution: this.usageStats.usageByShortcut,
      lastUsed: this.usageStats.lastUsed,
    };

    trackEvent("shortcut_analytics_generated", analytics);
    
    return analytics;
  }

  // Clear usage stats (for testing or reset)
  clearUsageStats(): void {
    this.usageStats = {
      totalUsage: 0,
      lastUsed: null,
      favoriteShortcut: null,
      usageByShortcut: {},
    };
    
    this.saveUsageStats();
    
    trackEvent("shortcut_usage_stats_cleared");
  }
}

// Export singleton instance
export const appShortcutsService = AppShortcutsService.getInstance();

export type { AppShortcut, ShortcutUsageStats };
