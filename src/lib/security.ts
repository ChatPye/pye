import { NextRequest } from 'next/server';
// Simple in-file limiter to avoid circular imports / missing export
type RateLimiterConfig = { maxRequests: number; windowMs: number };
class SimpleRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  public lastReset = Date.now();
  constructor(private config: RateLimiterConfig) {}
  checkLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const slot = Math.floor(now / this.config.windowMs);
    const mapKey = `${key}:${slot}`;
    const entry = this.requests.get(mapKey) || { count: 0, resetTime: slot * this.config.windowMs + this.config.windowMs };
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = slot * this.config.windowMs + this.config.windowMs;
    }
    entry.count++;
    this.requests.set(mapKey, entry);
    return { allowed: entry.count <= this.config.maxRequests, remaining: Math.max(this.config.maxRequests - entry.count, 0), resetTime: entry.resetTime };
  }
}

// DDoS Protection Configuration
export const DDOS_PROTECTION = {
  // Rate limits per IP
  maxRequestsPerMinute: 60,
  maxRequestsPerHour: 1000,
  maxRequestsPerDay: 10000,
  
  // Burst protection
  maxBurstRequests: 10,
  burstWindowMs: 1000, // 1 second
  
  // Block duration
  blockDurationMs: 15 * 60 * 1000, // 15 minutes
  
  // Whitelist (trusted IPs)
  whitelist: [
    '127.0.0.1',
    '::1',
    // Add your trusted IPs here
  ],
  
  // Blacklist (blocked IPs)
  blacklist: new Set<string>(),
};

