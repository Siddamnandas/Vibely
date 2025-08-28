import { VibelyTrack } from './data';

export interface CoverTemplate {
  id: string;
  name: string;
  style: 'classic' | 'modern' | 'minimalist' | 'vintage' | 'neon';
  layout: {
    titlePosition: { x: number; y: number };
    artistPosition: { x: number; y: number };
    imageArea: { x: number; y: number; width: number; height: number };
  };
  textStyles: {
    titleFont: string;
    titleSize: number;
    titleColor: string;
    titleWeight: 'normal' | 'bold' | 'black';
    artistFont: string;
    artistSize: number;
    artistColor: string;
    artistWeight: 'normal' | 'bold' | 'black';
  };
  effects: {
    hasGradient: boolean;
    gradientColors?: [string, string];
    hasOverlay: boolean;
    overlayColor?: string;
    overlayOpacity?: number;
    hasBlur: boolean;
    blurAmount?: number;
  };
}

export interface GenerationOptions {
  template?: CoverTemplate;
  userPhoto?: string;
  style?: 'auto' | 'classic' | 'modern' | 'minimalist' | 'vintage' | 'neon';
  mood?: 'happy' | 'sad' | 'energetic' | 'chill';
  colorPalette?: 'vibrant' | 'muted' | 'monochrome' | 'neon';
  preserveOriginalLayout?: boolean;
}

export interface GeneratedCover {
  id: string;
  trackId: string;
  imageUrl: string;
  template: CoverTemplate;
  userPhoto?: string;
  generatedAt: Date;
  style: string;
  mood: string;
}

// Pre-defined templates based on popular album cover layouts
export const COVER_TEMPLATES: CoverTemplate[] = [
  {
    id: 'classic_portrait',
    name: 'Classic Portrait',
    style: 'classic',
    layout: {
      titlePosition: { x: 0.1, y: 0.1 },
      artistPosition: { x: 0.1, y: 0.9 },
      imageArea: { x: 0.1, y: 0.2, width: 0.8, height: 0.6 }
    },
    textStyles: {
      titleFont: 'Inter',
      titleSize: 32,
      titleColor: '#FFFFFF',
      titleWeight: 'black',
      artistFont: 'Inter',
      artistSize: 18,
      artistColor: '#FFFFFF',
      artistWeight: 'bold'
    },
    effects: {
      hasGradient: true,
      gradientColors: ['#000000', '#333333'],
      hasOverlay: true,
      overlayColor: '#000000',
      overlayOpacity: 0.3,
      hasBlur: false
    }
  },
  {
    id: 'modern_minimal',
    name: 'Modern Minimal',
    style: 'modern',
    layout: {
      titlePosition: { x: 0.05, y: 0.05 },
      artistPosition: { x: 0.05, y: 0.15 },
      imageArea: { x: 0, y: 0, width: 1, height: 1 }
    },
    textStyles: {
      titleFont: 'Inter',
      titleSize: 36,
      titleColor: '#FFFFFF',
      titleWeight: 'black',
      artistFont: 'Inter',
      artistSize: 16,
      artistColor: '#CCCCCC',
      artistWeight: 'normal'
    },
    effects: {
      hasGradient: true,
      gradientColors: ['#9FFFA2', '#FF6F91'],
      hasOverlay: true,
      overlayColor: '#000000',
      overlayOpacity: 0.4,
      hasBlur: false
    }
  },
  {
    id: 'neon_cyberpunk',
    name: 'Neon Cyberpunk',
    style: 'neon',
    layout: {
      titlePosition: { x: 0.5, y: 0.1 },
      artistPosition: { x: 0.5, y: 0.9 },
      imageArea: { x: 0, y: 0, width: 1, height: 1 }
    },
    textStyles: {
      titleFont: 'Inter',
      titleSize: 40,
      titleColor: '#9FFFA2',
      titleWeight: 'black',
      artistFont: 'Inter',
      artistSize: 20,
      artistColor: '#FF6F91',
      artistWeight: 'bold'
    },
    effects: {
      hasGradient: true,
      gradientColors: ['#0E0F12', '#1a1d29'],
      hasOverlay: true,
      overlayColor: '#9FFFA2',
      overlayOpacity: 0.1,
      hasBlur: true,
      blurAmount: 2
    }
  },
  {
    id: 'vintage_retro',
    name: 'Vintage Retro',
    style: 'vintage',
    layout: {
      titlePosition: { x: 0.1, y: 0.8 },
      artistPosition: { x: 0.1, y: 0.9 },
      imageArea: { x: 0.1, y: 0.1, width: 0.8, height: 0.6 }
    },
    textStyles: {
      titleFont: 'Inter',
      titleSize: 28,
      titleColor: '#FFD36E',
      titleWeight: 'bold',
      artistFont: 'Inter',
      artistSize: 16,
      artistColor: '#FFFFFF',
      artistWeight: 'normal'
    },
    effects: {
      hasGradient: true,
      gradientColors: ['#8B4513', '#D2B48C'],
      hasOverlay: true,
      overlayColor: '#654321',
      overlayOpacity: 0.2,
      hasBlur: false
    }
  }
];

