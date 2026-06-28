import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import mongoose from 'mongoose';

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

// Watch history schema
const WatchHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  channelName: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  watchedDuration: { type: Number, default: 0 },
  completionPercentage: { type: Number, default: 0 },
  lastWatchedAt: { type: Date, default: Date.now },
  firstWatchedAt: { type: Date, default: Date.now },
  watchCount: { type: Number, default: 1 },
  isCompleted: { type: Boolean, default: false },
  metadata: {
    source: { type: String, default: 'extension' },
    videoUrl: { type: String, default: '' },
    lastPosition: { type: Number, default: 0 }
  }
});

const WatchHistory = mongoose.models.WatchHistory || mongoose.model('WatchHistory', WatchHistorySchema);

// In-memory storage for development
const inMemoryWatchHistoryStorage = new Map();

// Get video metadata from YouTube
async function getVideoMetadata(videoId: string): Promise<any> {
  try {
    // In a real implementation, you would use YouTube API
    // For now, return mock data
    return {
      title: `Video ${videoId}`,
      channelName: 'Sample Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 600 // 10 minutes default
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return {
      title: `Video ${videoId}`,
      channelName: 'Unknown Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 600
    };
  }
}

// GET - Retrieve watch history for a user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'lastWatchedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    let query: any = { userId: auth.id };
    
    if (videoId) {
      query.videoId = videoId;
    }
    
    let sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    let watchHistory;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      watchHistory = await WatchHistory.find(query)
        .sort(sortOptions)
        .limit(limit)
        .skip(offset);
    } else {
      // Use in-memory storage for development
      watchHistory = Array.from(inMemoryWatchHistoryStorage.values())
        .filter(entry => entry.userId === auth.id)
        .filter(entry => !videoId || entry.videoId === videoId)
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
      watchHistory: watchHistory.map(entry => ({
        id: entry._id || entry.id,
        videoId: entry.videoId,
        title: entry.title,
        channelName: entry.channelName,
        thumbnail: entry.thumbnail,
        duration: entry.duration,
        watchedDuration: entry.watchedDuration,
        completionPercentage: entry.completionPercentage,
        lastWatchedAt: entry.lastWatchedAt,
        firstWatchedAt: entry.firstWatchedAt,
        watchCount: entry.watchCount,
        isCompleted: entry.isCompleted,
        metadata: entry.metadata
      })),
      total: watchHistory.length,
      hasMore: watchHistory.length === limit
    });
    
  } catch (error) {
    console.error('Watch history retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve watch history' },
      { status: 500 }
    );
  }
}

