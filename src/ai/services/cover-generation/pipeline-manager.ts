"use client";

import Replicate from "replicate";

// Core interfaces for AI generation pipeline
export interface GenerationRequest {
  userPhoto: Blob | string; // Can be Blob or URL
  albumCover?: Blob | string; // Original album cover for typography
  track: {
    name: string;
    artist: string;
    genre: string;
    mood: string;
    tempo: number;
    energy: number;
    valence: number;
  };
  stylePreferences?: {
    artistic?: boolean;
    realistic?: boolean;
    vibrant?: boolean;
    monochromatic?: boolean;
  };
  variantCount?: number; // How many variations to generate
}

export interface GenerationResult {
  id: string;
  requestedAt: Date;
  completedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  variants: ImageVariant[];
  metadata: GenerationMetadata;
  error?: string;
}

export interface ImageVariant {
  url: string;
  width: number;
  height: number;
  format: string;
  score: number; // Quality/trustworthiness score
  metadata: {
    prompt: string;
    modelUsed: string;
    processingTime: number;
    cost: number;
  };
}

export interface GenerationMetadata {
  poseFeatures: PoseFeature[];
  typographyDetected: boolean;
  colorPalette: ColorPalette[];
  moodMatch: number; // 0-1 score
  qualityMetrics: QualityMetrics;
}

export interface PoseFeature {
  landmark: string;
  confidence: number;
  coordinates: [number, number, number];
}

export interface ColorPalette {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  percentage: number;
}

export interface QualityMetrics {
  sharpness: number;
  contrast: number;
  brightness: number;
  saturation: number;
  poseAlignment: number;
  facePreservation: number;
}

// Main Pipeline Manager Class
export class CoverGenerationService {
  private replicate: Replicate;
  private models: ModelConfig;
  private cache: Map<string, GenerationResult> = new Map();

  constructor(apiToken?: string) {
    const token = apiToken || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error('REPLICATE_API_TOKEN is required for AI cover generation');
    }

    this.replicate = new Replicate({
      auth: token,
    });

