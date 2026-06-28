import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Dev-Bypass, X-Dev-Email',
  'Access-Control-Max-Age': '86400',
};

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Handle video status requests with dev bypass support
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId') || searchParams.get('v');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Check for dev bypass
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true';
    
    // Forward to main video status endpoint with dev bypass support
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (isDevBypass) {
      headers['X-Dev-Bypass'] = 'true';
      headers['X-Dev-Email'] = request.headers.get('X-Dev-Email') || 'dev@chatpye.local';
    } else {
      // Production path - require auth
      const auth = await requireAuth();
      headers['Authorization'] = request.headers.get('Authorization') || '';
    }

    const videoResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/video/status?videoId=${videoId}`, {
      headers
    });

    if (!videoResponse.ok) {
      return NextResponse.json({ 
        error: 'Video not found' 
      }, { 
        status: videoResponse.status, 
        headers: corsHeaders 
      });
    }

    const data = await videoResponse.json();
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error) {
    console.error('Extension video status API error:', error);
    return NextResponse.json(
      { error: 'Failed to load video status' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Check for dev bypass
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true';
    
    // Forward to main video status endpoint with dev bypass support
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (isDevBypass) {
      headers['X-Dev-Bypass'] = 'true';
      headers['X-Dev-Email'] = request.headers.get('X-Dev-Email') || 'dev@chatpye.local';
    } else {
      // Production path - require auth
      const auth = await requireAuth();
      headers['Authorization'] = request.headers.get('Authorization') || '';
    }

    const videoResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/video/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ videoId })
    });

    if (!videoResponse.ok) {
      return NextResponse.json({ 
        error: 'Video not found' 
      }, { 
        status: videoResponse.status, 
        headers: corsHeaders 
      });
    }

    const data = await videoResponse.json();
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error) {
    console.error('Extension video status API error:', error);
    return NextResponse.json(
      { error: 'Failed to load video status' },
      { status: 500, headers: corsHeaders }
    );
  }
}
