// Comprehensive error handling system for Clerk, Stripe, and MailerLite failures

export interface ErrorContext {
  service: 'clerk' | 'stripe' | 'mailerlite' | 'aws' | 'database';
  operation: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  recoverable: boolean;
  retryAfter?: number;
  fallbackAction?: string;
}

export class ServiceError extends Error {
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly retryAfter?: number;
  public readonly fallbackAction?: string;

  constructor(
    message: string,
    context: ErrorContext,
    recoverable: boolean = false,
    retryAfter?: number,
    fallbackAction?: string
  ) {
    super(message);
    this.name = 'ServiceError';
    this.context = context;
    this.recoverable = recoverable;
    this.retryAfter = retryAfter;
    this.fallbackAction = fallbackAction;
  }
}

// Clerk Error Handling
export function handleClerkError(error: any, operation: string, userId?: string): ErrorResponse {
  console.error(`Clerk Error in ${operation}:`, error);
  
  if (error?.status === 401 || error?.code === 'unauthorized') {
    return {
      success: false,
      error: 'Authentication required. Please sign in again.',
      code: 'CLERK_UNAUTHORIZED',
      recoverable: true,
      fallbackAction: 'redirect_to_signin'
    };
  }
  
  if (error?.status === 403 || error?.code === 'forbidden') {
    return {
      success: false,
      error: 'Access denied. You do not have permission to perform this action.',
      code: 'CLERK_FORBIDDEN',
      recoverable: false,
      fallbackAction: 'redirect_to_dashboard'
    };
  }
  
  if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
    return {
      success: false,
      error: 'Too many requests. Please try again later.',
      code: 'CLERK_RATE_LIMIT',
      recoverable: true,
      retryAfter: 60
    };
  }
  
  if (error?.status >= 500) {
    return {
      success: false,
      error: 'Authentication service is temporarily unavailable. Please try again later.',
      code: 'CLERK_SERVER_ERROR',
      recoverable: true,
      retryAfter: 30
    };
  }
  
  return {
    success: false,
    error: 'An authentication error occurred. Please try again.',
    code: 'CLERK_UNKNOWN_ERROR',
    recoverable: true,
    fallbackAction: 'redirect_to_signin'
  };
}

// Stripe Error Handling
export function handleStripeError(error: any, operation: string, userId?: string): ErrorResponse {
  console.error(`Stripe Error in ${operation}:`, error);
  
  if (error?.type === 'card_error') {
    return {
      success: false,
      error: `Payment failed: ${error.message}`,
      code: 'STRIPE_CARD_ERROR',
      recoverable: true,
      fallbackAction: 'show_payment_form'
    };
  }
  
  if (error?.type === 'rate_limit_error') {
    return {
      success: false,
      error: 'Too many payment requests. Please try again later.',
      code: 'STRIPE_RATE_LIMIT',
      recoverable: true,
      retryAfter: 60
    };
  }
  
  if (error?.type === 'api_connection_error' || error?.type === 'api_error') {
    return {
      success: false,
      error: 'Payment service is temporarily unavailable. Please try again later.',
      code: 'STRIPE_API_ERROR',
      recoverable: true,
      retryAfter: 30
    };
  }
  
  if (error?.type === 'authentication_error') {
    return {
      success: false,
      error: 'Payment authentication failed. Please contact support.',
      code: 'STRIPE_AUTH_ERROR',
      recoverable: false,
      fallbackAction: 'contact_support'
    };
  }
  
  return {
    success: false,
    error: 'A payment error occurred. Please try again or contact support.',
    code: 'STRIPE_UNKNOWN_ERROR',
    recoverable: true,
    fallbackAction: 'contact_support'
  };
}

