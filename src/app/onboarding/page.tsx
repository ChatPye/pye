'use client';

import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowRight, Check, Star, Zap, Users, BarChart3, Brain, Shield } from 'lucide-react';

export default function OnboardingPage() {
  const { user } = useUser();
  const [step, setStep] = useState(1);

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Advanced AI Models",
      description: "Access to Claude, Gemini, and GPT for smarter learning"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Unlimited Questions",
      description: "Ask as many questions as you need without limits"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Team Features",
      description: "Share learning insights and collaborate with others"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics Dashboard",
      description: "Track your learning progress and competency growth"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Priority Support",
      description: "Get help from our dedicated ChatPye team"
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome to ChatPye Pro
          </h1>
          <p className="text-xl text-zinc-400">
            Unlock unlimited potential with our premium learning platform
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-zinc-800'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-zinc-800'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Account Setup */}
        {step === 1 && (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-6">Create Your Account</h2>
            <p className="text-zinc-400 mb-8">
              Sign up to get started with ChatPye Pro. It only takes a minute.
            </p>
            
            <SignedOut>
              <SignInButton mode="modal">
                <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Sign Up with ChatPye
                  <ArrowRight className="w-5 h-5" />
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Account Created Successfully!</span>
                </div>
                <p className="text-sm text-zinc-400">Welcome, {user?.firstName || 'there'}!</p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Continue to Payment
                <ArrowRight className="w-5 h-5" />
              </button>
            </SignedIn>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">Complete Your Payment</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Payment Form */}
              <div className="bg-zinc-900 rounded-lg p-6">
                <h3 className="text-lg font-medium text-white mb-4">Payment Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Cardholder Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Card Number</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Expiry Date</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">CVV</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="123"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Billing Address</label>
                    <textarea
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      rows={3}
                      placeholder="123 Main St, City, State, ZIP"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-zinc-900 rounded-lg p-6">
                <h3 className="text-lg font-medium text-white mb-4">Order Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300">ChatPye Pro</span>
                    <span className="text-white font-medium">$20/month</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300">Discount (20% OFF)</span>
                    <span className="text-green-400">-$4.00</span>
                  </div>
                  
                  <div className="border-t border-zinc-700 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-white">Total</span>
                      <span className="text-xl font-bold text-white">$16.00/month</span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-sm text-blue-300">
                      <strong>Limited Time:</strong> 20% OFF with code PIONEERNOV30
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setStep(3)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-6"
                >
                  Complete Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Features & Welcome */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">Welcome to ChatPye Pro!</h2>
            <p className="text-zinc-400 text-center mb-8">
              Here's what you can do with your new Pro account
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-zinc-900 rounded-lg p-6">
                  <div className="text-blue-400 mb-3">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">{feature.title}</h3>
                  <p className="text-zinc-400 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Start Learning Today
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
