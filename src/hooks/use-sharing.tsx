'use client';

import { useState } from 'react';
import { sharingService } from '@/lib/sharing';
import { useToast } from '@/hooks/use-toast';

export function useSharing() {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const shareTrack = async (
    title: string,
    artist: string,
    coverUrl?: string,
    platform?: string
  ) => {
    setIsSharing(true);
    
    try {
      const text = `Check out "${title}" by ${artist}! 🎵`;
      const success = await sharingService.share(
        { title, text, url: window.location.href },
        { platform: platform as any, imageUrl: coverUrl }
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