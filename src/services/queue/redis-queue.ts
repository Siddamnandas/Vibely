"use client";

// Using redis package with proper imports for better compatibility
import { createClient, RedisClientType } from 'redis';

// Core queue interfaces
export interface QueueTask<T = any> {
  id: string;
  type: TaskType;
  priority: Priority;
  payload: T;
  retries: number;
  maxRetries: number;
  timeout?: number;
  timestamps: {
    created: Date;
    queued?: Date;
    processing?: Date;
    completed?: Date;
    failed?: Date;
  };
  metadata: {
    userId: string;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
    source?: string;
  };
  dependencies?: string[]; // Task IDs this task depends on
}

export type TaskType =
  // AI Generation
  | 'ai_cover_generation'
  | 'ai_music_analysis'
  | 'ai_playlist_creation'
  // Social Features
  | 'social_notification'
  | 'friend_activity_update'
  | 'trend_analysis'
  // User Management
  | 'user_onboarding'
  | 'profile_update'
  | 'preference_sync'
  // Content Processing
  | 'content_moderation'
  | 'metadata_extraction'
  | 'image_processing'
  // Analytics
  | 'usage_analytics'
  | 'performance_monitoring'
  | 'cache_invalidation'
  // System Maintenance
  | 'database_cleanup'
  | 'cache_warming'
  | 'backup_processing';

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'background';

export interface QueueOptions {
  capacity: number;
  maxRetries: number;
  timeout: number;
  concurrency: number;
}

export interface QueueStats {
  name: string;
  size: number;
  processedToday: number;
  failedTasks: number;
  avgProcessingTime: number;
  successRate: number;
  activeWorkers: number;
  pendingTasks: number;
}

// Default queue configurations
export const QUEUE_CONFIGS: Record<Priority, QueueOptions> = {
  critical: {
    capacity: 5000,
    maxRetries: 5,
    timeout: 30000, // 30 seconds - for user-facing tasks
    concurrency: 10
  },
  high: {
    capacity: 10000,
    maxRetries: 3,
    timeout: 60000, // 1 minute - for immediate processing
    concurrency: 20
  },
  medium: {
    capacity: 25000,
    maxRetries: 3,
    timeout: 300000, // 5 minutes - for background tasks
    concurrency: 50
  },
  low: {
    capacity: 100000,
    maxRetries: 2,
    timeout: 1800000, // 30 minutes - for analytics
    concurrency: 20
  },
  background: {
    capacity: 1000000,
    maxRetries: 1,
    timeout: 86400000, // 24 hours - for maintenance
    concurrency: 10
  }
};

// Circuit Breaker State
interface CircuitBreaker {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: Date;
  successCount: number;
  threshold: number;
  timeout: number;
}

// Dead Letter Queue Entry
interface DeadLetterEntry extends QueueTask {
  originalQueue: Priority;
  failureReason: string;
  stackTrace?: string;
}

