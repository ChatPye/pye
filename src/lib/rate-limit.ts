// Rate limiting utilities
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Default rate limit configurations
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Per-user, per-endpoint limits
  API_GENERAL: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 req/min
  API_DAILY: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 100 }, // 100 req/day
  TRANSCRIPT_API: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 transcript req/min
  AUTH_API: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 auth req/min
  ADMIN_API: { windowMs: 60 * 1000, maxRequests: 100 }, // Higher limit for admins
};

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function generateRateLimitKey(
  userId: string, 
  endpoint: string, 
  windowMs: number
): string {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  return `${userId}:${endpoint}:${windowStart}`;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const resetTime = windowStart + config.windowMs;
  
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetTime <= now) {
    // New window or expired
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }
  
  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      retryAfter: Math.ceil((current.resetTime - now) / 1000),
    };
  }
  
  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  
  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime,
  };
}

export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup expired entries every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}
