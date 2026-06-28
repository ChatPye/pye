import { auth } from '@clerk/nextjs/server';

export interface User {
  id: string;
  email: string;
  subscription?: {
    tier: 'free' | 'pro' | 'enterprise';
  };
  userClass?: 'freemium' | 'pro' | 'inactive';
}

export async function requireAuth(): Promise<User> {
  // Check for development bypass
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    return {
      id: 'dev-user-id',
      email: process.env.DEV_AUTH_EMAIL || 'dev@chatpye.local',
      subscription: { tier: 'pro' },
      userClass: 'pro'
    };
  }

  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    throw new Error('Authentication required');
  }

  return {
    id: userId,
    email: sessionClaims?.email as string || '',
    subscription: (sessionClaims?.metadata as any)?.subscription || { tier: 'free' },
    userClass: (sessionClaims?.metadata as any)?.userClass || 'freemium'
  };
}

export async function getUser(): Promise<User | null> {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return null;
    }

    return {
      id: userId,
      email: sessionClaims?.email as string || '',
      subscription: (sessionClaims?.metadata as any)?.subscription || { tier: 'free' },
      userClass: (sessionClaims?.metadata as any)?.userClass || 'freemium'
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  
  // Check if user is admin based on email or metadata
  const adminEmails = ['job@chatpye.com', 'admin@chatpye.com', 'deborah@chatpye.com'];
  const isAdmin = adminEmails.includes(user.email) || user.subscription?.tier === 'enterprise';
  
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
  
  return user;
}