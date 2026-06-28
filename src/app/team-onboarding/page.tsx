'use client';

import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowRight, Check, Users, Plus, Minus } from 'lucide-react';

export default function TeamOnboardingPage() {
  const { user } = useUser();
  const [userCount, setUserCount] = useState(5);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isUK, setIsUK] = useState(false);

  // Detect location (simplified for demo)
  const pricePerUser = isUK ? (billingCycle === 'annual' ? 25 : 30) : (billingCycle === 'annual' ? 20 : 25);
  const currency = isUK ? '£' : '$';
  const totalPrice = userCount * pricePerUser;
  const discount = billingCycle === 'annual' ? Math.round(totalPrice * 0.17) : 0;
  const finalPrice = totalPrice - discount;

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Set Up Your Team
          </h1>
          <p className="text-xl text-zinc-400">
            Configure your team plan and get everyone started
          </p>
        </div>

        <SignedOut>
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-6">Create Your Account</h2>
            <p className="text-zinc-400 mb-8">
              Sign up to get started with ChatPye Team. It only takes a minute.
            </p>
            
            <SignInButton mode="modal">
              <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Sign Up with ChatPye
                <ArrowRight className="w-5 h-5" />
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Team Configuration */}
            <div className="bg-zinc-900 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-6">Team Configuration</h3>
              
              {/* Billing Cycle */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-300 mb-3">Billing Cycle</label>
                <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${
                      billingCycle === 'monthly' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${
                      billingCycle === 'annual' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              {/* User Count */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-300 mb-3">Number of Users</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setUserCount(Math.max(2, userCount - 1))}
                    className="p-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors"
                  >
                    <Minus className="w-4 h-4 text-zinc-400" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-white">{userCount}</span>
                    <span className="text-sm text-zinc-400 ml-2">users</span>
                  </div>
                  <button
                    onClick={() => setUserCount(userCount + 1)}
                    className="p-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">Minimum of 2 users required</p>
              </div>

              {/* Team Features */}
              <div>
                <h4 className="text-sm font-medium text-zinc-300 mb-3">What's Included</h4>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Unlimited Pods with community features
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Core AI Tutor (300 questions/day)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Custom videos + Zoom/Teams/YT integration
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Unlimited Youtube Extension Usage
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Insights dashboard + Competency profiles
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    500GB storage, dedicated support
                  </li>
                </ul>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-zinc-900 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-6">Order Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">ChatPye Team</span>
                  <span className="text-white font-medium">{currency}{pricePerUser}/user/month</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">{userCount} users</span>
                  <span className="text-white font-medium">{currency}{totalPrice}/month</span>
                </div>
                
                {billingCycle === 'annual' && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300">Annual discount</span>
                    <span className="text-green-400">-{currency}{discount}</span>
                  </div>
                )}
                
                <div className="border-t border-zinc-700 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-white">Total</span>
                    <span className="text-xl font-bold text-white">{currency}{finalPrice}/month</span>
                  </div>
                  {billingCycle === 'annual' && (
                    <p className="text-sm text-zinc-400 text-right">Billed annually</p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Continue to Billing
                </button>
                <button className="w-full border border-zinc-600 text-zinc-300 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
