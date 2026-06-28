'use client';

import { useState } from 'react';
import { Copy, Users, Gift, Star, CheckCircle } from 'lucide-react';

interface ReferralData {
  referralCode: string;
  stats: {
    totalReferrals: number;
    totalTokenRewards: number;
    totalXPRewards: number;
    pendingReferrals: number;
  };
  recentReferrals: Array<{
    id: string;
    refereeId: string;
    rewardType: string;
    rewardAmount: number;
    status: string;
    createdAt: string;
  }>;
  rewards: {
    tokensPerReferral: number;
    xpPerReferral: number;
    description: string;
  };
}

interface ReferralSystemProps {
  referralData: ReferralData;
  onReferralApplied?: () => void;
}

export default function ReferralSystem({ referralData, onReferralApplied }: ReferralSystemProps) {
  const [referralCode, setReferralCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const applyReferralCode = async () => {
    if (!referralCode.trim()) return;

    setIsApplying(true);
    setApplyMessage('');

    try {
      const response = await fetch('/api/user/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referralCode: referralCode.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setApplyMessage('Referral code applied successfully! You earned 50 tokens.');
        setReferralCode('');
        onReferralApplied?.();
      } else {
        setApplyMessage(data.error || 'Failed to apply referral code');
      }
    } catch (error) {
      setApplyMessage('Failed to apply referral code');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Referral Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Referrals</p>
              <p className="text-2xl font-bold">{referralData.stats.totalReferrals}</p>
            </div>
            <Users className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Token Rewards</p>
              <p className="text-2xl font-bold">{referralData.stats.totalTokenRewards}</p>
            </div>
            <Gift className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">XP Rewards</p>
              <p className="text-2xl font-bold">{referralData.stats.totalXPRewards}</p>
            </div>
            <Star className="h-8 w-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Pending</p>
              <p className="text-2xl font-bold">{referralData.stats.pendingReferrals}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Your Referral Code */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Referral Code</h3>
        <div className="flex items-center space-x-3">
          <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 border">
            <code className="text-lg font-mono text-gray-900">{referralData.referralCode}</code>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <Copy className="h-4 w-4" />
            <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Share this code with friends to earn rewards when they join!
        </p>
      </div>

      {/* Apply Referral Code */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Apply Referral Code</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Enter referral code"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={applyReferralCode}
              disabled={isApplying || !referralCode.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors"
            >
              {isApplying ? 'Applying...' : 'Apply'}
            </button>
          </div>
          {applyMessage && (
            <div className={`p-3 rounded-lg ${
              applyMessage.includes('successfully') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {applyMessage}
            </div>
          )}
        </div>
      </div>

      {/* Rewards Info */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Referral Rewards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Gift className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Token Rewards</p>
              <p className="text-sm text-gray-600">{referralData.rewards.tokensPerReferral} tokens per referral</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Star className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">XP Rewards</p>
              <p className="text-sm text-gray-600">{referralData.rewards.xpPerReferral} XP per referral</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">{referralData.rewards.description}</p>
      </div>

      {/* Recent Referrals */}
      {referralData.recentReferrals.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Referrals</h3>
          <div className="space-y-3">
            {referralData.recentReferrals.slice(0, 5).map((referral) => (
              <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    referral.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {referral.refereeId.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(referral.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    +{referral.rewardAmount} {referral.rewardType}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{referral.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
