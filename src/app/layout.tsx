import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { Toaster } from "@/components/ui/toaster";
// import { PerformanceProvider } from "@/components/performance-provider";
// import { ServiceWorkerProvider } from "@/components/service-worker-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Optimize font loading
  preload: true,
});

export const metadata: Metadata = {
  title: "Vibely - AI Album Art Generator",
  description:
    "Transform your music with personalized AI-generated album covers using your photos and mood analysis. Create stunning visuals that match your vibe.",
  keywords: [
    "AI",
    "album cover",
    "music",
    "photo",
    "generator",
    "artwork",
    "design",
    "spotify",
    "apple music",
  ],
  authors: [{ name: "Vibely Team" }],
  creator: "Vibely",
  publisher: "Vibely",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://vibely.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Vibely - AI Album Art Generator",
    description:
      "Transform your music with personalized AI-generated album covers using your photos and mood analysis.",
    siteName: "Vibely",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vibely - AI Album Art Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibely - AI Album Art Generator",
    description:
      "Transform your music with personalized AI-generated album covers using your photos and mood analysis.",
    images: ["/og-image.png"],
    creator: "@vibely_app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vibely",
  },
  verification: {
    google: "your-google-verification-code",
    // Add other verification codes as needed
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#9FFFA2" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0F12" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://accounts.spotify.com" />
        <link rel="preconnect" href="https://api.spotify.com" />
        <link rel="preconnect" href="https://music.apple.com" />
        <link rel="preconnect" href="https://js-cdn.music.apple.com" />
        <link rel="preconnect" href="https://js.stripe.com" />

        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* SVG icon placeholder - add actual icon.svg file to public directory */}
        {/* <link rel="icon" href="/icon.svg" type="image/svg+xml" /> */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Preload critical resources */}
        {/* Font preloading handled by Next.js Google Fonts optimization */}

        {/* Web App Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Vibely" />

        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#0E0F12" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Performance hints */}
        <meta httpEquiv="x-dns-prefetch-control" content="on" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />

        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      </head>
      <body className={inter.className}>
        {/* <ServiceWorkerProvider>
          <PerformanceProvider> */}
        <AuthProvider>
          <AnalyticsProvider>
            {children}
            <Toaster />
          </AnalyticsProvider>
        </AuthProvider>
        {/* </PerformanceProvider>
        </ServiceWorkerProvider> */}

        {/* Inline critical JavaScript for performance */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Critical performance optimizations
              (function() {
                // Detect and store performance capabilities
                if ('connection' in navigator) {
                  const connection = navigator.connection;
                  const networkInfo = {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt
                  };
                  sessionStorage.setItem('networkInfo', JSON.stringify(networkInfo));
                }
                // Removed custom modulepreload to avoid Next.js chunk path issues
                
                // Initialize performance timing
                if ('performance' in window && 'mark' in performance) {
                  performance.mark('app-start');
                }
                
                // Early service worker registration
                var embedded = false;
                try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
                if (!embedded && 'serviceWorker' in navigator && window.location.protocol === 'https:') {
                  navigator.serviceWorker.register('/sw.js').catch(function(e) {
                    console.log('SW registration failed');
                  });
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
