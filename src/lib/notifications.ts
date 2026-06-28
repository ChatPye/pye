/**
 * Browser Notifications Service
 * Handles requesting permission and showing notifications for video processing status
 */

export class NotificationService {
  private static permission: NotificationPermission = 'default'
  private static isSupported: boolean = false

  static init() {
    if (typeof window === 'undefined') return
    
    this.isSupported = 'Notification' in window
    if (this.isSupported) {
      this.permission = Notification.permission
    }
  }

  /**
   * Request notification permission from user
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser')
      return false
    }

    if (this.permission === 'granted') {
      return true
    }

    if (this.permission === 'denied') {
      console.warn('Notification permission denied')
      return false
    }

    const permission = await Notification.requestPermission()
    this.permission = permission
    
    return permission === 'granted'
  }

  /**
   * Show a notification
   */
  static async show(
    title: string,
    options?: NotificationOptions
  ): Promise<Notification | null> {
    if (!this.isSupported) {
      console.warn('Notifications not supported')
      return null
    }

    if (this.permission !== 'granted') {
      const granted = await this.requestPermission()
      if (!granted) {
        return null
      }
    }

    try {
      const notification = new Notification(title, {
        icon: '/images/icon-192.png',
        badge: '/images/badge-72.png',
        tag: 'chatpye-notification',
        requireInteraction: false,
        ...options
      })

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      // Handle click - focus window
      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return notification
    } catch (error) {
      console.error('Failed to show notification:', error)
      return null
    }
  }

  /**
   * Show video processing complete notification
   */
  static async showProcessingComplete(videoId: string, title?: string): Promise<void> {
    await this.show(
      'Video Processing Complete! 🎉',
      {
        body: title 
          ? `"${title}" is ready for questions`
          : 'Your video is ready for questions',
        data: { videoId, type: 'processing-complete' },
        tag: `video-complete-${videoId}`
      }
    )
  }

  /**
   * Show video processing failed notification
   */
  static async showProcessingFailed(videoId: string, error?: string): Promise<void> {
    await this.show(
      'Video Processing Failed',
      {
        body: error || 'An error occurred while processing your video',
        data: { videoId, type: 'processing-failed' },
        tag: `video-failed-${videoId}`,
        requireInteraction: true
      }
    )
  }

  /**
   * Check if notifications are supported
   */
  static getSupported(): boolean {
    return this.isSupported
  }

  /**
   * Get current permission status
   */
  static getPermission(): NotificationPermission {
    return this.permission
  }
}

// Initialize on module load (client-side only)
if (typeof window !== 'undefined') {
  NotificationService.init()
}

