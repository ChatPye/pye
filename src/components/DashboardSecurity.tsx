'use client';

import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Eye, Lock, Activity, Globe, Ban, CheckCircle } from 'lucide-react';

interface DashboardSecurityProps {
  userId?: string;
  enableRealTimeMonitoring?: boolean;
}

interface SecurityStatus {
  isSecure: boolean;
  lastLogin: string;
  loginLocation: string;
  activeSessions: number;
  suspiciousActivity: boolean;
  riskScore: number;
}

interface RecentSecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  description: string;
  ipAddress: string;
  location: string;
}

export function DashboardSecurity({ 
  userId, 
  enableRealTimeMonitoring = true 
}: DashboardSecurityProps) {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    isSecure: true,
    lastLogin: new Date().toISOString(),
    loginLocation: 'New York, US',
    activeSessions: 1,
    suspiciousActivity: false,
    riskScore: 15
  });

  const [recentEvents, setRecentEvents] = useState<RecentSecurityEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show security panel after component mounts
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (enableRealTimeMonitoring) {
      // Simulate real-time security monitoring
      const interval = setInterval(() => {
        // Simulate occasional security events
        if (Math.random() > 0.95) {
          const newEvent: RecentSecurityEvent = {
            id: Date.now().toString(),
            type: Math.random() > 0.5 ? 'login_attempt' : 'api_access',
            severity: Math.random() > 0.7 ? 'medium' : 'low',
            timestamp: new Date().toISOString(),
            description: Math.random() > 0.5 
              ? 'Login attempt from new location' 
              : 'API access from unknown IP',
            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            location: Math.random() > 0.5 ? 'London, UK' : 'Tokyo, Japan'
          };

          setRecentEvents(prev => [newEvent, ...prev.slice(0, 4)]);
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [enableRealTimeMonitoring]);

  const getRiskScoreColor = (score: number) => {
    if (score < 25) return 'text-green-400';
    if (score < 50) return 'text-yellow-400';
    if (score < 75) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-400 bg-green-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'high': return 'text-orange-400 bg-orange-900/20';
      case 'critical': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Security Status Card */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-xl border border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Security Status</h3>
              <p className="text-sm text-zinc-400">Your account security overview</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskScoreColor(securityStatus.riskScore)} bg-zinc-800`}>
            Risk Score: {securityStatus.riskScore}/100
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-sm font-medium text-white">Account Status</div>
              <div className="text-xs text-zinc-400">
                {securityStatus.isSecure ? 'Secure' : 'Needs Attention'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
            <Globe className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-sm font-medium text-white">Last Login</div>
              <div className="text-xs text-zinc-400">
                {new Date(securityStatus.lastLogin).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
            <Activity className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-sm font-medium text-white">Active Sessions</div>
              <div className="text-xs text-zinc-400">
                {securityStatus.activeSessions} session{securityStatus.activeSessions !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {securityStatus.suspiciousActivity && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400 font-medium">Suspicious Activity Detected</span>
            </div>
            <p className="text-xs text-red-300 mt-1">
              We've detected unusual activity on your account. Please review your recent login activity.
            </p>
          </div>
        )}
      </div>

      {/* Recent Security Events */}
      {recentEvents.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Recent Security Events</h3>
              <p className="text-sm text-zinc-400">Monitor your account activity</p>
            </div>
          </div>

          <div className="space-y-3">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{event.description}</div>
                    <div className="text-xs text-zinc-400">
                      {event.ipAddress} • {event.location}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Features */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-600/20 rounded-lg">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Security Features</h3>
            <p className="text-sm text-zinc-400">Protection measures in place</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <div>
              <div className="text-sm font-medium text-white">Two-Factor Authentication</div>
              <div className="text-xs text-zinc-400">Enabled via Clerk</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <div>
              <div className="text-sm font-medium text-white">DDoS Protection</div>
              <div className="text-xs text-zinc-400">Active monitoring</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <div>
              <div className="text-sm font-medium text-white">Bot Detection</div>
              <div className="text-xs text-zinc-400">Real-time scanning</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <div>
              <div className="text-sm font-medium text-white">Rate Limiting</div>
              <div className="text-xs text-zinc-400">API protection</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Actions */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Security Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            Review Login Activity
          </button>
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
            Enable 2FA
          </button>
          <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
            Change Password
          </button>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
            Sign Out All Devices
          </button>
        </div>
      </div>
    </div>
  );
}

// Security Alert Banner
export function SecurityAlertBanner({ 
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
    <div className={`${getAlertStyles()} border rounded-lg px-4 py-3 flex items-center gap-3 mb-6`}>
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="text-current hover:opacity-70 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}
