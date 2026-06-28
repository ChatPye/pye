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

// Extension sync schema to track data synchronization
const ExtensionSyncSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  extensionId: { type: String, required: true },
  syncType: { 
    type: String, 
    enum: ['bookmark', 'note', 'watch_history', 'dashboard_data'],
    required: true 
  },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now },
  source: { type: String, enum: ['extension', 'dashboard'], default: 'extension' }
});

const ExtensionSync = mongoose.models.ExtensionSync || mongoose.model('ExtensionSync', ExtensionSyncSchema);

// In-memory storage for development
const inMemorySyncStorage = new Map();

// POST - Sync data from extension to dashboard
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { syncType, data, extensionId } = await request.json();
    
    if (!syncType || !data) {
      return NextResponse.json({ 
        error: 'Sync type and data are required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    // Store sync data
    const syncData = {
      userId: auth.id,
      extensionId: extensionId || 'unknown',
      syncType,
      data,
      timestamp: new Date(),
      source: 'extension'
    };
    
    let syncRecord;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      syncRecord = new ExtensionSync(syncData);
      await syncRecord.save();
    } else {
      // Use in-memory storage for development
      const syncId = `${auth.id}_${syncType}_${Date.now()}`;
      syncRecord = { _id: syncId, ...syncData };
      inMemorySyncStorage.set(syncId, syncRecord);
    }
    
    // Process the sync based on type
    let result;
    switch (syncType) {
      case 'bookmark':
        result = await processBookmarkSync(auth.id, data);
        break;
      case 'note':
        result = await processNoteSync(auth.id, data);
        break;
      case 'watch_history':
        result = await processWatchHistorySync(auth.id, data);
        break;
      case 'dashboard_data':
        result = await processDashboardDataSync(auth.id, data);
        break;
      default:
        return NextResponse.json({ 
          error: 'Invalid sync type' 
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      syncId: syncRecord._id,
      processed: result,
      message: `${syncType} synced successfully`
    });
    
  } catch (error) {
    console.error('Extension sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync data' },
      { status: 500 }
    );
  }
}

// GET - Get sync status and recent syncs
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('syncType');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    let query: any = { userId: auth.id };
    if (syncType) {
      query.syncType = syncType;
    }
    
    let syncs;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      syncs = await ExtensionSync.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);
    } else {
      // Use in-memory storage for development
      syncs = Array.from(inMemorySyncStorage.values())
        .filter(sync => sync.userId === auth.id)
        .filter(sync => !syncType || sync.syncType === syncType)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    }
    
    return NextResponse.json({
      success: true,
      syncs: syncs.map(sync => ({
        id: sync._id,
        syncType: sync.syncType,
        timestamp: sync.timestamp,
        source: sync.source,
        extensionId: sync.extensionId
      })),
      total: syncs.length
    });
    
  } catch (error) {
    console.error('Extension sync retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sync data' },
      { status: 500 }
    );
  }
}

// Process bookmark sync from extension
async function processBookmarkSync(userId: string, bookmarkData: any) {
  try {
    // Forward to bookmarks API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...bookmarkData,
        userId
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error processing bookmark sync:', error);
    return { error: 'Failed to sync bookmark' };
  }
}

// Process note sync from extension
async function processNoteSync(userId: string, noteData: any) {
  try {
    // Forward to notes API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...noteData,
        userId
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error processing note sync:', error);
    return { error: 'Failed to sync note' };
  }
}

// Process watch history sync from extension
async function processWatchHistorySync(userId: string, watchHistoryData: any) {
  try {
    // Forward to watch history API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/watch-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...watchHistoryData,
        userId
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error processing watch history sync:', error);
    return { error: 'Failed to sync watch history' };
  }
}

// Process dashboard data sync from extension
async function processDashboardDataSync(userId: string, dashboardData: any) {
  try {
    // This could trigger XP rewards, credit updates, etc.
    // For now, just log the sync
    console.log('Dashboard data synced from extension:', {
      userId,
      data: dashboardData,
      timestamp: new Date()
    });
    
    return { 
      success: true, 
      message: 'Dashboard data synced',
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error processing dashboard data sync:', error);
    return { error: 'Failed to sync dashboard data' };
  }
}
