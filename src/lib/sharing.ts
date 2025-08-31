interface ShareData {
  title: string;
  text: string;
  url: string;
  files?: File[];
}

interface ShareOptions {
  platform?: "instagram" | "instagram-stories" | "twitter" | "facebook" | "tiktok" | "generic";
  imageUrl?: string;
  imageBlob?: Blob;
  trackId?: string;
  coverUrl?: string;
}

export class SharingService {
  private static instance: SharingService;

  static getInstance(): SharingService {
    if (!SharingService.instance) {
      SharingService.instance = new SharingService();
    }
    return SharingService.instance;
  }

  /**
   * Build share URL for specific platform (used in tests)
   */
  generateShareUrl(platform: string, data: { url: string; text?: string; title?: string }): string {
    switch (platform) {
      case "facebook": {
        const u = new URL("https://www.facebook.com/sharer/sharer.php");
        u.searchParams.set("u", data.url);
        if (data.title) u.searchParams.set("t", data.title);
        return u.toString();
      }
      case "twitter": {
        const u = new URL("https://twitter.com/intent/tweet");
        if (data.text) u.searchParams.set("text", data.text);
        u.searchParams.set("url", data.url);
        return u.toString();
      }
      default:
        return data.url;
    }
  }

  /**
   * Validate share data (used in tests)
   */
  validateShareData(data: Partial<ShareData>): boolean {
    return typeof data?.title === "string" && typeof data?.url === "string";
  }

  /**
   * Share content using the most appropriate method for the platform/device
   */
  async share(data: ShareData, options: ShareOptions = {}): Promise<boolean> {
    const { platform = "generic" } = options;

    try {
      // Track sharing intent
      this.trackShareEvent("share_initiated", {
        platform,
        content_type: "album_cover",
        track_id: options.trackId,
      });

      // Handle platform-specific sharing
      switch (platform) {
        case "instagram":
        case "instagram-stories":
          return await this.shareToInstagram(data, options);
        case "twitter":
          return await this.shareToTwitter(data, options);
        case "facebook":
          return await this.shareToFacebook(data, options);
        case "tiktok":
          return await this.shareToTikTok(data, options);
        default:
          return await this.shareGeneric(data, options);
      }
    } catch (error) {
      console.error("Sharing failed:", error);
      this.trackShareEvent("share_failed", {
        platform,
        error: error instanceof Error ? error.message : "Unknown error",
        track_id: options.trackId,
      });
      return false;
    }
  }

  /**
   * Share to Instagram (including Stories)
   */
  private async shareToInstagram(data: ShareData, options: ShareOptions): Promise<boolean> {
    if (!options.imageBlob && !options.imageUrl) {
      throw new Error("Instagram sharing requires an image");
    }

    // Try Instagram app scheme first (mobile)
    if (this.isMobile()) {
      try {
        const image = options.imageBlob || (await this.urlToBlob(options.imageUrl!));

        if (options.platform === "instagram-stories") {
          return await this.shareToInstagramStories(image, data);
        } else {
          return await this.shareToInstagramFeed(image, data);
        }
      } catch (error) {
        console.warn("Native Instagram sharing failed, falling back to web:", error);
      }
    }

    // Fallback to web sharing or copy link
    return await this.shareGeneric(data, options);
  }

  /**
   * Share to Instagram Stories using app schemes
   */
  private async shareToInstagramStories(image: Blob, data: ShareData): Promise<boolean> {
    if (this.canUseWebShare() && navigator.share) {
      const files = [new File([image], "cover.jpg", { type: "image/jpeg" })];

      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          files,
        });

