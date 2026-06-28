// Stripe configuration and utilities
import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';
import { SUBSCRIPTION_TIERS } from './subscription-tiers';

// Server-side Stripe instance
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

export interface CheckoutSessionData {
  priceId: string;
  tier: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession({
  priceId,
  tier,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: CheckoutSessionData): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer_email: userEmail,
    metadata: {
      userId,
      tier,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });

  return session;
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    return null;
  }
  
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return null;
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  return await stripe.subscriptions.cancel(subscriptionId);
}

export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });
}

// Webhook event handlers
export interface WebhookEventHandlers {
  'checkout.session.completed': (session: Stripe.Checkout.Session) => Promise<void>;
  'customer.subscription.created': (subscription: Stripe.Subscription) => Promise<void>;
  'customer.subscription.updated': (subscription: Stripe.Subscription) => Promise<void>;
  'customer.subscription.deleted': (subscription: Stripe.Subscription) => Promise<void>;
  'invoice.payment_succeeded': (invoice: Stripe.Invoice) => Promise<void>;
  'invoice.payment_failed': (invoice: Stripe.Invoice) => Promise<void>;
}

export async function handleStripeWebhook(
  event: Stripe.Event,
  handlers: Partial<WebhookEventHandlers>
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      if (handlers['checkout.session.completed']) {
        await handlers['checkout.session.completed'](event.data.object as Stripe.Checkout.Session);
      }
      break;
    
    case 'customer.subscription.created':
      if (handlers['customer.subscription.created']) {
        await handlers['customer.subscription.created'](event.data.object as Stripe.Subscription);
      }
      break;
    
    case 'customer.subscription.updated':
      if (handlers['customer.subscription.updated']) {
        await handlers['customer.subscription.updated'](event.data.object as Stripe.Subscription);
      }
      break;
    
    case 'customer.subscription.deleted':
      if (handlers['customer.subscription.deleted']) {
        await handlers['customer.subscription.deleted'](event.data.object as Stripe.Subscription);
      }
      break;
    
    case 'invoice.payment_succeeded':
      if (handlers['invoice.payment_succeeded']) {
        await handlers['invoice.payment_succeeded'](event.data.object as Stripe.Invoice);
      }
      break;
    
    case 'invoice.payment_failed':
      if (handlers['invoice.payment_failed']) {
        await handlers['invoice.payment_failed'](event.data.object as Stripe.Invoice);
      }
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

export function getTierFromPriceId(priceId: string): string {
  // Map Stripe price IDs to subscription tiers
  const tierMap: Record<string, string> = {
    'price_pro_monthly': 'pro',
    'price_enterprise_monthly': 'enterprise',
  };
  
  return tierMap[priceId] || 'free';
}

export function getPriceIdFromTier(tier: string): string | null {
  // Map subscription tiers to Stripe price IDs
  const priceMap: Record<string, string> = {
    'pro': 'price_pro_monthly',
    'enterprise': 'price_enterprise_monthly',
  };
  
  return priceMap[tier] || null;
}