// MailerLite Error Handling
export function handleMailerLiteError(error: any, operation: string, userId?: string): ErrorResponse {
  console.error(`MailerLite Error in ${operation}:`, error);
  
  if (error?.response?.status === 401) {
    return {
      success: false,
      error: 'Email service authentication failed.',
      code: 'MAILERLITE_AUTH_ERROR',
      recoverable: false,
      fallbackAction: 'skip_email'
    };
  }
  
  if (error?.response?.status === 429) {
    return {
      success: false,
      error: 'Email service rate limit exceeded. Will retry later.',
      code: 'MAILERLITE_RATE_LIMIT',
      recoverable: true,
      retryAfter: 300 // 5 minutes
    };
  }
  
  if (error?.response?.status >= 500) {
    return {
      success: false,
      error: 'Email service is temporarily unavailable.',
      code: 'MAILERLITE_SERVER_ERROR',
      recoverable: true,
      retryAfter: 60,
      fallbackAction: 'skip_email'
    };
  }
  
  return {
    success: false,
    error: 'Email service error occurred.',
    code: 'MAILERLITE_UNKNOWN_ERROR',
    recoverable: true,
    fallbackAction: 'skip_email'
  };
}

// Payment Recovery System
export interface PaymentRecoveryData {
  userId: string;
  sessionId: string;
  amount: number;
  currency: string;
  status: 'incomplete' | 'failed' | 'cancelled';
  createdAt: Date;
  lastAttempt: Date;
  attempts: number;
  metadata?: Record<string, any>;
}

export class PaymentRecoveryService {
  private static instance: PaymentRecoveryService;
  private recoveryData: Map<string, PaymentRecoveryData> = new Map();
  
  static getInstance(): PaymentRecoveryService {
    if (!PaymentRecoveryService.instance) {
      PaymentRecoveryService.instance = new PaymentRecoveryService();
    }
    return PaymentRecoveryService.instance;
  }
  
  // Store incomplete payment for recovery
  storeIncompletePayment(data: PaymentRecoveryData): void {
    this.recoveryData.set(data.sessionId, data);
    // In production, store this in a database
    console.log('Stored incomplete payment for recovery:', data.sessionId);
  }
  
  // Retrieve incomplete payment
  getIncompletePayment(sessionId: string): PaymentRecoveryData | null {
    return this.recoveryData.get(sessionId) || null;
  }
  
  // Check if user has incomplete payments
  hasIncompletePayments(userId: string): PaymentRecoveryData[] {
    return Array.from(this.recoveryData.values()).filter(
      payment => payment.userId === userId && payment.status === 'incomplete'
    );
  }
  
  // Update payment status
  updatePaymentStatus(sessionId: string, status: PaymentRecoveryData['status']): void {
    const payment = this.recoveryData.get(sessionId);
    if (payment) {
      payment.status = status;
      payment.lastAttempt = new Date();
      payment.attempts += 1;
      this.recoveryData.set(sessionId, payment);
    }
  }
  
  // Clean up completed payments
  cleanupCompletedPayments(): void {
    for (const [sessionId, payment] of this.recoveryData.entries()) {
      if (payment.status !== 'incomplete') {
        this.recoveryData.delete(sessionId);
      }
    }
  }
}

// Error Recovery Actions
export function executeErrorRecovery(errorResponse: ErrorResponse, context: ErrorContext): void {
  switch (errorResponse.fallbackAction) {
    case 'redirect_to_signin':
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in';
      }
      break;
      
    case 'redirect_to_dashboard':
      if (typeof window !== 'undefined') {
        window.location.href = '/workspace';
      }
      break;
      
    case 'show_payment_form':
      if (typeof window !== 'undefined') {
        window.location.href = '/pricing';
      }
      break;
      
    case 'contact_support':
      if (typeof window !== 'undefined') {
        window.location.href = '/support';
      }
      break;
      
    case 'skip_email':
      console.log('Skipping email operation due to error');
      break;
      
    default:
      console.log('No specific recovery action defined');
  }
}

// Retry Logic
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

// Global Error Handler
export function setupGlobalErrorHandling(): void {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Check if it's a service error we can handle
      if (event.reason instanceof ServiceError) {
        executeErrorRecovery({
          success: false,
          error: event.reason.message,
          code: event.reason.context.service.toUpperCase() + '_ERROR',
          recoverable: event.reason.recoverable,
          retryAfter: event.reason.retryAfter,
          fallbackAction: event.reason.fallbackAction
        }, event.reason.context);
      }
    });
    
    // Handle general errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });
  }
}
