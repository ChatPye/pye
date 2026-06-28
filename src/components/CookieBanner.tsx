'use client';

import { useState, useEffect } from 'react';
import { X, Cookie, Settings } from 'lucide-react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (!cookieConsent) {
      setIsVisible(true);
    }
  }, []);

  const acceptAll = () => {
    const consent = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setIsVisible(false);
    
    // Initialize analytics if accepted
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
      });
    }
  };

  const acceptSelected = () => {
    const consent = {
      ...preferences,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setIsVisible(false);
    
    // Update analytics consent
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: preferences.analytics ? 'granted' : 'denied',
        ad_storage: preferences.marketing ? 'granted' : 'denied',
      });
    }
  };

  const rejectAll = () => {
    const consent = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setIsVisible(false);
    
    // Deny all non-necessary cookies
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 p-4 shadow-2xl">
      <div className="max-w-7xl mx-auto">
        {!showSettings ? (
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Cookie className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
              <div className="text-sm text-zinc-300">
                <p className="font-medium text-white mb-1">We use cookies to enhance your experience</p>
                <p>
                  We use cookies to analyze site usage, personalize content, and improve our services. 
                  You can choose which cookies to accept or reject.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-md transition-colors"
              >
                <Settings className="w-4 h-4" />
                Customize
              </button>
              <button
                onClick={rejectAll}
                className="px-4 py-2 text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-md transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Cookie Preferences</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Necessary Cookies</h4>
                  <p className="text-sm text-zinc-400">Required for basic site functionality</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.necessary}
                    disabled
                    className="w-4 h-4 text-blue-600 bg-zinc-700 border-zinc-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Analytics Cookies</h4>
                  <p className="text-sm text-zinc-400">Help us understand how visitors interact with our site</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences(prev => ({ ...prev, analytics: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-zinc-700 border-zinc-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Marketing Cookies</h4>
                  <p className="text-sm text-zinc-400">Used to deliver relevant ads and marketing campaigns</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-zinc-700 border-zinc-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <button
                onClick={rejectAll}
                className="px-4 py-2 text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-md transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={acceptSelected}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}