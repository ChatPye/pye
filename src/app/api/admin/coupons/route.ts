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

// Coupon schema
const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['percentage', 'fixed_amount', 'free_trial'], 
    required: true 
  },
  value: { type: Number, required: true }, // percentage or amount
  currency: { type: String, default: 'usd' },
  maxUses: { type: Number, default: null }, // null = unlimited
  usedCount: { type: Number, default: 0 },
  maxUsesPerUser: { type: Number, default: 1 },
  applicablePlans: [{ type: String }], // ['pro', 'enterprise']
  applicableRegions: [{ type: String }], // ['us', 'uk']
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true }, // admin user ID
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
});

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);

// Coupon usage tracking schema
const CouponUsageSchema = new mongoose.Schema({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
  userId: { type: String, required: true },
  orderId: { type: String }, // Stripe order ID
  amount: { type: Number, required: true },
  discount: { type: Number, required: true },
  usedAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
});

const CouponUsage = mongoose.models.CouponUsage || mongoose.model('CouponUsage', CouponUsageSchema);

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
    const status = searchParams.get('status') || 'all'; // all, active, expired, inactive
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (process.env.MONGODB_URI) {
      await connectDB();
      
      // Build query
      const query: any = {};
      
      if (status === 'active') {
        query.isActive = true;
        query.validFrom = { $lte: new Date() };
        query.validUntil = { $gte: new Date() };
      } else if (status === 'expired') {
        query.validUntil = { $lt: new Date() };
      } else if (status === 'inactive') {
        query.isActive = false;
      }

      // Get coupons with usage statistics
      const coupons = await Coupon.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      // Get usage statistics for each coupon
      const couponsWithStats = await Promise.all(
        coupons.map(async (coupon) => {
          const usageCount = await CouponUsage.countDocuments({ couponId: coupon._id });
          const totalDiscount = await CouponUsage.aggregate([
            { $match: { couponId: coupon._id } },
            { $group: { _id: null, total: { $sum: '$discount' } } }
          ]);

          return {
            ...coupon,
            usageCount,
            totalDiscountGiven: totalDiscount[0]?.total || 0,
            isExpired: new Date(coupon.validUntil) < new Date(),
            isFullyUsed: coupon.maxUses ? usageCount >= coupon.maxUses : false
          };
        })
      );

      // Get summary statistics
      const totalCoupons = await Coupon.countDocuments();
      const activeCoupons = await Coupon.countDocuments({ 
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      });
      const expiredCoupons = await Coupon.countDocuments({ 
        validUntil: { $lt: new Date() }
      });

      return NextResponse.json({
        success: true,
        coupons: couponsWithStats,
        summary: {
          total: totalCoupons,
          active: activeCoupons,
          expired: expiredCoupons,
          inactive: totalCoupons - activeCoupons - expiredCoupons
        },
        pagination: {
          limit,
          offset,
          hasMore: coupons.length === limit
        }
      });

    } else {
      // Development mode - return mock data
      return NextResponse.json({
        success: true,
        coupons: [
          {
            _id: 'mock1',
            code: 'WELCOME20',
            name: 'Welcome Discount',
            description: '20% off for new users',
            type: 'percentage',
            value: 20,
            currency: 'usd',
            maxUses: 100,
            usedCount: 45,
            maxUsesPerUser: 1,
            applicablePlans: ['pro', 'enterprise'],
            applicableRegions: ['us', 'uk'],
            validFrom: new Date('2024-01-01'),
            validUntil: new Date('2024-12-31'),
            isActive: true,
            createdBy: 'admin',
            createdAt: new Date('2024-01-01'),
            usageCount: 45,
            totalDiscountGiven: 2250.00,
            isExpired: false,
            isFullyUsed: false
          },
          {
            _id: 'mock2',
            code: 'PRO50',
            name: 'Pro Upgrade',
            description: '$50 off Pro subscription',
            type: 'fixed_amount',
            value: 50,
            currency: 'usd',
            maxUses: 50,
            usedCount: 23,
            maxUsesPerUser: 1,
            applicablePlans: ['pro'],
            applicableRegions: ['us'],
            validFrom: new Date('2024-06-01'),
            validUntil: new Date('2024-09-30'),
            isActive: true,
            createdBy: 'admin',
            createdAt: new Date('2024-06-01'),
            usageCount: 23,
            totalDiscountGiven: 1150.00,
            isExpired: false,
            isFullyUsed: false
          }
        ],
        summary: {
          total: 8,
          active: 5,
          expired: 2,
          inactive: 1
        },
        pagination: {
          limit,
          offset,
          hasMore: false
        }
      });
    }

  } catch (error) {
    console.error('Coupons GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
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

    if (action === 'create_coupon') {
      if (process.env.MONGODB_URI) {
        await connectDB();
        
        // Validate required fields
        const { code, name, type, value, validFrom, validUntil } = data;
        
        if (!code || !name || !type || !value || !validFrom || !validUntil) {
          return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
          );
        }

        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
          return NextResponse.json(
            { error: 'Coupon code already exists' },
            { status: 400 }
          );
        }

        // Validate dates
        const fromDate = new Date(validFrom);
        const untilDate = new Date(validUntil);
        
        if (fromDate >= untilDate) {
          return NextResponse.json(
            { error: 'Valid from date must be before valid until date' },
            { status: 400 }
          );
        }

        // Validate value based on type
        if (type === 'percentage' && (value < 1 || value > 100)) {
          return NextResponse.json(
            { error: 'Percentage must be between 1 and 100' },
            { status: 400 }
          );
        }

        if (type === 'fixed_amount' && value <= 0) {
          return NextResponse.json(
            { error: 'Fixed amount must be greater than 0' },
            { status: 400 }
          );
        }

        // Create coupon
        const coupon = new Coupon({
          code: code.toUpperCase(),
          name,
          description: data.description || '',
          type,
          value,
          currency: data.currency || 'usd',
          maxUses: data.maxUses || null,
          maxUsesPerUser: data.maxUsesPerUser || 1,
          applicablePlans: data.applicablePlans || [],
          applicableRegions: data.applicableRegions || [],
          validFrom: fromDate,
          validUntil: untilDate,
          isActive: data.isActive !== false,
          createdBy: auth.id,
          metadata: data.metadata || {}
        });

        await coupon.save();

        return NextResponse.json({
          success: true,
          message: 'Coupon created successfully',
          coupon
        });
      }
    }

    if (action === 'update_coupon') {
      if (process.env.MONGODB_URI) {
        await connectDB();
        
        const { couponId, updates } = data;
        
        if (!couponId) {
          return NextResponse.json(
            { error: 'Coupon ID is required' },
            { status: 400 }
          );
        }

        // Remove fields that shouldn't be updated directly
        delete updates._id;
        delete updates.createdAt;
        delete updates.createdBy;
        delete updates.usedCount;
        
        updates.updatedAt = new Date();

        const coupon = await Coupon.findByIdAndUpdate(
          couponId,
          updates,
          { new: true, runValidators: true }
        );

        if (!coupon) {
          return NextResponse.json(
            { error: 'Coupon not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Coupon updated successfully',
          coupon
        });
      }
    }

    if (action === 'delete_coupon') {
      if (process.env.MONGODB_URI) {
        await connectDB();
        
        const { couponId } = data;
        
        if (!couponId) {
          return NextResponse.json(
            { error: 'Coupon ID is required' },
            { status: 400 }
          );
        }

        // Check if coupon has been used
        const usageCount = await CouponUsage.countDocuments({ couponId });
        if (usageCount > 0) {
          // Soft delete - just deactivate
          const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { isActive: false, updatedAt: new Date() },
            { new: true }
          );
          
          return NextResponse.json({
            success: true,
            message: 'Coupon deactivated (has usage history)',
            coupon
          });
        } else {
          // Hard delete - no usage history
          await Coupon.findByIdAndDelete(couponId);
          
          return NextResponse.json({
            success: true,
            message: 'Coupon deleted successfully'
          });
        }
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Coupons POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process coupon request' },
      { status: 500 }
    );
  }
}
