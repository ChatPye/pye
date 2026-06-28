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

// Type for lean query results
interface DemoRequestLean {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  company: string;
  phone?: string;
  message?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

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

// Export demo requests as JSON
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includePending = searchParams.get('includePending') === 'true';
    const dateRange = searchParams.get('dateRange'); // 'today', 'week', 'month', 'all'
    
    // Build query based on parameters
    const query: any = {};
    
    if (!includePending) {
      query.status = { $ne: 'pending' };
    }
    
    // Date range filtering
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0); // All time
      }
      
      query.createdAt = { $gte: startDate };
    }
    
    // Get demo requests
    const requests = await DemoRequest.find(query)
      .sort({ createdAt: -1 })
      .lean() as unknown as DemoRequestLean[];
    
    // Add summary statistics
    const summary = {
      totalRequests: requests.length,
      byStatus: {
        pending: requests.filter(r => r.status === 'pending').length,
        contacted: requests.filter(r => r.status === 'contacted').length,
        scheduled: requests.filter(r => r.status === 'scheduled').length,
        completed: requests.filter(r => r.status === 'completed').length,
      },
      byDate: {
        today: requests.filter(r => {
          const today = new Date();
          const requestDate = new Date(r.createdAt);
          return requestDate.toDateString() === today.toDateString();
        }).length,
        thisWeek: requests.filter(r => {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return new Date(r.createdAt) >= weekAgo;
        }).length,
        thisMonth: requests.filter(r => {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return new Date(r.createdAt) >= monthAgo;
        }).length,
      },
      exportDate: new Date().toISOString(),
      exportParameters: {
        format,
        includePending,
        dateRange: dateRange || 'all'
      }
    };
    
    const exportData = {
      summary,
      requests: requests.map(request => ({
        id: request._id.toString(),
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
    
    if (format === 'json') {
      return NextResponse.json(exportData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="demo-requests-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }
    
    // CSV format
    if (format === 'csv') {
      const csvHeaders = 'ID,Name,Email,Company,Phone,Message,Status,Created At,Updated At\n';
      const csvRows = requests.map(request => 
        `"${request._id}","${request.name}","${request.email}","${request.company}","${request.phone || ''}","${(request.message || '').replace(/"/g, '""')}","${request.status}","${request.createdAt}","${request.updatedAt}"`
      ).join('\n');
      
      const csvContent = csvHeaders + csvRows;
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="demo-requests-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }
    
    return NextResponse.json({ error: 'Invalid format. Use json or csv.' }, { status: 400 });
    
  } catch (error) {
    console.error('Error exporting demo requests:', error);
    return NextResponse.json({ 
      error: 'Failed to export demo requests',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Scheduled export job (POST endpoint for triggering manually or via cron)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const emailNotification = searchParams.get('email') === 'true';
    const uploadToS3 = searchParams.get('s3') === 'true';
    
    // Get all demo requests
    const requests = await DemoRequest.find({})
      .sort({ createdAt: -1 })
      .lean() as unknown as DemoRequestLean[];
    
    // Create export data with summary
    const exportData = {
      summary: {
        totalRequests: requests.length,
        byStatus: {
          pending: requests.filter(r => r.status === 'pending').length,
          contacted: requests.filter(r => r.status === 'contacted').length,
          scheduled: requests.filter(r => r.status === 'scheduled').length,
          completed: requests.filter(r => r.status === 'completed').length,
        },
        byDate: {
          today: requests.filter(r => {
            const today = new Date();
            const requestDate = new Date(r.createdAt);
            return requestDate.toDateString() === today.toDateString();
          }).length,
          thisWeek: requests.filter(r => {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return new Date(r.createdAt) >= weekAgo;
          }).length,
          thisMonth: requests.filter(r => {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return new Date(r.createdAt) >= monthAgo;
          }).length,
        },
        exportDate: new Date().toISOString()
      },
      requests: requests.map(request => ({
        id: request._id.toString(),
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
    
    const exportFileName = `demo-requests-export-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    let s3Url = '';
    
    // Upload to S3 if requested
    if (uploadToS3 && process.env.AWS_ACCESS_KEY_ID) {
      try {
        const s3Client = getS3Client();
        const bucketName = process.env.S3_EXPORT_BUCKET || 'chatpye-exports';
        
        const uploadCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: `demo-requests/${exportFileName}`,
          Body: jsonContent,
          ContentType: 'application/json',
          Metadata: {
            'export-type': 'demo-requests',
            'export-date': new Date().toISOString(),
            'total-records': requests.length.toString()
          }
        });
        
        await s3Client.send(uploadCommand);
        s3Url = `https://${bucketName}.s3.amazonaws.com/demo-requests/${exportFileName}`;
        console.log('Export uploaded to S3:', s3Url);
      } catch (error) {
        console.error('Failed to upload to S3:', error);
      }
    }
    
    // Send email notification if requested
    if (emailNotification && process.env.FROM_EMAIL) {
      try {
        const sesClient = getSESClient();
        const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;
        
        const emailContent = `
          <h2>ChatPye Demo Requests Export</h2>
          <p>Automated export completed successfully.</p>
          
          <h3>Summary:</h3>
          <ul>
            <li><strong>Total Requests:</strong> ${exportData.summary.totalRequests}</li>
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
          
          ${s3Url ? `<p><strong>S3 Export URL:</strong> <a href="${s3Url}">Download Export</a></p>` : ''}
          
          <p>Export completed at: ${new Date().toLocaleString()}</p>
        `;
        
        const emailCommand = new SendEmailCommand({
          Source: process.env.FROM_EMAIL,
          Destination: {
            ToAddresses: [adminEmail],
          },
          Message: {
            Subject: {
              Data: `ChatPye Demo Requests Export - ${new Date().toLocaleDateString()}`,
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
        console.log('Export notification email sent to:', adminEmail);
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Export completed successfully',
      summary: exportData.summary,
      s3Url,
      exportFileName,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in scheduled export:', error);
    return NextResponse.json({ 
      error: 'Failed to complete export',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
