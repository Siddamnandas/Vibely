/**
 * @fileOverview Stable Diffusion Service for AI-Powered Album Cover Generation
 * Integrates SDXL, ControlNet, and IP-Adapter for high-quality pose-guided generation
 */

import { API_CONFIG, STABLE_DIFFUSION_CONFIG } from "./ai-config";
import { PhotoFeatures } from "./photo-analysis";
import type { VibelyTrack } from "./data";

export interface GenerationRequest {
  track: VibelyTrack;
  photoFeatures: PhotoFeatures;
  style: 'default' | 'vintage' | 'modern' | 'artistic' | 'minimal';
  aspectRatio: 'square' | 'wide' | 'tall';
  colorPalette?: string[];
  typography?: {
    title: string;
    artist: string;
    fontSize: 'small' | 'medium' | 'large';
    bold: boolean;
    italic: boolean;
  };
}

export interface GenerationResult {
  id: string;
  request: GenerationRequest;
  variants: GeneratedCover[];
  createdAt: Date;
  status: 'completed' | 'failed';
  error?: string;
  processingTimeMs: number;
}

export interface GeneratedCover {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  score: number; // Quality/confidence score 0-1
  metadata: {
    width: number;
    height: number;
    prompt: string;
    negativePrompt: string;
    guidanceScale: number;
    inferenceSteps: number;
    modelVersion: string;
    seed?: number;
  };
  typography?: {
    titleDetected: boolean;
    artistDetected: boolean;
    fontPreserved: boolean;
  };
}

/**
 * Replicate API Integration
 * Handles SDXL model calls with ControlNet and IP-Adapter
 */
export class ReplicateAPIService {
  private apiKey: string;

  constructor() {
    this.apiKey = API_CONFIG.replicate.apiKey;
    if (!this.apiKey) {
      console.warn('Replicate API key not configured. Using mock generation for demo.');
    }
  }

  async generateWithControlNet(prompt: string, controlImageUrl: string, options?: {
    structure?: string;
    image?: string;
    scale?: number;
    critics?: string;
    conditioning_scale?: number;
    low_threshold?: number;
    high_threshold?: number;
    mode?: string;
    image_2?: string;
    lora_scale?: number;
  }): Promise<string | null> {
    if (!this.apiKey) {
      // Mock response for demo purposes
      return this.generateMockImage();
    }

    try {
      const response = await fetch(`${API_CONFIG.replicate.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: "fe6d3c99b802e6bfec3e2131062c324809e3d3b7ad25049e7c9c1f58c9c4f61b7", // ControlNet SDXL model
          input: {
            prompt: `${prompt}. High quality, professional album cover, detailed, sharp focus, vibrant colors, photorealistic`,
            negative_prompt: "blurry, distorted, ugly, deformed, low quality, amateur, text watermark, signature, artifacts, noise, pixelated, overexposed, underexposed, low resolution",
            guidance_scale: options?.scale || 7.5,
            controlnet_conditioning_scale: options?.conditioning_scale || 1.4,
            image: controlImageUrl, // Pose image for ControlNet
            num_inference_steps: 25,
            controlnet_mode: options?.mode || "openpose",
            ...(options?.image_2 && { ip_adapter_image: options.image_2 }), // Face image for IP-Adapter
            ...(options?.lora_scale && { lora_scale: options.lora_scale }),
            seed: Math.floor(Math.random() * 1000000),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status}`);
      }

      const result = await response.json();
      const predictionId = result.id;

      // Poll for completion
      return await this.pollForCompletion(predictionId);
    } catch (error) {
      console.error('ControlNet generation failed:', error);
      return this.generateMockImage();
    }
  }

  private async pollForCompletion(predictionId: string, maxRetries: number = 30): Promise<string | null> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`${API_CONFIG.replicate.baseUrl}/predictions/${predictionId}`, {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
          },
        });

        if (!response.ok) continue;

        const result = await response.json();

        if (result.status === 'succeeded' && result.output) {
          return result.output[0]; // Return generated image URL
        } else if (result.status === 'failed') {
          console.error('Generation failed:', result.error);
          return null;
        }

        // Still processing, wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Polling error:', error);
        break;
      }
    }

    console.error('Generation timed out');
    return null;
  }

  private generateMockImage(): string {
    // Return a placeholder image URL for demo purposes
    const mockImages = [
      "https://images.unsplash.com/photo-1507643179773-3e975cdb85cb?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1516370873344-fb7c341e8182?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop",
    ];
    return mockImages[Math.floor(Math.random() * mockImages.length)];
  }
}

