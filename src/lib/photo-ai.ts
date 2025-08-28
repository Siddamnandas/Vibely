export type PhotoMood = 'happy' | 'sad' | 'energetic' | 'chill';
export type PhotoAnalysis = {
  mood: PhotoMood;
  confidence: number;
  dominantColors: string[];
  brightness: number;
  contrast: number;
  faces: number;
  emotions?: {
    joy: number;
    calm: number;
    energy: number;
    melancholy: number;
  };
};

export interface PhotoMatchScore {
  photoId: string;
  photoUrl: string;
  matchScore: number;
  analysis: PhotoAnalysis;
  reasons: string[];
}

class PhotoAIService {
  
  /**
   * Analyze photo for mood, colors, and emotional content
   * In production, this would use computer vision APIs like Google Vision, AWS Rekognition, etc.
   */
  async analyzePhoto(imageUrl: string): Promise<PhotoAnalysis> {
    return new Promise((resolve) => {
      // Simulate AI processing time
      setTimeout(() => {
        // Mock analysis based on image URL patterns
        const analysis = this.generateMockAnalysis(imageUrl);
        resolve(analysis);
      }, 800 + Math.random() * 1200); // Random delay 0.8-2s
    });
  }

  /**
   * Analyze multiple photos in batch
   */
  async analyzePhotos(imageUrls: string[]): Promise<PhotoAnalysis[]> {
    const promises = imageUrls.map(url => this.analyzePhoto(url));
    return Promise.all(promises);
  }

