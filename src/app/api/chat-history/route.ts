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

// Chat history schema
const ChatHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  videoId: { type: String, required: true },
  sessionId: { type: String, required: true },
  messages: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['user', 'ai'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: {
      videoTimestamp: { type: Number, default: 0 },
      responseTime: { type: Number, default: 0 },
      tokensUsed: { type: Number, default: 0 }
    }
  }],
  videoMetadata: {
    title: { type: String, default: '' },
    channelName: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    duration: { type: Number, default: 0 }
  },
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

const ChatHistory = mongoose.models.ChatHistory || mongoose.model('ChatHistory', ChatHistorySchema);

// In-memory storage for development
const inMemoryChatHistoryStorage = new Map();

// GET - Retrieve chat history for a video
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const sessionId = searchParams.get('sessionId');
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    let chatHistory;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      chatHistory = await ChatHistory.findOne({ 
        userId: auth.id, 
        videoId,
        isActive: true 
      });
    } else {
      // Use in-memory storage for development
      chatHistory = Array.from(inMemoryChatHistoryStorage.values())
        .find(chat => chat.userId === auth.id && chat.videoId === videoId && chat.isActive);
    }
    
    if (!chatHistory) {
      return NextResponse.json({
        success: true,
        chatHistory: {
          videoId,
          messages: [],
          sessionId: sessionId || `session_${Date.now()}`,
          isNew: true
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      chatHistory: {
        id: chatHistory._id,
        videoId: chatHistory.videoId,
        sessionId: chatHistory.sessionId,
        messages: chatHistory.messages,
        videoMetadata: chatHistory.videoMetadata,
        lastActivity: chatHistory.lastActivity,
        createdAt: chatHistory.createdAt,
        isNew: false
      }
    });
    
  } catch (error) {
    console.error('Chat history retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve chat history' },
      { status: 500 }
    );
  }
}

// POST - Save chat history
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      videoId, 
      sessionId, 
      messages, 
      videoMetadata 
    } = await request.json();
    
    if (!videoId || !sessionId || !messages) {
      return NextResponse.json({ 
        error: 'Video ID, session ID, and messages are required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    // Check if chat history already exists
    let chatHistory;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      chatHistory = await ChatHistory.findOne({ 
        userId: auth.id, 
        videoId,
        isActive: true 
      });
    } else {
      chatHistory = Array.from(inMemoryChatHistoryStorage.values())
        .find(chat => chat.userId === auth.id && chat.videoId === videoId && chat.isActive);
    }
    
    if (chatHistory) {
      // Update existing chat history
      chatHistory.messages = messages;
      chatHistory.sessionId = sessionId;
      chatHistory.videoMetadata = videoMetadata || chatHistory.videoMetadata;
      chatHistory.lastActivity = new Date();
      chatHistory.updatedAt = new Date();
      
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        await chatHistory.save();
      } else {
        inMemoryChatHistoryStorage.set(chatHistory._id || `chat_${Date.now()}`, chatHistory);
      }
    } else {
      // Create new chat history
      const chatHistoryData = {
        userId: auth.id,
        videoId,
        sessionId,
        messages,
        videoMetadata: videoMetadata || {},
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };
      
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        chatHistory = new ChatHistory(chatHistoryData);
        await chatHistory.save();
      } else {
        const chatId = `chat_${auth.id}_${videoId}_${Date.now()}`;
        chatHistory = { _id: chatId, ...chatHistoryData };
        inMemoryChatHistoryStorage.set(chatId, chatHistory);
      }
    }
    
    return NextResponse.json({
      success: true,
      chatHistory: {
        id: chatHistory._id,
        videoId: chatHistory.videoId,
        sessionId: chatHistory.sessionId,
        messages: chatHistory.messages,
        videoMetadata: chatHistory.videoMetadata,
        lastActivity: chatHistory.lastActivity
      }
    });
    
  } catch (error) {
    console.error('Chat history save error:', error);
    return NextResponse.json(
      { error: 'Failed to save chat history' },
      { status: 500 }
    );
  }
}

// PUT - Add message to chat history
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      videoId, 
      sessionId, 
      message 
    } = await request.json();
    
    if (!videoId || !sessionId || !message) {
      return NextResponse.json({ 
        error: 'Video ID, session ID, and message are required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    let chatHistory;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      chatHistory = await ChatHistory.findOne({ 
        userId: auth.id, 
        videoId,
        isActive: true 
      });
    } else {
      chatHistory = Array.from(inMemoryChatHistoryStorage.values())
        .find(chat => chat.userId === auth.id && chat.videoId === videoId && chat.isActive);
    }
    
    if (!chatHistory) {
      // Create new chat history
      const chatHistoryData = {
        userId: auth.id,
        videoId,
        sessionId,
        messages: [message],
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };
      
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        chatHistory = new ChatHistory(chatHistoryData);
        await chatHistory.save();
      } else {
        const chatId = `chat_${auth.id}_${videoId}_${Date.now()}`;
        chatHistory = { _id: chatId, ...chatHistoryData };
        inMemoryChatHistoryStorage.set(chatId, chatHistory);
      }
    } else {
      // Add message to existing chat history
      chatHistory.messages.push(message);
      chatHistory.lastActivity = new Date();
      chatHistory.updatedAt = new Date();
      
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        await chatHistory.save();
      } else {
        inMemoryChatHistoryStorage.set(chatHistory._id || `chat_${Date.now()}`, chatHistory);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Message added to chat history'
    });
    
  } catch (error) {
    console.error('Chat history update error:', error);
    return NextResponse.json(
      { error: 'Failed to update chat history' },
      { status: 500 }
    );
  }
}

// DELETE - Delete chat history
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json({ 
        error: 'Video ID is required' 
      }, { status: 400 });
    }
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    let deleted;
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      deleted = await ChatHistory.findOneAndUpdate(
        { userId: auth.id, videoId },
        { isActive: false, updatedAt: new Date() },
        { new: true }
      );
    } else {
      // Use in-memory storage for development
      const chatHistory = Array.from(inMemoryChatHistoryStorage.values())
        .find(chat => chat.userId === auth.id && chat.videoId === videoId);
      
      if (chatHistory) {
        chatHistory.isActive = false;
        chatHistory.updatedAt = new Date();
        inMemoryChatHistoryStorage.set(chatHistory._id || `chat_${Date.now()}`, chatHistory);
        deleted = chatHistory;
      }
    }
    
    if (!deleted) {
      return NextResponse.json({ error: 'Chat history not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Chat history deleted successfully'
    });
    
  } catch (error) {
    console.error('Chat history deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat history' },
      { status: 500 }
    );
  }
}

