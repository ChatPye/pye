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

// Email automation schema
const EmailAutomationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userClass: { 
    type: String, 
    enum: ['freemium', 'pro', 'enterprise'], 
    default: 'freemium' 
  },
  emailSequence: {
    currentStep: { type: Number, default: 0 },
    lastSent: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    paused: { type: Boolean, default: false }
  },
  emailHistory: [{
    step: { type: Number, required: true },
    subject: { type: String, required: true },
    sentAt: { type: Date, required: true },
    opened: { type: Boolean, default: false },
    clicked: { type: Boolean, default: false }
  }],
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const EmailAutomation = mongoose.models.EmailAutomation || mongoose.model('EmailAutomation', EmailAutomationSchema);

// In-memory storage for development
const inMemoryEmailStorage = new Map();

// Email templates for different user classes
const EMAIL_TEMPLATES = {
  freemium: [
    {
      step: 0,
      subject: "Welcome to ChatPye! ðŸš€ Your AI Learning Journey Starts Now",
      template: "welcome_freemium",
      delay: 0 // Immediate
    },
    {
      step: 1,
      subject: "Your first video is ready to explore with AI",
      template: "first_video",
      delay: 1 // 1 day
    },
    {
      step: 2,
      subject: "Unlock unlimited learning with Pro (Limited Time: 20% Off)",
      template: "pro_pitch",
      delay: 3 // 3 days
    },
    {
      step: 3,
      subject: "You're missing out on these Pro features",
      template: "pro_features",
      delay: 7 // 7 days
    },
    {
      step: 4,
      subject: "Last chance: 20% off Pro expires soon â°",
      template: "urgency",
      delay: 14 // 14 days
    },
    {
      step: 5,
      subject: "Your ChatPye journey continues - here's what you've learned",
      template: "re_engagement",
      delay: 30 // 30 days
    },
    {
      step: 6,
      subject: "Advanced features you might love",
      template: "advanced_features",
      delay: 60 // 60 days
    }
  ],
  pro: [
    {
      step: 0,
      subject: "Welcome to ChatPye Pro! ðŸŽ‰ Let's maximize your learning",
      template: "pro_welcome",
      delay: 0 // Immediate
    },
    {
      step: 1,
      subject: "Pro tips: Getting the most out of ChatPye",
      template: "pro_tips",
      delay: 1 // 1 day
    },
    {
      step: 2,
      subject: "Advanced AI models explained",
      template: "ai_features",
      delay: 3 // 3 days
    },
    {
      step: 3,
      subject: "Export and sharing features guide",
      template: "export_features",
      delay: 7 // 7 days
    },
    {
      step: 4,
      subject: "Pro user best practices for maximum productivity",
      template: "best_practices",
      delay: 14 // 14 days
    },
    {
      step: 5,
      subject: "Your Pro usage insights and recommendations",
      template: "usage_insights",
      delay: 30 // 30 days
    },
    {
      step: 6,
      subject: "Advanced workflows and automation features",
      template: "automation",
      delay: 60 // 60 days
    }
  ]
};

