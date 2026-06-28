'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, Mail, Calendar, Users, TrendingUp, Clock, RefreshCw, Settings } from 'lucide-react';

interface ExportSummary {
  totalRequests: number;
  newRequests: number;
  pendingRequests: number;
  byStatus: {
    pending: number;
    contacted: number;
    scheduled: number;
    completed: number;
  };
  byDate: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  exportDate: string;
}

interface DemoRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function DemoRequestsExport() {
  const [exportSummary, setExportSummary] = useState<ExportSummary | null>(null);
  const [recentRequests, setRecentRequests] = useState<DemoRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastExport, setLastExport] = useState<string>('');
  const [autoExportEnabled, setAutoExportEnabled] = useState(true);

  // Load initial data
  useEffect(() => {
    loadExportData();
  }, []);

  const loadExportData = async () => {
    setIsLoading(true);
    try {
      // Get recent demo requests
      const requestsResponse = await fetch('/api/admin/demo-requests?limit=10');
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setRecentRequests(requestsData.requests || []);
        
        // Calculate summary from recent data
        const summary: ExportSummary = {
          totalRequests: requestsData.pagination?.total || 0,
          newRequests: requestsData.requests?.filter((r: DemoRequest) => {
            const today = new Date();
            const requestDate = new Date(r.createdAt);
            return requestDate.toDateString() === today.toDateString();
          }).length || 0,
          pendingRequests: requestsData.requests?.filter((r: DemoRequest) => r.status === 'pending').length || 0,
          byStatus: {
            pending: requestsData.requests?.filter((r: DemoRequest) => r.status === 'pending').length || 0,
            contacted: requestsData.requests?.filter((r: DemoRequest) => r.status === 'contacted').length || 0,
            scheduled: requestsData.requests?.filter((r: DemoRequest) => r.status === 'scheduled').length || 0,
            completed: requestsData.requests?.filter((r: DemoRequest) => r.status === 'completed').length || 0,
          },
          byDate: {
            today: requestsData.requests?.filter((r: DemoRequest) => {
              const today = new Date();
              const requestDate = new Date(r.createdAt);
              return requestDate.toDateString() === today.toDateString();
            }).length || 0,
            thisWeek: requestsData.requests?.filter((r: DemoRequest) => {
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              return new Date(r.createdAt) >= weekAgo;
            }).length || 0,
            thisMonth: requestsData.requests?.filter((r: DemoRequest) => {
              const monthAgo = new Date();
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              return new Date(r.createdAt) >= monthAgo;
            }).length || 0,
          },
          exportDate: new Date().toISOString()
        };
        setExportSummary(summary);
      }
    } catch (error) {
      console.error('Failed to load export data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualExport = async (format: 'json' | 'csv') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/demo-requests/export?format=${format}&includePending=true&dateRange=all`);
      if (response.ok) {
        // Create download link
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `demo-requests-export-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setLastExport(new Date().toLocaleString());
      } else {
        alert('Export failed. Please try again.');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerScheduledExport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/demo-requests/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setLastExport(new Date().toLocaleString());
        alert(`Scheduled export completed successfully! ${result.summary.totalRequests} requests exported.`);
      } else {
        alert('Scheduled export failed. Please try again.');
      }
    } catch (error) {
      console.error('Scheduled export failed:', error);
      alert('Scheduled export failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'contacted': return 'text-blue-400 bg-blue-400/10';
      case 'scheduled': return 'text-purple-400 bg-purple-400/10';
      case 'completed': return 'text-green-400 bg-green-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (isLoading && !exportSummary) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
        <span className="ml-2 text-zinc-400">Loading export data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Demo Requests Export</h1>
          <p className="text-zinc-400 mt-1">Manage and export demo request data with automated scheduling</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadExportData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {exportSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{exportSummary.totalRequests}</p>
                <p className="text-sm text-zinc-400">Total Requests</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{exportSummary.newRequests}</p>
                <p className="text-sm text-zinc-400">New Today</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{exportSummary.pendingRequests}</p>
                <p className="text-sm text-zinc-400">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{exportSummary.byDate.thisWeek}</p>
                <p className="text-sm text-zinc-400">This Week</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Export Controls</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Manual Export */}
          <div>
            <h3 className="text-md font-medium text-white mb-3">Manual Export</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleManualExport('json')}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                Export JSON
              </button>
              
              <button
                onClick={() => handleManualExport('csv')}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Automated Export */}
          <div>
            <h3 className="text-md font-medium text-white mb-3">Automated Export</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoExport"
                  checked={autoExportEnabled}
                  onChange={(e) => setAutoExportEnabled(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoExport" className="text-sm text-zinc-300">
                  Enable twice-daily automated exports
                </label>
              </div>
              
              <button
                onClick={triggerScheduledExport}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                Trigger Scheduled Export
              </button>
              
              {lastExport && (
                <p className="text-xs text-zinc-400">
                  Last export: {lastExport}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      {exportSummary && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Status Breakdown</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(exportSummary.byStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-sm text-zinc-400 capitalize">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Requests */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Demo Requests</h2>
        {recentRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((request) => (
                  <tr key={request.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-3 px-4 text-white font-medium">{request.name}</td>
                    <td className="py-3 px-4 text-zinc-300">{request.company}</td>
                    <td className="py-3 px-4 text-zinc-300">{request.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-400 text-center py-8">No demo requests found</p>
        )}
      </div>

      {/* Export Settings */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Export Settings</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-md font-medium text-white mb-2">Schedule</h3>
            <p className="text-sm text-zinc-400">Automated exports run twice daily at 9 AM and 9 PM UTC</p>
          </div>
          <div>
            <h3 className="text-md font-medium text-white mb-2">Storage</h3>
            <p className="text-sm text-zinc-400">Exports are stored in S3 and emailed to admin</p>
          </div>
          <div>
            <h3 className="text-md font-medium text-white mb-2">Retention</h3>
            <p className="text-sm text-zinc-400">Export files are retained for 90 days</p>
          </div>
        </div>
      </div>
    </div>
  );
}
