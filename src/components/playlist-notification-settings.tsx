"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, PlayCircle, Plus, Share2, Trash2 } from "lucide-react";
import { usePlaylistNotifications, usePlaylistChangeMonitor } from "@/hooks/use-playlist-notifications";
import { pushNotificationService } from "@/lib/push-notifications";

interface PlaylistNotificationSettingsProps {
  className?: string;
}

export function PlaylistNotificationSettings({ className }: PlaylistNotificationSettingsProps) {
  const {
    isPlaylistNotificationsEnabled,
    enablePlaylistNotifications,
    disablePlaylistNotifications,
    notifyPlaylistChange,
  } = usePlaylistNotifications();

  // Enable the playlist change monitor
  usePlaylistChangeMonitor();

  const [permissionStatus, setPermissionStatus] = React.useState<NotificationPermission>("default");

  React.useEffect(() => {
    setPermissionStatus(Notification.permission);
  }, []);

  const handleRequestPermission = async () => {
    const granted = await pushNotificationService.requestPermission();
    if (granted) {
      setPermissionStatus("granted");
    }
  };

  const handleToggleNotifications = (enabled: boolean) => {
    if (enabled) {
      enablePlaylistNotifications();
    } else {
      disablePlaylistNotifications();
    }
  };

  // Demo functions to test notifications
  const testNotifications = {
    created: () => notifyPlaylistChange({
      type: "created",
      playlistId: "demo-playlist-1",
      playlistName: "My Awesome Playlist",
      data: { trackCount: 15 }
    }),
    
    updated: () => notifyPlaylistChange({
      type: "updated",
      playlistId: "demo-playlist-2",
      playlistName: "Chill Vibes",
      data: { changeType: "songs_added", changeCount: 3 }
    }),
    
    shared: () => notifyPlaylistChange({
      type: "shared",
      playlistId: "demo-playlist-3",
      playlistName: "Road Trip Mix",
      data: { sharedBy: "Alex Johnson" }
    }),
    
    deleted: () => notifyPlaylistChange({
      type: "deleted",
      playlistId: "demo-playlist-4",
      playlistName: "Old Favorites"
    }),
    
    newMusic: () => notifyPlaylistChange({
      type: "new_music",
      playlistId: "demo-playlist-5",
      playlistName: "New Releases",
      data: { artistName: "The Weekend", songTitle: "Blinding Lights" }
    })
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Playlist Notifications
        </CardTitle>
        <CardDescription>
          Get notified when playlists are created, updated, shared, or when new music is added.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Permission Status */}
        {permissionStatus !== "granted" && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellOff className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Notifications permission {permissionStatus === "denied" ? "denied" : "not granted"}
                </span>
              </div>
              {permissionStatus === "default" && (
                <Button size="sm" onClick={handleRequestPermission}>
                  Enable
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="playlist-notifications" className="text-sm font-medium">
            Enable playlist notifications
          </Label>
          <Switch
            id="playlist-notifications"
            checked={isPlaylistNotificationsEnabled}
            onCheckedChange={handleToggleNotifications}
            disabled={permissionStatus !== "granted"}
          />
        </div>

        {/* Notification Types */}
        {isPlaylistNotificationsEnabled && permissionStatus === "granted" && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Notification Types</h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Plus className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">Playlist Created</div>
                    <div className="text-xs text-gray-500">When new playlists are created</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={testNotifications.created}>
                  Test
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <PlayCircle className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium">Playlist Updated</div>
                    <div className="text-xs text-gray-500">When songs are added or removed</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={testNotifications.updated}>
                  Test
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Share2 className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="text-sm font-medium">Playlist Shared</div>
                    <div className="text-xs text-gray-500">When someone shares a playlist with you</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={testNotifications.shared}>
                  Test
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <div>
                    <div className="text-sm font-medium">Playlist Deleted</div>
                    <div className="text-xs text-gray-500">When playlists are deleted (with undo option)</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={testNotifications.deleted}>
                  Test
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="text-sm font-medium">New Music Added</div>
                    <div className="text-xs text-gray-500">When new songs are added to your library</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={testNotifications.newMusic}>
                  Test
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Notifications work even when the app is closed</p>
          <p>• Click notifications to open relevant playlists</p>
          <p>• Some notifications include action buttons (undo, add to library, etc.)</p>
          <p>• Notifications respect your battery saver settings</p>
        </div>
      </CardContent>
    </Card>
  );
}