// Get or create email automation record
async function getEmailAutomation(userId: string, userClass: string = 'freemium') {
  let emailAutomation;
  
  if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
    emailAutomation = await EmailAutomation.findOne({ userId });
    
    if (!emailAutomation) {
      emailAutomation = new EmailAutomation({
        userId,
        userClass,
        emailSequence: {
          currentStep: 0,
          lastSent: null,
          completed: false,
          paused: false
        },
        emailHistory: [],
        preferences: {
          emailNotifications: true,
          marketingEmails: true,
          frequency: 'weekly'
        }
      });
      await emailAutomation.save();
    }
  } else {
    // Use in-memory storage for development
    emailAutomation = inMemoryEmailStorage.get(userId);
    
    if (!emailAutomation) {
      emailAutomation = {
        userId,
        userClass,
        emailSequence: {
          currentStep: 0,
          lastSent: null,
          completed: false,
          paused: false
        },
        emailHistory: [],
        preferences: {
          emailNotifications: true,
          marketingEmails: true,
          frequency: 'weekly'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryEmailStorage.set(userId, emailAutomation);
    }
  }
  
  return emailAutomation;
}

// Send email via AWS SES (placeholder implementation)
async function sendEmail(to: string, subject: string, template: string, userData: any) {
  try {
    // In a real implementation, you would:
    // 1. Fetch email template from database or file system
    // 2. Replace template variables with user data
    // 3. Send email via AWS SES
    
    console.log(`Sending email to ${to}: ${subject} (${template})`);
    
    // For now, just log the email
    return {
      success: true,
      messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// GET - Get email automation status
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const emailAutomation = await getEmailAutomation(auth.id);
    
    return NextResponse.json({
      success: true,
      emailAutomation: {
        currentStep: emailAutomation.emailSequence.currentStep,
        completed: emailAutomation.emailSequence.completed,
        paused: emailAutomation.emailSequence.paused,
        lastSent: emailAutomation.emailSequence.lastSent,
        emailHistory: emailAutomation.emailHistory,
        preferences: emailAutomation.preferences,
        nextEmail: emailAutomation.emailSequence.completed ? null : {
          step: emailAutomation.emailSequence.currentStep + 1,
          subject: EMAIL_TEMPLATES[emailAutomation.userClass as keyof typeof EMAIL_TEMPLATES][emailAutomation.emailSequence.currentStep]?.subject,
          delay: EMAIL_TEMPLATES[emailAutomation.userClass as keyof typeof EMAIL_TEMPLATES][emailAutomation.emailSequence.currentStep]?.delay
        }
      }
    });
    
  } catch (error) {
    console.error('Email automation retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve email automation status' },
      { status: 500 }
    );
  }
}

// POST - Update email automation
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const { 
      action,
      userClass,
      preferences,
      emailEvent 
    } = await request.json();
    
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
    
    const emailAutomation = await getEmailAutomation(auth.id, userClass);
    
    switch (action) {
      case 'update_user_class':
        if (userClass && userClass !== emailAutomation.userClass) {
          emailAutomation.userClass = userClass;
          // Reset sequence for new user class
          emailAutomation.emailSequence.currentStep = 0;
          emailAutomation.emailSequence.completed = false;
        }
        break;
        
      case 'update_preferences':
        if (preferences) {
          emailAutomation.preferences = {
            ...emailAutomation.preferences,
            ...preferences
          };
        }
        break;
        
      case 'pause_sequence':
        emailAutomation.emailSequence.paused = true;
        break;
        
      case 'resume_sequence':
        emailAutomation.emailSequence.paused = false;
        break;
        
      case 'send_next_email':
        if (!emailAutomation.emailSequence.paused && 
            !emailAutomation.emailSequence.completed &&
            emailAutomation.preferences.emailNotifications) {
          
          const currentTemplate = EMAIL_TEMPLATES[emailAutomation.userClass as keyof typeof EMAIL_TEMPLATES][emailAutomation.emailSequence.currentStep];
          
          if (currentTemplate) {
            // Send email
            const emailResult = await sendEmail(
              auth.email || 'user@example.com', // Get from auth
              currentTemplate.subject,
              currentTemplate.template,
              {
                userId: auth.id,
                userClass: emailAutomation.userClass,
                name: (auth as any).name || 'ChatPye User'
              }
            );
            
            if (emailResult.success) {
              // Update email history
              emailAutomation.emailHistory.push({
                step: emailAutomation.emailSequence.currentStep,
                subject: currentTemplate.subject,
                sentAt: new Date(),
                opened: false,
                clicked: false
              });
              
              // Move to next step
              emailAutomation.emailSequence.currentStep += 1;
              emailAutomation.emailSequence.lastSent = new Date();
              
              // Check if sequence is completed
              if (emailAutomation.emailSequence.currentStep >= EMAIL_TEMPLATES[emailAutomation.userClass as keyof typeof EMAIL_TEMPLATES].length) {
                emailAutomation.emailSequence.completed = true;
              }
            }
          }
        }
        break;
        
      case 'email_event':
        if (emailEvent) {
          // Track email opens/clicks
          const email = emailAutomation.emailHistory.find(
            (e: any) => e.step === emailEvent.step
          );
          
          if (email) {
            if (emailEvent.type === 'open') {
              email.opened = true;
            } else if (emailEvent.type === 'click') {
              email.clicked = true;
            }
          }
        }
        break;
    }
    
    emailAutomation.updatedAt = new Date();
    
    if (process.env.MONGODB_URI && mongoose.connections[0].readyState) {
      await emailAutomation.save();
    } else {
      inMemoryEmailStorage.set(auth.id, emailAutomation);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email automation updated successfully'
    });
    
  } catch (error) {
    console.error('Email automation update error:', error);
    return NextResponse.json(
      { error: 'Failed to update email automation' },
      { status: 500 }
    );
  }
}

