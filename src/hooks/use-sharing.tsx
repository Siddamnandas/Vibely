"use client";

import { useState } from "react";
import { SharingService } from "@/lib/sharing";
import { useToast } from "@/hooks/use-toast";

const sharingService = SharingService.getInstance();

export function useSharing() {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const shareTrack = async (
    title: string,
    artist: string,
    coverUrl?: string,
    platform?: string,
    options?: { hashtags?: string[]; autoHashtags?: boolean },
  ) => {
    setIsSharing(true);

    try {
      const text = `Check out "${title}" by ${artist}! 🎵`;
      const success = await sharingService.share(
        { title, text, url: window.location.href },
        {
          platform: platform as any,
          imageUrl: coverUrl,
          hashtags: options?.hashtags,
          autoHashtags: options?.autoHashtags,
        },
      );

      if (!success) {
        toast({ variant: "destructive", title: "Share failed" });
      }

      return success;
    } catch (error) {
      toast({ variant: "destructive", title: "Share failed" });
      return false;
    } finally {
      setIsSharing(false);
    }
  };

  return { isSharing, shareTrack };
}
