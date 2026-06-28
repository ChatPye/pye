import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

interface Bookmark {
  id: string;
  videoId: string;
  title: string;
  timestamp: number;
  thumbnailUrl?: string;
  createdAt: string;
  userId: string;
}

// GET - Get bookmarks for the extension
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // For now, return empty bookmarks since we don't have a database connection
    // In production, this would fetch from MongoDB/DocumentDB
    const bookmarks: Bookmark[] = [];
    
    return NextResponse.json({
      success: true,
      bookmarks,
      total: bookmarks.length
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks' },
      { status: 500 }
    );
  }
}

// POST - Create a new bookmark from the extension
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await request.json();
    const { videoId, title, timestamp, thumbnailUrl } = body;
    
    if (!videoId || !title) {
      return NextResponse.json(
        { error: 'videoId and title are required' },
        { status: 400 }
      );
    }
    
    // For now, just return success since we don't have a database connection
    // In production, this would save to MongoDB/DocumentDB
    const bookmark: Bookmark = {
      id: `bookmark_${Date.now()}`,
      videoId,
      title,
      timestamp: timestamp || 0,
      thumbnailUrl,
      createdAt: new Date().toISOString(),
      userId: auth.id
    };
    
    return NextResponse.json({
      success: true,
      bookmark
    });
  } catch (error) {
    console.error('Error creating bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to create bookmark' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a bookmark
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const bookmarkId = searchParams.get('id');
    
    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'Bookmark ID is required' },
        { status: 400 }
      );
    }
    
    // For now, just return success since we don't have a database connection
    // In production, this would delete from MongoDB/DocumentDB
    
    return NextResponse.json({
      success: true,
      message: 'Bookmark deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to delete bookmark' },
      { status: 500 }
    );
  }
}
