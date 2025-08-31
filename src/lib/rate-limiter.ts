// Simple in-memory rate limiter for development
// NOTE: In production, use Redis or similar for distributed rate limiting

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if a key is allowed to make a request
   * @param key Unique identifier for the client (e.g., IP address, user ID)
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const window = this.requests.get(key);

    // If no previous requests or window has expired, reset
    if (!window || window.resetTime <= now) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      };
    }

    // If within limit, increment count
    if (window.count < this.maxRequests) {
      window.count += 1;
      this.requests.set(key, window);
      return {
        allowed: true,
        remaining: this.maxRequests - window.count,
        resetTime: window.resetTime,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: window.resetTime,
    };
  }

  /**
   * Get rate limit info for a key without incrementing
   */
  get(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const window = this.requests.get(key);

    if (!window || window.resetTime <= now) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs,
      };
    }

    return {
      allowed: window.count < this.maxRequests,
      remaining: Math.max(0, this.maxRequests - window.count),
      resetTime: window.resetTime,
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clean up expired entries periodically
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, window] of this.requests.entries()) {
      if (window.resetTime <= now) {
        this.requests.delete(key);
      }
    }
  }
}

// Create rate limiters for different endpoints
export const aiRegenRateLimiter = new RateLimiter(60000, 5); // 5 requests per minute
export const spotifyApiRateLimiter = new RateLimiter(60000, 30); // 30 requests per minute

// Clean up expired entries every 5 minutes
setInterval(
  () => {
    aiRegenRateLimiter.cleanup();
    spotifyApiRateLimiter.cleanup();
  },
  5 * 60 * 1000,
);
