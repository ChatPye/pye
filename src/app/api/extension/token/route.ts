import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// POST - Get or create extension token
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401, headers: corsHeaders });
    }

    const { installId } = await request.json();
    
    if (!installId) {
      return NextResponse.json({ 
        error: 'Install ID is required' 
      }, { status: 400, headers: corsHeaders });
    }

    // Create JWT token for extension
    const tokenPayload = {
      userId,
      installId,
      email: sessionClaims?.email,
      userClass: (sessionClaims?.metadata as any)?.userClass || 'freemium',
      subscription: (sessionClaims?.metadata as any)?.subscription || { tier: 'free' },
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      type: 'extension',
      iss: 'chatpye.com'
    };

    const secret = process.env.EXTENSION_JWT_SECRET || process.env.CLERK_SECRET_KEY || 'fallback-secret';
    const token = jwt.sign(tokenPayload, secret, { algorithm: 'HS256' });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: userId,
        email: sessionClaims?.email,
        userClass: (sessionClaims?.metadata as any)?.userClass || 'freemium',
        subscription: (sessionClaims?.metadata as any)?.subscription || { tier: 'free' }
      },
      expiresAt: tokenPayload.exp * 1000
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Extension token error:', error);
    return NextResponse.json(
      { error: 'Failed to generate extension token' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET - Verify extension token
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Invalid authorization header' 
      }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.substring(7);
    
    try {
      const secret = process.env.EXTENSION_JWT_SECRET || process.env.CLERK_SECRET_KEY || 'fallback-secret';
      const payload = jwt.verify(token, secret) as any;
      
      return NextResponse.json({
        success: true,
        valid: true,
        userId: payload.userId,
        installId: payload.installId,
        email: payload.email,
        userClass: payload.userClass,
        subscription: payload.subscription,
        expiresAt: payload.exp * 1000
      }, { headers: corsHeaders });
      
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Invalid or expired token' 
      }, { status: 401, headers: corsHeaders });
    }
    
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500, headers: corsHeaders }
    );
  }
}
