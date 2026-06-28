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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UserClass = mongoose.models.UserClass || mongoose.model('UserClass', UserClassSchema);

// Credits schema
const CreditsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  current: { type: Number, default: 50 },
  totalAllocated: { type: Number, default: 50 },
  tier: { type: String, enum: ['freemium', 'pro'], default: 'freemium' },
  lastReset: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Credits = mongoose.models.Credits || mongoose.model('Credits', CreditsSchema);

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
const inMemoryStats = {
  totalUsers: 0,
  activeUsers: 0,
  proUsers: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  totalVideos: 0,
  totalQuestions: 0,
  totalNotes: 0,
  totalBookmarks: 0
};

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
    
    if (process.env.MONGODB_URI) {
      await connectDB();
      
      // Get system statistics from database
      const totalUsers = await UserClass.countDocuments();
      const proUsers = await UserClass.countDocuments({ userClass: 'pro' });
      const activeUsers = await UserClass.countDocuments({
        'usageStats.lastActivity': {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      });
      
      // Aggregate usage stats
      const usageStats = await UserClass.aggregate([
        {
          $group: {
            _id: null,
            totalVideos: { $sum: '$usageStats.videosProcessed' },
            totalQuestions: { $sum: '$usageStats.questionsAsked' },
            totalNotes: { $sum: '$usageStats.notesCreated' },
            totalBookmarks: { $sum: '$usageStats.bookmarksCreated' }
          }
        }
      ]);
      
      // Calculate revenue (mock data for now)
      const totalRevenue = proUsers * 29.99; // $29.99 per pro user
      const monthlyRevenue = totalRevenue * 0.1; // Assume 10% monthly churn
      
      const stats = {
        totalUsers,
        activeUsers,
        proUsers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        totalVideos: usageStats[0]?.totalVideos || 0,
        totalQuestions: usageStats[0]?.totalQuestions || 0,
        totalNotes: usageStats[0]?.totalNotes || 0,
        totalBookmarks: usageStats[0]?.totalBookmarks || 0
      };
      
      return NextResponse.json({
        success: true,
        stats
      });
      
    } else {
      // Return mock data for development
      return NextResponse.json({
        success: true,
        stats: inMemoryStats
      });
    }
    
  } catch (error) {
    console.error('Admin stats retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve admin statistics' },
      { status: 500 }
    );
  }
}
