/**
 * Robust Extension Communication Service
 * Handles communication between the web app and ChatPye Chrome extension
 * Works in both local development and production environments
 */

import React from 'react';

export interface ExtensionMessage {
  type: string;
  data?: any;
  timestamp?: number;
  source?: string;
  target?: string;
}

export interface DashboardData {
  credits: { balance: number; subscriptionTier: string };
  xp: { totalXP: number; level: number; currentLevelXP: number; nextLevelXP: number };
  referrals: { totalReferrals: number; completedReferrals: number };
  watchTime: number;
  recentNotes: any[];
  recentWatchHistory: any[];
}

export interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class ExtensionCommunicationService {
  private static instance: ExtensionCommunicationService;
  private messageQueue: ExtensionMessage[] = [];
  private isExtensionAvailable = false;
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  private constructor() {
    this.initializeExtensionDetection();
  }

  public static getInstance(): ExtensionCommunicationService {
    if (!ExtensionCommunicationService.instance) {
      ExtensionCommunicationService.instance = new ExtensionCommunicationService();
    }
    return ExtensionCommunicationService.instance;
  }

  /**
   * Initialize extension detection and communication
   */
  private initializeExtensionDetection(): void {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }
    
    // Listen for extension responses
    window.addEventListener('message', this.handleExtensionMessage.bind(this));
    
    // Try to detect if extension is available
    this.detectExtension();
  }

  /**
   * Detect if the ChatPye extension is installed and active
   */
  private async detectExtension(): Promise<boolean> {
    // Only run on client side
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      // Send a ping message to test if extension is listening
      const pingMessage: ExtensionMessage = {
        type: 'CHATPYE_PING',
        timestamp: Date.now(),
        source: 'webapp'
      };

      await this.sendMessage(pingMessage);
      
      // Wait for response
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('🔍 Extension not detected (timeout)');
          this.isExtensionAvailable = false;
          resolve(false);
        }, 1000);

        const handlePingResponse = (event: MessageEvent) => {
          if (event.data?.type === 'CHATPYE_PONG') {
            clearTimeout(timeout);
            window.removeEventListener('message', handlePingResponse);
            console.log('✅ Extension detected and active');
            this.isExtensionAvailable = true;
            resolve(true);
          }
        };

        window.addEventListener('message', handlePingResponse);
      });
    } catch (error) {
      console.log('🔍 Extension not detected (error):', error);
      this.isExtensionAvailable = false;
      return false;
    }
  }

  /**
   * Send message to extension with retry logic
   */
  public async sendMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
    // Only run on client side
    if (typeof window === 'undefined') {
      return { success: false, error: 'Server-side rendering' };
    }

    return new Promise((resolve) => {
      const sendAttempt = () => {
        try {
          // Add metadata to message
          const enrichedMessage = {
            ...message,
            timestamp: message.timestamp || Date.now(),
            source: 'webapp',
            target: 'extension'
          };

          // Send message
          window.postMessage(enrichedMessage, '*');
          
          console.log('📤 Message sent to extension:', enrichedMessage.type, enrichedMessage);

          // For fire-and-forget messages, resolve immediately
          if (this.isFireAndForgetMessage(message.type)) {
            resolve({ success: true });
            return;
          }

          // For messages expecting responses, wait with timeout
          this.waitForResponse(message.type, resolve);

        } catch (error) {
          console.error('❌ Failed to send message to extension:', error);
          
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`🔄 Retrying message send (${this.retryCount}/${this.maxRetries})`);
            setTimeout(sendAttempt, this.retryDelay);
          } else {
            resolve({ success: false, error: 'Extension communication failed' });
          }
        }
      };

      sendAttempt();
    });
  }

  /**
   * Wait for extension response with timeout
   */
  private waitForResponse(messageType: string, resolve: (response: ExtensionResponse) => void): void {
    const timeout = setTimeout(() => {
      console.warn(`⏰ Extension response timeout for: ${messageType}`);
      resolve({ success: false, error: 'Extension response timeout' });
    }, 5000);

    const handleResponse = (event: MessageEvent) => {
      if (event.data?.type === `${messageType}_RESPONSE` || 
          event.data?.originalType === messageType) {
        clearTimeout(timeout);
        window.removeEventListener('message', handleResponse);
        
        console.log('📥 Extension response received:', event.data);
        resolve({ 
          success: event.data?.success !== false, 
          data: event.data?.data,
          error: event.data?.error 
        });
      }
    };

    window.addEventListener('message', handleResponse);
  }

  /**
   * Handle incoming messages from extension
   */
  private handleExtensionMessage(event: MessageEvent): void {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Only handle messages from our extension
    if (event.data?.source === 'extension' && event.data?.target === 'webapp') {
      console.log('📥 Message received from extension:', event.data);
      
      // Handle specific message types
      switch (event.data.type) {
        case 'CHATPYE_PONG':
          this.isExtensionAvailable = true;
          break;
        case 'CHATPYE_DATA_UPDATE':
          this.handleDataUpdate(event.data);
          break;
        case 'CHATPYE_AUTH_STATUS':
          this.handleAuthStatus(event.data);
          break;
        default:
          console.log('📥 Unhandled extension message:', event.data.type);
      }
    }
  }

  /**
   * Handle data updates from extension
   */
  private handleDataUpdate(data: any): void {
    console.log('📊 Data update from extension:', data);
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('chatpye-extension-data', { detail: data }));
  }

  /**
   * Handle auth status updates from extension
   */
  private handleAuthStatus(data: any): void {
    console.log('🔐 Auth status from extension:', data);
    // Emit custom event for auth components
    window.dispatchEvent(new CustomEvent('chatpye-extension-auth', { detail: data }));
  }

  /**
   * Check if message type is fire-and-forget
   */
  private isFireAndForgetMessage(messageType: string): boolean {
    const fireAndForgetTypes = [
      'CHATPYE_HANDSHAKE',
      'CHATPYE_PING',
      'CHATPYE_DATA_UPDATE'
    ];
    return fireAndForgetTypes.includes(messageType);
  }

  /**
   * Send handshake to extension
   */
  public async sendHandshake(handshakeCode: string, expiresIn: number): Promise<void> {
    const message: ExtensionMessage = {
      type: 'CHATPYE_HANDSHAKE',
      data: {
        code: handshakeCode,
        expiresIn,
        timestamp: Date.now()
      }
    };

    await this.sendMessage(message);
  }

  /**
   * Request data from extension
   */
  public async requestData(dataType: string): Promise<ExtensionResponse> {
    const message: ExtensionMessage = {
      type: 'CHATPYE_REQUEST_DATA',
      data: { dataType }
    };

    return await this.sendMessage(message);
  }

  /**
   * Check if extension is available
   */
  public isExtensionActive(): boolean {
    return this.isExtensionAvailable;
  }

  /**
   * Get extension status info
   */
  public getExtensionStatus(): { available: boolean; retryCount: number } {
    return {
      available: this.isExtensionAvailable,
      retryCount: this.retryCount
    };
  }

  /**
   * Send dashboard data to extension for sync
   */
  public async syncDashboardData(dashboardData: DashboardData): Promise<void> {
    const message: ExtensionMessage = {
      type: 'CHATPYE_DASHBOARD_SYNC',
      data: dashboardData,
      timestamp: Date.now()
    };
    await this.sendMessage(message);
  }

  /**
   * Request extension to sync its data with dashboard
   */
  public async requestExtensionSync(): Promise<void> {
    const message: ExtensionMessage = {
      type: 'CHATPYE_REQUEST_SYNC',
      data: {},
      timestamp: Date.now()
    };
    await this.sendMessage(message);
  }

  /**
   * Send video bookmark to extension
   */
  public async syncBookmark(bookmark: any): Promise<void> {
    const message: ExtensionMessage = {
      type: 'CHATPYE_BOOKMARK_SYNC',
      data: bookmark,
      timestamp: Date.now()
    };
    await this.sendMessage(message);
  }

  /**
   * Send note to extension
   */
  public async syncNote(note: any): Promise<void> {
    const message: ExtensionMessage = {
      type: 'CHATPYE_NOTE_SYNC',
      data: note,
      timestamp: Date.now()
    };
    await this.sendMessage(message);
  }

  /**
   * Send watch history to extension
   */
  public async syncWatchHistory(history: any): Promise<void> {
    const message: ExtensionMessage = {
      type: 'CHATPYE_WATCH_HISTORY_SYNC',
      data: history,
      timestamp: Date.now()
    };
    await this.sendMessage(message);
  }
}

// Export singleton instance
export const extensionCommunication = ExtensionCommunicationService.getInstance();

// Export React hook for easy use in components
export function useExtensionCommunication() {
  const [extensionStatus, setExtensionStatus] = React.useState({
    available: false,
    retryCount: 0
  });

  React.useEffect(() => {
    const updateStatus = () => {
      setExtensionStatus(extensionCommunication.getExtensionStatus());
    };

    // Update status periodically
    const interval = setInterval(updateStatus, 5000);
    updateStatus(); // Initial update

    return () => clearInterval(interval);
  }, []);

  return {
    ...extensionCommunication,
    status: extensionStatus
  };
}
