'use client'

import { useEffect } from 'react'
import { useClerk } from '@clerk/nextjs'

/**
 * Custom error handler for Clerk sign-in errors
 * Intercepts and improves error messages
 */
export default function ClerkErrorHandler() {
  const { loaded } = useClerk()

  useEffect(() => {
    if (!loaded) return

    // Listen for Clerk error events and improve messaging
    const handleError = (event: any) => {
      const errorMessage = event.detail?.error?.message || ''
      
      if (errorMessage.includes('External Account was not found') || 
          errorMessage.includes('not found') ||
          errorMessage.includes('identifier')) {
        // Replace with better message
        const errorElement = document.querySelector('[data-clerk-error]') || 
                           document.querySelector('.cl-error') ||
                           document.querySelector('[role="alert"]')
        
        if (errorElement) {
          errorElement.textContent = "It seems you haven't created an account yet. Please use the 'Sign up' button to create a new account."
        }
      }
    }

    // Override Clerk's error display
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            const text = element.textContent || ''
            
            if (text.includes('External Account was not found') || 
                text.includes('not found') && text.includes('identifier')) {
              element.textContent = "It seems you haven't created an account yet. Please use the 'Sign up' button to create a new account."
            }
          }
        })
      })
    })

    // Observe the Clerk component container
    const clerkContainer = document.querySelector('[class*="cl-"]') || document.body
    observer.observe(clerkContainer, {
      childList: true,
      subtree: true
    })

    // Listen for custom Clerk events
    window.addEventListener('clerk-error', handleError)

    return () => {
      observer.disconnect()
      window.removeEventListener('clerk-error', handleError)
    }
  }, [loaded])

  return null
}

