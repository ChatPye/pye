import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  const userId = session.metadata?.userId;
  const billingCycle = session.metadata?.billingCycle;
  const region = session.metadata?.region;
  const promoCode = session.metadata?.promoCode;

  if (userId) {
    // Update user metadata in Clerk
    try {
      // This would typically be done via Clerk's API
      console.log(`User ${userId} completed checkout for ${billingCycle} plan in ${region}`);
      
      if (promoCode) {
        console.log(`Promo code ${promoCode} was used`);
      }
    } catch (error) {
      console.error('Error updating user metadata:', error);
    }
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  const userId = subscription.metadata?.userId;
  const plan = subscription.metadata?.plan;
  const billingCycle = subscription.metadata?.billingCycle;

  if (userId) {
    try {
      // Update user subscription status
      console.log(`User ${userId} subscription created: ${plan} (${billingCycle})`);
      
      // You might want to update your database here
      // await updateUserSubscription(userId, {
      //   status: 'active',
      //   plan,
      //   billingCycle,
      //   stripeSubscriptionId: subscription.id,
      //   currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      // });
    } catch (error) {
      console.error('Error handling subscription creation:', error);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const userId = subscription.metadata?.userId;
  const status = subscription.status;

  if (userId) {
    try {
      console.log(`User ${userId} subscription updated to status: ${status}`);
      
      // Update user subscription status in your database
      // await updateUserSubscription(userId, {
      //   status,
      //   currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      // });
    } catch (error) {
      console.error('Error handling subscription update:', error);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const userId = subscription.metadata?.userId;

  if (userId) {
    try {
      console.log(`User ${userId} subscription cancelled`);
      
      // Update user subscription status to cancelled
      // await updateUserSubscription(userId, {
      //   status: 'cancelled',
      //   cancelledAt: new Date()
      // });
    } catch (error) {
      console.error('Error handling subscription deletion:', error);
    }
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded for invoice:', invoice.id);
  
  const subscriptionId = invoice.subscription as string;
  
  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId;
      
      if (userId) {
        console.log(`Payment succeeded for user ${userId}`);
        
        // Update user's payment status
        // await updateUserPaymentStatus(userId, 'paid');
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed for invoice:', invoice.id);
  
  const subscriptionId = invoice.subscription as string;
  
  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId;
      
      if (userId) {
        console.log(`Payment failed for user ${userId}`);
        
        // Update user's payment status and notify them
        // await updateUserPaymentStatus(userId, 'failed');
        // await sendPaymentFailedNotification(userId);
      }
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }
}

