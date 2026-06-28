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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAuth();
    
    // Check if user is admin
    if (!isAdmin(auth.email || '')) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }
    
    const { userId } = await params;
    
    if (process.env.MONGODB_URI) {
      await connectDB();
      
      const user = await UserClass.findOneAndUpdate(
        { userId },
        { 
          userClass: 'pro',
          subscriptionStatus: {
            isActive: true,
            planType: 'monthly',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          },
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'User upgraded to Pro successfully',
        user: {
          id: user.userId,
          userClass: user.userClass,
          subscriptionStatus: user.subscriptionStatus
        }
      });
      
    } else {
      // Mock response for development
      return NextResponse.json({
        success: true,
        message: 'User upgraded to Pro successfully (development mode)',
        user: {
          id: userId,
          userClass: 'pro',
          subscriptionStatus: {
            isActive: true,
            planType: 'monthly',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      });
    }
    
  } catch (error) {
    console.error('User upgrade error:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade user' },
      { status: 500 }
    );
  }
}
