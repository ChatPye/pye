'use client';

import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component
const LoadingSpinner = ({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
    </div>
  );
};

// Lazy load heavy components
export const LazyYouTubeChat = lazy(() => 
  import('./YouTubeChat')
);

export const LazyDemoForm = lazy(() => 
  import('./DemoForm')
);

export const LazyDashboardSecurity = lazy(() => 
  import('./DashboardSecurity').then(module => ({ default: module.DashboardSecurity }))
);

export const LazyAdminDashboard = lazy(() => 
  import('../app/admin/page')
);

// Wrapped components with Suspense
export const YouTubeChatWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner size="large" />}>
    <LazyYouTubeChat {...props} />
  </Suspense>
);

export const DemoFormWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner size="default" />}>
    <LazyDemoForm {...props} />
  </Suspense>
);

export const DashboardSecurityWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner size="default" />}>
    <LazyDashboardSecurity {...props} />
  </Suspense>
);

export const AdminDashboardWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner size="large" />}>
    <LazyAdminDashboard {...props} />
  </Suspense>
);

// Image lazy loading component
export const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = '/images/placeholder.svg',
  ...props 
}: {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  [key: string]: any;
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, inView] = useInView<HTMLImageElement>({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView && src) {
      setImageSrc(src);
    }
  }, [inView, src]);

  return (
    <img
      ref={imageRef}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${imageSrc === placeholder ? 'opacity-50' : 'opacity-100'} ${className}`}
      {...props}
    />
  );
};

// Video lazy loading component
export const LazyVideo = ({ 
  src, 
  poster, 
  className = '',
  ...props 
}: {
  src: string;
  poster: string;
  className?: string;
  [key: string]: any;
}) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [videoRef, inView] = useInView<HTMLDivElement>({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      setShouldLoad(true);
    }
  }, [inView]);

  return (
    <div ref={videoRef} className={className}>
      {shouldLoad ? (
        <video
          src={src}
          poster={poster}
          controls
          preload="metadata"
          className="w-full h-auto"
          {...props}
        />
      ) : (
        <div 
          className="w-full h-64 bg-gray-900 flex items-center justify-center"
          style={{ backgroundImage: `url(${poster})`, backgroundSize: 'cover' }}
        >
          <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded">
            Click to load video
          </div>
        </div>
      )}
    </div>
  );
};

// Chart lazy loading component
export const LazyChart = ({ 
  type, 
  data, 
  className = '',
  ...props 
}: {
  type: string;
  data: any;
  className?: string;
  [key: string]: any;
}) => {
  const [ChartComponent, setChartComponent] = useState<any>(null);
  const [chartRef, inView] = useInView<HTMLDivElement>({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      // Dynamically import chart library
      import('react-chartjs-2').then(chartjs => {
        const chartModule = chartjs as any;
        setChartComponent(() => chartModule[type]);
      });
    }
  }, [inView, type]);

  if (!ChartComponent) {
    return (
      <div ref={chartRef} className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={className}>
      <ChartComponent data={data} {...props} />
    </div>
  );
};

// Route-based code splitting
export const LazyRoute = ({ 
  component: Component, 
  fallback = <LoadingSpinner size="large" />,
  ...props 
}: {
  component: React.ComponentType<any>;
  fallback?: React.ReactNode;
  [key: string]: any;
}) => (
  <Suspense fallback={fallback}>
    <Component {...props} />
  </Suspense>
);

// Utility hook for intersection observer
export function useInView<T extends HTMLElement = HTMLElement>(options = {}) {
  const [inView, setInView] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, inView] as const;
}
