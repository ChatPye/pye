'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { isClerkPublishableKey } from '@/lib/clerk-env';
import { ArrowRight, LogOut, Users, BarChart3, Settings, Shield, Crown, Mail, CreditCard, Trophy, TrendingUp, DollarSign, Calendar, Plus, Edit, Trash2, Save, RotateCcw, AlertTriangle, Eye, Ban, Unlock, Activity, Globe } from 'lucide-react';

// Force dynamic rendering to avoid SSR issues with Clerk
export const dynamic = 'force-dynamic';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  userClass: 'freemium' | 'pro' | 'enterprise';
  subscriptionStatus: {
    isActive: boolean;
    planType: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  usageStats: {
    videosProcessed: number;
    questionsAsked: number;
    notesCreated: number;
    bookmarksCreated: number;
    lastActivity: string;
  };
  xp: {
    total: number;
    level: number;
    badges: string[];
  };
  createdAt: string;
  isAdmin: boolean;
  isSuspended: boolean;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  proUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalVideos: number;
  totalQuestions: number;
  totalNotes: number;
  totalBookmarks: number;
}

interface SystemSetting {
  _id: string;
  category: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  isPublic: boolean;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  name?: string;
}

interface SettingsState {
  [category: string]: SystemSetting[];
}

interface SecurityEvent {
  _id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress: string;
  endpoint: string;
  method: string;
  statusCode: number;
  country: string;
  city: string;
  isBot: boolean;
  isProxy: boolean;
  isTor: boolean;
  riskScore: number;
  createdAt: Date;
}

interface SuspiciousIP {
  _id: string;
  ipAddress: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isBlocked: boolean;
  blockUntil?: Date;
  eventCount: number;
  countries: string[];
  userAgents: string[];
  endpoints: string[];
}

