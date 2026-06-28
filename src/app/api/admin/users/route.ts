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

// Admin check
const isAdmin = (email: string): boolean => {
  const ADMIN_EMAILS = ['job.oyebisi@gmail.com', 'job@chatpye.com'];
  return ADMIN_EMAILS.includes(email);
};

// User class schema
const UserClassSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userClass: { 
    type: String, 
    enum: ['freemium', 'pro', 'enterprise'], 
    default: 'freemium' 
  },
  subscriptionStatus: {
    isActive: { type: Boolean, default: false },
    planType: { type: String, enum: ['monthly', 'annual'], default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null }
  },
  usageStats: {
    videosProcessed: { type: Number, default: 0 },
    questionsAsked: { type: Number, default: 0 },
    notesCreated: { type: Number, default: 0 },
    bookmarksCreated: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  },
  isSuspended: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UserClass = mongoose.models.UserClass || mongoose.model('UserClass', UserClassSchema);

// XP schema
const XPSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  total: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ type: String }],
  streak: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const XP = mongoose.models.XP || mongoose.model('XP', XPSchema);

// In-memory storage for development
const inMemoryUsers = new Map();

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    
    // Check if user is admin
    if (!isAdmin(auth.email || '')) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (process.env.MONGODB_URI) {
      await connectDB();
      
      // Get users with pagination
      const users = await UserClass.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
      
      // Get XP data for users
      const userIds = users.map(user => user.userId);
      const xpData = await XP.find({ userId: { $in: userIds } });
      
      // Combine user data with XP data
      const usersWithXP = users.map(user => {
        const xp = xpData.find(x => x.userId === user.userId);
        return {
          id: user.userId,
          email: user.userId, // In a real app, you'd fetch email from Clerk
          name: user.userId, // In a real app, you'd fetch name from Clerk
          userClass: user.userClass,
          subscriptionStatus: user.subscriptionStatus,
          usageStats: user.usageStats,
          xp: {
            total: xp?.total || 0,
            level: xp?.level || 1,
            badges: xp?.badges || []
          },
          createdAt: user.createdAt,
          isAdmin: isAdmin(user.userId),
          isSuspended: user.isSuspended
        };
      });
      
      return NextResponse.json({
        success: true,
        users: usersWithXP
      });
      
    } else {
      // Return mock data for development
      const mockUsers = Array.from(inMemoryUsers.values()).slice(offset, offset + limit);
      
      return NextResponse.json({
        success: true,
        users: mockUsers
      });
    }
    
  } catch (error) {
    console.error('Admin users retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve users' },
      { status: 500 }
    );
  }
}
