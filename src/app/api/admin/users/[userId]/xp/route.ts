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
    const { amount } = await request.json();
    
    if (process.env.MONGODB_URI) {
      await connectDB();
      
      let xp = await XP.findOne({ userId });
      let newBadges: string[] = [];
      
      if (!xp) {
        xp = new XP({
          userId,
          total: amount,
          level: 1,
          badges: [],
          streak: 0
        });
      } else {
        xp.total += amount;
        
        // Calculate new level (every 100 XP = 1 level)
        const newLevel = Math.floor(xp.total / 100) + 1;
        xp.level = newLevel;
        
        // Add badges based on XP milestones
        if (xp.total >= 100 && !xp.badges.includes('First Steps')) {
          newBadges.push('First Steps');
        }
        if (xp.total >= 500 && !xp.badges.includes('Getting Started')) {
          newBadges.push('Getting Started');
        }
        if (xp.total >= 1000 && !xp.badges.includes('Learning Pro')) {
          newBadges.push('Learning Pro');
        }
        if (xp.total >= 2500 && !xp.badges.includes('Knowledge Seeker')) {
          newBadges.push('Knowledge Seeker');
        }
        if (xp.total >= 5000 && !xp.badges.includes('Expert Learner')) {
          newBadges.push('Expert Learner');
        }
        
        xp.badges = [...xp.badges, ...newBadges];
        xp.updatedAt = new Date();
      }
      
      await xp.save();
      
      return NextResponse.json({
        success: true,
        message: `Added ${amount} XP to user`,
        xp: {
          userId: xp.userId,
          total: xp.total,
          level: xp.level,
          badges: xp.badges,
          newBadges: newBadges || []
        }
      });
      
    } else {
      // Mock response for development
      return NextResponse.json({
        success: true,
        message: `Added ${amount} XP to user (development mode)`,
        xp: {
          userId,
          total: amount,
          level: Math.floor(amount / 100) + 1,
          badges: ['First Steps'],
          newBadges: ['First Steps']
        }
      });
    }
    
  } catch (error) {
    console.error('XP addition error:', error);
    return NextResponse.json(
      { error: 'Failed to add XP to user' },
      { status: 500 }
    );
  }
}
