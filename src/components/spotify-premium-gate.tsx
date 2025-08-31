"use client";

import { useEffect, useState } from "react";
import { usePlayback } from "@/context/playback-context";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function SpotifyPremiumGate() {
  const { isSpotifyPremium, isSpotifyReady } = usePlayback();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show the gate if Spotify is ready but user is not Premium
    setIsVisible(isSpotifyReady && !isSpotifyPremium);
  }, [isSpotifyReady, isSpotifyPremium]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0E0F12] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Spotify Premium Required</h2>
          <p className="text-white/70 mb-6">
            Vibely requires Spotify Premium to play full tracks. Upgrade to Premium to enjoy
            unlimited skips, no ads, and the best audio quality.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                window.open("https://www.spotify.com/premium/", "_blank");
              }}
              className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-white hover:opacity-90 rounded-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Close the gate but continue with limited functionality
                setIsVisible(false);
              }}
              className="border-white/20 text-white hover:bg-white/10 rounded-full"
            >
              Continue with Limited Features
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
