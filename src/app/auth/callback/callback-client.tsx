"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { AuthSkeleton } from "@/components/ui/skeleton";

export default function SpotifyCallbackClient({ code, error }: { code?: string | null; error?: string | null }) {
  const router = useRouter();
  const { handleAuthCallback } = useSpotifyAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Authenticating with Spotify...");

  useEffect(() => {
    if (error) {
      setStatus("error");
      setMessage(`Authentication failed: ${error}`);
      setTimeout(() => router.push("/"), 3000);
      return;
    }

    if (code) {
      handleAuthCallback(code)
        .then(() => {
          setStatus("success");
          setMessage("Successfully authenticated! Redirecting...");
          setTimeout(() => router.push("/"), 2000);
        })
        .catch(() => {
          setStatus("error");
          setMessage("Authentication failed. Please try again.");
          setTimeout(() => router.push("/"), 3000);
        });
    } else {
      setStatus("error");
      setMessage("No authentication code received.");
      setTimeout(() => router.push("/"), 3000);
    }
  }, [code, error, handleAuthCallback, router]);

  if (status === "loading") {
    return <AuthSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mb-6">
          {status === "success" && <CheckCircle className="w-16 h-16 mx-auto text-[#9FFFA2]" />}
          {status === "error" && <XCircle className="w-16 h-16 mx-auto text-[#FF6F91]" />}
        </div>

        <h1 className="text-2xl font-black text-white mb-4">
          {status === "success" && "Authentication Successful!"}
          {status === "error" && "Authentication Failed"}
        </h1>

        <p className="text-white/70 text-lg">{message}</p>

        {status === "error" && (
          <button
            onClick={() => router.push("/")}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            Return Home
          </button>
        )}
      </div>
    </div>
  );
}

