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
  hashtags?: string[];
  storyTemplate?: "square" | "story" | "post";
  autoHashtags?: boolean;
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
          return await this.shareToInstagramStories(image, data, options);
        } else {
          return await this.shareToInstagramFeed(image, data, options);
        }
      } catch (error) {
        console.warn("Native Instagram sharing failed, falling back to web:", error);
      }
    }

    // Fallback to web sharing or copy link
    return await this.shareGeneric(data, options);
  }

  /**
   * Share to Instagram Stories using app schemes with enhanced features
   */
  private async shareToInstagramStories(
    image: Blob,
    data: ShareData,
    options: ShareOptions = {},
  ): Promise<boolean> {
    // Generate hashtags for Instagram
    const hashtags = options.hashtags || this.generateAutoHashtags(data.title, data.text);
    const hashtagText = hashtags
      .slice(0, 5)
      .map((tag) => `#${tag}`)
      .join(" "); // Instagram Stories limit
    const enhancedText = `${data.text} ${hashtagText} \n\nMade with Vibely ✨`;

    if (this.canUseWebShare() && navigator.share) {
      const files = [new File([image], "cover.jpg", { type: "image/jpeg" })];

      try {
        await navigator.share({
          title: data.title,
          text: enhancedText,
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

        // Instagram Stories URL scheme with enhanced parameters
        const instagramUrl = `instagram-stories://share?media=${encodeURIComponent(dataUrl)}&text=${encodeURIComponent(enhancedText)}`;

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
    this.downloadImage(image, `${data.title}-story.jpg`);

    // Copy the enhanced text to clipboard for easy pasting
    await this.copyToClipboard(enhancedText);

    this.showShareInstructions("instagram-stories", data);

    this.showNotification("Caption with hashtags copied to clipboard! 📋", 5000);

    return true;
  }

  /**
   * Share to Instagram Feed
   */
  private async shareToInstagramFeed(
    image: Blob,
    data: ShareData,
    options: ShareOptions = {},
  ): Promise<boolean> {
    // Generate hashtags for Instagram
    const hashtags = options.hashtags || this.generateAutoHashtags(data.title, data.text);
    const hashtagText = hashtags
      .slice(0, 10)
      .map((tag) => `#${tag}`)
      .join(" "); // Instagram allows more hashtags in posts
    const enhancedText = `${data.text}\n\n${hashtagText}\n\nGenerated with Vibely ✨`;

    if (this.canUseWebShare() && navigator.share) {
      const files = [new File([image], "cover.jpg", { type: "image/jpeg" })];

      try {
        await navigator.share({
          title: data.title,
          text: enhancedText,
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
    this.downloadImage(image, `${data.title}-post.jpg`);

    // Copy the enhanced text to clipboard
    await this.copyToClipboard(enhancedText);

    this.showShareInstructions("instagram", data);

    this.showNotification("Caption with hashtags copied to clipboard! 📋", 5000);

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
   * Share to TikTok with enhanced features
   */
  private async shareToTikTok(data: ShareData, options: ShareOptions): Promise<boolean> {
    // Generate hashtags if not provided
    const hashtags = options.hashtags || this.generateAutoHashtags(data.title, data.text);
    const hashtagText = hashtags.map((tag) => `#${tag}`).join(" ");

    // Create TikTok-optimized content
    const tiktokText = `🎵 ${data.text} ${hashtagText} \n\nGenerated with Vibely ✨`;

    // If we have an image, try TikTok's direct sharing (mobile)
    if (this.isMobile() && (options.imageBlob || options.imageUrl)) {
      try {
        // TikTok app scheme for video creation with image
        const tiktokUrl = `tiktok://camera`;
        const opened = window.open(tiktokUrl, "_blank");

        if (opened) {
          // Also download the image for manual upload
          if (options.imageBlob) {
            this.downloadImage(options.imageBlob, `${data.title}-tiktok-cover.jpg`);
          } else if (options.imageUrl) {
            const blob = await this.urlToBlob(options.imageUrl);
            this.downloadImage(blob, `${data.title}-tiktok-cover.jpg`);
          }

          // Copy the optimized text
          await this.copyToClipboard(tiktokText);

          this.trackShareEvent("share_completed", {
            platform: "tiktok",
            method: "app_scheme_with_image",
          });

          this.showNotification(
            "🎬 TikTok opened! Cover image downloaded and caption copied. Create your video and add the image!",
            10000,
          );
          return true;
        }
      } catch (error) {
        console.warn("TikTok app scheme failed:", error);
      }
    }

    // Fallback: copy optimized content and download image
    await this.copyToClipboard(tiktokText);

    // Download image if available
    if (options.imageBlob) {
      this.downloadImage(options.imageBlob, `${data.title}-tiktok-cover.jpg`);
    } else if (options.imageUrl) {
      try {
        const blob = await this.urlToBlob(options.imageUrl);
        this.downloadImage(blob, `${data.title}-tiktok-cover.jpg`);
      } catch (error) {
        console.warn("Failed to download image for TikTok:", error);
      }
    }

    this.showShareInstructions("tiktok", data);

    this.trackShareEvent("share_completed", {
      platform: "tiktok",
      method: "copy_with_image",
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
        return "📱 Story-ready image downloaded! Open Instagram, create a story, and add the downloaded image. Perfect for 9:16 aspect ratio! ✨";
      case "instagram":
        return "📱 Image downloaded! Open Instagram, create a post, and add the downloaded image. Don't forget to use the suggested hashtags! 🎵";
      case "tiktok":
        return "📱 Ready for TikTok! Image downloaded and link copied. Create a video and use the image as your cover. Paste the link in your bio! 🎬";
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
   * Generate automatic hashtags based on song title and artist
   */
  private generateAutoHashtags(title: string, text: string): string[] {
    const baseHashtags = ["Vibely", "AIArt", "MusicCover", "AlbumArt", "PersonalizedMusic"];

    // Extract potential genre/mood keywords from title and text
    const keywords = `${title} ${text}`.toLowerCase();
    const genreHashtags: string[] = [];

    // Genre detection
    if (keywords.includes("indie") || keywords.includes("alternative"))
      genreHashtags.push("Indie", "Alternative");
    if (keywords.includes("pop")) genreHashtags.push("Pop", "PopMusic");
    if (keywords.includes("rock")) genreHashtags.push("Rock", "RockMusic");
    if (keywords.includes("hip hop") || keywords.includes("rap"))
      genreHashtags.push("HipHop", "Rap");
    if (keywords.includes("electronic") || keywords.includes("edm"))
      genreHashtags.push("Electronic", "EDM");
    if (keywords.includes("jazz")) genreHashtags.push("Jazz", "JazzMusic");
    if (keywords.includes("classical")) genreHashtags.push("Classical", "ClassicalMusic");
    if (keywords.includes("country")) genreHashtags.push("Country", "CountryMusic");
    if (keywords.includes("folk")) genreHashtags.push("Folk", "FolkMusic");
    if (keywords.includes("r&b") || keywords.includes("soul")) genreHashtags.push("RnB", "Soul");

    // Mood detection
    if (keywords.includes("chill") || keywords.includes("calm"))
      genreHashtags.push("Chill", "ChillVibes");
    if (keywords.includes("workout") || keywords.includes("gym"))
      genreHashtags.push("Workout", "GymMusic");
    if (keywords.includes("party") || keywords.includes("dance"))
      genreHashtags.push("Party", "DanceMusic");
    if (keywords.includes("sad") || keywords.includes("melancholy"))
      genreHashtags.push("Melancholy", "EmotionalMusic");
    if (keywords.includes("happy") || keywords.includes("upbeat"))
      genreHashtags.push("Happy", "UpbeatMusic");
    if (keywords.includes("romantic") || keywords.includes("love"))
      genreHashtags.push("Romantic", "LoveMusic");
    if (keywords.includes("night") || keywords.includes("midnight"))
      genreHashtags.push("NightVibes", "MidnightMusic");
    if (keywords.includes("summer")) genreHashtags.push("Summer", "SummerVibes");
    if (keywords.includes("winter")) genreHashtags.push("Winter", "WinterVibes");

    // Time-based hashtags
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) genreHashtags.push("MorningMusic");
    else if (hour >= 12 && hour < 17) genreHashtags.push("AfternoonVibes");
    else if (hour >= 17 && hour < 22) genreHashtags.push("EveningMusic");
    else genreHashtags.push("LateNightVibes");

    // Combine and limit hashtags
    const allHashtags = [...baseHashtags, ...genreHashtags];
    return [...new Set(allHashtags)]; // Remove duplicates
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

export async function shareToTikTok(
  title: string,
  imageUrl: string,
  text: string,
  trackId?: string,
  hashtags?: string[],
): Promise<boolean> {
  return sharingService.share(
    {
      title,
      text,
      url: window.location.href,
    },
    {
      platform: "tiktok",
      imageUrl,
      trackId,
      hashtags,
      autoHashtags: !hashtags, // Auto-generate if no hashtags provided
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
