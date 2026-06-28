import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { getClientIP, checkDDoSProtection, validateRequestSize, getCORSHeaders, SECURITY_CONFIG } from '@/lib/security';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/workspace(.*)',
  '/admin(.*)',
  '/api/user(.*)',
  '/api/admin(.*)'
]);

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  const headers = request.headers;
  const clientIP = getClientIP(request, headers);

  // Skip middleware for static assets and public routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/pyelab') ||
    pathname.startsWith('/start')  // Allow access to start route for authentication
  ) {
    return NextResponse.next();
  }

  // E2E/dev test mode: bypass middleware entirely to avoid auth dependencies
  if (process.env.E2E === 'true') {
    return NextResponse.next();
  }

  const { userId } = await auth();

  // Redirect authenticated users to workspace
  if (userId) {
    console.log(`🔐 Authenticated user ${userId} accessing ${pathname}`);
    
    // If user is on the landing page, redirect to default workspace
    if (pathname === '/') {
      console.log('🔄 Redirecting authenticated user from / to /workspace');
      return NextResponse.redirect(new URL('/workspace', request.url));
    }
    
    // If user is on sign-in/sign-up pages but already authenticated, redirect to workspace
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
      const redirectUrl = new URL('/workspace', request.url);
      // Preserve any redirect parameter from the original request
      const originalRedirect = request.nextUrl.searchParams.get('redirect');
      if (originalRedirect) {
        redirectUrl.pathname = originalRedirect;
        console.log(`🔄 Redirecting authenticated user to ${originalRedirect}`);
      } else {
        console.log('🔄 Redirecting authenticated user to /workspace');
      }
      return NextResponse.redirect(redirectUrl);
    }
    
    // If user is already on a workspace route, let them through
    if (pathname.startsWith('/workspace')) {
      console.log(`✅ Authenticated user accessing workspace: ${pathname}`);
      return NextResponse.next();
    }
  } else {
    console.log(`🔓 Unauthenticated user accessing ${pathname}`);
  }

  // Security checks for production
  if (process.env.NODE_ENV === 'production') {
    // DDoS Protection
    const ddosCheck = await checkDDoSProtection(request, headers);
    if (!ddosCheck.allowed) {
      console.warn(`🚨 DDoS protection triggered for IP: ${clientIP}`);
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          ...getCORSHeaders()
        }
      });
    }

    // Request size validation
    const sizeCheck = validateRequestSize(request, SECURITY_CONFIG.maxRequestSize, headers);
    if (!sizeCheck) {
      console.warn(`🚨 Large request blocked from IP: ${clientIP}`);
      return new NextResponse('Request Too Large', { 
        status: 413,
        headers: getCORSHeaders()
      });
    }

    // Bot detection for API routes
    if (pathname.startsWith('/api/')) {
      const userAgent = headers.get('user-agent') || '';
      const isBot = detectBot(userAgent);
      
      if (isBot) {
        console.warn(`🚨 Bot detected: ${userAgent} from IP: ${clientIP}`);
        // Log security event
        await logSecurityEvent({
          type: 'bot_detected',
          severity: 'medium',
          ipAddress: clientIP,
          userAgent,
          endpoint: pathname,
          method: request.method
        });
      }
    }
  }

  // Protect routes that require authentication
  if (isProtectedRoute(request)) {
    if (!userId) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const signInUrl = new URL('/sign-in', request.url);
      const redirectPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      signInUrl.searchParams.set('redirect', redirectPath || '/workspace');

      const source = request.nextUrl.searchParams.get('source');
      if (source) {
        signInUrl.searchParams.set('source', source);
      }

      const referral = request.nextUrl.searchParams.get('ref');
      if (referral) {
        signInUrl.searchParams.set('ref', referral);
      }

      return NextResponse.redirect(signInUrl);
    }
  }

  // Add security headers
  const response = NextResponse.next();
  addSecurityHeaders(response);
  
  return response;
});

// Bot detection function
function detectBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i,
    /postman/i, /insomnia/i, /httpie/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
}

// Add security headers
function addSecurityHeaders(response: NextResponse) {
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://clerk.accounts.dev https://clerk.chatpye.com https://*.clerk.accounts.dev https://*.clerk.chatpye.com https://www.googletagmanager.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; "+
    "media-src 'self' https://storage.googleapis.com; " +
    "connect-src 'self' https://api.stripe.com https://clerk.accounts.dev https://*.clerk.accounts.dev https://clerk.chatpye.com https://*.clerk.chatpye.com https://www.google-analytics.com https://region1.google-analytics.com; " +
    "frame-src 'self' https://js.stripe.com https://clerk.accounts.dev https://clerk.chatpye.com; " +
    "worker-src 'self' blob:;"
  );
  
  // HSTS for HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

// Log security events
async function logSecurityEvent(event: any) {
  try {
    // In production, this would send to your security monitoring system
    console.log('🔒 Security Event:', event);
    
    // You could also send to your security API
    // await fetch('/api/admin/security', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     action: 'log_security_event',
    //     data: event
    //   })
    // });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/start/:path*',  // Updated to handle catch-all route
    '/billing',
    '/return',
    '/dashboard/:path*',
    '/workspace/:path*',
    '/admin/:path*'
  ]
};
