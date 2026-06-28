import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

// Cache Stripe instance for better performance
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  timeout: 10000, // 10 second timeout
  maxNetworkRetries: 2,
});


// Cache price IDs for better performance
const PRICE_IDS = {
  US: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY_US || 'price_1SB3KXKDxlf4ZHnmu11kTAwK',
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL_US || 'price_1SB3KXKDxlf4ZHnmA9MseFhr',
  },
  UK: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY_UK || 'price_1SB3KYKDxlf4ZHnmfxEH3XZ6',
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL_UK || 'price_1SB3KYKDxlf4ZHnmuRSfKqCC',
  }
};

// Function to get product description based on region
function getProductDescription(region: string) {
  return 'Unlimited AI chat, notes, bookmarks, and premium features';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const { billingCycle, promoCode, region = 'US' } = await request.json();

  if (!billingCycle) {
    return NextResponse.json({ error: 'Billing cycle is required' }, { status: 400 });
  }

  // Get the appropriate price ID based on region and billing cycle
  const priceId = PRICE_IDS[region as keyof typeof PRICE_IDS]?.[billingCycle as 'monthly' | 'annual'];
  
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid billing cycle or region' }, { status: 400 });
  }

  // Check if we're using placeholder price IDs (indicates Stripe not fully configured)
  if (priceId.includes('Example') || priceId.includes('placeholder')) {
    console.error('Stripe price IDs are not configured. Using placeholder values.');
    return NextResponse.json({ 
      error: 'Payment system is being configured. Please try again in a few minutes.',
      details: 'Stripe price IDs need to be set up in production'
    }, { status: 503 });
  }

  // Create checkout session
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/workspace?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    customer_email: undefined, // Will be set by Clerk
    allow_promotion_codes: true, // Enable promo code input in Stripe checkout
    automatic_tax: { enabled: true },
    metadata: {
      userId,
      billingCycle,
      region,
      promoCode: promoCode || '',
    },
    subscription_data: {
      metadata: {
        userId,
        plan: 'pro',
        billingCycle,
        region,
      },
    },
  };

  // Auto-apply 30% promo PIONEEROCT12 for all users through Oct 12, 2025
  const now = new Date();
  const autoPromoDeadline = new Date('2025-10-12T23:59:59Z');
  const effectivePromo = promoCode || (now <= autoPromoDeadline ? 'PIONEEROCT12' : undefined);

  // Apply promo code if provided/effective
  if (effectivePromo) {
    try {
      // Check if promo code exists and is valid
      const coupon = await stripe.coupons.retrieve(effectivePromo);
      if (coupon.valid) {
        sessionParams.discounts = [{
          coupon: effectivePromo,
        }];
      }
    } catch (error) {
      console.warn(`Invalid promo code: ${effectivePromo}`, error);
      // Continue without promo code - user can still enter one in checkout
    }
  }

    const session = await stripe.checkout.sessions.create(sessionParams);

    const duration = Date.now() - startTime;
    console.log(`Stripe checkout session created in ${duration}ms for user ${userId}`);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Improve logging: extract Stripe-specific error details if available
    const asAny = error as any;
    const stripeMessage = asAny?.message;
    const stripeType = asAny?.type;
    const stripeCode = asAny?.code;
    const stripeParam = asAny?.param;
    const raw = asAny?.raw || asAny?.rawType ? { rawType: asAny?.rawType, raw: asAny?.raw } : undefined;

    console.error('Stripe checkout error:', {
      message: stripeMessage,
      type: stripeType,
      code: stripeCode,
      param: stripeParam,
      raw
    });

    return NextResponse.json(
      { error: 'Failed to create checkout session', details: stripeMessage || 'unknown_error' },
      { status: 500 }
    );
  }
}

