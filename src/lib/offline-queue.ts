"use client";

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: "high" | "medium" | "low";
}

interface OfflineQueueConfig {
  maxQueueSize: number;
  retryDelay: number;
  maxRetries: number;
  persistence: boolean;
}

class OfflineQueue {
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  private config: OfflineQueueConfig;
  private storageKey = "vibely.offline.queue";

  constructor(config: Partial<OfflineQueueConfig> = {}) {
    this.config = {
      maxQueueSize: 100,
      retryDelay: 5000,
      maxRetries: 3,
      persistence: true,
      ...config,
    };

    this.loadFromStorage();
    this.setupEventListeners();
  }

  // Add action to queue
  enqueue(
    type: string,
    payload: any,
    options: {
      priority?: "high" | "medium" | "low";
      maxRetries?: number;
    } = {}
  ): string {
    const id = this.generateId();
    const action: QueuedAction = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
      priority: options.priority || "medium",
    };

    // Add to queue based on priority
    if (action.priority === "high") {
      this.queue.unshift(action);
    } else {
      this.queue.push(action);
    }

    // Enforce max queue size
    if (this.queue.length > this.config.maxQueueSize) {
      this.queue = this.queue.slice(0, this.config.maxQueueSize);
    }

    this.saveToStorage();
    
    // Process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }

    console.log(`📤 Queued action: ${type}`, { id, priority: action.priority });
    return id;
  }

  // Remove action from queue
  dequeue(id: string): boolean {
    const index = this.queue.findIndex(action => action.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Get queue status
  getStatus() {
    return {
      size: this.queue.length,
      isProcessing: this.isProcessing,
      isOnline: navigator.onLine,
      actions: this.queue.map(action => ({
        id: action.id,
        type: action.type,
        priority: action.priority,
        retryCount: action.retryCount,
        timestamp: action.timestamp,
      })),
    };
  }

  // Process the queue
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing queue with ${this.queue.length} actions`);

    while (this.queue.length > 0 && navigator.onLine) {
      const action = this.queue[0];
      
      try {
        await this.executeAction(action);
        this.queue.shift(); // Remove successful action
        console.log(`✅ Action completed: ${action.type}`);
      } catch (error) {
        console.warn(`❌ Action failed: ${action.type}`, error);
        
        action.retryCount++;
        
        if (action.retryCount >= action.maxRetries) {
          console.error(`🚫 Action exceeded max retries: ${action.type}`);
          this.queue.shift(); // Remove failed action
          this.handleFailedAction(action, error);
        } else {
          // Move to end of queue for retry
          this.queue.push(this.queue.shift()!);
          console.log(`🔄 Retrying action: ${action.type} (${action.retryCount}/${action.maxRetries})`);
          
          // Wait before retry
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelay * action.retryCount)
          );
        }
      }
    }

    this.isProcessing = false;
    this.saveToStorage();
  }

  // Execute individual action
  private async executeAction(action: QueuedAction): Promise<void> {
    const handlers = this.getActionHandlers();
    const handler = handlers[action.type];
    
    if (!handler) {
      throw new Error(`No handler found for action type: ${action.type}`);
    }

    return handler(action.payload);
  }

  // Get action handlers
  private getActionHandlers(): Record<string, (payload: any) => Promise<void>> {
    return {
      // Music actions
      "music.play": async (payload) => {
        const response = await fetch("/api/music/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to play music");
      },

      "music.like": async (payload) => {
        const response = await fetch(`/api/music/like/${payload.trackId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liked: payload.liked }),
        });
        if (!response.ok) throw new Error("Failed to like track");
      },

      "music.playlist.create": async (payload) => {
        const response = await fetch("/api/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to create playlist");
      },

      // Analytics actions
      "analytics.track": async (payload) => {
        const response = await fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to track analytics");
      },

      // AI generation actions
      "ai.generate": async (payload) => {
        const response = await fetch("/api/generate-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to generate cover");
      },

      // User preference actions
      "user.preferences": async (payload) => {
        const response = await fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to update preferences");
      },
    };
  }

  // Handle failed actions
  private handleFailedAction(action: QueuedAction, error: any): void {
    console.error(`Failed action after ${action.maxRetries} retries:`, {
      type: action.type,
      payload: action.payload,
      error: error.message,
    });

    // Store failed actions for later analysis
    const failedActions = this.getFailedActions();
    failedActions.push({
      ...action,
      error: error.message,
      failedAt: Date.now(),
    });
    
    // Keep only last 20 failed actions
    if (failedActions.length > 20) {
      failedActions.splice(0, failedActions.length - 20);
    }
    
    localStorage.setItem("vibely.offline.failed", JSON.stringify(failedActions));
  }

  // Setup event listeners
  private setupEventListeners(): void {
    // Process queue when coming online
    window.addEventListener("online", () => {
      console.log("📶 Network restored - processing offline queue");
      this.processQueue();
    });

    // Log when going offline
    window.addEventListener("offline", () => {
      console.log("📵 Network lost - actions will be queued");
    });

    // Process queue periodically
    setInterval(() => {
      if (navigator.onLine && this.queue.length > 0) {
        this.processQueue();
      }
    }, 30000); // Every 30 seconds
  }

  // Storage methods
  private saveToStorage(): void {
    if (!this.config.persistence) return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.warn("Failed to save queue to storage:", error);
    }
  }

  private loadFromStorage(): void {
    if (!this.config.persistence) return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📂 Loaded ${this.queue.length} actions from storage`);
      }
    } catch (error) {
      console.warn("Failed to load queue from storage:", error);
      this.queue = [];
    }
  }

  private getFailedActions(): any[] {
    try {
      const stored = localStorage.getItem("vibely.offline.failed");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clear queue
  clear(): void {
    this.queue = [];
    this.saveToStorage();
  }

  // Get failed actions for debugging
  getFailedActionsList(): any[] {
    return this.getFailedActions();
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

// Hook for using offline queue
export function useOfflineQueue() {
  const enqueue = (
    type: string,
    payload: any,
    options?: { priority?: "high" | "medium" | "low"; maxRetries?: number }
  ) => {
    return offlineQueue.enqueue(type, payload, options);
  };

  const getStatus = () => offlineQueue.getStatus();
  
  const processQueue = () => offlineQueue.processQueue();

  return {
    enqueue,
    getStatus,
    processQueue,
    isOnline: navigator?.onLine ?? true,
  };
}

// Helper functions for common actions
export const queueActions = {
  trackMusic: (trackId: string, event: string, metadata?: any) => {
    offlineQueue.enqueue("analytics.track", {
      event: `music.${event}`,
      properties: { trackId, ...metadata },
    }, { priority: "low" });
  },

  likeTrack: (trackId: string, liked: boolean) => {
    offlineQueue.enqueue("music.like", { trackId, liked }, { priority: "medium" });
  },

  createPlaylist: (name: string, tracks: string[]) => {
    offlineQueue.enqueue("music.playlist.create", { name, tracks }, { priority: "high" });
  },

  generateCover: (prompt: string, style: string) => {
    offlineQueue.enqueue("ai.generate", { prompt, style }, { priority: "medium" });
  },

  updatePreferences: (preferences: any) => {
    offlineQueue.enqueue("user.preferences", preferences, { priority: "medium" });
  },
};
