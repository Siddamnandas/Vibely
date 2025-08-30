"use client";

import React, { useEffect } from "react";
import { useDevicePerformance } from "@/hooks/use-device-performance";

interface PreloaderProps {
  children: React.ReactNode;
}

// List of critical resources to preload
const CRITICAL_RESOURCES = [
  // Critical images
  "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=840&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=400&auto=format&fit=crop",
  
  // Critical CSS (if needed)
  // "/critical-styles.css",
];

const PRECONNECT_DOMAINS = [
  "https://images.unsplash.com",
  "https://picsum.photos",
  "https://api.spotify.com",
  "https://accounts.spotify.com",
];

export function ResourcePreloader({ children }: PreloaderProps) {
  const deviceProfile = useDevicePerformance();

  useEffect(() => {
    // Skip preloading on low-end devices or slow connections
    if (deviceProfile.isLowEndDevice || deviceProfile.connectionType === "slow") {
      return;
    }

    // Preconnect to external domains
    PRECONNECT_DOMAINS.forEach((domain) => {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = domain;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    });

    // Preload critical images
    CRITICAL_RESOURCES.forEach((src) => {
      if (src.startsWith("http")) {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = src;
        document.head.appendChild(link);
      }
    });

    // Cleanup function
    return () => {
      // Remove preload links if needed (optional)
      const preloadLinks = document.querySelectorAll('link[rel="preload"], link[rel="preconnect"]');
      preloadLinks.forEach((link) => {
        if (CRITICAL_RESOURCES.includes(link.getAttribute("href") || "") ||
            PRECONNECT_DOMAINS.includes(link.getAttribute("href") || "")) {
          link.remove();
        }
      });
    };
  }, [deviceProfile]);

  return <>{children}</>;
}

// Critical CSS inlining component
export function CriticalStylesLoader() {
  useEffect(() => {
    // Load non-critical CSS asynchronously
    const loadCSS = (href: string) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.media = "print";
      link.onload = () => {
        link.media = "all";
      };
      document.head.appendChild(link);
    };

    // Example: Load non-critical styles
    // loadCSS("/non-critical-styles.css");
  }, []);

  return null;
}

// Performance monitoring and optimization hints
export function PerformanceOptimizer() {
  const deviceProfile = useDevicePerformance();

  useEffect(() => {
    // Set CSS custom properties for performance-based styling
    const root = document.documentElement;
    
    root.style.setProperty("--animation-duration", 
      deviceProfile.shouldUseAnimations ? "0.3s" : "0s"
    );
    
    root.style.setProperty("--backdrop-blur", 
      deviceProfile.tier === "low" ? "0px" : "12px"
    );

    root.style.setProperty("--image-quality",
      deviceProfile.maxImageQuality === "high" ? "1" : 
      deviceProfile.maxImageQuality === "medium" ? "0.8" : "0.6"
    );

    // Add performance hints
    if (typeof window !== "undefined" && "performance" in window) {
      // Mark critical path completion
      performance.mark("critical-path-complete");
      
      // Measure total page load time
      const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        const loadTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;
        console.log(`📊 Page load time: ${Math.round(loadTime)}ms`);
        
        // Track slow loads
        if (loadTime > 3000) {
          console.warn("⚠️ Slow page load detected:", {
            loadTime: Math.round(loadTime),
            deviceTier: deviceProfile.tier,
            connectionType: deviceProfile.connectionType,
          });
        }
      }
    }
  }, [deviceProfile]);

  return null;
}

// Component to defer non-critical JavaScript
export function DeferredScriptLoader({ scripts }: { scripts: string[] }) {
  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    // Load scripts after main content is ready
    const timeout = setTimeout(async () => {
      for (const script of scripts) {
        try {
          await loadScript(script);
        } catch (error) {
          console.warn(`Failed to load script: ${script}`, error);
        }
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [scripts]);

  return null;
}