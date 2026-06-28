import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import mongoose from 'mongoose';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// DocumentDB connection
const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  
  if (!process.env.MONGODB_URI && !process.env.DOCUMENTDB_URI && process.env.NODE_ENV === 'development') {
    console.log('No database configured, using in-memory storage for development');
    return;
  }
  
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || process.env.DOCUMENTDB_URI || 'mongodb://localhost:27017/chatpye'
    );
  } catch (error) {
    console.error('Database connection failed:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to in-memory storage for development');
    } else {
      throw error;
    }
  }
};

// Bookmark schema
const BookmarkSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  timestamp: { type: Number, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'general' },
  tags: [String],
  isPublic: { type: Boolean, default: false },
  shareUrl: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  videoTitle: { type: String, default: '' },
  channelName: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  metadata: {
    source: { type: String, default: 'extension' },
    videoUrl: { type: String, default: '' },
    timestampFormatted: { type: String, default: '' }
  }
});

const Bookmark = mongoose.models.Bookmark || mongoose.model('Bookmark', BookmarkSchema);

// In-memory storage for development
const inMemoryBookmarkStorage = new Map();

// Format timestamp to readable format
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Get video metadata from YouTube
async function getVideoMetadata(videoId: string): Promise<any> {
  try {
    // In a real implementation, you would use YouTube API
    // For now, return mock data
    return {
      title: `Video ${videoId}`,
      channelName: 'Sample Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return {
      title: `Video ${videoId}`,
      channelName: 'Unknown Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0
    };
  }
}

// GET - Retrieve bookmarks for a user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    let query: any = { userId: auth.id };
    
    if (videoId) {
      query.videoId = videoId;
    }
    
    if (category) {
      query.category = category;
    }
    
    let sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    let bookmarks;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      bookmarks = await Bookmark.find(query)
        .sort(sortOptions)
        .limit(limit)
        .skip(offset);
    } else {
      // Use in-memory storage for development
      bookmarks = Array.from(inMemoryBookmarkStorage.values())
        .filter(bookmark => bookmark.userId === auth.id)
        .filter(bookmark => !videoId || bookmark.videoId === videoId)
        .filter(bookmark => !category || bookmark.category === category)
        .sort((a, b) => {
          const aVal = a[sortBy as keyof typeof a];
          const bVal = b[sortBy as keyof typeof b];
          if (sortOrder === 'desc') {
            return new Date(bVal as any).getTime() - new Date(aVal as any).getTime();
          } else {
            return new Date(aVal as any).getTime() - new Date(bVal as any).getTime();
          }
        })
        .slice(offset, offset + limit);
    }
    
    return NextResponse.json({
      success: true,
      bookmarks: bookmarks.map(bookmark => ({
        id: bookmark._id || bookmark.id,
        videoId: bookmark.videoId,
        title: bookmark.title,
        timestamp: bookmark.timestamp,
        description: bookmark.description,
        category: bookmark.category,
        tags: bookmark.tags,
        isPublic: bookmark.isPublic,
        shareUrl: bookmark.shareUrl,
        thumbnail: bookmark.thumbnail,
        videoTitle: bookmark.videoTitle,
        channelName: bookmark.channelName,
        duration: bookmark.duration,
        createdAt: bookmark.createdAt,
        updatedAt: bookmark.updatedAt,
        metadata: bookmark.metadata
      })),
      total: bookmarks.length,
      hasMore: bookmarks.length === limit
    });
    
  } catch (error) {
    console.error('Bookmarks retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve bookmarks' },
      { status: 500 }
    );
  }
}

