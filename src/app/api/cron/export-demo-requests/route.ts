import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// DocumentDB connection
const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  
  try {
    await mongoose.connect(
      process.env.DOCUMENTDB_URI || 'mongodb://localhost:27017/chatpye'
    );
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

// Demo request schema
const DemoRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String, required: true },
  phone: { type: String },
  message: { type: String },
  status: { type: String, default: 'pending', enum: ['pending', 'contacted', 'scheduled', 'completed'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const DemoRequest = mongoose.models.DemoRequest || mongoose.model('DemoRequest', DemoRequestSchema);

// Configure for SSR deployment
export const dynamic = 'force-dynamic';

// AWS S3 client for storing exports
const getS3Client = () => {
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
};

// AWS SES client for email notifications
const getSESClient = () => {
  return new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
};

// Cron job endpoint for automated exports (runs twice daily)
export async function POST(request: NextRequest) {
  try {
    // Verify cron job authorization (optional - you can add API key validation here)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    // Get requests from the last 12 hours (since last export)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const requests = await DemoRequest.find({
      createdAt: { $gte: twelveHoursAgo }
    }).sort({ createdAt: -1 }).lean();
    
    // Also get all pending requests regardless of date
    const pendingRequests = await DemoRequest.find({
      status: 'pending'
    }).sort({ createdAt: -1 }).lean();
    
    // Combine and deduplicate
    const allRequests = [...requests];
    pendingRequests.forEach(pending => {
      if (!allRequests.find(req => (req._id as any).toString() === (pending._id as any).toString())) {
        allRequests.push(pending);
      }
    });
    
    // Create export data with summary
    const exportData = {
      summary: {
        totalRequests: allRequests.length,
        newRequests: requests.length,
        pendingRequests: pendingRequests.length,
        byStatus: {
          pending: allRequests.filter(r => r.status === 'pending').length,
          contacted: allRequests.filter(r => r.status === 'contacted').length,
          scheduled: allRequests.filter(r => r.status === 'scheduled').length,
          completed: allRequests.filter(r => r.status === 'completed').length,
        },
        byDate: {
          today: allRequests.filter(r => {
            const today = new Date();
            const requestDate = new Date(r.createdAt);
            return requestDate.toDateString() === today.toDateString();
          }).length,
          thisWeek: allRequests.filter(r => {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return new Date(r.createdAt) >= weekAgo;
          }).length,
          thisMonth: allRequests.filter(r => {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return new Date(r.createdAt) >= monthAgo;
          }).length,
        },
        exportDate: new Date().toISOString(),
        exportType: 'scheduled'
      },
      requests: allRequests.map(request => ({
        id: (request._id as any).toString(),
        name: request.name,
        email: request.email,
        company: request.company,
        phone: request.phone || '',
        message: request.message || '',
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      }))
    };
    
    const exportFileName = `demo-requests-export-${new Date().toISOString().split('T')[0]}-${Math.floor(Date.now() / (12 * 60 * 60 * 1000))}.json`;
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    let s3Url = '';
    
    // Upload to S3
    if (process.env.AWS_ACCESS_KEY_ID) {
      try {
        const s3Client = getS3Client();
        const bucketName = process.env.S3_EXPORT_BUCKET || 'chatpye-exports';
        
        const uploadCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: `demo-requests/${exportFileName}`,
          Body: jsonContent,
          ContentType: 'application/json',
          Metadata: {
            'export-type': 'demo-requests-scheduled',
            'export-date': new Date().toISOString(),
            'total-records': allRequests.length.toString(),
            'new-records': requests.length.toString(),
            'pending-records': pendingRequests.length.toString()
          }
        });
        
        await s3Client.send(uploadCommand);
        s3Url = `https://${bucketName}.s3.amazonaws.com/demo-requests/${exportFileName}`;
        console.log('Scheduled export uploaded to S3:', s3Url);
      } catch (error) {
        console.error('Failed to upload scheduled export to S3:', error);
      }
    }
    
    // Send email notification
    if (process.env.FROM_EMAIL && allRequests.length > 0) {
      try {
        const sesClient = getSESClient();
        const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
        
        const emailContent = `
          <h2>ChatPye Demo Requests - Automated Export</h2>
          <p>Your twice-daily export has been completed.</p>
          
          <h3>Summary:</h3>
          <ul>
            <li><strong>Total Requests in Export:</strong> ${exportData.summary.totalRequests}</li>
            <li><strong>New Requests (Last 12h):</strong> ${exportData.summary.newRequests}</li>
            <li><strong>Pending Requests:</strong> ${exportData.summary.pendingRequests}</li>
          </ul>
          
          <h3>Status Breakdown:</h3>
          <ul>
            <li><strong>Pending:</strong> ${exportData.summary.byStatus.pending}</li>
            <li><strong>Contacted:</strong> ${exportData.summary.byStatus.contacted}</li>
            <li><strong>Scheduled:</strong> ${exportData.summary.byStatus.scheduled}</li>
            <li><strong>Completed:</strong> ${exportData.summary.byStatus.completed}</li>
          </ul>
          
          <h3>Recent Activity:</h3>
          <ul>
            <li><strong>Today:</strong> ${exportData.summary.byDate.today} requests</li>
            <li><strong>This Week:</strong> ${exportData.summary.byDate.thisWeek} requests</li>
            <li><strong>This Month:</strong> ${exportData.summary.byDate.thisMonth} requests</li>
          </ul>
          
          ${s3Url ? `<p><strong>Download Export:</strong> <a href="${s3Url}">${exportFileName}</a></p>` : ''}
          
          <h3>Recent Requests:</h3>
          <ul>
            ${allRequests.slice(0, 10).map(request => `
              <li>
                <strong>${request.name}</strong> (${request.company}) - ${request.status}
                <br><small>Email: ${request.email} | Created: ${new Date(request.createdAt).toLocaleString()}</small>
              </li>
            `).join('')}
          </ul>
          
          <p><em>This is an automated export generated twice daily. Export completed at: ${new Date().toLocaleString()}</em></p>
        `;
        
        const emailCommand = new SendEmailCommand({
          Source: process.env.FROM_EMAIL,
          Destination: {
            ToAddresses: [adminEmail],
          },
          Message: {
            Subject: {
              Data: `ChatPye Demo Requests Export - ${new Date().toLocaleDateString()} (${allRequests.length} requests)`,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: emailContent,
                Charset: 'UTF-8',
              },
            },
          },
        });
        
        await sesClient.send(emailCommand);
        console.log('Scheduled export notification email sent to:', adminEmail);
      } catch (error) {
        console.error('Failed to send scheduled export email:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Scheduled export completed successfully',
      summary: exportData.summary,
      s3Url,
      exportFileName,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in scheduled export cron job:', error);
    return NextResponse.json({ 
      error: 'Failed to complete scheduled export',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'demo-requests-export-cron',
    lastCheck: new Date().toISOString()
  });
}