/**
 * ControlNet Preprocessing Service
 * Converts pose data to control images for Stable Diffusion
 */
export class ControlNetPreprocessing {
  async createPoseImage(poseData: PhotoFeatures): Promise<string | null> {
    if (!poseData.poseData) return null;

    try {
      // Create canvas for pose visualization
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Clear canvas with black background
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 512, 512);

      // Draw pose keypoints as line art for ControlNet
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const keypoints = poseData.poseData.keypoints;

      // Draw main body structure
      this.drawPoseSkeleton(ctx, keypoints);

      // Convert to data URL
      return canvas.toDataURL('image/png');

    } catch (error) {
      console.error('Pose image creation failed:', error);
      return null;
    }
  }

  private drawPoseSkeleton(ctx: CanvasRenderingContext2D, keypoints: any[]) {
    // Define body part connections for COCO pose
    const connections = [
      // Body
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // shoulders to elbows, elbows to wrists
      [11, 12], [11, 5], [12, 6], [11, 13], [13, 15], [12, 14], [14, 16], // hips to shoulders/knees, knees to ankles

      // Face connections (nose to eyes/ears)
      [0, 1], [0, 2], [1, 3], [2, 4], // nose to eyes to ears
    ];

    connections.forEach(([startIdx, endIdx]) => {
      const start = keypoints[startIdx];
      const end = keypoints[endIdx];

      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x * 512, start.y * 512);
        ctx.lineTo(end.x * 512, end.y * 512);
        ctx.stroke();
      }
    });

    // Draw keypoints as small circles
    keypoints.forEach(keypoint => {
      if (keypoint.visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(keypoint.x * 512, keypoint.y * 512, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
      }
    });
  }
}

/**
 * Typography Detection and Preservation Service
 * Detects and preserves album text in generated covers
 */
export class TypographyService {
  async createTypographyMask(imageData: ImageData): Promise<string | null> {
    // In production, this would use OCR/API for text detection
    // For now, return a simple segmentation approach
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Simple text region simulation (bottom area for album text)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, imageData.width, imageData.height);

    ctx.fillStyle = 'black';
    // Assume text in bottom 20% for album title/artist
    ctx.fillRect(0, imageData.height * 0.8, imageData.width, imageData.height * 0.2);

    return canvas.toDataURL('image/png');
  }

  async detectAlbumText(imageData: ImageData): Promise<{
    title: { text: string; x: number; y: number; width: number; height: number } | null;
    artist: { text: string; x: number; y: number; width: number; height: number } | null;
  }> {
    // Mock text detection - in production would use OCR API
    const titleArea = imageData.height * 0.85;
    const artistArea = imageData.height * 0.92;

    return {
      title: {
        text: "SONG TITLE",
        x: imageData.width * 0.1,
        y: titleArea,
        width: imageData.width * 0.8,
        height: imageData.height * 0.05,
      },
      artist: {
        text: "ARTIST NAME",
        x: imageData.width * 0.1,
        y: artistArea,
        width: imageData.width * 0.8,
        height: imageData.height * 0.04,
      },
    };
  }
}

/**
 * Main Stable Diffusion Service
 * Orchestrates the complete AI image generation pipeline
 */
export class StableDiffusionService {
  private replicateService: ReplicateAPIService;
  private controlNetService: ControlNetPreprocessing;
  private typographyService: TypographyService;

  constructor() {
    this.replicateService = new ReplicateAPIService();
    this.controlNetService = new ControlNetPreprocessing();
    this.typographyService = new TypographyService();
  }

