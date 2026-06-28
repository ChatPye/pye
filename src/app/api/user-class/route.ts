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
    endDate: { type: Date, default: null },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null }
  },
  usageStats: {
    videosProcessed: { type: Number, default: 0 },
    questionsAsked: { type: Number, default: 0 },
    notesCreated: { type: Number, default: 0 },
    bookmarksCreated: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  },
  preferences: {
    showUpgradePrompts: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UserClass = mongoose.models.UserClass || mongoose.model('UserClass', UserClassSchema);

// In-memory storage for development
const inMemoryUserClassStorage = new Map();

// Get or create user class record
async function getUserClass(userId: string) {
  let userClass;
  
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    userClass = await UserClass.findOne({ userId });
    
    if (!userClass) {
      userClass = new UserClass({
        userId,
        userClass: 'freemium',
        subscriptionStatus: {
          isActive: false,
          planType: null,
          startDate: null,
          endDate: null
        },
        usageStats: {
          videosProcessed: 0,
          questionsAsked: 0,
          notesCreated: 0,
          bookmarksCreated: 0,
          lastActivity: new Date()
        },
        preferences: {
          showUpgradePrompts: true,
          emailNotifications: true,
          marketingEmails: true
        }
      });
      await userClass.save();
    }
  } else {
    // Use in-memory storage for development
    userClass = inMemoryUserClassStorage.get(userId);
    
    if (!userClass) {
      userClass = {
        userId,
        userClass: 'freemium',
        subscriptionStatus: {
          isActive: false,
          planType: null,
          startDate: null,
          endDate: null
        },
        usageStats: {
          videosProcessed: 0,
          questionsAsked: 0,
          notesCreated: 0,
          bookmarksCreated: 0,
          lastActivity: new Date()
        },
        preferences: {
          showUpgradePrompts: true,
          emailNotifications: true,
          marketingEmails: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryUserClassStorage.set(userId, userClass);
    }
  }
  
  return userClass;
}

// Check if user should see upgrade prompts
function shouldShowUpgradePrompts(userClass: any): boolean {
  if (userClass.userClass === 'pro' || userClass.userClass === 'enterprise') {
    return false;
  }
  
  if (!userClass.preferences.showUpgradePrompts) {
    return false;
  }
  
  // Show prompts for freemium users
  return true;
}

// GET - Get user class and subscription status
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const userClass = await getUserClass(auth.id);
    
    // Check if subscription is still active
    const isSubscriptionActive = userClass.subscriptionStatus.isActive && 
      userClass.subscriptionStatus.endDate && 
      new Date() < new Date(userClass.subscriptionStatus.endDate);
    
    // Update user class based on subscription status
    if (isSubscriptionActive && userClass.userClass === 'freemium') {
      userClass.userClass = 'pro';
      userClass.updatedAt = new Date();
      
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        await userClass.save();
      } else {
        inMemoryUserClassStorage.set(auth.id, userClass);
      }
    } else if (!isSubscriptionActive && userClass.userClass === 'pro') {
      userClass.userClass = 'freemium';
      userClass.subscriptionStatus.isActive = false;
      userClass.updatedAt = new Date();
      
      if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
        await userClass.save();
      } else {
        inMemoryUserClassStorage.set(auth.id, userClass);
      }
    }
    
    return NextResponse.json({
      success: true,
      userClass: {
        class: userClass.userClass,
        subscriptionStatus: {
          isActive: isSubscriptionActive,
          planType: userClass.subscriptionStatus.planType,
          startDate: userClass.subscriptionStatus.startDate,
          endDate: userClass.subscriptionStatus.endDate
        },
        usageStats: userClass.usageStats,
        preferences: userClass.preferences,
        showUpgradePrompts: shouldShowUpgradePrompts(userClass),
        limits: userClass.userClass === 'pro' ? {
          videosPerMonth: -1, // Unlimited
          questionsPerMonth: -1, // Unlimited
          notesPerMonth: -1, // Unlimited
          bookmarksPerMonth: -1 // Unlimited
        } : {
          videosPerMonth: 2,
          questionsPerMonth: 20,
          notesPerMonth: 10,
          bookmarksPerMonth: 50
        }
      }
    });
    
  } catch (error) {
    console.error('User class retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve user class' },
      { status: 500 }
    );
  }
}

// POST - Update user class (for subscription changes)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      action,
      subscriptionData,
      preferences,
      usageUpdate 
    } = await request.json();
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const userClass = await getUserClass(auth.id);
    
    switch (action) {
      case 'update_subscription':
        if (subscriptionData) {
          userClass.subscriptionStatus = {
            ...userClass.subscriptionStatus,
            ...subscriptionData
          };
          
          // Update user class based on subscription
          if (subscriptionData.isActive) {
            userClass.userClass = 'pro';
          } else {
            userClass.userClass = 'freemium';
          }
        }
        break;
        
      case 'update_preferences':
        if (preferences) {
          userClass.preferences = {
            ...userClass.preferences,
            ...preferences
          };
        }
        break;
        
      case 'update_usage':
        if (usageUpdate) {
          userClass.usageStats = {
            ...userClass.usageStats,
            ...usageUpdate,
            lastActivity: new Date()
          };
        }
        break;
        
      case 'upgrade_to_pro':
        userClass.userClass = 'pro';
        userClass.subscriptionStatus.isActive = true;
        userClass.subscriptionStatus.startDate = new Date();
        if (subscriptionData?.planType) {
          userClass.subscriptionStatus.planType = subscriptionData.planType;
        }
        break;
        
      case 'downgrade_to_freemium':
        userClass.userClass = 'freemium';
        userClass.subscriptionStatus.isActive = false;
        userClass.subscriptionStatus.endDate = new Date();
        break;
    }
    
    userClass.updatedAt = new Date();
    
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await userClass.save();
    } else {
      inMemoryUserClassStorage.set(auth.id, userClass);
    }
    
    return NextResponse.json({
      success: true,
      message: 'User class updated successfully',
      userClass: {
        class: userClass.userClass,
        subscriptionStatus: userClass.subscriptionStatus,
        usageStats: userClass.usageStats,
        preferences: userClass.preferences
      }
    });
    
  } catch (error) {
    console.error('User class update error:', error);
    return NextResponse.json(
      { error: 'Failed to update user class' },
      { status: 500 }
    );
  }
}

