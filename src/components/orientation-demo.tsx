"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, Tablet, RotateCcw, RotateCw, Monitor, Info } from "lucide-react";
import {
  useOrientation,
  useResponsiveDesign,
  useMiniPlayerResponsive,
} from "@/hooks/use-orientation";

export function OrientationDemo({ className }: { className?: string }) {
  const orientation = useOrientation();
  const responsive = useResponsiveDesign();
  const miniPlayer = useMiniPlayerResponsive();

  const getDeviceIcon = () => {
    if (responsive.isDesktop) return <Monitor className="h-4 w-4" />;
    if (responsive.isTablet) return <Tablet className="h-4 w-4" />;
    return <Smartphone className="h-4 w-4" />;
  };

  const getOrientationIcon = () => {
    return orientation.isLandscape ? (
      <RotateCw className="h-4 w-4" />
    ) : (
      <RotateCcw className="h-4 w-4" />
    );
  };

  const handleForceRefresh = () => {
    orientation.forceRefresh();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getDeviceIcon()}
          Orientation & Responsive Mini-Player
          <Badge variant={orientation.isLandscape ? "default" : "secondary"}>
            {orientation.orientation}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time mobile orientation detection and mini-player optimization
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {getOrientationIcon()}
              Orientation
            </div>
            <div className="text-2xl font-bold capitalize">{orientation.orientation}</div>
            <div className="text-xs text-gray-500">{orientation.angle}° rotation</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4" />
              Screen Size
            </div>
            <div className="text-lg font-bold">
              {orientation.availableWidth} × {orientation.availableHeight}
            </div>
            <Badge variant="outline" className="text-xs">
              {responsive.breakpoint}
            </Badge>
          </div>
        </div>

        {/* Mini-Player Dimensions */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4" />
            Mini-Player Responsive Configuration
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-gray-600">Height</div>
              <div className="font-mono">{miniPlayer.dimensions.height}px</div>
            </div>
            <div>
              <div className="text-gray-600">Icon Size</div>
              <div className="font-mono">{miniPlayer.dimensions.iconSize}px</div>
            </div>
            <div>
              <div className="text-gray-600">Margin X</div>
              <div className="font-mono">{miniPlayer.dimensions.marginX}px</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-600">Border Radius</div>
              <div className="font-mono">{miniPlayer.dimensions.borderRadius}px</div>
            </div>
            <div>
              <div className="text-gray-600">Max Width</div>
              <div className="font-mono">{miniPlayer.dimensions.width}px</div>
            </div>
          </div>
        </div>

        {/* Safe Area Insets */}
        {(orientation.safeAreaInsets.top > 0 ||
          orientation.safeAreaInsets.bottom > 0 ||
          orientation.safeAreaInsets.left > 0 ||
          orientation.safeAreaInsets.right > 0) && (
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-2">
              Safe Area Insets (iPhone/Android notch/home indicator)
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <div className="text-gray-600">Top</div>
                <div className="font-mono">{orientation.safeAreaInsets.top}px</div>
              </div>
              <div>
                <div className="text-gray-600">Right</div>
                <div className="font-mono">{orientation.safeAreaInsets.right}px</div>
              </div>
              <div>
                <div className="text-gray-600">Bottom</div>
                <div className="font-mono">{orientation.safeAreaInsets.bottom}px</div>
              </div>
              <div>
                <div className="text-gray-600">Left</div>
                <div className="font-mono">{orientation.safeAreaInsets.left}px</div>
              </div>
            </div>
          </div>
        )}

        {/* Device Capabilities */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Device Features</div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={orientation.isSupported ? "default" : "destructive"}>
              Orientation API: {orientation.isSupported ? "✓" : "✗"}
            </Badge>
            <Badge variant={responsive.isMobile ? "default" : "outline"}>
              Mobile: {responsive.isMobile ? "✓" : "✗"}
            </Badge>
            <Badge variant={responsive.isTablet ? "default" : "outline"}>
              Tablet: {responsive.isTablet ? "✓" : "✗"}
            </Badge>
            <Badge variant={responsive.isDesktop ? "default" : "outline"}>
              Desktop: {responsive.isDesktop ? "✓" : "✗"}
            </Badge>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm font-medium text-yellow-800 mb-2">Testing Instructions</div>
          <div className="text-xs text-yellow-700 space-y-1">
            <p>• Rotate your device to see mini-player size adjustments</p>
            <p>• Try different screen sizes using browser dev tools</p>
            <p>• Mini-player becomes smaller in landscape mode</p>
            <p>• Safe area insets are respected for iPhone X+ devices</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleForceRefresh} className="mt-2">
            Force Refresh Layout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
