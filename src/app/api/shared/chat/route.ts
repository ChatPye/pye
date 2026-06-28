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

// Shared Chat schema
const SharedChatSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  isPublic: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  metadata: {
    source: { type: String, default: 'chat' },
    tags: [String],
    description: String
  }
});

const SharedChat = mongoose.models.SharedChat || mongoose.model('SharedChat', SharedChatSchema);

// In-memory storage for development
const inMemorySharedChats = new Map();

// Generate unique share ID
function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// POST - Create a shared chat
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { title, messages, isPublic = true, metadata = {} } = await request.json();
    
    if (!title || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ 
        error: 'Title and messages are required' 
      }, { status: 400 });
    }

    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    const shareId = generateShareId();
    
    const sharedChatData = {
      shareId,
      userId: auth.id,
      title,
      messages,
      isPublic,
      metadata: {
        source: 'chat',
        tags: metadata.tags || [],
        description: metadata.description || ''
      }
    };

    let sharedChat;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      sharedChat = new SharedChat(sharedChatData);
      await sharedChat.save();
    } else {
      // Use in-memory storage for development
      sharedChat = { _id: shareId, ...sharedChatData };
      inMemorySharedChats.set(shareId, sharedChat);
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://chatpye.com'}/shared/${shareId}`;

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl,
      message: 'Chat shared successfully'
    });
    
  } catch (error) {
    console.error('Error creating shared chat:', error);
    return NextResponse.json(
      { error: 'Failed to create shared chat' },
      { status: 500 }
    );
  }
}

// GET - Get shared chat by ID (public access)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('id');
    
    if (!shareId) {
      return NextResponse.json({ 
        error: 'Share ID is required' 
      }, { status: 400 });
    }

    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    let sharedChat;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      sharedChat = await SharedChat.findOne({ shareId, isPublic: true });
      
      if (sharedChat) {
        // Increment view count
        sharedChat.viewCount += 1;
        await sharedChat.save();
      }
    } else {
      // Use in-memory storage for development
      sharedChat = inMemorySharedChats.get(shareId);
      if (sharedChat && sharedChat.isPublic) {
        sharedChat.viewCount += 1;
        inMemorySharedChats.set(shareId, sharedChat);
      }
    }

    if (!sharedChat) {
      return NextResponse.json({ 
        error: 'Shared chat not found or not public' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      shareId: sharedChat.shareId,
      title: sharedChat.title,
      messages: sharedChat.messages,
      viewCount: sharedChat.viewCount,
      createdAt: sharedChat.createdAt,
      metadata: sharedChat.metadata
    });
    
  } catch (error) {
    console.error('Error retrieving shared chat:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve shared chat' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a shared chat (owner only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { shareId } = await request.json();
    
    if (!shareId) {
      return NextResponse.json({ 
        error: 'Share ID is required' 
      }, { status: 400 });
    }

    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    let deleted;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      const result = await SharedChat.deleteOne({ 
        shareId, 
        userId: auth.id 
      });
      deleted = result.deletedCount > 0;
    } else {
      // Use in-memory storage for development
      const sharedChat = inMemorySharedChats.get(shareId);
      if (sharedChat && sharedChat.userId === auth.id) {
        inMemorySharedChats.delete(shareId);
        deleted = true;
      } else {
        deleted = false;
      }
    }

    if (!deleted) {
      return NextResponse.json({ 
        error: 'Shared chat not found or access denied' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Shared chat deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting shared chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete shared chat' },
      { status: 500 }
    );
  }
}
