import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// RATE LIMITING UTILITY
// ============================================================================

/**
 * Simple in-memory rate limiter
 * 
 * Note: This is a basic implementation suitable for single-instance deployments.
 * For production with multiple instances, use Redis or similar distributed cache.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Rate limit configuration options
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;
}

/**
 * Default rate limit configurations
 */
export const RateLimitConfigs = {
  /** Auth endpoints: 10 requests per minute */
  auth: {
    limit: 10,
    windowMs: 60 * 1000,
    keyPrefix: 'auth',
  } as RateLimitConfig,

  /** Enrollment endpoints: 20 requests per minute */
  enrollment: {
    limit: 20,
    windowMs: 60 * 1000,
    keyPrefix: 'enrollment',
  } as RateLimitConfig,

  /** General API: 100 requests per minute */
  api: {
    limit: 100,
    windowMs: 60 * 1000,
    keyPrefix: 'api',
  } as RateLimitConfig,

  /** Strict: 5 requests per minute (for sensitive operations) */
  strict: {
    limit: 5,
    windowMs: 60 * 1000,
    keyPrefix: 'strict',
  } as RateLimitConfig,
};

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header or falls back to a default
 */
function getClientId(request: NextRequest): string {
  // Try to get IP from X-Forwarded-For header (common in proxied environments)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Get the first IP in the list (client IP)
    return forwardedFor.split(',')[0].trim();
  }

  // Try X-Real-IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default (not ideal but works for development)
  return 'unknown-client';
}

/**
 * Check if a request is rate limited
 * 
 * @param request - The Next.js request object
 * @param config - Rate limit configuration
 * @returns Object with isLimited flag and remaining requests
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RateLimitConfigs.api
): {
  isLimited: boolean;
  remaining: number;
  resetTime: number;
} {
  const clientId = getClientId(request);
  const key = `${config.keyPrefix || 'default'}:${clientId}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If no entry or window has expired, create a new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      isLimited: false,
      remaining: config.limit - 1,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  // Check if limit exceeded
  const isLimited = entry.count > config.limit;
  const remaining = Math.max(0, config.limit - entry.count);

  return {
    isLimited,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limit middleware wrapper
 * Returns a 429 response if rate limit is exceeded
 * 
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = rateLimit(request, RateLimitConfigs.auth);
 *   if (rateLimitResult) {
 *     return rateLimitResult;
 *   }
 *   // Continue with request handling...
 * }
 * ```
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = RateLimitConfigs.api
): NextResponse | null {
  const { isLimited, remaining, resetTime } = checkRateLimit(request, config);

  if (isLimited) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Muitas requisições. Por favor, aguarde antes de tentar novamente.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        },
      }
    );
  }

  // Not rate limited, return null to continue
  return null;
}

/**
 * Add rate limit headers to a response
 * Useful for informing clients about their rate limit status
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  config: RateLimitConfig = RateLimitConfigs.api
): NextResponse {
  const { remaining, resetTime } = checkRateLimit(request, config);

  response.headers.set('X-RateLimit-Limit', config.limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

  return response;
}

/**
 * Reset rate limit for a specific client (useful for testing)
 */
export function resetRateLimit(clientId: string, keyPrefix: string = 'default'): void {
  const key = `${keyPrefix}:${clientId}`;
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
