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

// Security event schema
const SecurityEventSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['ddos', 'bot_detected', 'suspicious_activity', 'rate_limit_exceeded', 'failed_login', 'unauthorized_access'],
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    required: true 
  },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },
  userId: { type: String },
  endpoint: { type: String },
  method: { type: String },
  statusCode: { type: Number },
  requestSize: { type: Number },
  responseTime: { type: Number },
  country: { type: String },
  city: { type: String },
  isp: { type: String },
  isBot: { type: Boolean, default: false },
  isProxy: { type: Boolean, default: false },
  isTor: { type: Boolean, default: false },
  riskScore: { type: Number, default: 0 }, // 0-100
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

const SecurityEvent = mongoose.models.SecurityEvent || mongoose.model('SecurityEvent', SecurityEventSchema);

// Rate limiting schema
const RateLimitSchema = new mongoose.Schema({
  ipAddress: { type: String, required: true },
  endpoint: { type: String, required: true },
  count: { type: Number, default: 1 },
  windowStart: { type: Date, default: Date.now },
  lastRequest: { type: Date, default: Date.now },
  isBlocked: { type: Boolean, default: false },
  blockUntil: { type: Date }
});

const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', RateLimitSchema);

// Suspicious IP schema
const SuspiciousIPSchema = new mongoose.Schema({
  ipAddress: { type: String, required: true, unique: true },
  reason: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  isBlocked: { type: Boolean, default: false },
  blockUntil: { type: Date },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  eventCount: { type: Number, default: 1 },
  countries: [{ type: String }],
  userAgents: [{ type: String }],
  endpoints: [{ type: String }]
});

