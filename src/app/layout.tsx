import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PerformanceProvider } from "@/components/performance-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Optimize font loading
  preload: true,
});

export const metadata: Metadata = {
  title: "Vibely - Personalize Your Music Stories",
  description:
    "Vibely plays your Spotify/Apple Music and automatically turns every song into a personalized cover using your own photos—perfect for sharing to Stories. 2-3 smart variants per track based on mood/tempo/energy. Free: 3 covers/month • Premium: unlimited.",
  keywords: [
    "music covers",
    "AI album art",
    "spotify personalization",
    "music stories",
    "instagram stories",
    "apple music",
    "personalized playlist covers",
    "music art",
    "stories sharing",
    "mood-based covers",
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
    title: "Vibely - Personalize Your Music Stories",
    description:
      "Vibely plays your Spotify/Apple Music and automatically turns every song into a personalized cover using your own photos—perfect for sharing to Stories. 2-3 smart variants per track based on mood/tempo/energy.",
    siteName: "Vibely",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vibely - Personalize Your Music Stories",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibely - Personalize Your Music Stories",
    description:
      "Vibely plays your Spotify/Apple Music and automatically turns every song into a personalized cover using your own photos—perfect for sharing to Stories. 2-3 smart variants per track.",
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
        {/* Preload critical resources */}
        <link rel="preload" href="/_next/static/css/app/layout.css" as="style" />
        <link rel="preload" href="/_next/static/chunks/webpack.js" as="script" />

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
        <PerformanceProvider>
          {children}
        </PerformanceProvider>

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
