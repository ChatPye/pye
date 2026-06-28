import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';
import { handleClerkError, handleStripeError, handleMailerLiteError, PaymentRecoveryService } from '@/lib/error-handling';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user's onboarding status
    const hasAcceptedTerms = user.unsafeMetadata?.hasAcceptedTerms === true;
    const hasSelectedPlan = user.unsafeMetadata?.hasSelectedPlan === true;
    const hasCompletedOnboarding = user.unsafeMetadata?.hasCompletedOnboarding === true;
    
    // Check for incomplete payments
    const recoveryService = PaymentRecoveryService.getInstance();
    const incompletePayments = recoveryService.hasIncompletePayments(userId);

    return NextResponse.json({
      success: true,
      onboardingStatus: {
        hasAcceptedTerms,
        hasSelectedPlan,
        hasCompletedOnboarding,
        incompletePayments: incompletePayments.length > 0,
        nextStep: getNextOnboardingStep(hasAcceptedTerms, hasSelectedPlan, hasCompletedOnboarding, incompletePayments.length > 0)
      },
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error in onboarding status check:', error);
    const errorResponse = handleClerkError(error, 'onboarding_status_check');
    return NextResponse.json(errorResponse, { status: 500 });
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
    const { action, data } = body;

    switch (action) {
      case 'accept_terms':
        return await handleAcceptTerms(user, data);
      
      case 'select_plan':
        return await handleSelectPlan(user, data);
      
      case 'complete_onboarding':
        return await handleCompleteOnboarding(user, data);
      
      case 'resume_payment':
        return await handleResumePayment(user, data);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in onboarding API:', error);
    const errorResponse = handleClerkError(error, 'onboarding_action');
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

async function handleAcceptTerms(user: any, data: any) {
  try {
    // Update user metadata to indicate terms acceptance
    await user.update({
      unsafeMetadata: {
        ...user.unsafeMetadata,
        hasAcceptedTerms: true,
        termsAcceptedAt: new Date().toISOString()
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Terms accepted successfully',
      nextStep: 'select_plan'
    });
  } catch (error) {
    console.error('Error accepting terms:', error);
    const errorResponse = handleClerkError(error, 'accept_terms');
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

async function handleSelectPlan(user: any, data: any) {
  try {
    const { plan, paymentMethod } = data;
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan selection required' }, { status: 400 });
    }

    // Update user metadata
    await user.update({
      unsafeMetadata: {
        ...user.unsafeMetadata,
        hasSelectedPlan: true,
        selectedPlan: plan,
        planSelectedAt: new Date().toISOString()
      }
    });

    // If payment is required, handle it
    if (plan !== 'free' && paymentMethod) {
      try {
        // Here you would integrate with Stripe
        // For now, we'll simulate a payment process
        const paymentResult = await processPayment(plan, paymentMethod, user.id);
        
        if (paymentResult.success) {
          return NextResponse.json({
            success: true,
            message: 'Plan selected and payment processed successfully',
            nextStep: 'complete_onboarding',
            paymentResult
          });
        } else {
          // Store incomplete payment for recovery
          const recoveryService = PaymentRecoveryService.getInstance();
          recoveryService.storeIncompletePayment({
            userId: user.id,
            sessionId: paymentResult.sessionId,
            amount: paymentResult.amount,
            currency: paymentResult.currency,
            status: 'incomplete',
            createdAt: new Date(),
            lastAttempt: new Date(),
            attempts: 1,
            metadata: { plan, paymentMethod }
          });
          
          return NextResponse.json({
            success: false,
            error: 'Payment processing failed',
            nextStep: 'retry_payment',
            paymentRecovery: {
              sessionId: paymentResult.sessionId,
              canRetry: true
            }
          });
        }
      } catch (paymentError) {
        console.error('Payment processing error:', paymentError);
        const errorResponse = handleStripeError(paymentError, 'select_plan');
        return NextResponse.json(errorResponse, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Plan selected successfully',
      nextStep: 'complete_onboarding'
    });
  } catch (error) {
    console.error('Error selecting plan:', error);
    const errorResponse = handleClerkError(error, 'select_plan');
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

async function handleCompleteOnboarding(user: any, data: any) {
  try {
    // Update user metadata
    await user.update({
      unsafeMetadata: {
        ...user.unsafeMetadata,
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date().toISOString()
      }
    });

    // Add user to MailerLite
    try {
      await addUserToMailerLite(user);
    } catch (mailerLiteError) {
      console.error('MailerLite error during onboarding:', mailerLiteError);
      // Don't fail onboarding if MailerLite fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      nextStep: 'dashboard'
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    const errorResponse = handleClerkError(error, 'complete_onboarding');
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

async function handleResumePayment(user: any, data: any) {
  try {
    const { sessionId } = data;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const recoveryService = PaymentRecoveryService.getInstance();
    const incompletePayment = recoveryService.getIncompletePayment(sessionId);
    
    if (!incompletePayment) {
      return NextResponse.json({ error: 'No incomplete payment found' }, { status: 404 });
    }

    // Here you would retry the payment with Stripe
    // For now, we'll return the payment data for the frontend to handle
    return NextResponse.json({
      success: true,
      message: 'Payment recovery data retrieved',
      paymentData: {
        sessionId: incompletePayment.sessionId,
        amount: incompletePayment.amount,
        currency: incompletePayment.currency,
        plan: incompletePayment.metadata?.plan,
        canRetry: incompletePayment.attempts < 3
      }
    });
  } catch (error) {
    console.error('Error resuming payment:', error);
    const errorResponse = handleStripeError(error, 'resume_payment');
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

async function processPayment(plan: string, paymentMethod: any, userId: string) {
  // This is a placeholder for Stripe integration
  // In production, you would:
  // 1. Create a Stripe payment intent
  // 2. Process the payment
  // 3. Handle success/failure scenarios
  
  return {
    success: Math.random() > 0.3, // Simulate 70% success rate
    sessionId: `pi_${Date.now()}`,
    amount: getPlanAmount(plan),
    currency: 'usd'
  };
}

function getPlanAmount(plan: string): number {
  const planPricing = {
    'free': 0,
    'pro': 29.99,
    'enterprise': 99.99
  };
  return planPricing[plan as keyof typeof planPricing] || 0;
}

async function addUserToMailerLite(user: any) {
  // This is a placeholder for MailerLite integration
  // In production, you would:
  // 1. Determine user class (freemium/pro)
  // 2. Add user to appropriate MailerLite group
  // 3. Set up email sequences
  
  console.log('Adding user to MailerLite:', user.emailAddresses[0]?.emailAddress);
}

function getNextOnboardingStep(
  hasAcceptedTerms: boolean,
  hasSelectedPlan: boolean,
  hasCompletedOnboarding: boolean,
  hasIncompletePayments: boolean
): string {
  if (hasIncompletePayments) {
    return 'retry_payment';
  }
  
  if (!hasAcceptedTerms) {
    return 'accept_terms';
  }
  
  if (!hasSelectedPlan) {
    return 'select_plan';
  }
  
  if (!hasCompletedOnboarding) {
    return 'complete_onboarding';
  }
  
  return 'dashboard';
}