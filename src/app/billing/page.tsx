'use client';

import { useState } from 'react';
import { SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers';

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState('pro');

  const startCheckout = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stripe/create-checkout-session', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier })
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  };

  const tiers = Object.values(SUBSCRIPTION_TIERS).filter(tier => tier.id !== 'free');

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-semibold">Choose Your Plan</h1>
        <p className="mt-3 text-zinc-400">Select a plan to unlock premium features in the YouTube extension.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-lg border p-6 cursor-pointer transition ${
              selectedTier === tier.id
                ? 'border-white bg-zinc-900'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
            onClick={() => setSelectedTier(tier.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{tier.name}</h3>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  ${(tier.price / 100).toFixed(2)}
                </div>
                <div className="text-sm text-zinc-400">per month</div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-lg font-medium text-blue-400">
                {tier.maxTokens.toLocaleString()} tokens/month
              </div>
              <div className="text-sm text-zinc-400">Monthly allocation</div>
            </div>
            
            <ul className="space-y-2 mb-6">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-zinc-300">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                  {feature}
                </li>
              ))}
            </ul>
            
            {selectedTier === tier.id && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-black rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <button 
          onClick={startCheckout} 
          disabled={loading} 
          className="inline-flex items-center gap-2 rounded-md bg-white px-8 py-3 text-sm font-medium text-black transition hover:bg-zinc-100 disabled:opacity-60"
        >
          {loading ? 'Redirecting…' : `Subscribe to ${SUBSCRIPTION_TIERS[selectedTier.toUpperCase()].name}`}
        </button>
        
        <div className="mt-4">
          <a href="/return" className="text-sm text-zinc-400 hover:text-white transition">
            I already have a subscription
          </a>
        </div>
      </div>
    </main>
  );
}