// Revenue Analytics Component
function RevenueAnalytics() {
  const [revenueData, setRevenueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/revenue?period=${period}`);
      const data = await response.json();
      
      if (data.success) {
        setRevenueData(data);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-zinc-800 rounded mb-4 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center">
                  <div className="h-8 bg-zinc-800 rounded mb-2"></div>
                  <div className="h-4 bg-zinc-800 rounded w-1/2 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Revenue Analytics</h3>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>

        {/* Revenue Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center p-4 bg-zinc-800 rounded-lg">
            <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">
              ${revenueData?.revenue?.total?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-zinc-400">Total Revenue</div>
          </div>
          <div className="text-center p-4 bg-zinc-800 rounded-lg">
            <CreditCard className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-400">
              {revenueData?.revenue?.transactions || 0}
            </div>
            <div className="text-sm text-zinc-400">Transactions</div>
          </div>
          <div className="text-center p-4 bg-zinc-800 rounded-lg">
            <TrendingUp className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-400">
              {revenueData?.metrics?.conversionRate || 0}%
            </div>
            <div className="text-sm text-zinc-400">Conversion Rate</div>
          </div>
          <div className="text-center p-4 bg-zinc-800 rounded-lg">
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-400">
              ${revenueData?.metrics?.arpu || 0}
            </div>
            <div className="text-sm text-zinc-400">ARPU</div>
          </div>
        </div>

        {/* Revenue by Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Revenue by Plan</h4>
            <div className="space-y-2">
              {Object.entries(revenueData?.revenue?.byType || {}).map(([plan, amount]) => (
                <div key={plan} className="flex justify-between items-center p-2 bg-zinc-800 rounded">
                  <span className="text-sm capitalize">{plan.replace('-', ' ')}</span>
                  <span className="font-medium">${(amount as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">Revenue by Region</h4>
            <div className="space-y-2">
              {Object.entries(revenueData?.revenue?.byRegion || {}).map(([region, amount]) => (
                <div key={region} className="flex justify-between items-center p-2 bg-zinc-800 rounded">
                  <span className="text-sm uppercase">{region}</span>
                  <span className="font-medium">${(amount as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Coupon Management Component
function CouponManagement() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/coupons');
      const data = await response.json();
      
      if (data.success) {
        setCoupons(data.coupons);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-800 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-zinc-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Coupon Management</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </button>
      </div>

      {coupons.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold mb-2">No Coupons Yet</h4>
          <p className="text-zinc-400 mb-4">Create your first promotional coupon to start driving conversions.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Create First Coupon
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {coupons.map((coupon) => (
            <div key={coupon._id} className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-bold text-blue-400">{coupon.code}</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-900 text-green-400">
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {coupon.isExpired && (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-900 text-red-400">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">{coupon.name}</p>
                  <p className="text-xs text-zinc-500">{coupon.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {coupon.usedCount}/{coupon.maxUses || '∞'} uses
                  </div>
                  <div className="text-xs text-zinc-500">
                    ${coupon.totalDiscountGiven.toLocaleString()} saved
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// System Settings Component
function SystemSettings() {
  const [settings, setSettings] = useState<SettingsState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings((prev: SettingsState) => ({
      ...prev,
      [category]: prev[category].map((setting: SystemSetting) =>
        setting.key === key ? { ...setting, value } : setting
      )
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Flatten settings for bulk update
      const flatSettings = Object.entries(settings).flatMap(([category, categorySettings]: [string, SystemSetting[]]) =>
        categorySettings.map((setting: SystemSetting) => ({
          category,
          key: setting.key,
          value: setting.value,
          description: setting.description,
          isPublic: setting.isPublic
        }))
      );

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_update',
          data: { settings: flatSettings }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-800 rounded mb-4 w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-zinc-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">System Settings</h3>
        <div className="flex gap-2">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(settings).map(([category, categorySettings]: [string, SystemSetting[]]) => (
          <div key={category}>
            <h4 className="font-medium mb-4 capitalize text-lg">{category} Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categorySettings.map((setting: SystemSetting) => (
                <div key={setting.key} className="p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">{setting.name || setting.key}</label>
                    {setting.isPublic && (
                      <span className="px-2 py-1 text-xs bg-blue-900 text-blue-400 rounded">Public</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">{setting.description}</p>
                  
                  {setting.type === 'boolean' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={setting.value}
                        onChange={(e) => handleSettingChange(category, setting.key, e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-zinc-700 border-zinc-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">Enabled</span>
                    </label>
                  ) : setting.type === 'number' ? (
                    <input
                      type="number"
                      value={setting.value}
                      onChange={(e) => handleSettingChange(category, setting.key, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={setting.value}
                      onChange={(e) => handleSettingChange(category, setting.key, e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Security Monitoring Component
function SecurityMonitoring() {
  const [securityData, setSecurityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState('overview'); // overview, events, ips

  useEffect(() => {
    fetchSecurityData();
  }, [timeRange, activeTab]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const type = activeTab === 'overview' ? '' : activeTab;
      const response = await fetch(`/api/admin/security?type=${type}&timeRange=${timeRange}`);
      const data = await response.json();
      
      if (data.success) {
        setSecurityData(data);
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const blockIP = async (ipAddress: string) => {
    try {
      const response = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'block_ip',
          data: {
            ipAddress,
            duration: 3600, // 1 hour
            reason: 'Manually blocked by admin'
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`IP ${ipAddress} blocked successfully`);
        fetchSecurityData();
      }
    } catch (error) {
      console.error('Error blocking IP:', error);
      alert('Error blocking IP');
    }
  };

  const unblockIP = async (ipAddress: string) => {
    try {
      const response = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unblock_ip',
          data: { ipAddress }
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`IP ${ipAddress} unblocked successfully`);
        fetchSecurityData();
      }
    } catch (error) {
      console.error('Error unblocking IP:', error);
      alert('Error unblocking IP');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/20';
      case 'high': return 'text-orange-400 bg-orange-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'low': return 'text-blue-400 bg-blue-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-zinc-800 rounded mb-4 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center">
                  <div className="h-8 bg-zinc-800 rounded mb-2"></div>
                  <div className="h-4 bg-zinc-800 rounded w-1/2 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Security Monitoring</h3>
          <div className="flex gap-3">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'events', label: 'Security Events', icon: AlertTriangle },
            { id: 'ips', label: 'Suspicious IPs', icon: Globe }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && securityData?.overview && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center p-4 bg-zinc-800 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-400">
                  {securityData.overview.totalEvents || 0}
                </div>
                <div className="text-sm text-zinc-400">Security Events</div>
              </div>
              <div className="text-center p-4 bg-zinc-800 rounded-lg">
                <Globe className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-400">
                  {securityData.overview.totalSuspiciousIPs || 0}
                </div>
                <div className="text-sm text-zinc-400">Suspicious IPs</div>
              </div>
              <div className="text-center p-4 bg-zinc-800 rounded-lg">
                <Ban className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-400">
                  {securityData.overview.topRateLimits?.filter((r: any) => r.isBlocked).length || 0}
                </div>
                <div className="text-sm text-zinc-400">Blocked IPs</div>
              </div>
              <div className="text-center p-4 bg-zinc-800 rounded-lg">
                <Eye className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-400">
                  {securityData.overview.totalRateLimits || 0}
                </div>
                <div className="text-sm text-zinc-400">Rate Limits</div>
              </div>
            </div>

            {/* Recent Events */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Recent Security Events</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {securityData.overview.recentEvents?.map((event: SecurityEvent) => (
                    <div key={event._id} className="p-3 bg-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{event.type}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(event.severity)}`}>
                          {event.severity}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {event.ipAddress} • {event.endpoint} • {event.method} {event.statusCode}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(event.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Suspicious IPs</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {securityData.overview.suspiciousIPs?.map((ip: SuspiciousIP) => (
                    <div key={ip._id} className="p-3 bg-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{ip.ipAddress}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(ip.severity)}`}>
                          {ip.severity}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mb-2">
                        {ip.reason} • {ip.eventCount} events
                      </div>
                      <div className="flex gap-2">
                        {ip.isBlocked ? (
                          <button
                            onClick={() => unblockIP(ip.ipAddress)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => blockIP(ip.ipAddress)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Security Events */}
        {activeTab === 'events' && securityData?.events && (
          <div className="space-y-4">
            {securityData.events.map((event: SecurityEvent) => (
              <div key={event._id} className="p-4 bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-sm rounded-full ${getSeverityColor(event.severity)}`}>
                      {event.severity.toUpperCase()}
                    </span>
                    <span className="font-medium">{event.type}</span>
                  </div>
                  <span className="text-sm text-zinc-400">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-400">IP:</span>
                    <span className="ml-2 font-mono">{event.ipAddress}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Endpoint:</span>
                    <span className="ml-2">{event.endpoint}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Method:</span>
                    <span className="ml-2">{event.method}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Status:</span>
                    <span className="ml-2">{event.statusCode}</span>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-sm">
                  {event.isBot && <span className="text-red-400">🤖 Bot</span>}
                  {event.isProxy && <span className="text-orange-400">🌐 Proxy</span>}
                  {event.isTor && <span className="text-purple-400">🧅 Tor</span>}
                  <span className="text-zinc-400">Risk Score: {event.riskScore}/100</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suspicious IPs */}
        {activeTab === 'ips' && securityData?.suspiciousIPs && (
          <div className="space-y-4">
            {securityData.suspiciousIPs.map((ip: SuspiciousIP) => (
              <div key={ip._id} className="p-4 bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg">{ip.ipAddress}</span>
                    <span className={`px-3 py-1 text-sm rounded-full ${getSeverityColor(ip.severity)}`}>
                      {ip.severity.toUpperCase()}
                    </span>
                    {ip.isBlocked && (
                      <span className="px-2 py-1 text-xs bg-red-900 text-red-400 rounded">
                        BLOCKED
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {ip.isBlocked ? (
                      <button
                        onClick={() => unblockIP(ip.ipAddress)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => blockIP(ip.ipAddress)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Block
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-sm text-zinc-400 mb-2">{ip.reason}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-400">Events:</span>
                    <span className="ml-2">{ip.eventCount}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Countries:</span>
                    <span className="ml-2">{ip.countries.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Endpoints:</span>
                    <span className="ml-2">{ip.endpoints.length}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">User Agents:</span>
                    <span className="ml-2">{ip.userAgents.length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Admin component that handles Clerk authentication gracefully
function AdminDashboardContent() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  const ADMIN_EMAILS = ['job.oyebisi@gmail.com', 'job@chatpye.com'];

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/admin-login');
      return;
    }
    
    if (user) {
      const userEmail = user.emailAddresses[0]?.emailAddress;
      console.log('🔍 Admin Check:', {
        userEmail,
        adminEmails: ADMIN_EMAILS,
        isAdmin: ADMIN_EMAILS.includes(userEmail || '')
      });
      
      if (ADMIN_EMAILS.includes(userEmail || '')) {
        console.log('✅ User is admin, loading admin dashboard');
        setIsAdmin(true);
        setLoading(false); // Allow dashboard to render immediately
        fetchAdminData(); // Load data in background
      } else {
        console.log('❌ User is not admin, redirecting to workspace');
        router.push('/workspace');
      }
    }
  }, [user, isLoaded, router]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users')
      ]);
      
      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      
      if (statsData.success) {
        setSystemStats(statsData.stats);
      }
      
      if (usersData.success) {
        setUsers(usersData.users);
      }
      
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const suspendUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Error suspending user:', error);
    }
  };

  const unsuspendUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/unsuspend`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Error unsuspending user:', error);
    }
  };

  const addXP = async (userId: string, amount: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/xp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });
      
      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Error adding XP:', error);
    }
  };

  const upgradeUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/upgrade`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Error upgrading user:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this user? This action cannot be undone and will remove all user data including:\n\n' +
      '• User account and authentication\n' +
      '• All bookmarks and notes\n' +
      '• Watch history and XP\n' +
      '• Subscription data\n\n' +
      'Type "DELETE" to confirm:'
    );

    if (!confirmed) return;

    const deleteConfirm = prompt('Type "DELETE" to confirm permanent user deletion:');
    if (deleteConfirm !== 'DELETE') {
      alert('User deletion cancelled.');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('User deleted successfully!');
        fetchAdminData(); // Refresh data
      } else {
        alert(`Failed to delete user: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user. Please try again.');
    }
  };

  const downgradeUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/downgrade`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Error downgrading user:', error);
    }
  };

  // Show loading state only while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Welcome, {user.emailAddresses[0]?.emailAddress}</p>
          <span className="inline-block mt-2 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
            🔒 Admin Access
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {[
              { id: 'overview', label: 'System Overview', icon: BarChart3 },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'security', label: 'Security Monitoring', icon: Shield },
              { id: 'revenue', label: 'Revenue & Analytics', icon: CreditCard },
              { id: 'coupons', label: 'Coupons & Promotions', icon: Mail },
              { id: 'settings', label: 'System Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {activeTab === 'overview' && 'System Overview'}
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'security' && 'Security Monitoring'}
                {activeTab === 'revenue' && 'Revenue & Analytics'}
                {activeTab === 'coupons' && 'Coupons & Promotions'}
                {activeTab === 'settings' && 'System Settings'}
              </h2>
              <p className="text-zinc-400 mt-1">
                {activeTab === 'overview' && 'Monitor system performance and user activity'}
                {activeTab === 'users' && 'Manage users, subscriptions, and permissions'}
                {activeTab === 'security' && 'Monitor security threats, bot activity, and DDoS attacks'}
                {activeTab === 'revenue' && 'Track revenue, conversions, and financial metrics'}
                {activeTab === 'coupons' && 'Create and manage promotional codes'}
                {activeTab === 'settings' && 'Configure system settings and preferences'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'overview' && systemStats && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-400">{systemStats.totalUsers}</div>
                      <div className="text-sm text-zinc-400">Total Users</div>
                    </div>
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    {systemStats.activeUsers} active this month
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-400">{systemStats.proUsers}</div>
                      <div className="text-sm text-zinc-400">Pro Users</div>
                    </div>
                    <Crown className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    {((systemStats.proUsers / systemStats.totalUsers) * 100).toFixed(1)}% conversion
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-yellow-400">${systemStats.monthlyRevenue}</div>
                      <div className="text-sm text-zinc-400">Monthly Revenue</div>
                    </div>
                    <CreditCard className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    ${systemStats.totalRevenue} total revenue
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-400">{systemStats.totalVideos}</div>
                      <div className="text-sm text-zinc-400">Videos Processed</div>
                    </div>
                    <Trophy className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    {systemStats.totalQuestions} questions asked
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-zinc-900 rounded-lg border border-zinc-800">
                <div className="p-6 border-b border-zinc-800">
                  <h3 className="text-lg font-semibold">Recent User Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.email}</div>
                            <div className="text-sm text-zinc-400">
                              {user.userClass} • Level {user.xp.level} • {user.usageStats.questionsAsked} questions
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.userClass === 'pro' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            {user.userClass}
                          </span>
                          {user.isSuspended && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                              Suspended
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-semibold">User Management</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center">
                          <span className="text-lg font-medium">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-zinc-400">
                            Joined {new Date(user.createdAt).toLocaleDateString()} • 
                            {user.usageStats.questionsAsked} questions • 
                            Level {user.xp.level}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.userClass === 'pro' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          {user.userClass}
                        </span>
                        
                        {user.isSuspended ? (
                          <button
                            onClick={() => unsuspendUser(user.id)}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => suspendUser(user.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Suspend
                          </button>
                        )}
                        
                        {user.userClass === 'freemium' ? (
                          <button
                            onClick={() => upgradeUser(user.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            Upgrade
                          </button>
                        ) : (
                          <button
                            onClick={() => downgradeUser(user.id)}
                            className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
                          >
                            Downgrade
                          </button>
                        )}
                        
                        <button
                          onClick={() => addXP(user.id, 100)}
                          className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                        >
                          +100 XP
                        </button>
                        
                        {ADMIN_EMAILS.includes(user.email) ? (
                          <span className="px-3 py-1 bg-gray-600 text-gray-300 rounded text-sm cursor-not-allowed flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <SecurityMonitoring />
          )}

          {activeTab === 'revenue' && (
            <RevenueAnalytics />
          )}

          {activeTab === 'coupons' && (
            <CouponManagement />
          )}

          {activeTab === 'settings' && (
            <SystemSettings />
          )}
        </div>
      </div>
    </div>
  );
}

function AdminStaffGate() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Loading…</div>
      </div>
    );
  }

  const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() || '';
  const staffEmails = ['job@chatpye.com', 'job.oyebisi@gmail.com'];
  if (!staffEmails.includes(email)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Access restricted</h1>
          <p className="text-zinc-400">This area is limited to ChatPye staff.</p>
        </div>
      </div>
    );
  }

  return <AdminDashboardContent />;
}

// Main component that handles Clerk availability
export default function AdminDashboard() {
  if (!isClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h1>
          <p className="text-zinc-400">Authentication not configured. Please set up Clerk keys.</p>
        </div>
      </div>
    );
  }

  return <AdminStaffGate />;
}