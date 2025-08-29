"use client";

import React from "react";
import { Battery, BatteryLow, Zap, Volume2, VolumeX } from "lucide-react";
import { usePlayback } from "@/context/playback-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BatteryStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function BatteryStatusIndicator({
  className,
  showDetails = false,
}: BatteryStatusIndicatorProps) {
  const {
    batteryStatus,
    audioSettings,
    isBatterySaveMode,
    enableBatterySaveMode,
    disableBatterySaveMode,
  } = usePlayback();

  if (!batteryStatus.isSupported) {
    return null; // Don't show if battery API is not supported
  }

  const batteryPercentage = Math.round(batteryStatus.level * 100);
  const isLowBattery = batteryStatus.isLowBattery;
  const isCriticalBattery = batteryStatus.isCriticalBattery;

  const getBatteryIcon = () => {
    if (isCriticalBattery) {
      return <BatteryLow className="h-4 w-4 text-red-400" />;
    } else if (isLowBattery) {
      return <BatteryLow className="h-4 w-4 text-yellow-400" />;
    } else {
      return <Battery className="h-4 w-4 text-green-400" />;
    }
  };

  const getBatteryColor = () => {
    if (isCriticalBattery) return "bg-red-500";
    if (isLowBattery) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getAudioQualityText = () => {
    switch (audioSettings.audioBitrate) {
      case "high":
        return "High Quality";
      case "medium":
        return "Medium Quality";
      case "low":
        return "Battery Saver";
      default:
        return "Standard";
    }
  };

  if (!showDetails) {
    // Compact indicator for mini player or status bar
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 ${className}`}>
              {getBatteryIcon()}
              {isBatterySaveMode && <Zap className="h-3 w-3 text-yellow-400 animate-pulse" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div>Battery: {batteryPercentage}%</div>
              {batteryStatus.charging && <div>Charging...</div>}
              <div>Audio: {getAudioQualityText()}</div>
              {isBatterySaveMode && <div>Battery Saver Active</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed view for settings or full player
  return (
    <div className={`bg-white/5 rounded-lg p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getBatteryIcon()}
          <span className="text-sm font-medium">Battery {batteryPercentage}%</span>
          {batteryStatus.charging && <Zap className="h-4 w-4 text-blue-400" />}
        </div>

        {(isLowBattery || isBatterySaveMode) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={isBatterySaveMode ? disableBatterySaveMode : enableBatterySaveMode}
            className="text-xs"
          >
            {isBatterySaveMode ? "Disable" : "Enable"} Battery Saver
          </Button>
        )}
      </div>

      {/* Battery level progress bar */}
      <div className="space-y-1">
        <Progress
          value={batteryPercentage}
          className="h-2"
          style={{
            background: "rgba(255, 255, 255, 0.1)",
          }}
        />
        <div className="flex justify-between text-xs text-white/60">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Audio quality status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {audioSettings.shouldReduceQuality ? (
            <VolumeX className="h-4 w-4 text-yellow-400" />
          ) : (
            <Volume2 className="h-4 w-4 text-green-400" />
          )}
          <span className="text-sm">{getAudioQualityText()}</span>
        </div>

        {isBatterySaveMode && (
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <Zap className="h-3 w-3" />
            Battery Saver
          </div>
        )}
      </div>

      {/* Battery optimizations details */}
      {audioSettings.shouldReduceQuality && (
        <div className="text-xs text-white/50 space-y-1">
          <div>Active optimizations:</div>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            {audioSettings.audioBitrate === "low" && <li>Reduced audio quality</li>}
            {!audioSettings.preloadNext && <li>Disabled track preloading</li>}
            {!audioSettings.audioEffects && <li>Disabled audio effects</li>}
            {!audioSettings.backgroundAudioProcessing && <li>Reduced background processing</li>}
            {audioSettings.volumeLimit < 1.0 && (
              <li>Limited volume to {Math.round(audioSettings.volumeLimit * 100)}%</li>
            )}
          </ul>
        </div>
      )}

      {/* Charging information */}
      {batteryStatus.charging && batteryStatus.chargingTime !== Infinity && (
        <div className="text-xs text-white/50">
          Time to full charge: {Math.round(batteryStatus.chargingTime / 60)} minutes
        </div>
      )}

      {!batteryStatus.charging && batteryStatus.dischargingTime !== Infinity && (
        <div className="text-xs text-white/50">
          Estimated time remaining: {Math.round(batteryStatus.dischargingTime / 60)} minutes
        </div>
      )}
    </div>
  );
}
