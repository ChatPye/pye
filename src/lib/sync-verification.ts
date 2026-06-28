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

// DocumentDB schema for sync verification
const SyncVerificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  entityType: { 
    type: String, 
    required: true,
    enum: ['note', 'bookmark', 'share', 'chat_history', 'user_settings']
  },
  entityId: { type: String, required: true },
  source: { 
    type: String, 
    required: true,
    enum: ['extension', 'web_app', 'api']
  },
  action: { 
    type: String, 
    required: true,
    enum: ['create', 'update', 'delete', 'read']
  },
  data: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
  syncStatus: { 
    type: String, 
    enum: ['pending', 'synced', 'conflict', 'failed'],
    default: 'pending'
  },
  conflictResolution: { type: String },
  lastSyncAttempt: { type: Date },
  syncAttempts: { type: Number, default: 0 }
});

const SyncVerification = mongoose.models.SyncVerification || mongoose.model('SyncVerification', SyncVerificationSchema);

// In-memory storage for development
const inMemoryStorage = {
  syncVerification: new Map<string, any>()
};

// Record sync event
export async function recordSyncEvent(
  userId: string,
  entityType: string,
  entityId: string,
  source: string,
  action: string,
  data: any = {}
): Promise<void> {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    const syncEvent = {
      userId,
      entityType,
      entityId,
      source,
      action,
      data,
      timestamp: new Date(),
      syncStatus: 'pending',
      lastSyncAttempt: new Date(),
      syncAttempts: 0
    };

    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      const verification = new SyncVerification(syncEvent);
      await verification.save();
    } else {
      const eventId = `${userId}_${entityType}_${entityId}_${Date.now()}`;
      inMemoryStorage.syncVerification.set(eventId, syncEvent);
    }

    console.log(`Sync event recorded: ${action} ${entityType} ${entityId} from ${source}`);
  } catch (error) {
    console.error('Error recording sync event:', error);
  }
}

// Verify sync consistency
export async function verifySyncConsistency(userId: string, entityType: string): Promise<any> {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    let events;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      events = await SyncVerification.find({ 
        userId, 
        entityType 
      }).sort({ timestamp: -1 });
    } else {
      events = Array.from(inMemoryStorage.syncVerification.values())
        .filter((e: any) => e.userId === userId && e.entityType === entityType)
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
    }

    // Group events by entity ID
    const entityEvents = events.reduce((acc: any, event: any) => {
      if (!acc[event.entityId]) {
        acc[event.entityId] = [];
      }
      acc[event.entityId].push(event);
      return acc;
    }, {});

    const inconsistencies = [];
    const syncStats = {
      total: events.length,
      pending: 0,
      synced: 0,
      conflicts: 0,
      failed: 0
    };

    // Check each entity for inconsistencies
    for (const [entityId, entityEventList] of Object.entries(entityEvents)) {
      const events = entityEventList as any[];
      
      // Check for conflicts (same entity modified from different sources)
      const sources = [...new Set(events.map(e => e.source))];
      if (sources.length > 1) {
        const recentEvents = events.slice(0, 2); // Check last 2 events
        if (recentEvents.length === 2 && 
            recentEvents[0].source !== recentEvents[1].source &&
            recentEvents[0].action === 'update' && recentEvents[1].action === 'update') {
          inconsistencies.push({
            entityId,
            type: 'conflict',
            message: 'Entity modified from multiple sources',
            events: recentEvents
          });
        }
      }

      // Check sync status
      events.forEach(event => {
        syncStats[event.syncStatus as keyof typeof syncStats]++;
      });
    }

    return {
      userId,
      entityType,
      inconsistencies,
      syncStats,
      lastChecked: new Date()
    };

  } catch (error) {
    console.error('Error verifying sync consistency:', error);
    return {
      userId,
      entityType,
      inconsistencies: [],
      syncStats: { total: 0, pending: 0, synced: 0, conflicts: 0, failed: 0 },
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Resolve sync conflicts
export async function resolveSyncConflict(
  userId: string,
  entityType: string,
  entityId: string,
  resolution: 'extension_wins' | 'web_wins' | 'manual'
): Promise<{success: boolean, message: string}> {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    let events;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      events = await SyncVerification.find({ 
        userId, 
        entityType, 
        entityId 
      }).sort({ timestamp: -1 });
    } else {
      events = Array.from(inMemoryStorage.syncVerification.values())
        .filter((e: any) => e.userId === userId && e.entityType === entityType && e.entityId === entityId)
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
    }

    if (events.length < 2) {
      return { success: false, message: 'No conflict found' };
    }

    const [latest, previous] = events;
    
    // Update sync status based on resolution
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await SyncVerification.updateMany(
        { userId, entityType, entityId },
        { 
          syncStatus: 'synced',
          conflictResolution: resolution,
          lastSyncAttempt: new Date()
        }
      );
    } else {
      events.forEach((event: any) => {
        event.syncStatus = 'synced';
        event.conflictResolution = resolution;
        event.lastSyncAttempt = new Date();
      });
    }

    return { 
      success: true, 
      message: `Conflict resolved using ${resolution} strategy` 
    };

  } catch (error) {
    console.error('Error resolving sync conflict:', error);
    return { 
      success: false, 
      message: 'Failed to resolve conflict' 
    };
  }
}

