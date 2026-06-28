import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Demo transcript for landing page - pre-processed and cached
const DEMO_TRANSCRIPT = {
  videoId: "DH7REvnQ1y4",
  title: "Y Combinator Startup School — Building Products",
  summary: "This video covers essential principles for building successful products as a startup founder. Key topics include understanding user needs, building MVP (Minimum Viable Product), iterating based on feedback, and scaling effectively. The speaker emphasizes the importance of talking to users early and often, measuring what matters, and staying focused on solving real problems rather than building features.",
  transcript: [
    {
      text: "Welcome to Y Combinator Startup School. Today we're going to talk about building products that users actually want.",
      start: 0,
      duration: 5
    },
    {
      text: "The most common mistake I see founders make is building something they think is cool, without talking to users first.",
      start: 5,
      duration: 6
    },
    {
      text: "Your first step should always be to understand the problem you're trying to solve. Who has this problem? How are they currently solving it?",
      start: 11,
      duration: 8
    },
    {
      text: "Once you understand the problem, build the smallest possible version that solves it. This is your MVP - Minimum Viable Product.",
      start: 19,
      duration: 7
    },
    {
      text: "Don't worry about making it perfect. Get it in front of users as quickly as possible and start getting feedback.",
      start: 26,
      duration: 6
    },
    {
      text: "The feedback you get from real users is worth more than months of planning and building in isolation.",
      start: 32,
      duration: 6
    },
    {
      text: "Measure everything. What metrics matter most to your business? Focus on those and ignore vanity metrics.",
      start: 38,
      duration: 6
    },
    {
      text: "User acquisition, retention, and revenue are usually the metrics that matter most for early-stage startups.",
      start: 44,
      duration: 6
    },
    {
      text: "Iterate quickly. Take user feedback, make changes, and test again. This cycle should be as fast as possible.",
      start: 50,
      duration: 6
    },
    {
      text: "Remember, you're not building a product for yourself. You're building it for your users. Listen to them.",
      start: 56,
      duration: 6
    },
    {
      text: "When you're ready to scale, focus on the features that drive the most value for your users and your business.",
      start: 62,
      duration: 7
    },
    {
      text: "Don't try to be everything to everyone. Pick a specific niche and dominate it before expanding.",
      start: 69,
      duration: 6
    },
    {
      text: "Building a successful product is hard work, but following these principles will give you the best chance of success.",
      start: 75,
      duration: 6
    }
  ],
  embeddings: [] // Will be generated when needed
};

export async function GET() {
  return NextResponse.json({
    transcript: DEMO_TRANSCRIPT,
    success: true
  });
}

// Initialize demo transcript with embeddings (one-time setup)
export async function POST() {
  try {
    // Store the demo transcript in DocumentDB
    const storeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEMO_TRANSCRIPT)
    });

    if (storeResponse.ok) {
      // Generate embeddings for the demo transcript
      const embedResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: DEMO_TRANSCRIPT.videoId,
          transcript: DEMO_TRANSCRIPT.transcript
        })
      });

      if (embedResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Demo transcript initialized with embeddings'
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to initialize demo transcript'
    }, { status: 500 });

  } catch (error) {
    console.error('Error initializing demo transcript:', error);
    return NextResponse.json({
      error: 'Failed to initialize demo transcript',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
