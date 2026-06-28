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

// Shared Chat schema (same as in share/route.ts)
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

// GET - Get user's shared chats
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }

    let sharedChats;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      sharedChats = await SharedChat.find({ userId: auth.id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .select('shareId title viewCount createdAt isPublic metadata');
    } else {
      // Use in-memory storage for development
      sharedChats = Array.from(inMemorySharedChats.values())
        .filter(chat => chat.userId === auth.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(offset, offset + limit)
        .map(chat => ({
          shareId: chat.shareId,
          title: chat.title,
          viewCount: chat.viewCount,
          createdAt: chat.createdAt,
          isPublic: chat.isPublic,
          metadata: chat.metadata
        }));
    }

    // Add share URLs
    const sharedChatsWithUrls = sharedChats.map(chat => ({
      ...chat,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chatpye.com'}/shared/${chat.shareId}`
    }));

    return NextResponse.json({
      success: true,
      sharedChats: sharedChatsWithUrls,
      total: sharedChats.length
    });
    
  } catch (error) {
    console.error('Error retrieving shared chats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve shared chats' },
      { status: 500 }
    );
  }
}
