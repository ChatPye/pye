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

// Basic chat endpoint for extension with dev bypass support
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, question, useTranscript } = body;

    if (!videoId || !question) {
      return NextResponse.json({ error: 'Video ID and question are required' }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Check for dev bypass
    const headers = request.headers;
    const isDevBypass = headers.get('X-Dev-Bypass') === 'true';
    
    // Forward to main basic chat endpoint with dev bypass support
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (isDevBypass) {
      requestHeaders['X-Dev-Bypass'] = 'true';
      requestHeaders['X-Dev-Email'] = headers.get('X-Dev-Email') || 'dev@chatpye.local';
    } else {
      // Production path - require auth
      const auth = await requireAuth();
      requestHeaders['Authorization'] = headers.get('Authorization') || '';
    }

    const chatResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat/basic`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({ 
        videoId, 
        question,
        useTranscript: true
      })
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      return NextResponse.json({ 
        error: errorText || 'Basic chat request failed' 
      }, { 
        status: chatResponse.status, 
        headers: corsHeaders 
      });
    }

    // Stream the response back to the extension
    const response = new NextResponse(chatResponse.body, {
      status: chatResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': chatResponse.headers.get('Content-Type') || 'application/json',
      }
    });

    return response;

  } catch (error) {
    console.error('Extension basic chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process basic chat request' },
      { status: 500, headers: corsHeaders }
    );
  }
}
