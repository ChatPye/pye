import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import mongoose from 'mongoose';

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

// Demo request schema for DocumentDB
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

const DEFAULT_TEAM_EMAIL = 'job@chatpye.com';

// AWS SES client for sending emails
const getSESClient = () => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured');
  }
  return new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

// AWS SNS client for notifications
const getSNSClient = () => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured');
  }
  return new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

const getTeamRecipients = () => {
  const raw = process.env.TEAM_NOTIFICATION_EMAILS || process.env.DEMO_REQUEST_NOTIFY_EMAILS || DEFAULT_TEAM_EMAIL;
  return raw
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
};

export async function POST(request: NextRequest) {
  try {
    const { name, email, company, phone, message } = await request.json();

    if (!name || !email || !company) {
      return NextResponse.json({ 
        error: 'Name, email, and company are required' 
      }, { status: 400 });
    }

    // Development mode fallback - just return success without AWS services
    if (process.env.NODE_ENV === 'development' && !process.env.AWS_ACCESS_KEY_ID) {
      console.log('Demo request received (development mode):', { name, email, company, phone, message });
      return NextResponse.json({
        success: true,
        message: 'Demo request submitted successfully (development mode)'
      });
    }

    // Send confirmation email to user
    try {
      const sesClient = getSESClient();
      
      const confirmationEmail = new SendEmailCommand({
        Source: process.env.SES_FROM_EMAIL || 'noreply@chatpye.com',
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: 'Demo Request Received - ChatPye',
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Thank you for your interest in ChatPye!</h2>
                  <p>Hi ${name},</p>
                  <p>We've received your demo request and are excited to show you how ChatPye can transform your training videos into interactive learning experiences.</p>
                  
                  <h3>What happens next?</h3>
                  <ul>
                    <li>Our team will review your requirements within 24 hours</li>
                    <li>We'll schedule a personalized demo session</li>
                    <li>You'll get access to our latest features and insights</li>
                  </ul>
                  
                  <p>In the meantime, feel free to explore our interactive demo on the website.</p>
                  
                  <p>Best regards,<br>The ChatPye Team</p>
                  
                  <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                  <p style="font-size: 12px; color: #6b7280;">
                    This email was sent because you requested a demo of ChatPye. 
                    If you didn't request this, please ignore this email.
                  </p>
                </div>
              `,
              Charset: 'UTF-8',
            },
            Text: {
              Data: `
                Thank you for your interest in ChatPye!
                
                Hi ${name},
                
                We've received your demo request and are excited to show you how ChatPye can transform your training videos into interactive learning experiences.
                
                What happens next?
                - Our team will review your requirements within 24 hours
                - We'll schedule a personalized demo session
                - You'll get access to our latest features and insights
                
                In the meantime, feel free to explore our interactive demo on the website.
                
                Best regards,
                The ChatPye Team
              `,
              Charset: 'UTF-8',
            },
          },
        },
      });

      await sesClient.send(confirmationEmail);
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      // Continue with the process even if email fails
    }

    // Send notification to internal team via SNS
    try {
      const snsClient = getSNSClient();
      
      const notificationMessage = `
        New Demo Request Received:
        
        Name: ${name}
        Email: ${email}
        Company: ${company}
        Phone: ${phone || 'Not provided'}
        Message: ${message || 'No additional message'}
        
        Timestamp: ${new Date().toISOString()}
      `;

      const notification = new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN || 'arn:aws:sns:us-east-1:123456789012:chatpye-demo-requests',
        Message: notificationMessage,
        Subject: 'New ChatPye Demo Request',
      });

      await snsClient.send(notification);
    } catch (error) {
      console.error('Failed to send SNS notification:', error);
      // Continue with the process even if SNS fails
    }

    // Email the internal team directly with request details
    try {
      const recipients = getTeamRecipients();
      if (recipients.length > 0) {
        const sesClient = getSESClient();
        const internalEmail = new SendEmailCommand({
          Source: process.env.SES_FROM_EMAIL || 'noreply@chatpye.com',
          Destination: {
            ToAddresses: recipients,
          },
          Message: {
            Subject: {
              Data: `New Demo Request – ${company}`,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">New Demo Request</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Company:</strong> ${company}</p>
                    <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                    <p><strong>Message:</strong></p>
                    <p style="background:#f4f4f5;padding:12px;border-radius:8px;">${message || 'No additional message'}</p>
                    <p style="margin-top:24px;font-size:12px;color:#6b7280;">Sent automatically by ChatPye demo form at ${new Date().toISOString()}</p>
                  </div>
                `,
                Charset: 'UTF-8',
              },
              Text: {
                Data: `New Demo Request\n\nName: ${name}\nEmail: ${email}\nCompany: ${company}\nPhone: ${phone || 'Not provided'}\n\nMessage: ${message || 'No additional message'}\n\nTimestamp: ${new Date().toISOString()}`,
                Charset: 'UTF-8',
              },
            },
          },
        });
        await sesClient.send(internalEmail);
      }
    } catch (error) {
      console.error('Failed to send internal team email for demo request:', error);
    }

    // Store in DocumentDB for admin tracking
    try {
      await connectDB();
      
      const demoRequest = new DemoRequest({
        name,
        email,
        company,
        phone,
        message,
        status: 'pending'
      });
      
      await demoRequest.save();
      console.log('Demo request stored in database:', demoRequest._id);
    } catch (error) {
      console.error('Failed to store demo request in database:', error);
      // Continue with the process even if database storage fails
    }

    return NextResponse.json({
      success: true,
      message: 'Demo request submitted successfully'
    });

  } catch (error) {
    console.error('Demo request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit demo request' },
      { status: 500 }
    );
  }
}