// POST - Add or update watch history entry
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      videoId, 
      watchedDuration, 
      lastPosition = 0 
    } = await request.json();
    
    if (!videoId || watchedDuration === undefined) {
      return NextResponse.json({ 
        error: 'Video ID and watched duration are required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    // Get video metadata
    const videoMetadata = await getVideoMetadata(videoId);
    
    // Check if entry already exists
    let existingEntry;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      existingEntry = await WatchHistory.findOne({ userId: auth.id, videoId });
    } else {
      // Use in-memory storage for development
      existingEntry = Array.from(inMemoryWatchHistoryStorage.values())
        .find(entry => entry.userId === auth.id && entry.videoId === videoId);
    }
    
    let entry;
    if (existingEntry) {
      // Update existing entry
      existingEntry.watchedDuration = Math.max(existingEntry.watchedDuration, watchedDuration);
      existingEntry.lastWatchedAt = new Date();
      existingEntry.watchCount += 1;
      existingEntry.metadata.lastPosition = lastPosition;
      
      // Calculate completion percentage
      const completionPercentage = (existingEntry.watchedDuration / videoMetadata.duration) * 100;
      existingEntry.completionPercentage = Math.min(completionPercentage, 100);
      existingEntry.isCompleted = completionPercentage >= 90; // 90% = completed
      
      entry = existingEntry;
    } else {
      // Create new entry
      const completionPercentage = (watchedDuration / videoMetadata.duration) * 100;
      
      const entryData = {
        userId: auth.id,
        videoId,
        title: videoMetadata.title,
        channelName: videoMetadata.channelName,
        thumbnail: videoMetadata.thumbnail,
        duration: videoMetadata.duration,
        watchedDuration,
        completionPercentage: Math.min(completionPercentage, 100),
        lastWatchedAt: new Date(),
        firstWatchedAt: new Date(),
        watchCount: 1,
        isCompleted: completionPercentage >= 90,
        metadata: {
          source: 'extension',
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          lastPosition
        }
      };
      
      entry = entryData;
    }
    
    // Save entry
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      if (existingEntry) {
        await existingEntry.save();
        entry = existingEntry;
      } else {
        // Create new entry from the entry data we already have
        const newEntry = new WatchHistory({
          userId: auth.id,
          videoId,
          title: videoMetadata.title,
          channelName: videoMetadata.channelName,
          thumbnail: videoMetadata.thumbnail,
          duration: videoMetadata.duration,
          watchedDuration,
          completionPercentage: Math.min((watchedDuration / videoMetadata.duration) * 100, 100),
          lastWatchedAt: new Date(),
          firstWatchedAt: new Date(),
          watchCount: 1,
          isCompleted: (watchedDuration / videoMetadata.duration) * 100 >= 90,
          metadata: {
            source: 'extension',
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            lastPosition
          }
        });
        await newEntry.save();
        entry = newEntry;
      }
    } else {
      // Use in-memory storage for development
      const entryId = `${auth.id}_${videoId}`;
      inMemoryWatchHistoryStorage.set(entryId, entry);
    }
    
    // Award XP for watching videos
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/xp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || ''
        },
        body: JSON.stringify({
          action: 'video_watched',
          metadata: { 
            videoId, 
            watchedDuration, 
            completionPercentage: entry.completionPercentage,
            isCompleted: entry.isCompleted 
          }
        })
      });
    } catch (error) {
      console.error('Error awarding XP for video watch:', error);
    }
    
    return NextResponse.json({
      success: true,
      watchHistory: {
        id: entry._id || entry.id,
        videoId: entry.videoId,
        title: entry.title,
        channelName: entry.channelName,
        thumbnail: entry.thumbnail,
        duration: entry.duration,
        watchedDuration: entry.watchedDuration,
        completionPercentage: entry.completionPercentage,
        lastWatchedAt: entry.lastWatchedAt,
        firstWatchedAt: entry.firstWatchedAt,
        watchCount: entry.watchCount,
        isCompleted: entry.isCompleted,
        metadata: entry.metadata
      }
    });
    
  } catch (error) {
    console.error('Watch history update error:', error);
    return NextResponse.json(
      { error: 'Failed to update watch history' },
      { status: 500 }
    );
  }
}

// DELETE - Clear watch history
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    let deleted;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      if (videoId) {
        deleted = await WatchHistory.deleteMany({ 
          userId: auth.id, 
          videoId 
        });
      } else {
        deleted = await WatchHistory.deleteMany({ 
          userId: auth.id 
        });
      }
    } else {
      // Use in-memory storage for development
      if (videoId) {
        const entryId = `${auth.id}_${videoId}`;
        deleted = inMemoryWatchHistoryStorage.delete(entryId) ? { deletedCount: 1 } : { deletedCount: 0 };
      } else {
        const userEntries = Array.from(inMemoryWatchHistoryStorage.entries())
          .filter(([key, entry]) => entry.userId === auth.id);
        userEntries.forEach(([key]) => inMemoryWatchHistoryStorage.delete(key));
        deleted = { deletedCount: userEntries.length };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: videoId ? 'Video removed from watch history' : 'Watch history cleared',
      deletedCount: deleted.deletedCount || 0
    });
    
  } catch (error) {
    console.error('Watch history deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to clear watch history' },
      { status: 500 }
    );
  }
}

