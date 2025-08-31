"use client";

import React, { useEffect, useState, Component } from "react";
import Head from "next/head";

// Simple error boundary to catch any JavaScript errors
class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Mobile preview error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-900 text-white p-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="mb-4">An error occurred in the mobile preview test.</p>
            <button 
              className="bg-white text-red-900 px-4 py-2 rounded font-medium"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function MobilePreviewTest() {
  const [isMobile, setIsMobile] = useState(false);
  const [viewportInfo, setViewportInfo] = useState({
    width: 0,
    height: 0,
    userAgent: "",
  });

  useEffect(() => {
    try {
      // Check if we're on a mobile device
      const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(mobileCheck);

      // Get viewport information
      setViewportInfo({
        width: window.innerWidth,
        height: window.innerHeight,
        userAgent: navigator.userAgent,
      });

      // Listen for resize events
      const handleResize = () => {
        setViewportInfo({
          width: window.innerWidth,
          height: window.innerHeight,
          userAgent: navigator.userAgent,
        });
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    } catch (error) {
      console.error("Error in mobile preview test:", error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Vibely Test" />
        <meta name="theme-color" content="#0E0F12" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Mobile Preview Test</h1>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Viewport Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/20 p-4 rounded-lg">
                <p className="text-sm text-gray-300">Width</p>
                <p className="text-2xl font-bold">{viewportInfo.width}px</p>
              </div>
              <div className="bg-black/20 p-4 rounded-lg">
                <p className="text-sm text-gray-300">Height</p>
                <p className="text-2xl font-bold">{viewportInfo.height}px</p>
              </div>
              <div className="bg-black/20 p-4 rounded-lg">
                <p className="text-sm text-gray-300">Device Type</p>
                <p className="text-2xl font-bold">{isMobile ? "Mobile" : "Desktop"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Mobile Preview Status</h2>
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-300 font-medium">✅ Mobile preview is working correctly!</p>
              <p className="mt-2">If you can see this message, the mobile preview extension should be able to display your application.</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="bg-indigo-500 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">1</span>
                <p>If you&apos;re seeing this page, the mobile preview is working correctly.</p>
              </li>
              <li className="flex items-start">
                <span className="bg-indigo-500 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">2</span>
                <p>If you see a blank screen in your mobile preview extension, try these steps:</p>
              </li>
              <li className="flex items-start">
                <span className="bg-indigo-500 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">3</span>
                <p>Check that the development server is running on port 3000 with external access enabled.</p>
              </li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Common Issues & Solutions:</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200">
                  <li><strong>Extension not properly configured:</strong> Make sure your mobile preview extension is set to use http://localhost:3000</li>
                  <li><strong>CORS or security restrictions:</strong> We&apos;ve already configured the CSP headers to allow embedding</li>
                  <li><strong>Network connectivity issues:</strong> Try accessing http://172.20.10.10:3000 directly in your browser</li>
                  <li><strong>Server not accessible:</strong> We&apos;ve configured the server to accept external connections with -H 0.0.0.0</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Testing URLs:</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200">
                  <li><a href="http://localhost:3000" className="text-blue-300 hover:underline">http://localhost:3000</a> (Local access)</li>
                  <li><a href={`http://172.20.10.10:3000`} className="text-blue-300 hover:underline">http://172.20.10.10:3000</a> (Network access)</li>
                  <li><a href="/test-iframe.html" className="text-blue-300 hover:underline">/test-iframe.html</a> (IFrame test page)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
