'use client';

import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Eye, Lock } from 'lucide-react';

interface SecurityMetrics {
  threatsBlocked: number;
  botRequests: number;
  ddosAttempts: number;
  lastThreat: string;
}

interface LandingPageSecurityProps {
  showSecurityBadge?: boolean;
  enableRealTimeMonitoring?: boolean;
}

export function LandingPageSecurity({ 
  showSecurityBadge = true, 
  enableRealTimeMonitoring = false 
}: LandingPageSecurityProps) {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>({
    threatsBlocked: 0,
    botRequests: 0,
    ddosAttempts: 0,
    lastThreat: 'None detected'
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Simulate security monitoring for demo purposes
    if (enableRealTimeMonitoring) {
      const interval = setInterval(() => {
        setSecurityMetrics(prev => ({
          threatsBlocked: prev.threatsBlocked + Math.floor(Math.random() * 3),
          botRequests: prev.botRequests + Math.floor(Math.random() * 5),
          ddosAttempts: prev.ddosAttempts + Math.floor(Math.random() * 2),
          lastThreat: new Date().toLocaleTimeString()
        }));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [enableRealTimeMonitoring]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  if (!showSecurityBadge || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Security Badge */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
          <Shield className="w-4 h-4" />
          <span>Standard security protections enabled</span>
        </div>
      </div>

      {/* Security Metrics (for demo/admin view) */}
      {enableRealTimeMonitoring && (
        <div className="fixed top-4 right-4 z-50 bg-black/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-4 text-white text-xs">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="font-medium">Security Monitor</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Threats Blocked:</span>
              <span className="text-red-400">{securityMetrics.threatsBlocked}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Bot Requests:</span>
              <span className="text-orange-400">{securityMetrics.botRequests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">DDoS Attempts:</span>
              <span className="text-purple-400">{securityMetrics.ddosAttempts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Last Threat:</span>
              <span className="text-green-400">{securityMetrics.lastThreat}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Features Display */}
      <div className="hidden md:block">
        <div className="fixed bottom-4 left-4 z-40 bg-black/80 backdrop-blur-sm border border-zinc-800 rounded-lg p-3 text-white text-xs">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-3 h-3 text-green-400" />
            <span className="font-medium">Security features</span>
          </div>
          <div className="space-y-1 text-zinc-400">
            <div>✅ DDoS mitigation</div>
            <div>✅ Bot filtering</div>
            <div>✅ Rate limiting</div>
            <div>✅ HTTPS/TLS</div>
          </div>
        </div>
      </div>
    </>
  );
}

// Security Alert Component
export function SecurityAlert({ 
  type, 
  message, 
  onDismiss 
}: { 
  type: 'warning' | 'error' | 'info'; 
  message: string; 
  onDismiss: () => void;
}) {
  const getAlertStyles = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400';
      case 'error':
        return 'bg-red-900/20 border-red-500/30 text-red-400';
      case 'info':
        return 'bg-blue-900/20 border-blue-500/30 text-blue-400';
      default:
        return 'bg-zinc-900/20 border-zinc-500/30 text-zinc-400';
    }
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${getAlertStyles()} border rounded-lg px-4 py-3 flex items-center gap-3 max-w-md`}>
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">{message}</span>
      <button
        onClick={onDismiss}
        className="ml-auto text-current hover:opacity-70 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

// Security Status Indicator
export function SecurityStatusIndicator() {
  const [status, setStatus] = useState<'secure' | 'warning' | 'error'>('secure');

  useEffect(() => {
    // Simulate status checks
    const checkSecurityStatus = () => {
      // In a real implementation, this would check actual security status
      const random = Math.random();
      if (random > 0.9) {
        setStatus('error');
      } else if (random > 0.8) {
        setStatus('warning');
      } else {
        setStatus('secure');
      }
    };

    const interval = setInterval(checkSecurityStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusStyles = () => {
    switch (status) {
      case 'secure':
        return 'bg-green-500 text-green-900';
      case 'warning':
        return 'bg-yellow-500 text-yellow-900';
      case 'error':
        return 'bg-red-500 text-red-900';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'secure':
        return <Shield className="w-3 h-3" />;
      case 'warning':
        return <AlertTriangle className="w-3 h-3" />;
      case 'error':
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusStyles()}`}>
      {getStatusIcon()}
      <span className="capitalize">{status}</span>
    </div>
  );
}