  /**
   * Match photos to song mood and audio features
   */
  async matchPhotosToSong(
    photos: Array<{ id: string; url: string }>,
    songMood: PhotoMood,
    audioFeatures?: { valence: number; energy: number; tempo: number }
  ): Promise<PhotoMatchScore[]> {
    
    const analyses = await this.analyzePhotos(photos.map(p => p.url));
    
    const matches: PhotoMatchScore[] = photos.map((photo, index) => {
      const analysis = analyses[index];
      const matchScore = this.calculateMatchScore(analysis, songMood, audioFeatures);
      const reasons = this.generateMatchReasons(analysis, songMood, matchScore);
      
      return {
        photoId: photo.id,
        photoUrl: photo.url,
        matchScore,
        analysis,
        reasons
      };
    });

    // Sort by match score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Get the best photo match for a song
   */
  async getBestPhotoMatch(
    photos: Array<{ id: string; url: string }>,
    songMood: PhotoMood,
    audioFeatures?: { valence: number; energy: number; tempo: number }
  ): Promise<PhotoMatchScore | null> {
    const matches = await this.matchPhotosToSong(photos, songMood, audioFeatures);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Calculate how well a photo matches a song's mood and features
   */
  private calculateMatchScore(
    analysis: PhotoAnalysis,
    songMood: PhotoMood,
    audioFeatures?: { valence: number; energy: number; tempo: number }
  ): number {
    let score = 0;

    // Base mood matching (40% weight)
    const moodScore = this.getMoodMatchScore(analysis.mood, songMood);
    score += moodScore * 0.4;

    // Audio features matching if available (30% weight)
    if (audioFeatures) {
      const audioScore = this.getAudioFeatureMatchScore(analysis, audioFeatures);
      score += audioScore * 0.3;
    } else {
      // If no audio features, give more weight to mood
      score += moodScore * 0.3;
    }

    // Visual quality factors (30% weight)
    const visualScore = this.getVisualQualityScore(analysis);
    score += visualScore * 0.3;

    return Math.min(100, Math.max(0, score));
  }

  private getMoodMatchScore(photoMood: PhotoMood, songMood: PhotoMood): number {
    if (photoMood === songMood) return 100;
    
    // Cross-mood compatibility matrix
    const compatibility: Record<PhotoMood, Record<PhotoMood, number>> = {
      happy: { happy: 100, energetic: 80, chill: 60, sad: 20 },
      sad: { sad: 100, chill: 70, energetic: 30, happy: 20 },
      energetic: { energetic: 100, happy: 80, chill: 50, sad: 30 },
      chill: { chill: 100, sad: 70, happy: 60, energetic: 50 }
    };

    return compatibility[photoMood][songMood] || 40;
  }

  private getAudioFeatureMatchScore(
    analysis: PhotoAnalysis,
    audioFeatures: { valence: number; energy: number; tempo: number }
  ): number {
    let score = 0;

    // Valence (positivity) matching
    if (audioFeatures.valence > 0.6 && analysis.brightness > 0.7) score += 25;
    if (audioFeatures.valence < 0.4 && analysis.brightness < 0.5) score += 25;

    // Energy matching
    if (audioFeatures.energy > 0.7 && analysis.contrast > 0.6) score += 25;
    if (audioFeatures.energy < 0.4 && analysis.contrast < 0.5) score += 25;

    // Tempo matching with visual dynamics
    if (audioFeatures.tempo > 120 && analysis.emotions?.energy && analysis.emotions.energy > 0.6) score += 25;
    if (audioFeatures.tempo < 90 && analysis.emotions?.calm && analysis.emotions.calm > 0.6) score += 25;

    return score;
  }

  private getVisualQualityScore(analysis: PhotoAnalysis): number {
    let score = 50; // Base score

    // Prefer photos with faces
    if (analysis.faces > 0) score += 20;

    // Good brightness range
    if (analysis.brightness >= 0.3 && analysis.brightness <= 0.8) score += 15;

    // Good contrast
    if (analysis.contrast >= 0.4 && analysis.contrast <= 0.8) score += 15;

    return Math.min(100, score);
  }

  private generateMatchReasons(
    analysis: PhotoAnalysis,
    songMood: PhotoMood,
    matchScore: number
  ): string[] {
    const reasons: string[] = [];

    if (analysis.mood === songMood) {
      reasons.push(`Perfect mood match: ${songMood}`);
    } else {
      reasons.push(`Complementary mood: ${analysis.mood} works with ${songMood}`);
    }

    if (analysis.faces > 0) {
      reasons.push(`Contains ${analysis.faces} face${analysis.faces > 1 ? 's' : ''}`);
    }

    if (analysis.brightness > 0.7) {
      reasons.push('Bright and vibrant');
    } else if (analysis.brightness < 0.3) {
      reasons.push('Moody and atmospheric');
    }

    if (matchScore > 80) {
      reasons.push('Excellent overall match');
    } else if (matchScore > 60) {
      reasons.push('Good visual harmony');
    }

    return reasons;
  }

  /**
   * Generate mock analysis based on image characteristics
   * In production, this would be replaced with real AI analysis
   */
  private generateMockAnalysis(imageUrl: string): PhotoAnalysis {
    // Simple heuristics based on URL patterns and random generation
    const urlLower = imageUrl.toLowerCase();
    
    let mood: PhotoMood = 'chill';
    let emotions = {
      joy: 0.3,
      calm: 0.5,
      energy: 0.4,
      melancholy: 0.3
    };

    // Detect mood from URL patterns (Unsplash/Picsum often have descriptive IDs)
    if (urlLower.includes('happy') || urlLower.includes('joy') || urlLower.includes('smile')) {
      mood = 'happy';
      emotions = { joy: 0.8, calm: 0.4, energy: 0.6, melancholy: 0.1 };
    } else if (urlLower.includes('sad') || urlLower.includes('dark') || urlLower.includes('rain')) {
      mood = 'sad';
      emotions = { joy: 0.2, calm: 0.3, energy: 0.2, melancholy: 0.8 };
    } else if (urlLower.includes('energy') || urlLower.includes('sport') || urlLower.includes('dance')) {
      mood = 'energetic';
      emotions = { joy: 0.7, calm: 0.2, energy: 0.9, melancholy: 0.1 };
    }

    // Random variations to simulate real AI analysis
    const brightness = 0.3 + Math.random() * 0.5;
    const contrast = 0.4 + Math.random() * 0.4;
    const faces = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;

    // Generate dominant colors based on mood
    const colorPalettes = {
      happy: ['#FFD36E', '#9FFFA2', '#8FD3FF'],
      sad: ['#6B73FF', '#9AA0F7', '#444444'],
      energetic: ['#FF6F91', '#9FFFA2', '#FF0080'],
      chill: ['#8FD3FF', '#BAFFC9', '#E1BEE7']
    };

    const dominantColors = colorPalettes[mood].slice(0, 2 + Math.floor(Math.random() * 2));

    return {
      mood,
      confidence: 0.7 + Math.random() * 0.3, // 70-100%
      dominantColors,
      brightness,
      contrast,
      faces,
      emotions
    };
  }
}

// Export singleton instance
export const photoAI = new PhotoAIService();

// Utility functions
export const getMoodColor = (mood: PhotoMood): string => {
  const colors = {
    happy: '#FFD36E',
    sad: '#6B73FF', 
    energetic: '#FF6F91',
    chill: '#8FD3FF'
  };
  return colors[mood];
};

export const getMoodIcon = (mood: PhotoMood): string => {
  const icons = {
    happy: '😊',
    sad: '😢',
    energetic: '⚡',
    chill: '😌'
  };
  return icons[mood];
};