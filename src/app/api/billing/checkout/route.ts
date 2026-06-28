import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getPricing } from '@/lib/pricing'
import { stripe } from '@/lib/stripe'

type PlanId = 'personal-pro' | 'business-starter' | 'business-team' | 'enterprise-community' | 'enterprise-amplify' | 'enterprise-arena'

const PLAN_TO_PRICE_KEY: Record<string, string> = {
  'personal-pro': 'pro',
  'business-starter': 'pro', // Same as pro for now
  'business-team': 'pro', // $20/seat
  'enterprise-community': 'community',
  'enterprise-amplify': 'amplify',
  'enterprise-arena': 'arena',
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const body = await request.json().catch(() => ({})) as { 
      planId?: PlanId
      orgName?: string
      email?: string
      returnUrl?: string
      quantity?: number
      promo?: boolean
    }
    const { planId, orgName, email, returnUrl, quantity = 1, promo } = body || {}

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    // Dev mode: mock checkout URL and immediate success
    const dev = process.env.DEV_FORCE_IN_MEMORY === 'true' || !stripe
    if (dev) {
      const mockSessionId = `cs_test_${Date.now()}`
      const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${returnUrl || '/onboarding/success'}?session_id=${mockSessionId}&planId=${encodeURIComponent(planId)}&orgName=${encodeURIComponent(orgName || '')}`
      const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${returnUrl || '/onboarding/cancel'}`
      return NextResponse.json({
        ok: true,
        checkoutUrl: successUrl,
        cancelUrl,
        sessionId: mockSessionId,
        dev: true,
      })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
    }

    // Get pricing for the plan
    const pricing = getPricing()
    const priceKey = PLAN_TO_PRICE_KEY[planId]
    const planConfig = pricing[priceKey]
    
    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get or create Stripe Price ID
    let priceId = planConfig.stripePriceId
    if (!priceId) {
      // Create Stripe product and price if they don't exist
      const product = await stripe.products.create({
        name: planConfig.label,
        metadata: { planKey: priceKey }
      })
      
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: planConfig.price * 100, // Convert to cents
        currency: planConfig.currency.toLowerCase(),
        recurring: { interval: 'month' }
      })
      
      priceId = price.id
      // TODO: Update planConfig with priceId (save to DB)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: planId === 'business-team' ? Math.max(1, quantity) : 1,
        },
      ],
      customer_email: email || undefined,
      metadata: {
        userId: userId || '',
        planId,
        orgName: orgName || '',
      },
      subscription_data: {
        metadata: {
          userId: userId || '',
          planId,
          orgName: orgName || '',
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${returnUrl || '/onboarding/success'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${returnUrl || '/onboarding/cancel'}`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({
      ok: true,
      checkoutUrl: session.url,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${returnUrl || '/onboarding/cancel'}`,
      sessionId: session.id,
    })
  } catch (e: any) {
    console.error('Checkout error:', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}


