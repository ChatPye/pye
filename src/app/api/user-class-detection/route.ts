import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userClass, email, firstName, lastName } = body;

    // Here you would typically:
    // 1. Update user class in your database
    // 2. Trigger appropriate email sequence in MailerLite
    // 3. Log the user class change

    // For now, we'll just return success
    // In production, you'd integrate with your database and MailerLite API

    console.log(`User ${userId} class changed to: ${userClass}`);
    console.log(`Email: ${email}, Name: ${firstName} ${lastName}`);

    // TODO: Integrate with MailerLite API to trigger appropriate sequence
    // - If userClass === 'freemium': trigger freemium_welcome sequence
    // - If userClass === 'pro': trigger pro_welcome sequence
    // - If userClass === 'inactive': trigger reengagement sequence

    return NextResponse.json({ 
      success: true, 
      message: `User class updated to ${userClass}`,
      userId,
      userClass,
      email,
      firstName,
      lastName
    });

  } catch (error) {
    console.error('Error in user class detection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user class from your database
    // For now, return a mock response
    const userClass = 'freemium'; // This would come from your database

    return NextResponse.json({ 
      success: true,
      userId,
      userClass
    });

  } catch (error) {
    console.error('Error getting user class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

