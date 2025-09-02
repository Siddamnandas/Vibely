import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-avatar",
      "@radix-ui/react-button",
      "@radix-ui/react-card",
      "@radix-ui/react-dialog",
      "framer-motion",
    ],

    // Concurrent features
    serverActions: {
      allowedOrigins: ["localhost:9002"],
    },
  },

  // Server external packages (moved from experimental)
  serverExternalPackages: ["sharp", "onnxruntime-node"],

  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    rules: {
      // Custom loader rules for better performance
      // Temporarily disabled SVG rule to fix webpack conflicts
      // "*.svg": {
      //   loaders: ["@svgr/webpack"],
      //   as: "*.js",
      // },
    },
  },

  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.spotify.com",
      },
      {
        protocol: "https",
        hostname: "*.scdn.co",
      },
      {
        protocol: "https",
        hostname: "*.mzstatic.com",
      },
      {
        protocol: "https",
        hostname: "generativelanguage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",

    // React optimizations
    reactRemoveProperties: process.env.NODE_ENV === "production",

    // Styled Components (if using)
    styledComponents: false,
  },

  // Bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Bundle analyzer
      if (process.env.ANALYZE === "true") {
        const BundleAnalyzerPlugin = require("@next/bundle-analyzer")({
          enabled: true,
        });
        config.plugins.push(new BundleAnalyzerPlugin());
      }

      // Optimize bundle size
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              maxSize: 244000, // 244KB
              priority: 10,
            },
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              enforce: true,
              priority: 5,
            },
            // Separate chunks for large libraries
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: "framer-motion",
              chunks: "all",
              priority: 20,
            },
            radixUI: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: "radix-ui",
              chunks: "all",
              priority: 15,
            },
            // AI and analytics separate chunks
            aiLibs: {
              test: /[\\/]node_modules[\\/](@genkit-ai|genkit)[\\/]/,
              name: "ai-libs",
              chunks: "all",
              priority: 25,
            },
            analytics: {
              test: /[\\/]node_modules[\\/](@amplitude|mixpanel|@sentry)[\\/]/,
              name: "analytics",
              chunks: "all",
              priority: 8,
            },
          },
        },
      };
    }

    // Performance optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      // Optimize lodash imports
      lodash: "lodash-es",
    };

    // Custom webpack rules
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    return config;
  },

  // Performance headers
  async headers() {
    const securityAndPerfHeaders = [
      {
        source: "/(.*)",
        headers: [
          // Security headers
          // Only send X-Frame-Options in production so local previews (VS Code, etc.) can iframe the app.
          // In development, allow trusted ancestors via CSP instead.
          ...(isProd
            ? [
                // In production, keep DENY by default.
                // Set ALLOW_IFRAME_PROD=true to relax for trusted preview environments.
                ...(process.env.ALLOW_IFRAME_PROD === "true"
                  ? [
                      {
                        key: "Content-Security-Policy",
                        value:
                          process.env.ALLOW_IFRAME_PROD === "true"
                            ? "frame-ancestors *;"
                            : "frame-ancestors 'self';",
                      },
                    ]
                  : [
                      {
                        key: "X-Frame-Options",
                        value: "DENY",
                      },
                    ]),
              ]
            : [
                {
                  key: "Content-Security-Policy",
                  // Broaden frame-ancestors during development so mobile preview extensions/webviews can render
                  // Set ALLOW_IFRAME_DEV=true to allow any ancestor (most permissive) for troubleshooting
                  value:
                    process.env.ALLOW_IFRAME_DEV === "true"
                      ? "frame-ancestors *;"
                      : [
                          "frame-ancestors",
                          "'self'",
                          // VS Code webview schemes/domains used by extensions
                          "vscode-webview://*",
                          "https://*.vscode-webview.net",
                          "https://*.vscode-cdn.net",
                          // Local dev hosts
                          "http://localhost:*",
                          "https://localhost:*",
                          "http://127.0.0.1:*",
                          "https://127.0.0.1:*",
                          // Network IPs for mobile testing
                          "http://172.20.10.*:*",
                          // Common preview/webview schemes
                          "chrome-extension://*",
                          "moz-extension://*",
                          "capacitor://*",
                          "ionic://*",
                          "file:",
                        ].join(" ") + ";",
                },
              ]),
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Performance headers
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
          },
        ],
      },
    ];

    return securityAndPerfHeaders;
  },

  // Rewrites for service worker
  async rewrites() {
    return [
      {
        source: "/service-worker.js",
        destination: "/sw.js",
      },
    ];
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_PWA_ENABLED: process.env.NODE_ENV === "production" ? "true" : "false",
  },

  // Output configuration
  output: "standalone",

  // Compression
  compress: true,

  // Power optimization for mobile
  poweredByHeader: false,

  // Generate ETags for better caching
  generateEtags: true,

  // Strict mode for better performance
  reactStrictMode: true,

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Analyze bundle size (plugin configured below when ANALYZE=true)
};

// Bundle analyzer
if (process.env.ANALYZE === "true") {
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}

export default nextConfig;
