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

// Shared chat schema
const SharedChatSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  messages: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['user', 'ai'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  videoMetadata: {
    title: { type: String, default: '' },
    channelName: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    duration: { type: Number, default: 0 }
  },
  viewCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null }, // Optional expiration
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SharedChat = mongoose.models.SharedChat || mongoose.model('SharedChat', SharedChatSchema);

// In-memory storage for development
const inMemorySharedChatStorage = new Map();

// Generate unique share ID
function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET - Retrieve shared chat
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');
    
    if (!shareId) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    let sharedChat;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      sharedChat = await SharedChat.findOne({ 
        shareId,
        isPublic: true 
      });
    } else {
      sharedChat = Array.from(inMemorySharedChatStorage.values())
        .find(chat => chat.shareId === shareId && chat.isPublic);
    }
    
    if (!sharedChat) {
      return NextResponse.json({ error: 'Shared chat not found' }, { status: 404 });
    }
    
    // Check if expired
    if (sharedChat.expiresAt && new Date() > new Date(sharedChat.expiresAt)) {
      return NextResponse.json({ error: 'Shared chat has expired' }, { status: 410 });
    }
    
    // Increment view count
    sharedChat.viewCount += 1;
    sharedChat.updatedAt = new Date();
    
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await sharedChat.save();
    } else {
      inMemorySharedChatStorage.set(sharedChat._id || shareId, sharedChat);
    }
    
    return NextResponse.json({
      success: true,
      sharedChat: {
        shareId: sharedChat.shareId,
        title: sharedChat.title,
        description: sharedChat.description,
        messages: sharedChat.messages,
        videoMetadata: sharedChat.videoMetadata,
        viewCount: sharedChat.viewCount,
        createdAt: sharedChat.createdAt
      }
    });
    
  } catch (error) {
    console.error('Shared chat retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve shared chat' },
      { status: 500 }
    );
  }
}

// POST - Create shared chat
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      videoId, 
      title, 
      description = '', 
      messages, 
      videoMetadata,
      expiresInDays = null 
    } = await request.json();
    
    if (!videoId || !title || !messages) {
      return NextResponse.json({ 
        error: 'Video ID, title, and messages are required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const shareId = generateShareId();
    const expiresAt = expiresInDays ? 
      new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000)) : 
      null;
    
    const sharedChatData = {
      shareId,
      userId: auth.id,
      videoId,
      title,
      description,
      messages,
      videoMetadata: videoMetadata || {},
      viewCount: 0,
      shareCount: 0,
      isPublic: true,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    let sharedChat;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      sharedChat = new SharedChat(sharedChatData);
      await sharedChat.save();
    } else {
      const chatId = `shared_${shareId}`;
      sharedChat = { _id: chatId, ...sharedChatData };
      inMemorySharedChatStorage.set(chatId, sharedChat);
    }
    
    // Award XP for sharing
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/xp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || ''
        },
        body: JSON.stringify({
          action: 'first_share',
          metadata: { shareId, videoId }
        })
      });
    } catch (error) {
      console.error('Error awarding XP for sharing:', error);
    }
    
    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chatpye.com'}/shared/${shareId}`;
    
    return NextResponse.json({
      success: true,
      shareUrl,
      shareId: sharedChat.shareId,
      expiresAt: sharedChat.expiresAt
    });
    
  } catch (error) {
    console.error('Shared chat creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create shared chat' },
      { status: 500 }
    );
  }
}

// PUT - Update shared chat (increment share count)
export async function PUT(request: NextRequest) {
  try {
    const { shareId } = await request.json();
    
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
      sharedChat = await SharedChat.findOne({ shareId });
    } else {
      sharedChat = Array.from(inMemorySharedChatStorage.values())
        .find(chat => chat.shareId === shareId);
    }
    
    if (!sharedChat) {
      return NextResponse.json({ error: 'Shared chat not found' }, { status: 404 });
    }
    
    // Increment share count
    sharedChat.shareCount += 1;
    sharedChat.updatedAt = new Date();
    
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await sharedChat.save();
    } else {
      inMemorySharedChatStorage.set(sharedChat._id || shareId, sharedChat);
    }
    
    return NextResponse.json({
      success: true,
      shareCount: sharedChat.shareCount
    });
    
  } catch (error) {
    console.error('Shared chat update error:', error);
    return NextResponse.json(
      { error: 'Failed to update shared chat' },
      { status: 500 }
    );
  }
}

// DELETE - Delete shared chat
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');
    
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
      deleted = await SharedChat.findOneAndDelete({ 
        shareId, 
        userId: auth.id 
      });
    } else {
      // Use in-memory storage for development
      const sharedChat = Array.from(inMemorySharedChatStorage.values())
        .find(chat => chat.shareId === shareId && chat.userId === auth.id);
      
      if (sharedChat) {
        inMemorySharedChatStorage.delete(sharedChat._id || shareId);
        deleted = sharedChat;
      }
    }
    
    if (!deleted) {
      return NextResponse.json({ error: 'Shared chat not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Shared chat deleted successfully'
    });
    
  } catch (error) {
    console.error('Shared chat deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete shared chat' },
      { status: 500 }
    );
  }
}

