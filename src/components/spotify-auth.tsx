'use client';

import { useSpotifyAuth } from '@/hooks/use-spotify-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, LogOut, User, Loader2 } from 'lucide-react';
import Image from 'next/image';

export function SpotifyAuth() {
  const { isAuthenticated, isLoading, userProfile, login, logout } = useSpotifyAuth();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-green-500/10 to-green-400/10 border-green-500/20">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-green-400" />
            <p className="text-white/70">Checking Spotify connection...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="bg-gradient-to-br from-green-500/10 to-green-400/10 border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <Music className="w-6 h-6 text-green-400" />
            Connect to Spotify
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70 mb-6">
            Connect your Spotify account to access your playlists, top tracks, and personalized music data for cover generation.
          </p>
          <Button 
            onClick={login}
            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 rounded-full"
          >
            <Music className="w-5 h-5 mr-2" />
            Connect Spotify Account
          </Button>
          <p className="text-xs text-white/50 mt-3 text-center">
            We'll redirect you to Spotify to authorize access
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-500/10 to-green-400/10 border-green-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-[#1DB954] rounded-full flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          Spotify Connected
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          {userProfile?.images?.[0]?.url ? (
            <Image
              src={userProfile.images[0].url}
              alt="Profile"
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white/70" />
            </div>
          )}
          <div>
            <p className="text-white font-semibold">
              {userProfile?.display_name || 'Spotify User'}
            </p>
            <p className="text-white/60 text-sm">Account connected</p>
          </div>
        </div>
        
        <Button 
          onClick={logout}
          variant="outline"
          className="w-full border-white/20 text-white hover:bg-white/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect Spotify
        </Button>
      </CardContent>
    </Card>
  );
}