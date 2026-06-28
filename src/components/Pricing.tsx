'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';

const Pricing = memo(function Pricing() {
  const [view, setView] = useState<'personal' | 'business'>('personal');
  const [isUK, setIsUK] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);

  // Optimized location detection with caching
  const detectLocation = useCallback(async () => {
    // Check cache first
    const cachedLocation = sessionStorage.getItem('chatpye_location');
    if (cachedLocation) {
      setIsUK(cachedLocation === 'UK');
      setLocationLoading(false);
      return;
    }

    try {
      // Try to get location from our API
      const response = await fetch('/api/geo-location');

      if (!response.ok) {
        throw new Error(`Geo API failed with status ${response.status}`);
      }

      const data = await response.json();
      const countryCode = data?.country || data?.country_code;
      const isUKLocation = countryCode === 'GB' || countryCode === 'UK';
      setIsUK(isUKLocation);
      sessionStorage.setItem('chatpye_location', isUKLocation ? 'UK' : 'US');
    } catch (error) {
      console.warn('Location detection failed, defaulting to US pricing.', error);
      setIsUK(false);
      sessionStorage.setItem('chatpye_location', 'US');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  // Personal pricing configuration
  const personalPricing = useMemo(() => ({
    free: {
      price: '0',
      currency: '$',
      features: [
        { text: 'Limited Youtube Extension Usage', included: true },
        { text: 'Standard AI Model', included: true },
        { text: '4 videos per month', included: true },
        { text: '10 questions per video', included: true },
        { text: 'Basic bookmarks', included: true },
        { text: 'Limited Web App Access', included: false },
        { text: 'No access to Agents for Learning and Productivity', included: false },
        { text: 'Note Taking: Not included', included: false },
        { text: 'Support: Not included', included: false }
      ]
    },
    pro: {
      price: isUK ? '15' : '20',
      currency: isUK ? '£' : '$',
      features: [
        { text: 'Unlimited Youtube Extension Usage', included: true },
        { text: 'Advanced & Smart AI Models (Claude, Gemini, GPT)', included: true },
        { text: '100 videos per month', included: true },
        { text: 'Unlimited Questions*', included: true },
        { text: 'Access to Agents for Learning and Productivity', included: true },
        { text: 'Advanced smart bookmarks', included: true },
        { text: 'AI-Powered Note Taking', included: true },
        { text: 'Web App Access: analytics, learning insights, team features', included: true },
        { text: 'Support by ChatPye Team', included: true }
      ]
    }
  }), [isUK]);

  // Business pricing configuration
  const businessPricing = useMemo(() => ({
    starter: {
      price: '0',
      currency: '$',
      priceUnit: '/ seat',
      description: 'For individuals and friends learning together',
      features: [
        { text: 'Up to 2 learners', included: true, icon: '👥' },
        { text: 'Core AI Tutor (10 questions/day)', included: true, icon: '🤖' },
        { text: 'Import from YouTube/Zoom (URLs only)', included: true, icon: '📹' },
        { text: '2 Videos/Month allowance', included: true, icon: '📊' },
        { text: 'Limited Youtube Extension Usage', included: true, icon: '🔒' },
        { text: '1 Pod per month', included: true, icon: '🏠' },
        { text: 'No access to Agents for Learning and Productivity', included: false, icon: '❌' },
        { text: 'No storage, no dashboard', included: false, icon: '❌' }
      ]
    },
    team: {
      price: isUK ? '15' : '20',
      currency: isUK ? '£' : '$',
      priceUnit: '/ user/month',
      description: 'For small teams, bootcamps, and training providers',
      popular: true,
      features: [
        { text: 'Unlimited Pods with community features', included: true, icon: '👥' },
        { text: 'Core AI Tutor (300 questions/day)', included: true, icon: '🤖' },
        { text: 'Custom videos + Zoom/Teams/YT integration', included: true, icon: '📹' },
        { text: 'Unlimited Youtube Extension Usage', included: true, icon: '🔓' },
        { text: 'Access to Agents for Learning and Productivity', included: true, icon: '🤖' },
        { text: 'Insights dashboard + Competency profiles', included: true, icon: '📊' },
        { text: 'Flashcards, Quizzes, Leaderboards', included: true, icon: '🎯' },
        { text: '500GB storage, dedicated support', included: true, icon: '💾' }
      ]
    },
    enterprise: {
      price: 'Contact Sales',
      priceUnit: '',
      description: 'For enterprises and advanced training orgs',
      features: [
        { text: 'Everything in Teams + Unlimited AI Tutor + Unlimited Storage + Agents', included: true, icon: '🏢' },
        { text: 'Unlimited learners + private communities', included: true, icon: '👥' },
        { text: 'XR/VR simulations + AI Colleagues', included: true, icon: '🥽' },
        { text: 'ScoutHR talent pipelines', included: true, icon: '🔍' },
        { text: 'Advanced analytics + engagement heatmaps', included: true, icon: '📈' },
        { text: 'SOC2 compliance, private cloud, SLA support', included: true, icon: '🔒' }
      ]
    }
  }), [isUK]);

  return (
    <section id="pricing" className="relative border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            💡 Simple, scalable pricing
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Start free. Add features and seats as you grow.
          </p>
          <div className="mt-4 inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-1 text-sm">
            <button
              onClick={() => setView('personal')}
              className={`px-4 py-1 rounded-md ${view === 'personal' ? 'bg-white text-black' : 'text-zinc-400'}`}
            >
              Personal
            </button>
            <button
              onClick={() => setView('business')}
              className={`px-4 py-1 rounded-md ${view === 'business' ? 'bg-white text-black' : 'text-zinc-400'}`}
            >
              Business
            </button>
          </div>
          {locationLoading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              Detecting your location for local pricing...
            </div>
          )}
        </div>

        {view === 'personal' ? (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Free Plan */}
            <div className="relative rounded-2xl border p-8 border-zinc-800 bg-zinc-950">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">Free</div>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{personalPricing.free.currency}{personalPricing.free.price}</span>
                  <span className="text-lg text-zinc-400">/month</span>
                </div>
                <div className="text-sm text-zinc-400 mb-6">Perfect for getting started</div>
              </div>
              <ul className="space-y-3 text-sm text-zinc-300">
                {personalPricing.free.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {feature.included ? (
                      <span className="text-emerald-400 text-lg">✓</span>
                    ) : (
                      <span className="text-zinc-500 text-lg">✘</span>
                    )}
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 text-center">
                <Link href="/sign-up" className="inline-flex items-center justify-center rounded-lg px-6 py-3 bg-white text-black font-medium hover:bg-zinc-100">
                  Get started
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-2xl border-2 p-8 border-blue-500 bg-zinc-950">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">Most Popular</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">Pro</div>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{personalPricing.pro.currency}{personalPricing.pro.price}</span>
                  <span className="text-lg text-zinc-400">/monthly</span>
                </div>
                <div className="text-sm text-zinc-400 mb-6">Unlock unlimited potential</div>
              </div>
              <ul className="space-y-3 text-sm text-zinc-300">
                {personalPricing.pro.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                      <span className="text-emerald-400 text-lg">✓</span>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-center text-xs text-blue-300">Limited Time: 20% OFF with code PIONEERNOV30 • Until NOV 30, 2025</div>
              <div className="mt-6 text-center">
                <Link href="/onboarding" className="inline-flex items-center justify-center rounded-lg px-6 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700">
                  Get started
                </Link>
            </div>
          </div>
          </div>
        ) : (
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Starter Plan */}
            <div className="relative rounded-2xl border p-8 border-zinc-800 bg-zinc-950">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">Starter</div>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{businessPricing.starter.currency}{businessPricing.starter.price}</span>
                  <span className="text-lg text-zinc-400">{businessPricing.starter.priceUnit}</span>
                </div>
                <div className="text-sm text-zinc-400 mb-6">{businessPricing.starter.description}</div>
              </div>
              <ul className="space-y-3 text-sm text-zinc-300">
                {businessPricing.starter.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex items-center gap-2">
                      {feature.included ? (
                        <span className="text-emerald-400 text-lg">✓</span>
                      ) : (
                        <span className="text-zinc-500 text-lg">✘</span>
                      )}
                      <span className="text-lg">{feature.icon}</span>
                    </div>
                    <span className={feature.included ? "text-zinc-300" : "text-zinc-500"}>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 text-center">
                <Link href="/sign-up" className="inline-flex w-full items-center justify-center rounded-lg px-6 py-3 bg-white text-black font-medium hover:bg-zinc-100">
                  Start Free
                </Link>
              </div>
            </div>

            {/* Team Plan */}
            <div className={`relative rounded-2xl border p-8 ${
              businessPricing.team.popular 
                ? 'border-blue-500/30 bg-blue-500/5 ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/10' 
                : 'border-zinc-800 bg-zinc-950'
            }`}>
              {businessPricing.team.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">Most Popular</div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">Team</div>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{businessPricing.team.currency}{businessPricing.team.price}</span>
                  <span className="text-lg text-zinc-400">{businessPricing.team.priceUnit}</span>
                </div>
                <div className="text-sm text-zinc-400 mb-6">{businessPricing.team.description}</div>
              </div>
              <ul className="space-y-3 text-sm text-zinc-300">
                {businessPricing.team.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 text-lg">✓</span>
                      <span className="text-lg">{feature.icon}</span>
                    </div>
                    <span className="text-zinc-300">{feature.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 text-center">
                <Link href="/team-onboarding" className="inline-flex w-full items-center justify-center rounded-lg px-6 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700">
                  Get Team Plan
                </Link>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="relative rounded-2xl border p-8 border-zinc-800 bg-zinc-950">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">Enterprise</div>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-white">{businessPricing.enterprise.price}</span>
                  <span className="text-lg text-zinc-400">{businessPricing.enterprise.priceUnit}</span>
                </div>
                <div className="text-sm text-zinc-400 mb-6">{businessPricing.enterprise.description}</div>
              </div>
              <ul className="space-y-3 text-sm text-zinc-300">
                {businessPricing.enterprise.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 text-lg">✓</span>
                      <span className="text-lg">{feature.icon}</span>
                    </div>
                    <span className="text-zinc-300">{feature.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 text-center">
                <Link href="/enterprise" className="inline-flex w-full items-center justify-center rounded-lg px-6 py-3 border border-zinc-600 text-white font-medium hover:bg-zinc-800">
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

export default Pricing;