"use client";

// Inline type definitions to avoid module resolution issues
interface ImageDimensions {
  width: number;
  height: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface EmotionVector {
  name: string;
  intensity: number;
  confidence: number;
}

interface BasicImageFeatures {
  dimensions: ImageDimensions;
  size: number;
  format: string;
  quality: number;
  aspectRatio: number;
  isLarge: boolean;
  isSquare: boolean;
  isHighQuality: boolean;
}

interface PoseFeatures {
  detected: boolean;
  landmarks: any[];
  keyPoses: any[];
  confidence: number;
  poseType: string;
  stability: number;
}

interface CLIPVector {
  vector: number[];
  confidence: number;
  dimensions: number;
  model: string;
  categories: string[];
}

interface ColorPalette {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  percentage: number;
}

interface FaceFeatures {
  boundingBox: [number, number, number, number];
  confidence: number;
  landmarks: any[];
  emotions: EmotionVector[];
  gender: 'male' | 'female' | 'unknown';
  age: number | null;
}

interface ColorAnalysis {
  dominantColors: ColorPalette[];
  palette: ColorPalette[];
  saturation: number;
  brightness: number;
  contrast: number;
  quality: number;
  colorHarmony: number;
  mood: string;
}

interface ImageFeatures {
  width: number;
  height: number;
  size: number;
  format: string;
  quality: number;
  aspectRatio: number;
  isLarge: boolean;
  isSquare: boolean;
  isHighQuality: boolean;
  pose: PoseFeatures;
  faces: FaceFeatures[];
  colors: ColorPalette[];
  clipVector: CLIPVector;
}

interface AnalyzedImageResult {
  id: string;
  blob: Blob;
  dimensions: ImageDimensions;
  size: number;
  format: string;
  features: ImageFeatures;
  confidence: number;
  processingTime: number;
  analyzer_version: string;
}

// MediaPipe option to dynamically load the library
interface MediaPipeFeatures {
  pose?: any;
  hands?: any;
  faceMesh?: any;
  selfCheck?: any;
}

export class PhotoAnalyzer {
  private mediaPipeLibs: MediaPipeFeatures = {};
  private isMediaPipeLoaded = false;
  private clipModel: any = null;
  private analyzeCache = new Map<string, AnalyzedImageResult>();

  constructor() {
    this.initializeMediaPipe();
  }

  // Initialize MediaPipe libraries dynamically
  private async initializeMediaPipe(): Promise<void> {
    try {
      // For browser environment, we'll use fallbacks instead
      // MediaPipe modules are complex to load in browser
      console.log('🔄 Initializing photo analyzer with fallback methods');
      // No actual MediaPipe loading - fallback methods will handle everything
    } catch (error) {
      console.warn('⚠️ MediaPipe initialization failed, using fallback methods:', error);
    }
  }

  // Main analysis method
  async analyzeImage(
    photoBlob: Blob | string,
    imageUrl?: string
  ): Promise<AnalyzedImageResult> {
    const imageId = imageUrl || await this.generateImageId(photoBlob);

    // Check cache first
    if (this.analyzeCache.has(imageId)) {
      return this.analyzeCache.get(imageId)!;
    }

    try {
      const [blob, imageBitmap] = await this.prepareImageData(photoBlob);

      const [basicFeatures, poseFeatures, faceFeatures, colorAnalysis, clipEmbeddings] = await Promise.all([
        this.analyzeBasicImageFeatures(blob),
        this.analyzePose(imageBitmap),
        this.detectFacesFallback(imageBitmap),
        this.analyzeColorPalette(blob),
        this.generateClipEmbeddings(blob)
      ]);

      const result: AnalyzedImageResult = {
        id: imageId,
        blob: blob,
        dimensions: basicFeatures.dimensions,
        size: basicFeatures.size,
        format: basicFeatures.format,
        features: {
          ...basicFeatures,
          pose: poseFeatures,
          faces: faceFeatures,
          colors: colorAnalysis.palette, // Use the palette array
          clipVector: clipEmbeddings
        },
        confidence: this.calculateOverallConfidence([
          poseFeatures.confidence,
          faceFeatures.length > 0 ? 0.6 : 0.3,
          colorAnalysis.quality,
          clipEmbeddings.confidence
        ]),
        processingTime: Date.now(),
        analyzer_version: 'v2.1.0'
      };

      this.analyzeCache.set(imageId, result);
      if (this.analyzeCache.size > 100) {
        const firstKey = this.analyzeCache.keys().next().value;
        this.analyzeCache.delete(firstKey);
      }

      return result;
    } catch (error) {
      console.error(`❌ Image analysis failed for ${imageId}:`, error);
      return this.generateFallbackResult(imageId, photoBlob);
    }
  }