class CoverGenerationEngine {
  
  /**
   * Analyze original album cover to extract layout and style information
   */
  async analyzeOriginalCover(coverUrl: string): Promise<Partial<CoverTemplate>> {
    // In a real implementation, this would use computer vision/AI to analyze:
    // - Text position and size
    // - Color palette
    // - Layout structure
    // - Typography style
    
    // For now, return a mock analysis
    return {
      layout: {
        titlePosition: { x: 0.1, y: 0.1 },
        artistPosition: { x: 0.1, y: 0.9 },
        imageArea: { x: 0, y: 0, width: 1, height: 1 }
      },
      textStyles: {
        titleFont: 'Inter',
        titleSize: 32,
        titleColor: '#FFFFFF',
        titleWeight: 'bold',
        artistFont: 'Inter',
        artistSize: 18,
        artistColor: '#CCCCCC',
        artistWeight: 'normal'
      }
    };
  }

  /**
   * Select the best template based on track mood and user preferences
   */
  selectTemplate(track: VibelyTrack, options: GenerationOptions): CoverTemplate {
    if (options.template) {
      return options.template;
    }

    // Auto-select based on mood and style
    const mood = options.mood || track.mood.toLowerCase();
    const style = options.style || 'auto';

    if (style === 'auto') {
      switch (mood) {
        case 'happy':
        case 'energetic':
          return COVER_TEMPLATES.find(t => t.style === 'neon') || COVER_TEMPLATES[0];
        case 'chill':
          return COVER_TEMPLATES.find(t => t.style === 'modern') || COVER_TEMPLATES[1];
        case 'sad':
          return COVER_TEMPLATES.find(t => t.style === 'vintage') || COVER_TEMPLATES[3];
        default:
          return COVER_TEMPLATES.find(t => t.style === 'classic') || COVER_TEMPLATES[0];
      }
    }

    return COVER_TEMPLATES.find(t => t.style === style) || COVER_TEMPLATES[0];
  }

  /**
   * Generate color palette based on mood and user preferences
   */
  generateColorPalette(track: VibelyTrack, options: GenerationOptions): [string, string] {
    const mood = options.mood || track.mood.toLowerCase();
    const palette = options.colorPalette || 'vibrant';

    const palettes = {
      vibrant: {
        happy: ['#9FFFA2', '#FFD36E'],
        energetic: ['#FF6F91', '#8FD3FF'],
        chill: ['#8FD3FF', '#9FFFA2'],
        sad: ['#6B73FF', '#9AA0F7']
      },
      muted: {
        happy: ['#A8E6CF', '#DCEDC8'],
        energetic: ['#FFB3BA', '#BAFFC9'],
        chill: ['#BAE1FF', '#FFFFBA'],
        sad: ['#C9C9FF', '#E1BEE7']
      },
      neon: {
        happy: ['#00FF41', '#FF0080'],
        energetic: ['#FF0080', '#00FFFF'],
        chill: ['#00FFFF', '#00FF41'],
        sad: ['#8000FF', '#0080FF']
      },
      monochrome: {
        happy: ['#FFFFFF', '#F0F0F0'],
        energetic: ['#000000', '#333333'],
        chill: ['#808080', '#C0C0C0'],
        sad: ['#404040', '#606060']
      }
    };

    const colors = palettes[palette][mood as keyof typeof palettes.vibrant] || palettes.vibrant.happy;
    return [colors[0], colors[1] || colors[0]] as [string, string];
  }

