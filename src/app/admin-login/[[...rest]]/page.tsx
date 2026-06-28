'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignIn, useUser } from '@clerk/nextjs';

// Force dynamic rendering to avoid SSR issues with Clerk
export const dynamic = 'force-dynamic';

// Pre-configured admin accounts
const ADMIN_ACCOUNTS = [
  {
    email: 'job@chatpye.com',
    username: 'job',
    password: 'brxTru2027',
    role: 'admin'
  },
  {
    email: 'admin@chatpye.com',
    username: 'admin',
    password: 'ChatPye2024!',
    role: 'admin'
  },
  {
    email: 'deborah@chatpye.com', 
    username: 'deborah',
    password: 'ChatPye2024!',
    role: 'admin'
  }
];

// Wrapper component to handle Clerk availability
function AdminLoginContent() {
  const [showAdminInfo, setShowAdminInfo] = useState(false);
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Admin emails list (same as in admin page)
  const ADMIN_EMAILS = ['job.oyebisi@gmail.com', 'job@chatpye.com'];

  // Handle successful admin authentication
  useEffect(() => {
    if (isLoaded && user) {
      const userEmail = user.emailAddresses[0]?.emailAddress;
      console.log('🔍 Admin Login - User detected:', {
        userEmail,
        adminEmails: ADMIN_EMAILS,
        isAdmin: ADMIN_EMAILS.includes(userEmail || '')
      });
      
      if (ADMIN_EMAILS.includes(userEmail || '')) {
        console.log('✅ Admin login successful, redirecting to admin dashboard');
        // Force redirect to admin dashboard
        window.location.href = '/admin';
      } else {
        console.log('❌ Non-admin user, redirecting to workspace');
        window.location.href = '/workspace';
      }
    }
  }, [user, isLoaded]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Login</h1>
          <p className="text-zinc-400">Access the ChatPye admin dashboard</p>
        </div>

        {/* Admin Account Information */}
        <div className="mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <button
            onClick={() => setShowAdminInfo(!showAdminInfo)}
            className="w-full text-left text-sm text-zinc-400 hover:text-white transition-colors"
          >
            {showAdminInfo ? 'Hide' : 'Show'} Admin Account Information
          </button>
          
          {showAdminInfo && (
            <div className="mt-4 space-y-3">
              {ADMIN_ACCOUNTS.map((account, index) => (
                <div key={index} className="p-3 bg-zinc-800 rounded border border-zinc-700">
                  <div className="text-sm">
                    <div className="font-medium text-white">Account {index + 1}</div>
                    <div className="text-zinc-300">Email: {account.email}</div>
                    <div className="text-zinc-300">Username: {account.username}</div>
                    <div className="text-zinc-300">Password: {account.password}</div>
                    <div className="text-zinc-300">Role: {account.role}</div>
                  </div>
                </div>
              ))}
              <div className="text-xs text-zinc-500 mt-2">
                Note: These accounts are pre-configured for admin access. 
                Email authentication codes will be sent to the registered email addresses.
              </div>
            </div>
          )}
        </div>

        {/* Clerk Sign In */}
        <div className="flex justify-center">
          {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-white text-black hover:bg-zinc-100',
                  card: 'bg-zinc-900 border-zinc-800',
                  headerTitle: 'text-white',
                  headerSubtitle: 'text-zinc-400',
                  socialButtonsBlockButton: 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700',
                  formFieldInput: 'bg-zinc-800 border-zinc-700 text-white',
                  formFieldLabel: 'text-zinc-300',
                  footerActionLink: 'text-blue-400 hover:text-blue-300',
                },
              }}
              signUpUrl="/start"
            />
          ) : (
            <div className="text-center">
              <p className="text-red-500 mb-4">Clerk configuration error</p>
              <Link 
                href="/start" 
                className="text-blue-400 hover:text-blue-300"
              >
                Go to regular login
              </Link>
            </div>
          )}
        </div>

        {/* Back to main site */}
        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to ChatPye
          </Link>
        </div>
      </div>
    </div>
  );
}

// Main page component with Clerk availability check
export default function AdminLoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading admin login...</p>
        </div>
      </div>
    );
  }

  return <AdminLoginContent />;
}