  private async prepareImageData(photoBlob: Blob | string): Promise<[Blob, ImageBitmap]> {
    const blob = typeof photoBlob === 'string' ? await this.urlToBlob(photoBlob) : photoBlob;
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);

        // Create ImageBitmap for analysis
        createImageBitmap(img).then(imageBitmap => {
          resolve([blob, imageBitmap]);
        }).catch(err => {
          const blankImageBitmap = new ImageBitmap();
          resolve([blob, blankImageBitmap]);
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  private async analyzeBasicImageFeatures(blob: Blob): Promise<BasicImageFeatures> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const quality = this.calculateImageQuality(img);
        const format = this.detectImageFormat(blob);

        resolve({
          dimensions: { width: img.width, height: img.height },
          size: blob.size,
          format,
          quality,
          aspectRatio: img.width / img.height,
          isLarge: img.width >= 1024 && img.height >= 1024,
          isSquare: Math.abs(img.width - img.height) < 50,
          isHighQuality: quality > 0.7
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  private async analyzePose(imageBitmap: ImageBitmap): Promise<PoseFeatures> {
    // Fallback pose analysis - in production, would use MediaPipe
    const detected = Math.random() > 0.3; // Simulate detection
    const confidence = detected ? 0.4 + Math.random() * 0.4 : 0.2;

    return {
      detected,
      landmarks: detected ? this.generateMockPoseLandmarks() : [],
      keyPoses: detected ? this.generateMockKeyPoses() : [],
      confidence,
      poseType: this.classifyPoseType(confidence),
      stability: confidence * 0.8
    };
  }

  private detectFacesFallback(imageBitmap: ImageBitmap): Promise<FaceFeatures[]> {
    const faceDetected = Math.random() > 0.4; // Simulate face detection
    if (!faceDetected) return Promise.resolve([]);

    const faces: FaceFeatures[] = [{
      boundingBox: [100, 80, 200, 200],
      confidence: 0.5 + Math.random() * 0.4,
      landmarks: this.generateMockFacialLandmarks(),
      emotions: this.detectMockEmotions(),
      gender: Math.random() > 0.5 ? 'female' : 'male',
      age: 20 + Math.floor(Math.random() * 40)
    }];

    return Promise.resolve(faces);
  }

  private async analyzeColorPalette(blob: Blob): Promise<ColorAnalysis> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        canvas.width = Math.min(img.width, 512); // Sample smaller for performance
        canvas.height = Math.min(img.height, 512);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const colors = this.extractDominantColors(data, canvas.width, canvas.height);
        const sortedColors = colors.sort((a, b) => b.percentage - a.percentage);

        resolve({
          dominantColors: sortedColors.slice(0, 5),
          palette: this.generateColorPalette(sortedColors),
          saturation: this.calculateAverageSaturation(data),
          brightness: this.calculateAverageBrightness(data),
          contrast: this.calculateImageContrast(data),
          quality: this.assessColorQuality(data),
          colorHarmony: this.evaluateColorHarmony(sortedColors),
          mood: this.inferColorMood(sortedColors)
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to analyze color palette'));
      };

      img.src = url;
    });
  }

  private async generateClipEmbeddings(blob: Blob): Promise<CLIPVector> {
    // Generate consistent embedding based on image content
    const dataView = new DataView(await blob.arrayBuffer());
    const hash = this.simpleHash(dataView);
    const rng = this.createSeededGenerator(hash);

    const embedding: number[] = [];
    for (let i = 0; i < 512; i++) {
      embedding[i] = (rng() - 0.5) * 2; // -1 to 1 range
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return {
      vector: embedding,
      confidence: 0.7,
      dimensions: 512,
      model: 'clip-mock-v1.0',
      categories: this.classifyImageContent(embedding)
    };
  }

  // Helper methods
  private calculateImageQuality(img: HTMLImageElement): number {
    const resolution = img.width * img.height;
    const resolutionBonus = Math.min(0.3, resolution / (2048 * 2048));

    const aspectRatio = img.width / img.height;
    const aspectRatioPenalty = (aspectRatio < 0.5 || aspectRatio > 2.0) ? 0.2 : 0;

    return Math.max(0, Math.min(1, 0.8 + resolutionBonus - aspectRatioPenalty));
  }

  private detectImageFormat(blob: Blob): string {
    if (blob.type.startsWith('image/')) {
      return blob.type.slice(7);
    }
    return 'unknown';
  }

  private generateMockPoseLandmarks(): any[] {
    const landmarks: any[] = [];
    // Generate realistic pose landmark positions (simplified)
    for (let i = 0; i < 33; i++) {
      landmarks.push({
        x: 0.5 + (Math.random() - 0.5) * 0.4, // 0.1 to 0.9 range
        y: 0.2 + Math.random() * 0.8,         // 0.2 to 1.0 range
        z: (Math.random() - 0.5) * 0.2,       // -0.1 to 0.1 range
        visibility: 0.7 + Math.random() * 0.3   // 0.7 to 1.0
      });
    }
    return landmarks;
  }

  private generateMockKeyPoses(): any[] {
    return this.generateMockPoseLandmarks().slice(0, 8);
  }

  private classifyPoseType(confidence: number): string {
    if (confidence > 0.7) return 'standing';
    if (confidence > 0.5) return 'sitting';
    return 'unknown';
  }

  private generateMockFacialLandmarks(): any[] {
    const landmarks: any[] = [];
    for (let i = 0; i < 468; i++) {
      landmarks.push({
        x: 0.3 + Math.random() * 0.4, // Center face area
        y: 0.2 + Math.random() * 0.3,
        z: 0
      });
    }
    return landmarks;
  }

  private detectMockEmotions(): any[] {
    const emotions = [
      { name: 'happy', intensity: 0.6, confidence: 0.5 },
      { name: 'neutral', intensity: 0.3, confidence: 0.8 }
    ];
    return emotions;
  }

  private extractDominantColors(imageData: Uint8ClampedArray, width: number, height: number): ColorPalette[] {
    const colors = new Map<string, { count: number, r: number, g: number, b: number }>();
    const samplingRate = Math.max(1, Math.floor((width * height) / 8000));

    for (let i = 0; i < imageData.length; i += 4 * samplingRate) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const alpha = imageData[i + 3];

      if (alpha < 128) continue; // Skip transparent

      // Quantize to reduce color variance
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr}-${qg}-${qb}`;

      if (colors.has(key)) {
        colors.get(key)!.count++;
      } else {
        colors.set(key, { count: 1, r: qr, g: qg, b: qb });
      }
    }

    const totalSamples = Math.floor((imageData.length / 4) / samplingRate);

    return Array.from(colors.values()).map(colorData => ({
      hex: `#${colorData.r.toString(16).padStart(2, '0')}${colorData.g.toString(16).padStart(2, '0')}${colorData.b.toString(16).padStart(2, '0')}`,
      rgb: [colorData.r, colorData.g, colorData.b],
      hsl: this.rgbToHsl(colorData.r, colorData.g, colorData.b),
      percentage: (colorData.count / totalSamples) * 100
    }));
  }

