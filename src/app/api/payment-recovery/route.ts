import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';
import { PaymentRecoveryService } from '@/lib/error-handling';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recoveryService = PaymentRecoveryService.getInstance();
    const incompletePayments = recoveryService.hasIncompletePayments(userId);

    return NextResponse.json({
      success: true,
      incompletePayments: incompletePayments.map(payment => ({
        sessionId: payment.sessionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        lastAttempt: payment.lastAttempt,
        attempts: payment.attempts
      }))
    });
  } catch (error) {
    console.error('Error retrieving payment recovery data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment recovery data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, sessionId, paymentData } = body;

    const recoveryService = PaymentRecoveryService.getInstance();

    switch (action) {
      case 'store_incomplete':
        if (!paymentData) {
          return NextResponse.json({ error: 'Payment data required' }, { status: 400 });
        }
        
        recoveryService.storeIncompletePayment({
          userId,
          sessionId: paymentData.sessionId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: 'incomplete',
          createdAt: new Date(),
          lastAttempt: new Date(),
          attempts: 0,
          metadata: paymentData.metadata
        });
        
        return NextResponse.json({ success: true, message: 'Payment stored for recovery' });

      case 'update_status':
        if (!sessionId || !paymentData?.status) {
          return NextResponse.json({ error: 'Session ID and status required' }, { status: 400 });
        }
        
        recoveryService.updatePaymentStatus(sessionId, paymentData.status);
        return NextResponse.json({ success: true, message: 'Payment status updated' });

      case 'retry_payment':
        if (!sessionId) {
          return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }
        
        const incompletePayment = recoveryService.getIncompletePayment(sessionId);
        if (!incompletePayment) {
          return NextResponse.json({ error: 'No incomplete payment found' }, { status: 404 });
        }
        
        // Here you would integrate with Stripe to retry the payment
        // For now, we'll just return the payment data
        return NextResponse.json({
          success: true,
          paymentData: {
            sessionId: incompletePayment.sessionId,
            amount: incompletePayment.amount,
            currency: incompletePayment.currency,
            status: incompletePayment.status
          }
        });

      case 'cleanup':
        recoveryService.cleanupCompletedPayments();
        return NextResponse.json({ success: true, message: 'Completed payments cleaned up' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in payment recovery API:', error);
    return NextResponse.json(
      { error: 'Payment recovery operation failed' },
      { status: 500 }
    );
  }
}

