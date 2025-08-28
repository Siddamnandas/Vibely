"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { useAppleMusicAuth } from "@/hooks/use-apple-music-auth";

export default function AuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Completing authentication...");

  const { handleAuthCallback: handleSpotifyCallback } = useSpotifyAuth();
  const { handleAuthCallback: handleAppleMusicCallback } = useAppleMusicAuth();

  useEffect(() => {
    const handleAuth = async () => {
      const provider = searchParams.get("provider");
      const code = searchParams.get("code");

      if (!provider || !code) {
        setStatus("error");
        setMessage("Missing authentication parameters");
        return;
      }

      try {
        let success = false;

        if (provider === "spotify") {
          success = await handleSpotifyCallback(code);
        } else if (provider === "apple-music") {
          success = await handleAppleMusicCallback(code);
        } else {
          throw new Error("Unsupported provider");
        }

        if (success) {
          setStatus("success");
          setMessage(
            `Successfully connected to ${provider === "spotify" ? "Spotify" : "Apple Music"}!`,
          );

          // Redirect to app after delay
          setTimeout(() => {
            router.push("/");
          }, 2000);
        } else {
          throw new Error("Authentication failed");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Authentication failed");
      }
    };

    handleAuth();
  }, [searchParams, handleSpotifyCallback, handleAppleMusicCallback, router]);

  return (
    <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mb-8">
          {status === "processing" && (
            <Loader2 className="w-16 h-16 mx-auto text-[#9FFFA2] animate-spin mb-4" />
          )}
          {status === "success" && (
            <div className="w-16 h-16 mx-auto bg-[#9FFFA2]/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-[#9FFFA2]" />
            </div>
          )}
          {status === "error" && (
            <div className="w-16 h-16 mx-auto bg-[#FF6F91]/20 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-[#FF6F91]" />
            </div>
          )}

          <h1 className="text-3xl font-black text-white mb-2">
            {status === "processing" && "Connecting..."}
            {status === "success" && "Connected!"}
            {status === "error" && "Connection Failed"}
          </h1>

          <p className="text-white/70 text-lg">{message}</p>
        </div>

        {status === "error" && (
          <Button
            onClick={() => router.push("/")}
            className="bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold hover:opacity-90 rounded-full px-8"
          >
            Return to App
          </Button>
        )}

        {status === "success" && (
          <p className="text-white/50 text-sm">Redirecting you to the app...</p>
        )}
      </div>
    </div>
  );
}