// Security Configuration
export const SECURITY_CONFIG = {
  // Request size limits
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  maxFileUploadSize: 50 * 1024 * 1024, // 50MB
  
  // Bot detection patterns
  botPatterns: [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i,
    /postman/i, /insomnia/i, /httpie/i,
    /headless/i, /phantom/i, /selenium/i
  ],
  
  // Suspicious user agents
  suspiciousUserAgents: [
    /sqlmap/i, /nikto/i, /nmap/i, /masscan/i,
    /zap/i, /burp/i, /acunetix/i, /nessus/i
  ],
  
  // Rate limiting by endpoint
  endpointLimits: {
    '/api/chat': { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
    '/api/admin': { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
    '/api/auth': { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
    '/api/demo': { maxRequests: 3, windowMs: 60000 }, // 3 requests per minute
  },
  
  // Security headers
  securityHeaders: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  }
};

// IP-based rate limiter
const ipRateLimiters = new Map<string, SimpleRateLimiter>();

// Get client IP address
export function getClientIP(request: NextRequest, headers?: Headers): string {
  const headersToUse = headers || request.headers;
  const forwarded = headersToUse.get('x-forwarded-for');
  const realIP = headersToUse.get('x-real-ip');
  const cfConnectingIP = headersToUse.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

// Check if IP is whitelisted
export function isWhitelisted(ip: string): boolean {
  return DDOS_PROTECTION.whitelist.includes(ip);
}

// Check if IP is blacklisted
export function isBlacklisted(ip: string): boolean {
  return DDOS_PROTECTION.blacklist.has(ip);
}

// Add IP to blacklist
export function blacklistIP(ip: string, duration: number = DDOS_PROTECTION.blockDurationMs): void {
  DDOS_PROTECTION.blacklist.add(ip);
  
  // Auto-remove after duration
  setTimeout(() => {
    DDOS_PROTECTION.blacklist.delete(ip);
  }, duration);
}

// Remove IP from blacklist
export function whitelistIP(ip: string): void {
  DDOS_PROTECTION.blacklist.delete(ip);
}

// Get or create rate limiter for IP
function getRateLimiter(ip: string): SimpleRateLimiter {
  if (!ipRateLimiters.has(ip)) {
    ipRateLimiters.set(ip, new SimpleRateLimiter({
      maxRequests: DDOS_PROTECTION.maxRequestsPerMinute,
      windowMs: 60 * 1000, // 1 minute
    }));
  }
  return ipRateLimiters.get(ip)!;
}

// Check DDoS protection
export function checkDDoSProtection(request: NextRequest, headers?: Headers): {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
} {
  const pathname = request.nextUrl.pathname;

  // Video pipeline endpoints — many polls/range requests during processing
  if (/^\/api\/video\/[^/]+\/(stream|status\/stream)$/.test(pathname)) {
    return { allowed: true };
  }
  if (pathname === '/api/video/process' || pathname.startsWith('/api/video/process/')) {
    return { allowed: true };
  }
  if (pathname === '/api/cron/video-process') {
    return { allowed: true };
  }
  if (/^\/api\/video\/[^/]+$/.test(pathname) && request.method === 'GET') {
    return { allowed: true };
  }

  const ip = getClientIP(request, headers);
  
  // Check whitelist
  if (isWhitelisted(ip)) {
    return { allowed: true };
  }
  
  // Check blacklist
  if (isBlacklisted(ip)) {
    return { 
      allowed: false, 
      reason: 'IP is blacklisted',
      retryAfter: DDOS_PROTECTION.blockDurationMs / 1000
    };
  }
  
  // Check rate limits
  const rateLimiter = getRateLimiter(ip);
  const result = rateLimiter.checkLimit(ip);
  
  if (!result.allowed) {
    // If rate limit exceeded multiple times, blacklist IP
    if (result.remaining === 0 && result.resetTime > Date.now() + 5 * 60 * 1000) {
      blacklistIP(ip);
      return { 
        allowed: false, 
        reason: 'Rate limit exceeded - IP blacklisted',
        retryAfter: DDOS_PROTECTION.blockDurationMs / 1000
      };
    }
    
    return { 
      allowed: false, 
      reason: 'Rate limit exceeded',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    };
  }
  
  return { allowed: true };
}

// Security headers middleware
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com https://clerk.accounts.dev https://*.clerk.accounts.dev",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.anthropic.com https://bedrock-runtime.us-east-1.amazonaws.com https://www.google-analytics.com https://api.mailerlite.com https://clerk.accounts.dev https://*.clerk.accounts.dev",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://clerk.accounts.dev https://*.clerk.accounts.dev",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; '),
  };
}

// Input validation and sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate video ID format
export function isValidVideoId(videoId: string): boolean {
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  return videoIdRegex.test(videoId);
}

// SQL injection protection (for MongoDB queries)
export function sanitizeMongoQuery(query: any): any {
  if (typeof query === 'string') {
    return sanitizeInput(query);
  }
  
  if (Array.isArray(query)) {
    return query.map(sanitizeMongoQuery);
  }
  
  if (query && typeof query === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(query)) {
      sanitized[key] = sanitizeMongoQuery(value);
    }
    return sanitized;
  }
  
  return query;
}

// CORS configuration
export function getCORSHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = [
    'https://chatpye.com',
    'https://www.chatpye.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// API key validation
export function validateAPIKey(apiKey: string, expectedKey: string): boolean {
  if (!apiKey || !expectedKey) return false;
  
  // Use constant-time comparison to prevent timing attacks
  if (apiKey.length !== expectedKey.length) return false;
  
  let result = 0;
  for (let i = 0; i < apiKey.length; i++) {
    result |= apiKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }
  
  return result === 0;
}

// Request size validation
export function validateRequestSize(request: NextRequest, maxSize: number = 1024 * 1024, headers?: Headers): boolean {
  const headersToUse = headers || request.headers;
  const contentLength = headersToUse.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    return size <= maxSize;
  }
  return true; // If no content-length header, assume it's okay
}

// Log security events
export function logSecurityEvent(
  event: string,
  details: any,
  ip: string,
  userAgent?: string
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip,
    userAgent,
    details,
  };
  
  // In production, send to security monitoring service
  console.warn('Security Event:', JSON.stringify(logEntry));
  
  // You could also send to external services like:
  // - AWS CloudWatch
  // - Datadog
  // - Sentry
  // - Custom security dashboard
}

