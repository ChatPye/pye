import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { OptimizedClerkProvider } from '@/lib/clerk-config';
import PerformanceOptimizer from '@/components/PerformanceOptimizer';
import CookieBanner from '@/components/CookieBanner';
import { LandingPageSecurity } from '@/components/LandingPageSecurity';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ChatPye — AI-native LMS for video training",
  description: "ChatPye embeds multimodal AI directly into your training and tutorial videos in 1 minute. Turn static recordings into interactive learning that accelerates upskilling, boosts engagement, and measures competency.",
  keywords: ["AI", "LMS", "video training", "interactive learning", "upskilling", "competency"],
  authors: [{ name: "ChatPye" }],
  openGraph: {
    title: "ChatPye — AI-native LMS for video training",
    description: "ChatPye embeds multimodal AI directly into your training and tutorial videos in 1 minute.",
    type: "website",
  },
};

// Clerk auth app — skip static prerender at build (avoids invalid-key failures on Vercel)
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isE2E = process.env.NEXT_PUBLIC_E2E === 'true';
  
  const content = (
    <html lang="en">
        <head>
          {/* Google Analytics */}
          {process.env.NEXT_PUBLIC_GA_ID && (
            <>
              <script
                async
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              />
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                      page_title: document.title,
                      page_location: window.location.href,
                    });
                  `,
                }}
              />
            </>
          )}
          
          {/* PostHog */}
          {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                  posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}', {api_host: '${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'}'});
                `,
              }}
            />
          )}
        </head>
        <body
          className={`${inter.variable} antialiased bg-black text-white selection:bg-white selection:text-black font-[Inter] overflow-x-hidden`}
        >
          <PerformanceOptimizer />
          {children}
          <CookieBanner />
          <LandingPageSecurity 
            showSecurityBadge={false}
            enableRealTimeMonitoring={false}
          />
        </body>
      </html>
  );

  if (isE2E) {
    return content;
  }

  return (
    <OptimizedClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || null}>
      {content}
    </OptimizedClerkProvider>
  );
}