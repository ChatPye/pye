// Analytics tracking utilities
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: Date;
}

export interface UTMData {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

// Google Analytics 4 tracking
export function trackGA4Event(event: string, parameters?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event, parameters);
  }
}

// PostHog tracking
export function trackPostHogEvent(event: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(event, properties);
  }
}

// Universal analytics tracking function
export function trackEvent(event: string, properties?: Record<string, any>, userId?: string) {
  // Track in GA4
  trackGA4Event(event, { ...properties, user_id: userId });
  
  // Track in PostHog
  trackPostHogEvent(event, { ...properties, userId });
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Analytics Event:', { event, properties, userId });
  }
}

// Specific event tracking functions
export function trackPageView(page: string, title?: string) {
  trackEvent('page_view', {
    page_title: title || document.title,
    page_location: window.location.href,
    page_path: page,
  });
}

export function trackSignUp(method: string, referralCode?: string) {
  trackEvent('sign_up', {
    method,
    referral_code: referralCode,
  });
}

export function trackSignIn(method: string) {
  trackEvent('login', {
    method,
  });
}

export function trackExtensionInstall(source: string) {
  trackEvent('extension_install', {
    source,
    install_timestamp: new Date().toISOString(),
  });
}

export function trackCheckoutStart(tier: string, price: number) {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: price,
    items: [{
      item_id: tier,
      item_name: `${tier} Plan`,
      category: 'subscription',
      quantity: 1,
      price: price,
    }],
  });
}

export function trackPurchase(tier: string, price: number, transactionId: string) {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: 'USD',
    value: price,
    items: [{
      item_id: tier,
      item_name: `${tier} Plan`,
      category: 'subscription',
      quantity: 1,
      price: price,
    }],
  });
}

export function trackExtensionActivation(userId: string, tier: string) {
  trackEvent('extension_activation', {
    user_id: userId,
    tier,
    activation_timestamp: new Date().toISOString(),
  });
}

export function trackNoteCreation(videoId: string, timestamp: number) {
  trackEvent('note_created', {
    video_id: videoId,
    video_timestamp: timestamp,
    content_type: 'youtube_note',
  });
}

export function trackVideoWatch(videoId: string, progress: number) {
  trackEvent('video_watch', {
    video_id: videoId,
    progress_percentage: Math.round(progress * 100),
  });
}

export function trackReferralUsed(referralCode: string, referrerUserId: string) {
  trackEvent('referral_used', {
    referral_code: referralCode,
    referrer_user_id: referrerUserId,
  });
}

export function trackReferralReward(referralCode: string, rewardType: string, amount: number) {
  trackEvent('referral_reward', {
    referral_code: referralCode,
    reward_type: rewardType,
    reward_amount: amount,
  });
}

export function trackXPAward(eventType: string, points: number, level: number) {
  trackEvent('xp_awarded', {
    event_type: eventType,
    points_awarded: points,
    new_level: level,
  });
}

export function trackTokenUsage(action: string, tokensUsed: number, remainingTokens: number) {
  trackEvent('token_used', {
    action,
    tokens_used: tokensUsed,
    remaining_tokens: remainingTokens,
  });
}

// UTM parameter capture and storage
export function captureUTMParameters(): UTMData {
  if (typeof window === 'undefined') return {};
  
  const urlParams = new URLSearchParams(window.location.search);
  const utmData: UTMData = {
    source: urlParams.get('utm_source') || undefined,
    medium: urlParams.get('utm_medium') || undefined,
    campaign: urlParams.get('utm_campaign') || undefined,
    term: urlParams.get('utm_term') || undefined,
    content: urlParams.get('utm_content') || undefined,
  };
  
  // Store in localStorage for persistence
  if (Object.values(utmData).some(value => value !== undefined)) {
    localStorage.setItem('chatpye_utm', JSON.stringify(utmData));
  }
  
  return utmData;
}

export function getStoredUTMParameters(): UTMData {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem('chatpye_utm');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function clearUTMParameters() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('chatpye_utm');
  }
}

// Conversion tracking
export function trackConversion(event: string, value?: number, currency: string = 'USD') {
  trackEvent('conversion', {
    conversion_event: event,
    value,
    currency,
  });
}

// User properties
export function setUserProperties(properties: Record<string, any>, userId?: string) {
  // Set in GA4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
      user_id: userId,
      custom_map: properties,
    });
  }
  
  // Set in PostHog
  if (typeof window !== 'undefined' && window.posthog) {
    if (userId) {
      window.posthog.identify(userId, properties as Record<string, any>);
    }
  }
}

// Error tracking
export function trackError(error: Error, context?: string) {
  trackEvent('error', {
    error_message: error.message,
    error_stack: error.stack,
    context,
  });
}

// Performance tracking
export function trackPerformance(metric: string, value: number, unit: string = 'ms') {
  trackEvent('performance', {
    metric_name: metric,
    metric_value: value,
    metric_unit: unit,
  });
}

// Declare global types for analytics libraries
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    posthog: {
      capture: (event: string, properties?: Record<string, any>) => void;
      identify: (userId: string, properties?: Record<string, any>) => void;
    };
  }
}
