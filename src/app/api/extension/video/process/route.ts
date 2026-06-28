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

// Proxy to the main video process endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, forceReprocess, testMode } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Check for dev bypass
    const isDevBypass = request.headers.get('X-Dev-Bypass') === 'true';
    
    // Forward to main video process endpoint with dev bypass support
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

    const videoResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/video/process`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ videoId, forceReprocess, testMode })
    });

    if (!videoResponse.ok) {
      const errorText = await videoResponse.text();
      return NextResponse.json({ 
        error: errorText || 'Failed to process video' 
      }, { 
        status: videoResponse.status, 
        headers: corsHeaders 
      });
    }

    const data = await videoResponse.json();
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error) {
    console.error('Extension video process API error:', error);
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Forward to main video process endpoint
    const videoResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://chatpye.com'}/api/video/process?videoId=${videoId}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json'
      }
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
    console.error('Extension video process API error:', error);
    return NextResponse.json(
      { error: 'Failed to load video' },
      { status: 500, headers: corsHeaders }
    );
  }
}
