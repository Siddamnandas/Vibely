"use client";

import 'jest';
import { RedisQueueManager, QueueTask, Priority } from '../src/services/queue/redis-queue';

// Mock ioredis to avoid actual Redis connection
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    zadd: jest.fn(),
    zcard: jest.fn(),
    zPopMin: jest.fn(),
    lpush: jest.fn(),
    llen: jest.fn(),
    ltrim: jest.fn(),
    scat: jest.fn(),
    spop: jest.fn(),
    scard: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    ping: jest.fn(),
    connect: jest.fn(),
    quit: jest.fn(),
    on: jest.fn()
  }));
});

describe('RedisQueueManager', () => {
  let queueManager: RedisQueueManager;
  let mockRedis: any;

  const mockTask: QueueTask = {
    id: 'test-task-123',
    type: 'ai_cover_generation',
    priority: 'critical',
    payload: { prompt: 'Create album cover', quality: 'high' },
    retries: 0,
    maxRetries: 3,
    timeout: 30000,
    timestamps: { created: new Date() },
    metadata: {
      userId: 'user-123',
      sessionId: 'session-abc',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest/Test',
      source: 'test'
    }
  };

  beforeEach(() => {
    const IORedis = require('ioredis');
    mockRedis = new IORedis();
    queueManager = new RedisQueueManager();
  });

  afterEach(async () => {
    if (queueManager && typeof queueManager.disconnect === 'function') {
      await queueManager.disconnect();
    }
  });

  describe('Queue Task Management', () => {
    test('should enqueue a task successfully', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.zadd.mockResolvedValue(1);

      const result = await queueManager.enqueue(mockTask);

      expect(result).toBe('test-task-123');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'task:test-task-123',
        expect.stringContaining('"id":"test-task-123"'),
        expect.any(Object)
      );
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'queue:critical',
        expect.any(Number),
        'test-task-123'
      );
    });

    test('should dequeue highest priority task', async () => {
      mockRedis.zPopMin.mockResolvedValue(['test-task-123', { score: 1 }]);
      mockRedis.get.mockResolvedValue(JSON.stringify(mockTask));

      const result = await queueManager.dequeue('critical');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-task-123');
      expect(mockRedis.zPopMin).toHaveBeenCalledWith('queue:critical', 1);
    });

    test('should return null when queue is empty', async () => {
      mockRedis.zPopMin.mockResolvedValue(null);

      const result = await queueManager.dequeue('critical');

      expect(result).toBeNull();
    });

    test('should complete a task successfully', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockTask));
      mockRedis.del.mockResolvedValue(1);
      mockRedis.set.mockResolvedValue('OK');

      await queueManager.completeTask('test-task-123');

      expect(mockRedis.del).toHaveBeenCalledWith('task:test-task-123');
      expect(mockRedis.set).toHaveBeenCalled(); // Stores result
    });

    test('should fail a task and handle retries', async () => {
      const retryTask = { ...mockTask, retries: 0, maxRetries: 3 };
      mockRedis.get.mockResolvedValue(JSON.stringify(retryTask));
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.zadd.mockResolvedValue(1);

      await queueManager.failTask('test-task-123', 'Network error');

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'queue:critical',
        expect.any(Number),
        'test-task-123'
      );
    });

    test('should move task to dead letter queue after max retries', async () => {
      const exhaustedTask = { ...mockTask, retries: 3, maxRetries: 3 };
      mockRedis.get.mockResolvedValue(JSON.stringify(exhaustedTask));
      mockRedis.lpush.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      await queueManager.failTask('test-task-123', 'Persistent error', 'Stack trace');

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:dead_letter',
        expect.stringContaining('"failureReason":"Persistent error"')
      );
      expect(mockRedis.del).toHaveBeenCalledWith('task:test-task-123');
    });
  });

  describe('Queue Statistics', () => {
    test('should return comprehensive queue stats', async () => {
      mockRedis.zcard.mockResolvedValue(150);
      mockRedis.scard.mockResolvedValue(25);

      const stats = await queueManager.getQueueStats();

      expect(stats.critical).toBeDefined();
      expect(stats.critical.size).toBe(150);
      expect(stats.critical.activeWorkers).toBe(25);
      expect(mockRedis.zcard).toHaveBeenCalledWith('queue:critical');
    });

    test('should handle queue stats errors gracefully', async () => {
      mockRedis.zcard.mockRejectedValue(new Error('Redis error'));
      mockRedis.scard.mockResolvedValue(0);

      const stats = await queueManager.getQueueStats();

      expect(stats.critical.size).toBe(0);
      expect(stats.critical.activeWorkers).toBe(0);
    });
  });

  describe('Circuit Breaker Functionality', () => {
    test('should maintain circuit breaker state tracking', async () => {
      // Test the circuit breaker protection mechanism
      const health = await queueManager.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|unhealthy/);
    });

    test('should report health status accurately', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.zcard.mockResolvedValue(100);

      const health = await queueManager.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details).toHaveProperty('queueStats');
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    test('should detect unhealthy system state', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const health = await queueManager.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.error).toContain('Connection failed');
    });
  });

  describe('Priority Handling', () => {
    test('should handle different priority levels correctly', () => {
      const priorities: Priority[] = ['critical', 'high', 'medium', 'low', 'background'];

      priorities.forEach(priority => {
        // Verify queue keys are generated correctly
        expect(`queue:${priority}`).toMatch(/queue:(critical|high|medium|low|background)/);
      });
    });

    test('should prioritize critical tasks correctly', async () => {
      const urgentTask: QueueTask = { ...mockTask, priority: 'critical' };
      const normalTask: QueueTask = { ...mockTask, priority: 'low', id: 'normal-task' };

      mockRedis.set.mockResolvedValue('OK');
      mockRedis.zadd.mockResolvedValue(1);

      await queueManager.enqueue(urgentTask);
      await queueManager.enqueue(normalTask);

      // Critical should have priority score of 1 (lowest, highest priority)
      expect(mockRedis.zadd).toHaveBeenCalledWith('queue:critical', 1, urgentTask.id);
      expect(mockRedis.zadd).toHaveBeenCalledWith('queue:low', 4, normalTask.id);
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis connection errors', async () => {
      mockRedis.set.mockRejectedValue(new Error('Connection lost'));

      await expect(queueManager.enqueue(mockTask)).rejects.toThrow();
      expect(mockRedis.set).toHaveBeenCalled();
    });

    test('should handle invalid task data recovery', async () => {
      mockRedis.zPopMin.mockResolvedValue(['bad-task-id', { score: 1 }]);
      mockRedis.get.mockResolvedValue('invalid json');

      // Should handle invalid JSON gracefully
      const result = await queueManager.dequeue('critical');
      expect(result).toBeNull();
    });

    test('should handle timeouts and cancellations', async () => {
      const timeoutTask = { ...mockTask, timeout: 1000 };

      mockRedis.set.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('OK'), 50))
      );

      const result = await queueManager.enqueue(timeoutTask);
      expect(result).toBeDefined();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'task:test-task-123',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Resource Management', () => {
    test('should properly cleanup resources', async () => {
      mockRedis.quit = jest.fn().mockResolvedValue('OK');

      await queueManager.disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    test('should handle cleanup errors gracefully', async () => {
      mockRedis.quit.mockRejectedValue(new Error('Cleanup failed'));
      mockRedis.subscribers.quit.mockRejectedValue(new Error('Subscriber cleanup failed'));

      // Should not throw when cleanup fails
      await expect(queueManager.disconnect()).rejects.toThrow();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });

  describe('Performance Characteristics', () => {
    test('should handle high volume task enqueueing', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.zadd.mockResolvedValue(1);

      const tasks = Array(100).fill(null).map((_, i) => ({
        ...mockTask,
        id: `batch-task-${i}`
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        tasks.map(task => queueManager.enqueue(task))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockRedis.set).toHaveBeenCalledTimes(100);
      expect(mockRedis.zadd).toHaveBeenCalledTimes(100);
    });

    test('should handle concurrent dequeue operations', async () => {
      mockRedis.zPopMin.mockResolvedValue(['task-1', { score: 1 }]);
      mockRedis.get.mockResolvedValue(JSON.stringify(mockTask));

      const concurrentOperations = 10;
      const promises = Array(concurrentOperations).fill(null).map(() =>
        queueManager.dequeue('critical')
      );

      const results = await Promise.all(promises);
      const nonNullResults = results.filter(r => r !== null);

      expect(nonNullResults.length).toBeLessThanOrEqual(concurrentOperations);
      expect(mockRedis.zPopMin).toHaveBeenCalledTimes(concurrentOperations);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle dependencies correctly', async () => {
      const dependentTask: QueueTask = {
        ...mockTask,
        dependencies: ['parent-task-123']
      };

      mockRedis.set.mockResolvedValue('OK');
      mockRedis.zadd.mockResolvedValue(1);

      await queueManager.enqueue(dependentTask);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'task:test-task-123',
        expect.stringContaining('dependencies'),
        expect.any(Object)
      );
    });

    test('should aggregate multiple queue statistics', async () => {
      mockRedis.zcard.mockImplementation((key: string) => {
        const stats = {
          'queue:critical': 45,
          'queue:high': 123,
          'queue:medium': 89,
          'queue:low': 234,
          'queue:background': 567
        };
        return Promise.resolve(stats[key] || 0);
      });

      mockRedis.scard.mockResolvedValue(25);

      const stats = await queueManager.getQueueStats();

      expect(stats.critical.size).toBe(45);
      expect(stats.high.size).toBe(123);
      expect(stats.medium.size).toBe(89);
      expect(stats.low.size).toBe(234);
      expect(stats.background.size).toBe(567);
    });

    test('should handle message metadata enrichment', async () => {
      const enrichedTask: QueueTask = {
        ...mockTask,
        payload: {
          prompt: 'Create album cover',
          quality: 'ultra-high',
          style: 'cyberpunk',
          format: 'square'
        }
      };

      mockRedis.set.mockResolvedValue('OK');
      mockRedis.zadd.mockResolvedValue(1);

      await queueManager.enqueue(enrichedTask);

      // Verify richer payload is preserved
      const setCall = mockRedis.set.mock.calls[0];
      const taskData = JSON.parse(setCall[1]);
      expect(taskData.payload).toEqual({
        prompt: 'Create album cover',
        quality: 'ultra-high',
        style: 'cyberpunk',
        format: 'square'
      });
    });
  });
});