// Queue Manager Class
export class RedisQueueManager<T = any> {
  private client: RedisClientType;
  private isInitialized = false;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.client = new Redis(url, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 10,
        lazyConnect: true,
        reconnectOnError: (err) => {
          console.log('🔄 Redis reconnecting on error:', err.message);
          return true;
        },
        showFriendlyErrorStack: true
      });

      this.client.on('connect', () => console.log('🎯 Redis queue client connected'));
      this.client.on('error', (err: Error) => console.error('❌ Redis queue error:', err));
      this.client.on('ready', () => {
        this.isInitialized = true;
        console.log('🔄 Redis queue ready');
      });

      this.initializeCircuitBreakers();
    } catch (error) {
      console.error('❌ Failed to initialize Redis queue:', error);
      throw new Error('Redis queue initialization failed');
    }
  }

  // Queue Task Management
  async enqueue(task: QueueTask<T>): Promise<string> {
    await this.ensureConnection();

    const queueKey = this.getQueueKey(task.priority);
    const taskKey = `task:${task.id}`;

    try {
      // Store full task data
      await this.client.set(taskKey, JSON.stringify(task), {
        EX: task.timeout || QUEUE_CONFIGS[task.priority].timeout / 1000
      });

      // Push to priority queue with score based on priority
      const priority = this.getPriorityScore(task.priority);
      await this.client.zAdd(queueKey, {
        score: priority,
        value: task.id
      });

      // Update task timestamp
      task.timestamps.queued = new Date();
      await this.updateTaskMetadata(task.id, task);

      console.log(`✅ Task ${task.id} enqueued (${task.type}) to ${task.priority} queue`);
      return task.id;

    } catch (error) {
      console.error(`❌ Failed to enqueue task ${task.id}:`, error);
      throw new Error('Task enqueue failed');
    }
  }

  async dequeue(priority: Priority): Promise<QueueTask<T> | null> {
    await this.ensureConnection();

    const queueKey = this.getQueueKey(priority);

    try {
      // Get the highest priority task (lowest score)
      const result = await this.client.zPopMin(queueKey, 1);

      if (!result || result.length === 0) {
        return null; // Queue is empty
      }

      const taskId = result[0].value;
      const taskKey = `task:${taskId}`;

      // Get task data
      const taskData = await this.client.get(taskKey);
      if (!taskData) {
        console.warn(`⚠️ Task data missing for ${taskId}`);
        return null;
      }

      const task: QueueTask<T> = JSON.parse(taskData);

      // Mark as processing
      task.timestamps.processing = new Date();
      await this.client.set(taskKey, JSON.stringify(task), {
        EX: task.timeout || QUEUE_CONFIGS[priority].timeout / 1000
      });

      console.log(`⏳ Dequeued task ${taskId} for processing (${task.type})`);
      return task;

    } catch (error) {
      console.error(`❌ Failed to dequeue from ${priority} queue:`, error);
      return null;
    }
  }

  async completeTask(taskId: string, result?: any): Promise<void> {
    await this.ensureConnection();

    const taskKey = `task:${taskId}`;

    try {
      // Get task data
      const taskData = await this.client.get(taskKey);
      if (!taskData) {
        console.warn(`⚠️ Task data missing for ${taskId}`);
        return;
      }

      const task: QueueTask<T> = JSON.parse(taskData);
      task.timestamps.completed = new Date();

      // Store results
      if (result) {
        await this.client.set(`result:${taskId}`, JSON.stringify(result), {
          EX: 86400 // 24 hours
        });
      }

      // Remove task data
      await this.client.del(taskKey);

      // Update circuit breaker on success
      this.updateCircuitBreaker(task.type, 'success');

      console.log(`✅ Task ${taskId} completed successfully (${task.type})`);

    } catch (error) {
      console.error(`❌ Failed to complete task ${taskId}:`, error);
    }
  }

  async failTask(taskId: string, error: string, stackTrace?: string): Promise<void> {
    await this.ensureConnection();

    const taskKey = `task:${taskId}`;

    try {
      const taskData = await this.client.get(taskKey);
      if (!taskData) return;

      const task: QueueTask<T> = JSON.parse(taskData);
      task.timestamps.failed = new Date();

      // Check if task should be retried
      if (task.retries < (task.maxRetries || QUEUE_CONFIGS[task.priority].maxRetries)) {
        task.retries++;
        task.timestamps.queued = new Date();

        await this.client.set(taskKey, JSON.stringify(task), {
          EX: task.timeout || QUEUE_CONFIGS[task.priority].timeout / 1000
        });

        const queueKey = this.getQueueKey(task.priority);
        const priority = this.getPriorityScore(task.priority);
        await this.client.zadd(queueKey, priority, task.id);

        console.log(`🔄 Task ${taskId} re-enqueued (${task.type}) - Retry ${task.retries}/${task.maxRetries}`);
      } else {
        // Move to dead letter queue
        await this.moveToDeadLetter(task, error, stackTrace);
        console.error(`💀 Task ${taskId} moved to dead letter queue after ${task.retries} retries`);
      }

      // Update circuit breaker on failure
      this.updateCircuitBreaker(task.type, 'failure');

    } catch (err) {
      console.error(`❌ Failed to handle task failure ${taskId}:`, err);
    }
  }

  // Circuit Breaker Implementation
  private async isCircuitOpen(service: string): Promise<boolean> {
    const breaker = this.circuitBreakers.get(service);

    if (!breaker) {
      this.circuitBreakers.set(service, {
        state: 'closed',
        failures: 0,
        lastFailure: new Date(),
        successCount: 0,
        threshold: 5,
        timeout: 60000
      });
      return false;
    }

    if (breaker.state === 'open') {
      const timeSinceFailure = Date.now() - breaker.lastFailure.getTime();
      if (timeSinceFailure > breaker.timeout) {
        breaker.state = 'half-open';
        console.log(`🔄 Circuit breaker for ${service} moved to half-open`);
        this.circuitBreakers.set(service, breaker);
      }
    }

    return breaker.state === 'open';
  }

  private updateCircuitBreaker(service: string, result: 'success' | 'failure'): void {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return;

    if (result === 'failure') {
      breaker.failures++;
      breaker.lastFailure = new Date();

      if (breaker.failures >= breaker.threshold) {
        breaker.state = 'open';
        console.warn(`🚨 Circuit breaker for ${service} opened (${breaker.failures} failures)`);
      }
    } else if (result === 'success') {
      breaker.successCount++;

      if (breaker.state === 'half-open' && breaker.successCount >= 2) {
        breaker.state = 'closed';
        breaker.failures = 0;
        breaker.successCount = 0;
        console.log(`✅ Circuit breaker for ${service} closed`);
      }
    }

    this.circuitBreakers.set(service, breaker);
  }

  // Dead Letter Queue
  private async moveToDeadLetter(task: QueueTask<T>, error: string, stackTrace?: string): Promise<void> {
    const deadLetterEntry: DeadLetterEntry = {
      ...task,
      originalQueue: task.priority,
      failureReason: error,
      stackTrace
    };

    const dlqKey = 'queue:dead_letter';
    await this.client.lpush(dlqKey, JSON.stringify(deadLetterEntry));

    // Rotate dead letter queue to prevent unbounded growth
    const dlqSize = await this.client.llen(dlqKey);
    if (dlqSize > 1000) {
      await this.client.ltrim(dlqKey, -500, -1); // Keep only last 500
    }

    // Remove original task data
    await this.client.del(`task:${task.id}`);
  }

  // Queue Statistics
  async getQueueStats(): Promise<Record<Priority, QueueStats>> {
    await this.ensureConnection();

    const stats: Partial<Record<Priority, QueueStats>> = {};

    for (const priority of ['critical', 'high', 'medium', 'low', 'background'] as Priority[]) {
      const queueKey = this.getQueueKey(priority);

      try {
        const size = await this.client.zcard(queueKey);
        const pendingTasks = size;

        stats[priority] = {
          name: priority,
          size,
          processedToday: 0, // Requires additional tracking
          failedTasks: 0, // Requires additional tracking
          avgProcessingTime: 0, // Requires additional tracking
          successRate: 0, // Requires additional tracking
          activeWorkers: await this.getActiveWorkers(priority),
          pendingTasks
        };
      } catch (error) {
        console.error(`❌ Failed to get stats for ${priority} queue:`, error);
        stats[priority] = {
          name: priority,
          size: 0,
          processedToday: 0,
          failedTasks: 0,
          avgProcessingTime: 0,
          successRate: 0,
          activeWorkers: 0,
          pendingTasks: 0
        };
      }
    }

    return stats as Record<Priority, QueueStats>;
  }

  // Utility Methods
  private getQueueKey(priority: Priority): string {
    return `queue:${priority}`;
  }

  private getPriorityScore(priority: Priority): number {
    const scores: Record<Priority, number> = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
      background: 5
    };
    return scores[priority];
  }

  private initializeCircuitBreakers(): void {
    // Initialize circuit breakers for different services
    const services = ['ai_generation', 'spotify_api', 'apple_music_api', 'database', 'cache'];

    services.forEach(service => {
      this.circuitBreakers.set(service, {
        state: 'closed',
        failures: 0,
        lastFailure: new Date(),
        successCount: 0,
        threshold: 5,
        timeout: 60000
      });
    });
  }

  private async updateTaskMetadata(taskId: string, task: QueueTask<T>): Promise<void> {
    await this.client.set(`task_metadata:${taskId}`, JSON.stringify(task), {
      EX: task.timeout || QUEUE_CONFIGS[task.priority].timeout / 1000
    });
  }

  private async getActiveWorkers(priority: Priority): Promise<number> {
    const workersKey = `workers:${priority}`;

    try {
      const workers = await this.client.scard(workersKey);
      return workers || 0;
    } catch {
      return 0;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Redis queue not initialized');
    }

    if (!this.client.connected) {
      console.log('🔄 Redis connection lost, attempting to reconnect...');
      await this.client.connect();
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      await this.subscribers.quit();
      console.log('👋 Redis queue disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting Redis:', error);
    }
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      await this.client.ping();
      const stats = await this.getQueueStats();

      return {
        status: 'healthy',
        details: {
          connection: 'ok',
          queueStats: stats,
          circuitBreakers: Array.from(this.circuitBreakers.entries())
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}
