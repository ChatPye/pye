'use client';

import { useEffect, useState } from 'react';

export default function DebugEnvPage() {
  const [envVars, setEnvVars] = useState<any>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Only show non-sensitive environment variables
    const clerkVars = {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 15) + '...',
      NODE_ENV: process.env.NODE_ENV,
      CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: process.env.CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
      CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: process.env.CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
    };
    
    setEnvVars(clerkVars);
  }, []);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🔍 Environment Variables Debug</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Clerk Configuration:</h2>
        <div className="bg-gray-800 p-4 rounded-lg">
          <pre className="text-sm">
            {JSON.stringify(envVars, null, 2)}
          </pre>
        </div>
        
        <h2 className="text-xl font-semibold">Key Validation:</h2>
        <div className="bg-gray-800 p-4 rounded-lg">
          <ul className="space-y-2">
            <li>
              <strong>Has Clerk Key:</strong> {envVars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? '✅ Yes' : '❌ No'}
            </li>
            <li>
              <strong>Is Production Key:</strong> {envVars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') ? '✅ Yes' : '❌ No'}
            </li>
            <li>
              <strong>Is Test Key:</strong> {envVars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_') ? '✅ Yes' : '❌ No'}
            </li>
            <li>
              <strong>Environment:</strong> {envVars.NODE_ENV}
            </li>
            <li>
              <strong>Key Type Match:</strong> {
                envVars.NODE_ENV === 'production' && envVars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') ? '✅ Correct' :
                envVars.NODE_ENV !== 'production' && envVars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_') ? '✅ Correct' :
                '❌ Mismatch'
              }
            </li>
          </ul>
        </div>
        
        <h2 className="text-xl font-semibold">Console Logs:</h2>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-300">
            Check your browser console for detailed Clerk configuration logs.
          </p>
          <button 
            onClick={() => console.log('Manual debug check:', envVars)}
            className="mt-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Log to Console
          </button>
        </div>
      </div>
    </div>
  );
}