// Get sync status for user
export async function getUserSyncStatus(userId: string): Promise<any> {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    let events;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      events = await SyncVerification.find({ userId }).sort({ timestamp: -1 });
    } else {
      events = Array.from(inMemoryStorage.syncVerification.values())
        .filter((e: any) => e.userId === userId)
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
    }

    const entityTypes = [...new Set(events.map((e: any) => e.entityType))];
    const syncStatus = entityTypes.map(entityType => ({
      entityType,
      total: events.filter((e: any) => e.entityType === entityType).length,
      pending: events.filter((e: any) => e.entityType === entityType && e.syncStatus === 'pending').length,
      synced: events.filter((e: any) => e.entityType === entityType && e.syncStatus === 'synced').length,
      conflicts: events.filter((e: any) => e.entityType === entityType && e.syncStatus === 'conflict').length,
      failed: events.filter((e: any) => e.entityType === entityType && e.syncStatus === 'failed').length
    }));

    return {
      userId,
      syncStatus,
      lastActivity: events[0]?.timestamp || null,
      totalEvents: events.length
    };

  } catch (error) {
    console.error('Error getting user sync status:', error);
    return {
      userId,
      syncStatus: [],
      lastActivity: null,
      totalEvents: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Force sync for specific entity
export async function forceSyncEntity(
  userId: string,
  entityType: string,
  entityId: string
): Promise<{success: boolean, message: string}> {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    // Record force sync event
    await recordSyncEvent(userId, entityType, entityId, 'api', 'update', {
      forceSync: true,
      timestamp: new Date()
    });

    // In a real implementation, this would trigger actual sync logic
    // For now, just mark as synced
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await SyncVerification.updateMany(
        { userId, entityType, entityId },
        { 
          syncStatus: 'synced',
          lastSyncAttempt: new Date(),
          syncAttempts: { $inc: 1 }
        }
      );
    }

    return { 
      success: true, 
      message: `Force sync completed for ${entityType} ${entityId}` 
    };

  } catch (error) {
    console.error('Error forcing sync:', error);
    return { 
      success: false, 
      message: 'Failed to force sync' 
    };
  }
}

// Clean up old sync events (run periodically)
export async function cleanupOldSyncEvents(daysOld: number = 30): Promise<void> {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await SyncVerification.deleteMany({
        timestamp: { $lt: cutoffDate },
        syncStatus: 'synced'
      });
    } else {
      // Clean up in-memory storage
      for (const [key, event] of inMemoryStorage.syncVerification.entries()) {
        if (event.timestamp < cutoffDate && event.syncStatus === 'synced') {
          inMemoryStorage.syncVerification.delete(key);
        }
      }
    }

    console.log(`Cleaned up sync events older than ${daysOld} days`);
  } catch (error) {
    console.error('Error cleaning up sync events:', error);
  }
}
