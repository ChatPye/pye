'use client';

import React, { useState, useEffect } from 'react';
import { extensionCommunication } from '@/lib/extension-communication';

interface ExtensionData {
  transcriptData?: any;
  videoData?: any;
  userData?: any;
  lastUpdate?: number;
}

export function DashboardExtensionIntegration() {
  const [extensionStatus, setExtensionStatus] = useState({
    available: false,
    connected: false,
    lastPing: 0
  });
  const [extensionData, setExtensionData] = useState<ExtensionData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeExtension = async () => {
      try {
        // Check if extension is available
        const status = extensionCommunication.getExtensionStatus();
        setExtensionStatus(prev => ({
          ...prev,
          available: status.available,
          lastPing: Date.now()
        }));

        // If extension is available, request initial data
        if (status.available) {
          await requestInitialData();
        }

        // Listen for extension data updates
        const handleDataUpdate = (event: CustomEvent) => {
          console.log('📊 Extension data update received:', event.detail);
          setExtensionData(prev => ({
            ...prev,
            ...event.detail.data,
            lastUpdate: Date.now()
          }));
          setExtensionStatus(prev => ({
            ...prev,
            connected: true
          }));
        };

        // Listen for extension auth updates
        const handleAuthUpdate = (event: CustomEvent) => {
          console.log('🔐 Extension auth update received:', event.detail);
          // Handle auth status changes
        };

        window.addEventListener('chatpye-extension-data', handleDataUpdate as EventListener);
        window.addEventListener('chatpye-extension-auth', handleAuthUpdate as EventListener);

        // Periodic extension health check
        const healthCheckInterval = setInterval(async () => {
          try {
            await extensionCommunication.sendMessage({
              type: 'CHATPYE_PING',
              timestamp: Date.now()
            });
            setExtensionStatus(prev => ({
              ...prev,
              lastPing: Date.now()
            }));
          } catch (error) {
            console.warn('Extension health check failed:', error);
            setExtensionStatus(prev => ({
              ...prev,
              connected: false
            }));
          }
        }, 30000); // Check every 30 seconds

        return () => {
          window.removeEventListener('chatpye-extension-data', handleDataUpdate as EventListener);
          window.removeEventListener('chatpye-extension-auth', handleAuthUpdate as EventListener);
          clearInterval(healthCheckInterval);
        };

      } catch (error) {
        console.error('Failed to initialize extension integration:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeExtension();
  }, []);

  const requestInitialData = async () => {
    try {
      const transcriptResponse = await extensionCommunication.requestData('transcript');
      const videoResponse = await extensionCommunication.requestData('video');
      const userResponse = await extensionCommunication.requestData('user');

      setExtensionData({
        transcriptData: transcriptResponse.data,
        videoData: videoResponse.data,
        userData: userResponse.data,
        lastUpdate: Date.now()
      });

      setExtensionStatus(prev => ({
        ...prev,
        connected: true
      }));
    } catch (error) {
      console.error('Failed to request initial data from extension:', error);
    }
  };

  const handleRetryConnection = async () => {
    setIsLoading(true);
    try {
      await requestInitialData();
    } catch (error) {
      console.error('Retry connection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-800 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          <span className="text-sm text-zinc-300">Initializing extension connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Extension Status</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            extensionStatus.available && extensionStatus.connected 
              ? 'bg-green-400' 
              : extensionStatus.available 
                ? 'bg-yellow-400' 
                : 'bg-red-400'
          }`}></div>
          <span className="text-xs text-zinc-400">
            {extensionStatus.available && extensionStatus.connected 
              ? 'Connected' 
              : extensionStatus.available 
                ? 'Available' 
                : 'Not Available'}
          </span>
        </div>
      </div>

      {extensionStatus.available ? (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">
            Last ping: {new Date(extensionStatus.lastPing).toLocaleTimeString()}
          </div>
          
          {extensionData.lastUpdate && (
            <div className="text-xs text-zinc-400">
              Last data update: {new Date(extensionData.lastUpdate).toLocaleTimeString()}
            </div>
          )}

          {!extensionStatus.connected && (
            <button
              onClick={handleRetryConnection}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Retry Connection
            </button>
          )}
        </div>
      ) : (
        <div className="text-xs text-zinc-500">
          ChatPye extension not detected. 
          <a 
            href="https://chrome.google.com/webstore" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline ml-1"
          >
            Install Extension
          </a>
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-3">
          <summary className="text-xs text-zinc-500 cursor-pointer">Debug Info</summary>
          <pre className="text-xs text-zinc-400 mt-2 overflow-auto">
            {JSON.stringify({ extensionStatus, extensionData }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