// Clean up old rate limiters (run periodically)
export function cleanupRateLimiters(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [ip, limiter] of ipRateLimiters.entries()) {
    if (now - limiter.lastReset > maxAge) {
      ipRateLimiters.delete(ip);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupRateLimiters, 60 * 60 * 1000);

// Enhanced security functions

/**
 * Detect if a user agent is a bot
 */
export function detectBot(userAgent: string): boolean {
  return SECURITY_CONFIG.botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Detect suspicious user agents (security tools, scanners)
 */
export function detectSuspiciousUserAgent(userAgent: string): boolean {
  return SECURITY_CONFIG.suspiciousUserAgents.some(pattern => pattern.test(userAgent));
}

/**
 * Check if IP is in whitelist
 */
export function isWhitelistedIP(ip: string): boolean {
  return DDOS_PROTECTION.whitelist.includes(ip);
}

/**
 * Check if IP is blacklisted
 */
export function isBlacklistedIP(ip: string): boolean {
  return DDOS_PROTECTION.blacklist.has(ip);
}




/**
 * Check burst protection (rapid requests in short time)
 */
export async function checkBurstProtection(request: NextRequest): Promise<{ allowed: boolean; remaining: number }> {
  const clientIP = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  
  // Get or create burst limiter for this IP
  const limiterKey = `burst:${clientIP}`;
  let limiter = ipRateLimiters.get(limiterKey);
  
  if (!limiter) {
    limiter = new SimpleRateLimiter({
      maxRequests: DDOS_PROTECTION.maxBurstRequests,
      windowMs: DDOS_PROTECTION.burstWindowMs
    });
    ipRateLimiters.set(limiterKey, limiter);
  }
  
  const result = limiter.checkLimit(pathname);
  
  // If burst limit exceeded, temporarily blacklist IP
  if (!result.allowed) {
    blacklistIP(clientIP);
    // Auto-remove from blacklist after block duration
    setTimeout(() => {
      whitelistIP(clientIP);
    }, DDOS_PROTECTION.blockDurationMs);
  }
  
  return result;
}

/**
 * Check endpoint-specific rate limits
 */
export async function checkEndpointRateLimit(request: NextRequest): Promise<{ allowed: boolean; remaining: number }> {
  const clientIP = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  
  // Find matching endpoint limit
  const endpointLimit = Object.entries(SECURITY_CONFIG.endpointLimits)
    .find(([endpoint]) => pathname.startsWith(endpoint));
  
  if (!endpointLimit) {
    return { allowed: true, remaining: 999 };
  }
  
  const [, limit] = endpointLimit;
  const limiterKey = `endpoint:${clientIP}:${pathname}`;
  
  let limiter = ipRateLimiters.get(limiterKey);
  if (!limiter) {
    limiter = new SimpleRateLimiter(limit);
    ipRateLimiters.set(limiterKey, limiter);
  }
  
  return limiter.checkLimit(pathname);
}

/**
 * Get all security headers
 */
export function getAllSecurityHeaders(): Record<string, string> {
  return {
    ...SECURITY_CONFIG.securityHeaders,
    'Content-Security-Policy': 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://clerk.accounts.dev https://*.clerk.accounts.dev; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://clerk.accounts.dev https://*.clerk.accounts.dev; " +
      "frame-src 'self' https://js.stripe.com https://clerk.accounts.dev https://*.clerk.accounts.dev;"
  };
}

/**
 * Calculate risk score for a request
 */
export function calculateRiskScore(request: NextRequest, headers?: Headers): number {
  let riskScore = 0;
  const clientIP = getClientIP(request, headers);
  const headersToUse = headers || request.headers;
  const userAgent = headersToUse.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;
  
  // Bot detection
  if (detectBot(userAgent)) {
    riskScore += 30;
  }
  
  // Suspicious user agent
  if (detectSuspiciousUserAgent(userAgent)) {
    riskScore += 50;
  }
  
  // Admin endpoints
  if (pathname.startsWith('/api/admin')) {
    riskScore += 20;
  }
  
  // No referrer (possible direct API access)
  if (!headersToUse.get('referer')) {
    riskScore += 15;
  }
  
  // Missing common headers
  if (!headersToUse.get('accept')) {
    riskScore += 10;
  }
  
  // Unusual request methods
  if (!['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'].includes(request.method)) {
    riskScore += 25;
  }
  
  return Math.min(riskScore, 100); // Cap at 100
}