const SuspiciousIP = mongoose.models.SuspiciousIP || mongoose.model('SuspiciousIP', SuspiciousIPSchema);

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
    const type = searchParams.get('type'); // security_events, rate_limits, suspicious_ips
    const severity = searchParams.get('severity');
    const timeRange = searchParams.get('timeRange') || '24h'; // 1h, 24h, 7d, 30d
    const limit = parseInt(searchParams.get('limit') || '100');

    if (process.env.MONGODB_URI) {
      await connectDB();
      
      // Calculate time range
      const now = new Date();
      let startTime = new Date();
      
      switch (timeRange) {
        case '1h':
          startTime.setHours(now.getHours() - 1);
          break;
        case '24h':
          startTime.setDate(now.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(now.getDate() - 30);
          break;
      }

      if (type === 'security_events') {
        const query: any = { createdAt: { $gte: startTime } };
        if (severity) query.severity = severity;

        const events = await SecurityEvent.find(query)
          .sort({ createdAt: -1 })
          .limit(limit);

        // Get statistics
        const stats = await SecurityEvent.aggregate([
          { $match: { createdAt: { $gte: startTime } } },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              avgRiskScore: { $avg: '$riskScore' }
            }
          }
        ]);

        const severityStats = await SecurityEvent.aggregate([
          { $match: { createdAt: { $gte: startTime } } },
          {
            $group: {
              _id: '$severity',
              count: { $sum: 1 }
            }
          }
        ]);

        return NextResponse.json({
          success: true,
          events,
          stats: {
            byType: stats,
            bySeverity: severityStats,
            totalEvents: events.length
          }
        });
      }

      if (type === 'rate_limits') {
        const rateLimits = await RateLimit.find({
          lastRequest: { $gte: startTime }
        }).sort({ count: -1 }).limit(limit);

        return NextResponse.json({
          success: true,
          rateLimits
        });
      }

      if (type === 'suspicious_ips') {
        const suspiciousIPs = await SuspiciousIP.find({
          lastSeen: { $gte: startTime }
        }).sort({ eventCount: -1 }).limit(limit);

        return NextResponse.json({
          success: true,
          suspiciousIPs
        });
      }

      // Default: return overview
      const [events, rateLimits, suspiciousIPs] = await Promise.all([
        SecurityEvent.find({ createdAt: { $gte: startTime } }).limit(10),
        RateLimit.find({ lastRequest: { $gte: startTime } }).sort({ count: -1 }).limit(10),
        SuspiciousIP.find({ lastSeen: { $gte: startTime } }).sort({ eventCount: -1 }).limit(10)
      ]);

      return NextResponse.json({
        success: true,
        overview: {
          recentEvents: events,
          topRateLimits: rateLimits,
          suspiciousIPs: suspiciousIPs,
          totalEvents: await SecurityEvent.countDocuments({ createdAt: { $gte: startTime } }),
          totalRateLimits: await RateLimit.countDocuments({ lastRequest: { $gte: startTime } }),
          totalSuspiciousIPs: await SuspiciousIP.countDocuments({ lastSeen: { $gte: startTime } })
        }
      });

    } else {
      // Development mode - return mock data
      return NextResponse.json({
        success: true,
        overview: {
          recentEvents: [
            {
              _id: 'mock1',
              type: 'ddos',
              severity: 'critical',
              ipAddress: '192.168.1.100',
              endpoint: '/api/chat',
              method: 'POST',
              statusCode: 429,
              requestSize: 1024,
              responseTime: 50,
              country: 'US',
              city: 'New York',
              isp: 'AWS',
              isBot: true,
              isProxy: false,
              isTor: false,
              riskScore: 95,
              createdAt: new Date()
            },
            {
              _id: 'mock2',
              type: 'rate_limit_exceeded',
              severity: 'high',
              ipAddress: '10.0.0.1',
              endpoint: '/api/admin/users',
              method: 'GET',
              statusCode: 429,
              requestSize: 512,
              responseTime: 25,
              country: 'Unknown',
              city: 'Unknown',
              isp: 'Unknown',
              isBot: false,
              isProxy: true,
              isTor: false,
              riskScore: 75,
              createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
            }
          ],
          topRateLimits: [
            {
              _id: 'mock1',
              ipAddress: '192.168.1.100',
              endpoint: '/api/chat',
              count: 150,
              isBlocked: true,
              blockUntil: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
              lastRequest: new Date()
            }
          ],
          suspiciousIPs: [
            {
              _id: 'mock1',
              ipAddress: '192.168.1.100',
              reason: 'Multiple DDoS attempts',
              severity: 'critical',
              isBlocked: true,
              blockUntil: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
              firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
              lastSeen: new Date(),
              eventCount: 45,
              countries: ['US', 'CA'],
              userAgents: ['bot', 'scanner'],
              endpoints: ['/api/chat', '/api/users']
            }
          ],
          totalEvents: 156,
          totalRateLimits: 23,
          totalSuspiciousIPs: 8
        }
      });
    }

  } catch (error) {
    console.error('Security monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security data' },
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

    if (action === 'block_ip') {
      if (process.env.MONGODB_URI) {
        await connectDB();
        
        const { ipAddress, duration, reason } = data;
        
        if (!ipAddress) {
          return NextResponse.json(
            { error: 'IP address is required' },
            { status: 400 }
          );
        }

        // Update or create suspicious IP record
        const blockUntil = duration ? new Date(Date.now() + duration * 1000) : null;
        
        await SuspiciousIP.findOneAndUpdate(
          { ipAddress },
          {
            ipAddress,
            reason: reason || 'Manually blocked by admin',
            severity: 'high',
            isBlocked: true,
            blockUntil,
            lastSeen: new Date(),
            $inc: { eventCount: 1 }
          },
          { upsert: true }
        );

        return NextResponse.json({
          success: true,
          message: `IP ${ipAddress} blocked successfully`
        });
      }
    }

    if (action === 'unblock_ip') {
      if (process.env.MONGODB_URI) {
        await connectDB();
        
        const { ipAddress } = data;
        
        await SuspiciousIP.findOneAndUpdate(
          { ipAddress },
          {
            isBlocked: false,
            blockUntil: null
          }
        );

        return NextResponse.json({
          success: true,
          message: `IP ${ipAddress} unblocked successfully`
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Security POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process security request' },
      { status: 500 }
    );
  }
}