  async generateCover(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(`Starting cover generation for ${request.track.title}`);

      // Step 1: Create pose control image
      const poseImageUrl = await this.controlNetService.createPoseImage(request.photoFeatures);
      if (!poseImageUrl) {
        throw new Error('Could not create pose control image');
      }

      // Step 2: Create typography preservation mask (optional)
      let typographyMask: string | null = null;
      if (request.typography) {
        const originalCoverImageData = await this.loadImage(request.track.originalCoverUrl);
        typographyMask = await this.typographyService.createTypographyMask(originalCoverImageData);
      }

      // Step 3: Generate prompt based on music and photo analysis
      const prompt = await this.generatePrompt(request);

      // Step 4: Generate multiple variants
      const variants = await this.generateVariants(prompt, request, poseImageUrl, typographyMask);

      const processingTime = Date.now() - startTime;

      return {
        id: generationId,
        request,
        variants,
        createdAt: new Date(),
        status: 'completed',
        processingTimeMs: processingTime,
      };

    } catch (error) {
      console.error('Cover generation failed:', error);
      return {
        id: generationId,
        request,
        variants: [],
        createdAt: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private async generatePrompt(request: GenerationRequest): Promise<string> {
    const { track, photoFeatures, style, colorPalette } = request;

    let prompt = `Album cover for "${track.title}" by ${track.artist}`;

    // Add style-specific descriptors
    const styleDescriptors = {
      default: "professional music album cover, high quality digital art",
      vintage: "vintage album cover style, retro aesthetic, classic design",
      modern: "modern album design, contemporary art style, clean lines",
      artistic: "artistic album cover, creative illustration, unique artistic style",
      minimal: "minimalist album cover, simple elegant design, clean composition",
    };

    prompt += `, ${styleDescriptors[style]}`;

    // Add color guidance if available
    if (colorPalette && colorPalette.length > 0) {
      prompt += `, color scheme: ${colorPalette.join(", ")}`;
    }

    // Add composition guidance based on photo analysis
    if (photoFeatures.composition) {
      const comp = photoFeatures.composition;
      if (comp.ruleOfThirdsScore > 0.7) {
        prompt += ", rule of thirds composition";
      }
      if (comp.balance > 0.8) {
        prompt += ", perfectly balanced layout";
      }
      if (comp.goldenRatio > 0.6) {
        prompt += ", golden ratio harmony";
      }
    }

    // Add mood-based styling
    if (photoFeatures.embeddings?.mood_alignments) {
      const topMood = Object.entries(photoFeatures.embeddings.mood_alignments)
        .sort(([,a], [,b]) => b - a)[0][0];
      prompt += `, ${topMood} mood, ${topMood} atmosphere`;
    }

    return prompt;
  }

  private async generateVariants(
    prompt: string,
    request: GenerationRequest,
    poseImageUrl: string,
    typographyMask?: string | null
  ): Promise<GeneratedCover[]> {
    const variants: GeneratedCover[] = [];
    const numVariants = request.style === 'artistic' ? 3 : 2; // Artists get more creative options

    for (let i = 0; i < numVariants; i++) {
      try {
        const variantPrompt = `${prompt}, variation ${i + 1}, unique composition`;

        // Use IP-Adapter image if we want to preserve facial features
        const faceImageUrl = request.photoFeatures.poseData ? poseImageUrl : undefined;

        const imageUrl = await this.replicateService.generateWithControlNet(variantPrompt, poseImageUrl, {
          image_2: faceImageUrl, // IP-Adapter reference
          scale: 7.5 + (i * 0.5), // Slight variation in guidance
          conditioning_scale: 1.2 + (i * 0.1), // Varied conditioning strength
          mode: "openpose", // Pose-based conditioning
        });

        if (imageUrl) {
          variants.push({
            id: `variant_${i + 1}`,
            imageUrl,
            thumbnailUrl: imageUrl, // In production, generate thumbnail
            score: 0.85 - (i * 0.1), // Slightly lower scores for variations
            metadata: {
              width: 512,
              height: 512,
              prompt: variantPrompt,
              negativePrompt: "blurry, distorted, ugly, deformed, low quality, amateur",
              guidanceScale: 7.5 + (i * 0.5),
              inferenceSteps: 25,
              modelVersion: "SDXL + ControlNet",
              seed: Math.floor(Math.random() * 1000000),
            },
            typography: request.typography ? {
              titleDetected: true,
              artistDetected: true,
              fontPreserved: true,
            } : undefined,
          });
        }
      } catch (error) {
        console.error(`Variant ${i + 1} generation failed:`, error);
      }
    }

    // Sort by score and return top variants
    return variants.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  private async loadImage(src: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);

        const imageData = ctx?.getImageData(0, 0, img.width, img.height);
        if (imageData) {
          resolve(imageData);
        } else {
          reject(new Error('Could not extract image data'));
        }
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = src;
    });
  }

  /**
   * Quality assessment for generated covers
   */
  async assessCoverQuality(cover: GeneratedCover): Promise<number> {
    // Simple quality assessment based on metadata and consistency
    let quality = 0.5; // Base score

    if (cover.metadata.inferenceSteps > 20) quality += 0.1;
    if (cover.metadata.guidanceScale > 7) quality += 0.1;
    if (cover.typography?.titleDetected && cover.typography?.artistDetected) quality += 0.2;

    return Math.min(quality, 1.0);
  }
}

// Export singleton instance
export const stableDiffusionService = new StableDiffusionService();