        this.trackShareEvent("share_completed", {
          platform: "instagram-stories",
          method: "web_share_api",
        });
        return true;
      } catch (error) {
        // User cancelled or API not supported
        console.warn("Web Share API failed:", error);
      }
    }

    // Try URL scheme (mobile apps)
    if (this.isMobile()) {
      try {
        // Convert blob to data URL for app schemes
        const dataUrl = await this.blobToDataUrl(image);

        // Instagram Stories URL scheme
        const instagramUrl = `instagram-stories://share?media=${encodeURIComponent(dataUrl)}&text=${encodeURIComponent(data.text)}`;

        // Attempt to open Instagram app in new window/tab first for tests and desktop
        const opened = window.open(instagramUrl, "_blank");
        if (!opened) {
          // Fallback to same-window navigation
          window.location.href = instagramUrl;
        }

        // Track success (we can't really know if it worked)
        this.trackShareEvent("share_completed", {
          platform: "instagram-stories",
          method: "url_scheme",
        });
        return true;
      } catch (error) {
        console.warn("Instagram URL scheme failed:", error);
      }
    }

    // Final fallback: download image and show instructions
    this.downloadImage(image, `${data.title}.jpg`);
    this.showShareInstructions("instagram-stories", data);
    return true;
  }

  /**
   * Share to Instagram Feed
   */
  private async shareToInstagramFeed(image: Blob, data: ShareData): Promise<boolean> {
    if (this.canUseWebShare() && navigator.share) {
      const files = [new File([image], "cover.jpg", { type: "image/jpeg" })];

      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          files,
        });

        this.trackShareEvent("share_completed", {
          platform: "instagram",
          method: "web_share_api",
        });
        return true;
      } catch (error) {
        console.warn("Web Share API failed:", error);
      }
    }

    // Fallback: download and show instructions
    this.downloadImage(image, `${data.title}.jpg`);
    this.showShareInstructions("instagram", data);
    return true;
  }

  /**
   * Share to Twitter
   */
  private async shareToTwitter(data: ShareData, options: ShareOptions): Promise<boolean> {
    const tweetText = `${data.text}`;
    const tweetUrl = data.url;

    // Build Twitter intent URL
    const twitterUrl = new URL("https://twitter.com/intent/tweet");
    twitterUrl.searchParams.append("text", tweetText);
    if (tweetUrl) {
      twitterUrl.searchParams.append("url", tweetUrl);
    }

    // Open Twitter in new window
    const popup = window.open(
      twitterUrl.toString(),
      "twitter-share",
      "width=550,height=420,scrollbars=yes,resizable=yes",
    );

    if (popup) {
      this.trackShareEvent("share_completed", {
        platform: "twitter",
        method: "web_intent",
      });
      return true;
    }

    return false;
  }

  /**
   * Share to Facebook
   */
  private async shareToFacebook(data: ShareData, options: ShareOptions): Promise<boolean> {
    // Build Facebook share URL
    const facebookUrl = new URL("https://www.facebook.com/sharer/sharer.php");
    facebookUrl.searchParams.append("u", data.url);
    facebookUrl.searchParams.append("t", data.title);

    // Open Facebook in new window
    const popup = window.open(
      facebookUrl.toString(),
      "facebook-share",
      "width=626,height=436,scrollbars=yes,resizable=yes",
    );

    if (popup) {
      this.trackShareEvent("share_completed", {
        platform: "facebook",
        method: "web_intent",
      });
      return true;
    }

    return false;
  }

  /**
   * Share to TikTok
   */
  private async shareToTikTok(data: ShareData, options: ShareOptions): Promise<boolean> {
    // TikTok doesn't have a direct web share API, so we copy the link
    await this.copyToClipboard(data.url);
    this.showShareInstructions("tiktok", data);

    this.trackShareEvent("share_completed", {
      platform: "tiktok",
      method: "copy_link",
    });

    return true;
  }

  /**
   * Generic sharing using Web Share API or fallbacks
   */
  private async shareGeneric(data: ShareData, options: ShareOptions): Promise<boolean> {
    // Try Web Share API first
    if (this.canUseWebShare()) {
      try {
        const shareData: any = {
          title: data.title,
          text: data.text,
          url: data.url,
        };

        // Add files if available and supported
        if (data.files && this.canShareFiles()) {
          shareData.files = data.files;
        }

        await navigator.share(shareData);

        this.trackShareEvent("share_completed", {
          platform: "generic",
          method: "web_share_api",
        });
        return true;
      } catch (error) {
        // User cancelled or error occurred
        console.warn("Web Share API failed:", error);
      }
    }

    // Fallback to copying URL
    await this.copyToClipboard(data.url);
    this.showNotification("Link copied to clipboard! Share it anywhere you like.");

    this.trackShareEvent("share_completed", {
      platform: "generic",
      method: "copy_link",
    });

    return true;
  }

  /**
   * Download an image file
   */
  private downloadImage(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Show platform-specific sharing instructions
   */
  private showShareInstructions(platform: string, data: ShareData): void {
    const instructions = this.getShareInstructions(platform);
    this.showNotification(instructions, 8000); // Show for 8 seconds
  }

  private getShareInstructions(platform: string): string {
    switch (platform) {
      case "instagram-stories":
        return "📱 Image downloaded! Open Instagram, create a story, and add the downloaded image.";
      case "instagram":
        return "📱 Image downloaded! Open Instagram, create a post, and add the downloaded image.";
      case "tiktok":
        return "📱 Link copied! Open TikTok, create a video, and paste the link in your bio or description.";
      default:
        return "📋 Link copied to clipboard! Share it on your favorite platform.";
    }
  }

  /**
   * Copy text to clipboard
   */
  private async copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }

  /**
   * Convert URL to Blob
   */
  private async urlToBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    return await response.blob();
  }

  /**
   * Convert Blob to Data URL
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Check if Web Share API is available
   */
  private canUseWebShare(): boolean {
    return typeof navigator !== "undefined" && "share" in navigator;
  }

  /**
   * Check if Web Share API supports files
   */
  private canShareFiles(): boolean {
    return this.canUseWebShare() && navigator.canShare && navigator.canShare({ files: [] });
  }

  /**
   * Check if device is mobile
   */
  private isMobile(): boolean {
    return (
      typeof window !== "undefined" &&
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }

  /**
   * Show notification to user
   */
  private showNotification(message: string, duration: number = 3000): void {
    // Use your app's toast/notification system
    if (typeof window !== "undefined") {
      // For now, use a simple alert - replace with your toast system
      const event = new CustomEvent("show-toast", {
        detail: { message, duration },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Track sharing events
   */
  private trackShareEvent(event: string, properties: Record<string, any>): void {
    // Use your analytics service
    if (typeof window !== "undefined") {
      const trackingEvent = new CustomEvent("analytics-track", {
        detail: { event, properties },
      });
      window.dispatchEvent(trackingEvent);
    }
  }
}

// Create singleton instance
export const sharingService = SharingService.getInstance();

// Convenience functions
export async function shareToInstagramStories(
  title: string,
  imageUrl: string,
  text: string,
  trackId?: string,
): Promise<boolean> {
  return sharingService.share(
    {
      title,
      text,
      url: window.location.href,
    },
    {
      platform: "instagram-stories",
      imageUrl,
      trackId,
    },
  );
}

export async function shareGeneric(title: string, text: string, url?: string): Promise<boolean> {
  return sharingService.share({
    title,
    text,
    url: url || window.location.href,
  });
}

export async function shareWithImage(
  title: string,
  text: string,
  imageBlob: Blob,
  platform?: ShareOptions["platform"],
): Promise<boolean> {
  const files = [new File([imageBlob], "cover.jpg", { type: "image/jpeg" })];

  return sharingService.share(
    {
      title,
      text,
      url: window.location.href,
      files,
    },
    {
      platform,
      imageBlob,
    },
  );
}
