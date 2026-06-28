import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import mongoose from 'mongoose';

// Configure for SSR deployment
export const dynamic = 'force-dynamic';

// Admin check
const isAdmin = (email: string): boolean => {
  const ADMIN_EMAILS = ['job.oyebisi@gmail.com', 'job@chatpye.com'];
  return ADMIN_EMAILS.includes(email);
};

// Connect to database
const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/chatpye'
    );
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

// System settings schema
const SystemSettingsSchema = new mongoose.Schema({
  category: { type: String, required: true }, // 'general', 'billing', 'features', 'limits', 'notifications'
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String, enum: ['string', 'number', 'boolean', 'array', 'object'], required: true },
  description: { type: String },
  isPublic: { type: Boolean, default: false }, // whether frontend can access
  updatedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SystemSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);

// Default system settings
const DEFAULT_SETTINGS = [
  // General settings
  { category: 'general', key: 'site_name', value: 'ChatPye', type: 'string', description: 'Website name', isPublic: true },
  { category: 'general', key: 'site_description', value: 'AI-powered YouTube video assistant', type: 'string', description: 'Website description', isPublic: true },
  { category: 'general', key: 'maintenance_mode', value: false, type: 'boolean', description: 'Enable maintenance mode' },
  { category: 'general', key: 'registration_enabled', value: true, type: 'boolean', description: 'Allow new user registrations' },
  
  // Billing settings
  { category: 'billing', key: 'currency', value: 'usd', type: 'string', description: 'Default currency' },
  { category: 'billing', key: 'tax_rate', value: 0, type: 'number', description: 'Default tax rate (%)' },
  { category: 'billing', key: 'trial_days', value: 7, type: 'number', description: 'Free trial period (days)' },
  { category: 'billing', key: 'grace_period_days', value: 3, type: 'number', description: 'Grace period for failed payments' },
  
  // Feature flags
  { category: 'features', key: 'ai_chat_enabled', value: true, type: 'boolean', description: 'Enable AI chat feature', isPublic: true },
  { category: 'features', key: 'notes_enabled', value: true, type: 'boolean', description: 'Enable notes feature', isPublic: true },
  { category: 'features', key: 'bookmarks_enabled', value: true, type: 'boolean', description: 'Enable bookmarks feature', isPublic: true },
  { category: 'features', key: 'referrals_enabled', value: true, type: 'boolean', description: 'Enable referral system', isPublic: true },
  { category: 'features', key: 'xp_system_enabled', value: true, type: 'boolean', description: 'Enable XP system', isPublic: true },
  
  // Usage limits
  { category: 'limits', key: 'free_videos_per_month', value: 2, type: 'number', description: 'Free videos per month for free users' },
  { category: 'limits', key: 'free_questions_per_video', value: 5, type: 'number', description: 'Free questions per video for free users' },
  { category: 'limits', key: 'pro_videos_per_month', value: 100, type: 'number', description: 'Videos per month for Pro users' },
  { category: 'limits', key: 'enterprise_videos_per_month', value: -1, type: 'number', description: 'Videos per month for Enterprise users (-1 = unlimited)' },
  
  // Notifications
  { category: 'notifications', key: 'email_notifications', value: true, type: 'boolean', description: 'Enable email notifications' },
  { category: 'notifications', key: 'admin_notifications', value: true, type: 'boolean', description: 'Send notifications to admins' },
  { category: 'notifications', key: 'new_user_notification', value: true, type: 'boolean', description: 'Notify admins of new user registrations' },
  { category: 'notifications', key: 'subscription_notification', value: true, type: 'boolean', description: 'Notify admins of subscription changes' }
];

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
    const category = searchParams.get('category'); // filter by category
    const publicOnly = searchParams.get('public') === 'true'; // only public settings

    if (process.env.MONGODB_URI) {
      await connectDB();
      
      // Build query
      const query: any = {};
      if (category) {
        query.category = category;
      }
      if (publicOnly) {
        query.isPublic = true;
      }

      const settings = await SystemSettings.find(query).sort({ category: 1, key: 1 });

      // Group settings by category
      const groupedSettings = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      }, {} as Record<string, any[]>);

      return NextResponse.json({
        success: true,
        settings: groupedSettings,
        categories: Object.keys(groupedSettings)
      });

    } else {
      // Development mode - return mock data
      const mockSettings = DEFAULT_SETTINGS.map(setting => ({
        ...setting,
        _id: `mock_${setting.category}_${setting.key}`,
        updatedBy: 'admin',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      }));

      const groupedSettings = mockSettings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      }, {} as Record<string, any[]>);

      return NextResponse.json({
        success: true,
        settings: groupedSettings,
        categories: Object.keys(groupedSettings)
      });
    }

  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    
    // Check if user is admin
    if (!isAdmin(auth.email || '')) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const { action, data } = await request.json();

    if (action === 'update_setting') {
      if (process.env.MONGODB_URI) {
        await connectDB();
        
        const { category, key, value, description, isPublic } = data;
        
        if (!category || !key || value === undefined) {
          return NextResponse.json(
            { error: 'Category, key, and value are required' },
            { status: 400 }
          );
        }

        // Validate value type
        const setting = await SystemSettings.findOne({ category, key });
        if (setting) {
          // Validate value type matches existing setting
          if (typeof value !== setting.type && setting.type !== 'object') {
            return NextResponse.json(
              { error: `Value must be of type ${setting.type}` },
              { status: 400 }
            );
          }
        }

        // Update or create setting
        const updatedSetting = await SystemSettings.findOneAndUpdate(
          { category, key },
          {
            value,
            description: description || setting?.description,
            isPublic: isPublic !== undefined ? isPublic : setting?.isPublic,
            updatedBy: auth.id,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );

        return NextResponse.json({
          success: true,
          message: 'Setting updated successfully',
          setting: updatedSetting
        });
      }
    }

    if (action === 'bulk_update') {
      if (process.env.MONGODB_URI) {
        await connectDB();
        
        const { settings } = data;
        
        if (!Array.isArray(settings)) {
          return NextResponse.json(
            { error: 'Settings must be an array' },
            { status: 400 }
          );
        }

        const updatePromises = settings.map(async (setting: any) => {
          const { category, key, value, description, isPublic } = setting;
          
          if (!category || !key || value === undefined) {
            throw new Error(`Invalid setting: ${category}.${key}`);
          }

          return SystemSettings.findOneAndUpdate(
            { category, key },
            {
              value,
              description,
              isPublic,
              updatedBy: auth.id,
              updatedAt: new Date()
            },
            { upsert: true, new: true }
          );
        });

        const updatedSettings = await Promise.all(updatePromises);

        return NextResponse.json({
          success: true,
          message: `${updatedSettings.length} settings updated successfully`,
          settings: updatedSettings
        });
      }
    }

    if (action === 'reset_to_defaults') {
      if (process.env.MONGODB_URI) {
        await connectDB();
        
        // Reset all settings to default values
        const resetPromises = DEFAULT_SETTINGS.map(setting => 
          SystemSettings.findOneAndUpdate(
            { category: setting.category, key: setting.key },
            {
              value: setting.value,
              type: setting.type,
              description: setting.description,
              isPublic: setting.isPublic,
              updatedBy: auth.id,
              updatedAt: new Date()
            },
            { upsert: true, new: true }
          )
        );

        await Promise.all(resetPromises);

        return NextResponse.json({
          success: true,
          message: 'All settings reset to default values'
        });
      }
    }

    if (action === 'export_settings') {
      if (process.env.MONGODB_URI) {
        await connectDB();
        
        const settings = await SystemSettings.find({}).sort({ category: 1, key: 1 });
        
        return NextResponse.json({
          success: true,
          settings: settings.map(setting => ({
            category: setting.category,
            key: setting.key,
            value: setting.value,
            type: setting.type,
            description: setting.description,
            isPublic: setting.isPublic
          }))
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process settings request' },
      { status: 500 }
    );
  }
}
