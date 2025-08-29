"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Play,
  Pause,
  Square as Stop,
  Trash2,
  WifiOff,
  Wifi,
  Music,
  HardDrive,
  Download as DownloadIcon,
} from "lucide-react";
import { useOfflineAudio } from "@/lib/offline-audio-service";
import { formatBytes } from "@/lib/utils";

interface OfflineAudioPlayerProps {
  className?: string;
}

export function OfflineAudioPlayer({ className }: OfflineAudioPlayerProps) {
  const {
    isAudioAvailableOffline,
    cachedTracksCount,
    totalAudioCacheSize,
    currentlyPlaying,
    canPlayOffline,
    cacheTrack,
    playOfflineTrack,
    removeCachedTrack,
    pauseCurrentTrack,
    resumeCurrentTrack,
    stopCurrentTrack,
    getCachedTracks,
  } = useOfflineAudio();

  const [cachedTracks, setCachedTracks] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [cachingProgress, setCachingProgress] = React.useState<{ [key: string]: number }>({});

  // Load cached tracks
  React.useEffect(() => {
    const loadCachedTracks = async () => {
      try {
        const tracks = await getCachedTracks();
        setCachedTracks(tracks);
      } catch (error) {
        console.error("Failed to load cached tracks:", error);
      }
    };

    loadCachedTracks();
  }, [getCachedTracks, cachedTracksCount]);

  // Listen for caching progress updates
  React.useEffect(() => {
    const handleTrackCached = () => {
      // Refresh cached tracks list
      getCachedTracks().then(setCachedTracks);
    };

    window.addEventListener("offline-track-cached", handleTrackCached);
    return () => window.removeEventListener("offline-track-cached", handleTrackCached);
  }, [getCachedTracks]);

  const handlePlayTrack = async (trackId: string) => {
    setIsLoading(true);
    try {
      await playOfflineTrack(trackId);
    } catch (error) {
      console.error("Failed to play track:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    setIsLoading(true);
    try {
      await removeCachedTrack(trackId);
      setCachedTracks((tracks) => tracks.filter((t) => t.id !== trackId));
    } catch (error) {
      console.error("Failed to remove track:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCacheExampleTrack = async () => {
    // Demo functionality to cache a sample track
    const exampleTrack = {
      id: "example-track-1",
      title: "Demo Offline Track",
      artist: "Vibely Demo",
      audioUrl: "/demo-audio.mp3", // This would be a real audio URL
      duration: 180,
      playlistId: "demo-playlist",
      isAvailableOffline: false,
      lastCached: new Date(),
    };

    setIsLoading(true);
    setCachingProgress({ [exampleTrack.id]: 0 });

    try {
      // Simulate caching progress
      for (let i = 0; i <= 100; i += 10) {
        setCachingProgress({ [exampleTrack.id]: i });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await cacheTrack(exampleTrack);
      setCachingProgress({});
    } catch (error) {
      console.error("Failed to cache example track:", error);
      setCachingProgress({});
    } finally {
      setIsLoading(false);
    }
  };

  const isOnline = navigator.onLine;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Offline Audio Player
          {!isOnline && <WifiOff className="h-4 w-4 text-red-500" />}
          {isOnline && <Wifi className="h-4 w-4 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Play music even when you&apos;re offline. Cache your favorite tracks for uninterrupted
          listening.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Cached Tracks</span>
            </div>
            <div className="text-2xl font-bold">{cachedTracksCount}</div>
            <div className="text-xs text-gray-500">{formatBytes(totalAudioCacheSize)} used</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Play className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Status</span>
            </div>
            <Badge variant={canPlayOffline ? "default" : "secondary"}>
              {canPlayOffline ? "Ready" : "No Offline Music"}
            </Badge>
            <div className="text-xs text-gray-500 mt-1">{isOnline ? "Online" : "Offline Mode"}</div>
          </div>
        </div>

        {/* Current Playing Track */}
        {currentlyPlaying && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">{currentlyPlaying.title}</div>
                <div className="text-sm text-gray-600">{currentlyPlaying.artist}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={pauseCurrentTrack}>
                  <Pause className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={resumeCurrentTrack}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={stopCurrentTrack}>
                  <Stop className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Playing Offline
            </Badge>
          </div>
        )}

        {/* Demo Cache Button */}
        {cachedTracksCount === 0 && (
          <div className="text-center py-6">
            <div className="mb-4">
              <Download className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-gray-900">No Offline Music</h3>
              <p className="text-sm text-gray-500">Cache your favorite tracks to listen offline</p>
            </div>
            <Button onClick={handleCacheExampleTrack} disabled={isLoading}>
              <DownloadIcon className="h-4 w-4 mr-2" />
              {isLoading ? "Caching Demo Track..." : "Cache Demo Track"}
            </Button>
          </div>
        )}

        {/* Cached Tracks List */}
        {cachedTracks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Cached Tracks</h4>

            {cachedTracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                    <Music className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{track.title}</div>
                    <div className="text-xs text-gray-500">{track.artist}</div>
                    {track.cacheSize && (
                      <div className="text-xs text-gray-400">{formatBytes(track.cacheSize)}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {cachingProgress[track.id] !== undefined ? (
                    <div className="w-20">
                      <Progress value={cachingProgress[track.id]} className="h-2" />
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePlayTrack(track.id)}
                        disabled={isLoading}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveTrack(track.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cache Management Info */}
        <div className="text-xs text-gray-500 space-y-1 border-t pt-4">
          <p>• Offline music works without internet connection</p>
          <p>• Cached tracks are stored locally on your device</p>
          <p>• Clear cache to free up storage space</p>
          <p>• Cache size is limited to preserve device storage</p>
        </div>
      </CardContent>
    </Card>
  );
}