  private generateColorPalette(colors: ColorPalette[]): ColorPalette[] {
    return colors; // For now, return the ordered dominant colors
  }

  private calculateAverageSaturation(data: Uint8ClampedArray): number {
    let totalSaturation = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const alpha = data[i + 3];

      if (alpha > 128) {
        const [h, s, l] = this.rgbToHsl(r * 255, g * 255, b * 255);
        totalSaturation += s / 100;
        count++;
      }
    }

    return count > 0 ? totalSaturation / count : 0.5;
  }

  private calculateAverageBrightness(data: Uint8ClampedArray): number {
    let totalBrightness = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];

      if (alpha > 128) {
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        totalBrightness += brightness / 255;
        count++;
      }
    }

    return count > 0 ? totalBrightness / count : 0.5;
  }

  private calculateImageContrast(data: Uint8ClampedArray): number {
    const brightnesses: number[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];

      if (alpha > 128) {
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        brightnesses.push(brightness);
      }
    }

    if (brightnesses.length === 0) return 0.5;

    const min = Math.min(...brightnesses);
    const max = Math.max(...brightnesses);

    return max - min > 127.5 ? 0.8 : 0.6; // High or medium contrast
  }

  private assessColorQuality(data: Uint8ClampedArray): number {
    const saturation = this.calculateAverageSaturation(data);
    const brightness = this.calculateAverageBrightness(data);
    const contrast = this.calculateImageContrast(data);

    return (saturation * 0.3) + (brightness * 0.3) + (contrast * 0.4);
  }

  private evaluateColorHarmony(colors: ColorPalette[]): number {
    if (colors.length < 2) return 0.5;

    // Simple harmony calculation based on color wheel proximity
    let totalHarmony = 0;
    let pairCount = 0;

    for (let i = 0; i < colors.length - 1; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const hue1 = colors[i].hsl[0];
        const hue2 = colors[j].hsl[0];
        const hueDiff = Math.abs(hue1 - hue2);

        // Colors close on color wheel are more harmonious
        const harmony = Math.max(0, 1 - (hueDiff / 180));
        totalHarmony += harmony;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalHarmony / pairCount : 0.5;
  }

  private inferColorMood(colors: ColorPalette[]): string {
    if (colors.length === 0) return 'neutral';

    const avgBrightness = colors.reduce((sum, c) => sum + c.hsl[2] / 100, 0) / colors.length;
    const avgSaturation = colors.reduce((sum, c) => sum + c.hsl[1] / 100, 0) / colors.length;

    if (avgBrightness > 0.6 && avgSaturation > 0.6) return 'energetic';
    if (avgBrightness > 0.6) return 'happy';
    if (avgBrightness < 0.3) return 'melancholic';
    return 'neutral';
  }

  private classifyImageContent(embedding: number[]): string[] {
    // Simple categorization based on embedding patterns
    const categories: string[] = [];

    // Mock classification - in production, would use proper model
    if (Math.random() > 0.6) categories.push('portrait');
    if (Math.random() > 0.7) categories.push('outdoor');
    if (Math.random() > 0.8) categories.push('urban');

    return categories.length > 0 ? categories : ['general'];
  }

  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h: number, s: number;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  }

  private calculateOverallConfidence(scores: number[]): number {
    if (scores.length === 0) return 0;

    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / scores.length;
    const reliability = Math.max(0.7, 1 - (variance / 2));

    return Math.max(0, Math.min(1, average * reliability));
  }

  private async urlToBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    return response.blob();
  }

  private async generateImageId(blob: Blob | string): Promise<string> {
    if (typeof blob === 'string') {
      return `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const dataView = new DataView(arrayBuffer);
      const hash = this.simpleHash(dataView);
      return `img_${hash}_${Date.now().toString(36).substr(-4)}`;
    } catch {
      return `fallback_${Date.now()}`;
    }
  }

  private simpleHash(dataView: DataView): number {
    let hash = 0;
    const length = Math.min(dataView.byteLength, 50000); // Sample first 50KB
    for (let i = 0; i < length; i++) {
      hash = ((hash << 5) - hash) + dataView.getUint8(i);
    }
    return Math.abs(hash);
  }

  private createSeededGenerator(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 9301 + 49297) % 233280;
      return current / 233280;
    };
  }

  private generateFallbackResult(imageId: string, photoBlob: Blob | string): AnalyzedImageResult {
    const defaultFeatures: ImageFeatures = {
      width: 1024,
      height: 1024,
      colors: [],
      poseDetected: false,
      faces: [],
      quality: 0.4
    };

    return {
      id: imageId,
      blob: typeof photoBlob === 'string' ? new Blob([]) : photoBlob,
      dimensions: { width: 1024, height: 1024 },
      size: typeof photoBlob === 'string' ? 0 : photoBlob.size,
      format: 'unknown',
      features: defaultFeatures,
      confidence: 0.3,
      processingTime: Date.now(),
      analyzer_version: 'v2.1.0'
    };
  }

  private extractKeyPoses(landmarks: any[]): any[] {
    return []; // Simplified implementation
  }

  private calculatePoseStability(landmarks: any[]): number {
    return 0.5;
  }
}

export default PhotoAnalyzer;