// POST - Create a new bookmark
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      videoId, 
      title, 
      timestamp, 
      description = '', 
      category = 'general',
      tags = [],
      isPublic = false 
    } = await request.json();
    
    if (!videoId || !title || timestamp === undefined) {
      return NextResponse.json({ 
        error: 'Video ID, title, and timestamp are required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    // Get video metadata
    const videoMetadata = await getVideoMetadata(videoId);
    
    const bookmarkData = {
      userId: auth.id,
      videoId,
      title,
      timestamp,
      description,
      category,
      tags,
      isPublic,
      thumbnail: videoMetadata.thumbnail,
      videoTitle: videoMetadata.title,
      channelName: videoMetadata.channelName,
      duration: videoMetadata.duration,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        source: 'extension',
        videoUrl: `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(timestamp)}s`,
        timestampFormatted: formatTimestamp(timestamp)
      }
    };
    
    let bookmark;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      bookmark = new Bookmark(bookmarkData);
      await bookmark.save();
    } else {
      // Use in-memory storage for development
      const bookmarkId = `${auth.id}_${videoId}_${timestamp}_${Date.now()}`;
      bookmark = { _id: bookmarkId, ...bookmarkData };
      inMemoryBookmarkStorage.set(bookmarkId, bookmark);
    }
    
    // Award XP for bookmark creation
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/xp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || ''
        },
        body: JSON.stringify({
          action: 'bookmark_created',
          metadata: { videoId, timestamp }
        })
      });
    } catch (error) {
      console.error('Error awarding XP for bookmark:', error);
    }
    
    return NextResponse.json({
      success: true,
      bookmark: {
        id: bookmark._id,
        videoId: bookmark.videoId,
        title: bookmark.title,
        timestamp: bookmark.timestamp,
        description: bookmark.description,
        category: bookmark.category,
        tags: bookmark.tags,
        isPublic: bookmark.isPublic,
        thumbnail: bookmark.thumbnail,
        videoTitle: bookmark.videoTitle,
        channelName: bookmark.channelName,
        duration: bookmark.duration,
        createdAt: bookmark.createdAt,
        updatedAt: bookmark.updatedAt,
        metadata: bookmark.metadata
      }
    });
    
  } catch (error) {
    console.error('Bookmark creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create bookmark' },
      { status: 500 }
    );
  }
}

// PUT - Update a bookmark
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      bookmarkId, 
      title, 
      description, 
      category, 
      tags, 
      isPublic 
    } = await request.json();
    
    if (!bookmarkId) {
      return NextResponse.json({ 
        error: 'Bookmark ID is required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    
    let bookmark;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      bookmark = await Bookmark.findOneAndUpdate(
        { _id: bookmarkId, userId: auth.id },
        updateData,
        { new: true }
      );
    } else {
      // Use in-memory storage for development
      const existingBookmark = inMemoryBookmarkStorage.get(bookmarkId);
      if (existingBookmark && existingBookmark.userId === auth.id) {
        bookmark = { ...existingBookmark, ...updateData };
        inMemoryBookmarkStorage.set(bookmarkId, bookmark);
      }
    }
    
    if (!bookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      bookmark: {
        id: bookmark._id,
        videoId: bookmark.videoId,
        title: bookmark.title,
        timestamp: bookmark.timestamp,
        description: bookmark.description,
        category: bookmark.category,
        tags: bookmark.tags,
        isPublic: bookmark.isPublic,
        thumbnail: bookmark.thumbnail,
        videoTitle: bookmark.videoTitle,
        channelName: bookmark.channelName,
        duration: bookmark.duration,
        createdAt: bookmark.createdAt,
        updatedAt: bookmark.updatedAt,
        metadata: bookmark.metadata
      }
    });
    
  } catch (error) {
    console.error('Bookmark update error:', error);
    return NextResponse.json(
      { error: 'Failed to update bookmark' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a bookmark
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const bookmarkId = searchParams.get('bookmarkId');
    
    if (!bookmarkId) {
      return NextResponse.json({ 
        error: 'Bookmark ID is required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    let deleted;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      deleted = await Bookmark.findOneAndDelete({ 
        _id: bookmarkId, 
        userId: auth.id 
      });
    } else {
      // Use in-memory storage for development
      const existingBookmark = inMemoryBookmarkStorage.get(bookmarkId);
      if (existingBookmark && existingBookmark.userId === auth.id) {
        inMemoryBookmarkStorage.delete(bookmarkId);
        deleted = existingBookmark;
      }
    }
    
    if (!deleted) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Bookmark deleted successfully'
    });
    
  } catch (error) {
    console.error('Bookmark deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete bookmark' },
      { status: 500 }
    );
  }
}