  /**
   * Process user photo for integration with cover
   */
  async processUserPhoto(photoUrl: string, template: CoverTemplate): Promise<string> {
    // For AI generation, we pass the original photo URL
    // The AI model will handle the integration and processing
    return photoUrl;
  }
  
  /**
   * Convert URL to data URI for AI processing
   */
  private async urlToDataUri(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      const dataUri = `data:${blob.type};base64,${buffer.toString('base64')}`;
      return dataUri;
    } catch (error) {
      console.error('Error converting URL to Data URI:', error);
      throw new Error('Could not process image URL.');
    }
  }

  /**
   * Generate album cover with user photo integration using real AI
   */
  async generateCover(track: VibelyTrack, options: GenerationOptions = {}): Promise<GeneratedCover> {
    const template = this.selectTemplate(track, options);
    const colorPalette = this.generateColorPalette(track, options);
    
    let processedPhoto = options.userPhoto;
    if (processedPhoto) {
      processedPhoto = await this.processUserPhoto(processedPhoto, template);
    }

    let imageUrl: string;
    
    if (processedPhoto && track.originalCoverUrl) {
      try {
        // Convert URLs to data URIs for AI processing
        const photoDataUri = await this.urlToDataUri(processedPhoto);
        const originalCoverDataUri = await this.urlToDataUri(track.originalCoverUrl);
        
        // Use real AI generation via API
        const response = await fetch('/api/generate-cover', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoDataUri,
            songTitle: track.title,
            artistName: track.artist,
            originalCoverDataUri
          })
        });
        
        if (response.ok) {
          const aiResult = await response.json();
          imageUrl = aiResult.generatedCoverUris[0] || this.generateMockCover(track, template, processedPhoto);
        } else {
          throw new Error('API request failed');
        }
      } catch (error) {
        console.warn('AI cover generation failed, falling back to mock:', error);
        imageUrl = this.generateMockCover(track, template, processedPhoto);
      }
    } else {
      // No user photo provided, use mock generation
      imageUrl = this.generateMockCover(track, template, processedPhoto);
    }

    return {
      id: `cover_${track.id}_${Date.now()}`,
      trackId: track.id,
      imageUrl,
      template,
      userPhoto: processedPhoto,
      generatedAt: new Date(),
      style: template.style,
      mood: track.mood.toLowerCase()
    };
  }

  /**
   * Generate multiple cover variants
   */
  async generateVariants(track: VibelyTrack, options: GenerationOptions = {}): Promise<GeneratedCover[]> {
    const variants: GeneratedCover[] = [];
    
    // Generate 3 different variants
    for (let i = 0; i < 3; i++) {
      const variantOptions = { ...options };
      
      // Use different templates/styles for variants
      if (i === 0) {
        variantOptions.style = 'modern';
      } else if (i === 1) {
        variantOptions.style = 'neon';
      } else {
        variantOptions.style = 'vintage';
      }
      
      const variant = await this.generateCover(track, variantOptions);
      variant.id = `${variant.id}_v${i + 1}`;
      variants.push(variant);
    }
    
    return variants;
  }

  /**
   * Generate mock cover URL (placeholder for actual generation)
   */
  private generateMockCover(track: VibelyTrack, template: CoverTemplate, userPhoto?: string): string {
    // Use Unsplash with specific parameters to simulate generated covers
    const seed = `${track.id}_${template.id}`;
    const style = template.style;
    
    const styleMap = {
      classic: 'photo-1493225457124-a3eb161ffa5f',
      modern: 'photo-1514525253161-7a46d19cd819', 
      neon: 'photo-1518709268805-4e9042af2176',
      vintage: 'photo-1470225620780-dba8ba36b745',
      minimalist: 'photo-1493225457124-a3eb161ffa5f'
    };

    const imageId = styleMap[style] || styleMap.classic;
    return `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=500&h=890&q=80`;
  }
}

// Export singleton instance
export const coverGenerator = new CoverGenerationEngine();

// Export utility functions
export const getTemplateByStyle = (style: string): CoverTemplate | undefined => {
  return COVER_TEMPLATES.find(t => t.style === style);
};

export const getTemplateById = (id: string): CoverTemplate | undefined => {
  return COVER_TEMPLATES.find(t => t.id === id);
};

export const getAllTemplates = (): CoverTemplate[] => {
  return [...COVER_TEMPLATES];
};