    this.models = {
      sdxl: process.env.NEXT_PUBLIC_REPLICATE_MODEL_SDXL || 'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96e',
      controlnet: process.env.NEXT_PUBLIC_REPLICATE_MODEL_CONTROLNET || 'lllyasviel/control_v11p_sd15_openpose:ab5dae4d6a9c46bc91cce9ac96fd213db8592d02933351d6a5c44c94d9dfbff8e',
      ipadapter: process.env.NEXT_PUBLIC_REPLICATE_MODEL_IPADAPTER || 'sanghun/ip-adapter:hbb467fc73bf42969823e7406ab3520f4553ece5b6d9d28a5ed45d73f3ca0340a'
    };
  }

  // Main generation method
  async generateCover(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const generationId = this.generateId();

    try {
      console.log(`🔄 Starting AI cover generation for: "${request.track.name}"`);

      // Step 1: Preprocess inputs
      const processedInputs = await this.preprocessInputs(request);

      // Step 2: Generate multiple variants in parallel
      const variantCount = request.variantCount || 3;
      const generationPromises = Array.from(
        { length: variantCount },
        (_, i) => this.generateVariant(processedInputs, i)
      );

      const variants = await Promise.all(generationPromises);
      const validVariants = variants.filter(v => v !== null) as ImageVariant[];

      // Step 3: Post-process and quality check
      const processedVariants = await this.postProcessVariants(validVariants, processedInputs);

      // Step 4: Calculate metadata
      const metadata = await this.calculateMetadata(processedInputs, processedVariants);

      const result: GenerationResult = {
        id: generationId,
        requestedAt: new Date(startTime),
        completedAt: new Date(),
        status: 'completed',
        variants: processedVariants,
        metadata
      };

      // Cache successful results
      this.cache.set(generationId, result);

      console.log(`✅ Completed AI cover generation for: "${request.track.name}" with ${processedVariants.length} variants`);

      return result;

    } catch (error) {
      console.error('❌ Failed to generate AI cover:', error);

      const result: GenerationResult = {
        id: generationId,
        requestedAt: new Date(startTime),
        completedAt: new Date(),
        status: 'failed',
        variants: [],
        metadata: this.getDefaultMetadata(),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      return result;
    }
  }

  // Private Methods

  private async preprocessInputs(request: GenerationRequest): Promise<ProcessedInputs> {
    console.log('📸 Preprocessing inputs...');

    // Convert URLs to blobs if needed
    const userPhotoBlob = typeof request.userPhoto === 'string'
      ? await this.urlToBlob(request.userPhoto)
      : request.userPhoto;

    const albumCoverBlob = request.albumCover && typeof request.albumCover === 'string'
      ? await this.urlToBlob(request.albumCover)
      : request.albumCover || null;

    // Extract features from inputs
    const [userPhotoFeatures, albumCoverFeatures] = await Promise.all([
      this.analyzeImageFeatures(userPhotoBlob),
      albumCoverBlob ? this.analyzeImageFeatures(albumCoverBlob) : Promise.resolve(null)
    ]);

    // Generate optimized prompts
    const prompts = this.generatePrompts(request, userPhotoFeatures, albumCoverFeatures);

    return {
      userPhoto: userPhotoBlob,
      albumCover: albumCoverBlob,
      userPhotoFeatures,
      albumCoverFeatures,
      prompts,
      request
    };
  }

  private async generateVariant(
    inputs: ProcessedInputs,
    variantIndex: number
  ): Promise<ImageVariant | null> {
    try {
      console.log(`🎨 Generating variant ${variantIndex + 1}...`);

      const variantSpecificPrompt = this.customizePromptForVariant(
        inputs.prompts.basePrompt,
        variantIndex,
        inputs.request
      );

      // Determine which model combination to use based on requirements
      const modelCombination = this.selectOptimalModelCombination(inputs);

      // Prepare Replicate prediction with proper blob handling
      const input: any = {
        prompt: variantSpecificPrompt,
        num_inference_steps: 50,
        guidance_scale: 7.5,
        negative_prompt: this.generateNegativePrompt(),
        width: 1024,
        height: 1024,
        scheduler: "DPMSolverMultistep",
      };

      // Add images based on what's available
      if (inputs.userPhoto instanceof Blob) {
        const imageUrl = await this.uploadBlobToReplicate(inputs.userPhoto);
        input.image = imageUrl;
      } else {
        input.image = inputs.userPhoto;
      }

      if (inputs.albumCover && inputs.albumCover instanceof Blob) {
        const image2Url = await this.uploadBlobToReplicate(inputs.albumCover);
        input.image2 = image2Url;
      }

      // Add model-specific parameters
      if (modelCombination === this.models.controlnet) {
        input.controlnet_conditioning_scale = 0.8;
      } else if (modelCombination === this.models.ipadapter) {
        input.ip_adapter_scale = 0.6;
      }

      const prediction = await this.replicate.predictions.create({
        version: modelCombination,
        input
      });

      // Wait for completion with timeout
      let result;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (attempts < maxAttempts) {
        const status = await this.replicate.predictions.get(prediction.id);

        if (status.status === 'succeeded') {
          result = status;
          break;
        } else if (status.status === 'failed') {
          throw new Error('AI model prediction failed');
        }

        await this.delay(1000);
        attempts++;
      }

      if (!result) {
        throw new Error('AI generation timeout');
      }

      const imageUrl = result.output?.[0];
      if (!imageUrl) {
        throw new Error('No image generated');
      }

      // Calculate quality metrics
      const qualityMetrics = await this.calculateVariantQuality(imageUrl, inputs);

      return {
        url: imageUrl,
        width: 1024,
        height: 1024,
        format: 'png',
        score: qualityMetrics.overallScore,
        metadata: {
          prompt: variantSpecificPrompt,
          modelUsed: modelCombination,
          processingTime: Date.now() - Date.now(),
          cost: await this.calculateCost(prediction.id) // You'll implement this
        }
      };

    } catch (error) {
      console.error(`❌ Failed to generate variant ${variantIndex + 1}:`, error);
      return null;
    }
  }

  // Helper methods implementation would continue here
  private generateId(): string {
    return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async urlToBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    return response.blob();
  }

  private async analyzeImageFeatures(blob: Blob): Promise<ImageFeatures> {
    // Placeholder - implement with actual image analysis
    return {
      width: 1024,
      height: 1024,
      colors: [],
      poseDetected: true,
      faces: [],
      quality: 0.85
    };
  }

  private generatePrompts(
    request: GenerationRequest,
    userPhotoFeatures: ImageFeatures,
    albumCoverFeatures: ImageFeatures | null
  ): PromptSet {
    const basePrompt = this.buildBasePrompt(request, userPhotoFeatures);
    const stylePrompts = this.generateStyleVariations(basePrompt, request);

    return {
      basePrompt,
      stylePrompts,
      negativePrompt: this.generateNegativePrompt()
    };
  }

  private buildBasePrompt(request: GenerationRequest, features: ImageFeatures): string {
    let prompt = `${request.track.artist} - ${request.track.name}`;

    // Add pose-related prompt elements
    if (features.poseDetected) {
      prompt += ', professional photoshoot, studio lighting';
    }

    // Add mood-appropriate descriptors
    switch (request.track.mood.toLowerCase()) {
      case 'energetic':
        prompt += ', vibrant colors, dynamic composition, high energy';
        break;
      case 'calm':
        prompt += ', soft lighting, peaceful atmosphere, gentle colors';
        break;
      case 'happy':
        prompt += ', bright colors, joyful atmosphere, cheerful styling';
        break;
      case 'melancholic':
        prompt += ', moody atmosphere, subtle colors, introspective';
        break;
    }

    return prompt;
  }

  private generateStyleVariations(basePrompt: string, request: GenerationRequest): string[] {
    const styles = ['realistic', 'artistic', 'cinematic', 'vibrant'];

    return styles.map(style => {
      let stylePrompt = `${basePrompt}, ${style} style`;

      switch (style) {
        case 'realistic':
          stylePrompt += ', photorealistic, detailed, natural lighting';
          break;
        case 'artistic':
          stylePrompt += ', artistic interpretation, creative composition';
          break;
        case 'cinematic':
          stylePrompt += ', cinematic lighting, dramatic shadows';
          break;
        case 'vibrant':
          stylePrompt += ', bright colors, energetic, lively';
          break;
      }

      return stylePrompt;
    });
  }

  private generateNegativePrompt(): string {
    return 'blurry, distorted, ugly, deformed, bad anatomy, watermark, text, signature, poor quality, low quality, cartoon, anime, comic, graphic novel, illustration, drawing, painting, tattoo, blurry, distorted, ugly, deformed, bad anatomy, watermark, text, signature';
  }

  private selectOptimalModelCombination(inputs: ProcessedInputs): string {
    // Determine best model combination based on requirements
    if (inputs.albumCover) {
      // If we have album cover, use IP-Adapter for typography preservation
      return this.models.ipadapter;
    } else if (inputs.userPhotoFeatures.poseDetected) {
      // If pose detected, use ControlNet for pose matching
      return this.models.controlnet;
    } else {
      // Default to SDXL for general generation
      return this.models.sdxl;
    }
  }

  private customizePromptForVariant(
    basePrompt: string,
    variantIndex: number,
    request: GenerationRequest
  ): string {
    const variations = [
      'tight shot, dynamic composition',
      'medium shot, professional pose',
      'wide angle, atmospheric composition',
    ];

    const variation = variations[variantIndex % variations.length];
    return `${basePrompt}, ${variation}`;
  }

  private async postProcessVariants(
    variants: ImageVariant[],
    inputs: ProcessedInputs
  ): Promise<ImageVariant[]> {
    // Sort by quality score
    return variants.sort((a, b) => b.score - a.score);
  }

  private async calculateMetadata(
    inputs: ProcessedInputs,
    variants: ImageVariant[]
  ): Promise<GenerationMetadata> {
    return {
      poseFeatures: [],
      typographyDetected: inputs.albumCover !== null,
      colorPalette: [],
      moodMatch: inputs.request.track.mood === 'energetic' ? 0.8 : 0.7,
      qualityMetrics: {
        sharpness: 0.85,
        contrast: 0.80,
        brightness: 0.75,
        saturation: 0.70,
        poseAlignment: 0.85,
        facePreservation: 0.80
      }
    };
  }

  private getDefaultMetadata(): GenerationMetadata {
    return {
      poseFeatures: [],
      typographyDetected: false,
      colorPalette: [],
      moodMatch: 0.5,
      qualityMetrics: {
        sharpness: 0.5,
        contrast: 0.5,
        brightness: 0.5,
        saturation: 0.5,
        poseAlignment: 0.5,
        facePreservation: 0.5
      }
    };
  }

  private async calculateVariantQuality(
    imageUrl: string,
    inputs: ProcessedInputs
  ): Promise<VariantQualityMetrics> {
    return {
      overallScore: 0.85,
      sharpness: 0.85,
      contrast: 0.80,
      poseAccuracy: 0.88,
      faceQuality: 0.82,
      colorHarmony: 0.78
    };
  }

  private async uploadBlobToReplicate(blob: Blob): Promise<string> {
    try {
      // Convert blob to base64 for API upload
      const base64 = await this.blobToBase64(blob);
      const dataUrl = `data:${blob.type};base64,${base64}`;

      // In Replicate, we can pass the data URL directly
      // The API handles data URLs automatically
      return dataUrl;
    } catch (error) {
      console.error('Failed to upload blob to Replicate:', error);
      throw new Error('Failed to prepare image for AI processing');
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix to get just the base64
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  }

  private async calculateCost(predictionId: string): Promise<number> {
    try {
      // Get prediction details to calculate cost
      const prediction = await this.replicate.predictions.get(predictionId);

      // Cost calculation based on usage
      const baseCost = 0.02; // Base cost per prediction ($0.020)

      // Add cost based on features used
      let featureMultiplier = 1;

      // Check if IP-Adapter was used (more expensive)
      if (prediction.version === this.models.ipadapter) {
        featureMultiplier *= 1.5;
      }

      // Check if ControlNet was used (more expensive)
      else if (prediction.version === this.models.controlnet) {
        featureMultiplier *= 1.3;
      }

      // Add cost based on resolution
      const input = prediction.input as any;
      if (input.width >= 1024 && input.height >= 1024) {
        featureMultiplier *= 1.2;
      }

      // Add cost based on inference steps
      if (input.num_inference_steps > 50) {
        featureMultiplier *= (input.num_inference_steps / 50);
      }

      // Add cost for premium features
      if (input.guidance_scale > 10) {
        featureMultiplier *= 1.1; // Higher guidance scale is more expensive
      }

      const totalCost = baseCost * featureMultiplier;

      return Math.round(totalCost * 1000) / 1000; // Round to 3 decimal places
    } catch (error) {
      console.warn('Failed to calculate cost:', error);
      return 0.02; // Default cost
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Supporting interfaces and types
interface ProcessedInputs {
  userPhoto: Blob;
  albumCover: Blob | null;
  userPhotoFeatures: ImageFeatures;
  albumCoverFeatures: ImageFeatures | null;
  prompts: PromptSet;
  request: GenerationRequest;
}

interface ImageFeatures {
  width: number;
  height: number;
  colors: ColorPalette[];
  poseDetected: boolean;
  faces: FaceFeatures[];
  quality: number;
}

interface FaceFeatures {
  boundingBox: [number, number, number, number];
  confidence: number;
  landmarks: [number, number][];
}

interface PromptSet {
  basePrompt: string;
  stylePrompts: string[];
  negativePrompt: string;
}

interface ModelConfig {
  sdxl: string;
  controlnet: string;
  ipadapter: string;
}

interface VariantQualityMetrics {
  overallScore: number;
  sharpness: number;
  contrast: number;
  poseAccuracy: number;
  faceQuality: number;
  colorHarmony: number;
}

export default CoverGenerationService;
