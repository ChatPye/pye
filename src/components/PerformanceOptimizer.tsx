'use client';

import { useEffect } from 'react';

export default function PerformanceOptimizer() {
  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      // Note: Critical assets are handled by Next.js automatically
      // No manual preloading needed for non-existent assets
    };

    // Optimize images with lazy loading
    const optimizeImages = () => {
      const images = document.querySelectorAll('img[data-src]');
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src || '';
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    };

    // Critical CSS inlining
    const inlineCriticalCSS = () => {
      const criticalCSS = `
        /* Critical above-the-fold styles */
        body { margin: 0; font-family: Inter, sans-serif; }
        .hero-section { min-height: 100vh; display: flex; align-items: center; }
        .hero-title { font-size: 3rem; font-weight: 700; line-height: 1.2; }
        .hero-subtitle { font-size: 1.25rem; opacity: 0.8; margin-top: 1rem; }
        .cta-button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                     color: white; padding: 1rem 2rem; border-radius: 0.5rem; 
                     text-decoration: none; font-weight: 600; display: inline-block; }
      `;
      
      const style = document.createElement('style');
      style.textContent = criticalCSS;
      document.head.insertBefore(style, document.head.firstChild);
    };

    // Resource hints for better performance
    const addResourceHints = () => {
      const hints = [
        { rel: 'dns-prefetch', href: 'https://clerk.accounts.dev' },
        { rel: 'dns-prefetch', href: 'https://js.stripe.com' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      ];

      hints.forEach(hint => {
        const link = document.createElement('link');
        link.rel = hint.rel;
        link.href = hint.href;
        if (hint.crossOrigin) link.crossOrigin = hint.crossOrigin;
        document.head.appendChild(link);
      });
    };

    // Service Worker registration for caching
    const registerServiceWorker = () => {
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('SW registered: ', registration);
          })
          .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
      }
    };

    // Performance monitoring
    const monitorPerformance = () => {
      if ('performance' in window) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            
            // Log Core Web Vitals
            const metrics = {
              FCP: perfData.loadEventEnd - perfData.fetchStart,
              LCP: 0, // Will be measured by web-vitals library
              CLS: 0, // Will be measured by web-vitals library
              FID: 0, // Will be measured by web-vitals library
            };

            console.log('Performance Metrics:', metrics);
            
            // Send to analytics if needed
            if (window.gtag) {
              window.gtag('event', 'performance_metrics', metrics);
            }
          }, 0);
        });
      }
    };

    // Initialize all optimizations
    preloadCriticalResources();
    inlineCriticalCSS();
    addResourceHints();
    optimizeImages();
    registerServiceWorker();
    monitorPerformance();

    // Cleanup function
    return () => {
      // Remove any added elements or observers
      const addedLinks = document.querySelectorAll('link[data-performance-added]');
      addedLinks.forEach(link => link.remove());
    };
  }, []);

  return null; // This component doesn't render anything
}