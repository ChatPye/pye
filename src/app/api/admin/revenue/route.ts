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

// Revenue tracking schema
const RevenueSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'usd' },
  subscriptionType: { type: String, required: true },
  billingCycle: { type: String, required: true },
  region: { type: String, required: true },
  stripeSessionId: { type: String },
  stripeSubscriptionId: { type: String },
  status: { type: String, default: 'completed' },
  createdAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
});

const Revenue = mongoose.models.Revenue || mongoose.model('Revenue', RevenueSchema);

// Analytics schema
const AnalyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  metrics: {
    newUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    churnRate: { type: Number, default: 0 },
    averageRevenuePerUser: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

const Analytics = mongoose.models.Analytics || mongoose.model('Analytics', AnalyticsSchema);

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
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
    const region = searchParams.get('region') || 'all'; // us, uk, all

    if (process.env.MONGODB_URI) {
      await connectDB();
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Build query
      const query: any = {
        createdAt: { $gte: startDate, $lte: now },
        status: 'completed'
      };

      if (region !== 'all') {
        query.region = region;
      }

      // Get revenue data
      const revenueData = await Revenue.find(query).sort({ createdAt: -1 });
      
      // Calculate metrics
      const totalRevenue = revenueData.reduce((sum, item) => sum + item.amount, 0);
      const totalTransactions = revenueData.length;
      const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      
      // Revenue by subscription type
      const revenueByType = revenueData.reduce((acc, item) => {
        const key = `${item.subscriptionType}-${item.billingCycle}`;
        acc[key] = (acc[key] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);

      // Revenue by region
      const revenueByRegion = revenueData.reduce((acc, item) => {
        acc[item.region] = (acc[item.region] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);

      // Monthly revenue trend
      const monthlyTrend = revenueData.reduce((acc, item) => {
        const month = item.createdAt.toISOString().substring(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);

      // Get user metrics
      const UserClassSchema = new mongoose.Schema({
        userId: { type: String, required: true, unique: true },
        userClass: { type: String, enum: ['freemium', 'pro', 'enterprise'], default: 'freemium' },
        subscriptionStatus: {
          isActive: { type: Boolean, default: false },
          planType: { type: String },
          startDate: { type: Date },
          endDate: { type: Date }
        },
        createdAt: { type: Date, default: Date.now }
      });

      const UserClass = mongoose.models.UserClass || mongoose.model('UserClass', UserClassSchema);
      
      const totalUsers = await UserClass.countDocuments();
      const activeSubscriptions = await UserClass.countDocuments({
        'subscriptionStatus.isActive': true
      });
      const proUsers = await UserClass.countDocuments({
        userClass: { $in: ['pro', 'enterprise'] }
      });

      // Conversion rate (pro users / total users)
      const conversionRate = totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0;

      // Average Revenue Per User (ARPU)
      const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;

      return NextResponse.json({
        success: true,
        revenue: {
          total: totalRevenue,
          transactions: totalTransactions,
          averageTransactionValue,
          byType: revenueByType,
          byRegion: revenueByRegion,
          monthlyTrend,
          period,
          region
        },
        metrics: {
          totalUsers,
          activeSubscriptions,
          proUsers,
          conversionRate: Math.round(conversionRate * 100) / 100,
          arpu: Math.round(arpu * 100) / 100,
          churnRate: 0 // TODO: Calculate churn rate
        }
      });

    } else {
      // Development mode - return mock data
      return NextResponse.json({
        success: true,
        revenue: {
          total: 12500.00,
          transactions: 45,
          averageTransactionValue: 277.78,
          byType: {
            'pro-monthly': 8500.00,
            'pro-annual': 3200.00,
            'enterprise-monthly': 800.00
          },
          byRegion: {
            'us': 9800.00,
            'uk': 2700.00
          },
          monthlyTrend: {
            '2024-08': 4200.00,
            '2024-09': 8300.00
          },
          period,
          region
        },
        metrics: {
          totalUsers: 156,
          activeSubscriptions: 42,
          proUsers: 38,
          conversionRate: 24.36,
          arpu: 80.13,
          churnRate: 5.2
        }
      });
    }

  } catch (error) {
    console.error('Revenue analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue analytics' },
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

    if (action === 'create_revenue_record') {
      // Create a revenue record (for testing or manual entry)
      if (process.env.MONGODB_URI) {
        await connectDB();
        
        const revenue = new Revenue({
          userId: data.userId,
          amount: data.amount,
          currency: data.currency || 'usd',
          subscriptionType: data.subscriptionType,
          billingCycle: data.billingCycle,
          region: data.region || 'us',
          stripeSessionId: data.stripeSessionId,
          status: 'completed',
          metadata: data.metadata || {}
        });
        
        await revenue.save();
        
        return NextResponse.json({
          success: true,
          message: 'Revenue record created successfully',
          revenue
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Revenue analytics POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process revenue analytics request' },
      { status: 500 }
    );
  }
}
