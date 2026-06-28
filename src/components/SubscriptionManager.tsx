'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface Subscription {
  id: string;
  status: string;
  planType: string;
  currentPeriodEnd: string;
  pausedAt?: string;
  pauseReason?: string;
}

interface SubscriptionManagerProps {
  subscription: Subscription;
  onUpdate: () => void;
}

export default function SubscriptionManager({ subscription, onUpdate }: SubscriptionManagerProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [showChurnOptions, setShowChurnOptions] = useState(false);
  const [pauseUntil, setPauseUntil] = useState('');

  const handlePause = async () => {
    if (!pauseUntil) {
      alert('Please select a resume date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/subscription/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          pauseUntil,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Subscription paused successfully');
        onUpdate();
      } else {
        alert('Failed to pause subscription');
      }
    } catch (error) {
      console.error('Error pausing subscription:', error);
      alert('Error pausing subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Subscription resumed successfully');
        onUpdate();
      } else {
        alert('Failed to resume subscription');
      }
    } catch (error) {
      console.error('Error resuming subscription:', error);
      alert('Error resuming subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleChurnPrevention = async (action: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription/churn-prevention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          action,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        onUpdate();
      } else {
        alert(data.message || 'Failed to process action');
      }
    } catch (error) {
      console.error('Error processing churn prevention:', error);
      alert('Error processing action');
    } finally {
      setLoading(false);
      setShowChurnOptions(false);
    }
  };

  const isPaused = subscription.status === 'paused' || subscription.pausedAt;
  const isTrialing = subscription.status === 'trialing';
  const isActive = subscription.status === 'active';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Subscription Management</h3>
      
      <div className="space-y-4">
        <div>
          <p><strong>Status:</strong> {subscription.status}</p>
          <p><strong>Plan:</strong> {subscription.planType}</p>
          <p><strong>Current Period End:</strong> {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
          {isPaused && (
            <p><strong>Paused Until:</strong> {subscription.pausedAt ? new Date(subscription.pausedAt).toLocaleDateString() : 'Indefinitely'}</p>
          )}
        </div>

        {/* Pause/Resume Controls */}
        <div className="space-y-2">
          {!isPaused ? (
            <div>
              <label className="block text-sm font-medium mb-2">
                Pause Subscription Until:
              </label>
              <input
                type="date"
                value={pauseUntil}
                onChange={(e) => setPauseUntil(e.target.value)}
                className="border rounded px-3 py-2 mr-2"
                min={new Date().toISOString().split('T')[0]}
              />
              <button
                onClick={handlePause}
                disabled={loading}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
              >
                {loading ? 'Pausing...' : 'Pause Subscription'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleResume}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Resuming...' : 'Resume Subscription'}
            </button>
          )}
        </div>

        {/* Churn Prevention Options */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowChurnOptions(!showChurnOptions)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {showChurnOptions ? 'Hide' : 'Show'} Retention Options
          </button>

          {showChurnOptions && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                If you're considering canceling, we can help with these options:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  onClick={() => handleChurnPrevention('offer_discount')}
                  disabled={loading}
                  className="bg-purple-500 text-white px-3 py-2 rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                >
                  Get 20% Discount
                </button>
                
                {isTrialing && (
                  <button
                    onClick={() => handleChurnPrevention('extend_trial')}
                    disabled={loading}
                    className="bg-indigo-500 text-white px-3 py-2 rounded text-sm hover:bg-indigo-600 disabled:opacity-50"
                  >
                    Extend Trial (7 days)
                  </button>
                )}
                
                <button
                  onClick={() => handleChurnPrevention('downgrade_plan')}
                  disabled={loading}
                  className="bg-orange-500 text-white px-3 py-2 rounded text-sm hover:bg-orange-600 disabled:opacity-50"
                >
                  Downgrade to Basic
                </button>
                
                <button
                  onClick={() => handleChurnPrevention('pause_subscription')}
                  disabled={loading}
                  className="bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 disabled:opacity-50"
                >
                  Pause for 30 Days
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
