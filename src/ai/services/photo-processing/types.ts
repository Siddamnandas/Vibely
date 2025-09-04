// Core photo processing types and interfaces

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface EmotionVector {
  name: string;
  intensity: number;
  confidence: number;
}

// Basic image features
export interface BasicImageFeatures {
  dimensions: ImageDimensions;
  size: number;
  format: string;
  quality: number;
  aspectRatio: number;
  isLarge: boolean;
  isSquare: boolean;
  isHighQuality: boolean;
}

// Pose analysis features
export interface PoseFeatures {
  detected: boolean;
  landmarks: PoseLandmark[];
  keyPoses: KeyPose[];
  confidence: number;
  poseType: PoseType;
  stability: number;
}

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface KeyPose {
  id: number;
  name: string;
  position: Point3D;
  confidence: number;
}

export type PoseType = 'standing' | 'sitting' | 'lying' | 'unknown';

// Face features
export interface FaceFeatures {
  boundingBox: [number, number, number, number]; // [x, y, width, height]
  confidence: number;
  landmarks: FacialLandmark[];
  emotions: EmotionVector[];
  gender: 'male' | 'female' | 'unknown';
  age: number | null;
}

export interface FacialLandmark {
  x: number;
  y: number;
  z: number;
  name: string;
}

// Color analysis
export interface ColorAnalysis {
  dominantColors: ColorPalette[];
  palette: ColorPalette[];
  saturation: number;
  brightness: number;
  contrast: number;
  quality: number;
  colorHarmony: number;
  mood: string;
}

export interface ColorPalette {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  percentage: number;
}

export interface ImageFeatures {
  width: number;
  height: number;
  colors: ColorPalette[];
  poseDetected: boolean;
  faces: FaceFeatures[];
  quality: number;
}

// CLIP embeddings
export interface CLIPVector {
  vector: number[];
  confidence: number;
  dimensions: number;
  model: string;
  categories: string[];
}

// Main analysis result
export interface AnalyzedImageResult {
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

// Processing options
export interface PhotoAnalysisOptions {
  includePose: boolean;
  includeFaces: boolean;
  includeColors: boolean;
  clipEmbeddings: boolean;
  qualityThreshold: number;
  maxFaces: number;
}

// Progress callbacks
export type ProgressCallback = (stage: string, progress: number) => void;

// Error types
export class PhotoAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PhotoAnalysisError';
  }
}

// Model information
export interface ModelInfo {
  name: string;
  version: string;
  supportedFeatures: string[];
  performance: ModelPerformance;
}

export interface ModelPerformance {
  avgProcessingTime: number; // in milliseconds
  memoryUsage: number; // in MB
  accuracy: number; // 0-1
  confidence: number;
}

// Processing configuration
export interface ProcessingConfig {
  useCPU: boolean;
  useGPU: boolean;
  maxWorkers: number;
  cacheResults: boolean;
  fallbackMode: boolean;
}

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    processingTime: number;
    modelUsed: string;
    version: string;
  };
}

export interface BatchAnalysisRequest {
  images: (Blob | string)[];
  options?: PhotoAnalysisOptions;
  callback?: ProgressCallback;
}

export interface BatchAnalysisResponse {
  results: AnalyzedImageResult[];
  errors: Array<{
    imageId: string;
    error: string;
  }>;
  summary: {
    totalProcessed: number;
    errorsCount: number;
    averageProcessingTime: number;
    totalProcessingTime: number;
  };
}

// Cache types
export interface CacheEntry {
  result: AnalyzedImageResult;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  enableCache: boolean;
  maxSize: number;
  defaultTTL: number;
}

// Worker types for parallel processing
export interface WorkerTask {
  id: string;
  imageData: any;
  options: PhotoAnalysisOptions;
}

export interface WorkerResult {
  id: string;
  result: AnalyzedImageResult | null;
  error: string | null;
  processingTime: number;
}

// Utility types
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'tiff' | 'unknown';

export type ProcessingStage = 'loading' | 'preprocessing' | 'pose_analysis' | 'face_detection' | 'color_analysis' | 'clip_embeddings' | 'postprocessing' | 'complete';

export interface ProcessingMetrics {
  stage: ProcessingStage;
  progress: number; // 0-1
  estimatedTimeRemaining: number; // in seconds
  currentStep: string;
}

// Configuration constants
export const PHOTO_ANALYSIS_CONFIG = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_WIDTH: 4096,
  MAX_HEIGHT: 4096,
  MIN_WIDTH: 32,
  MIN_HEIGHT: 32,
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'] as const,
  POSE_CONFIDENCE_THRESHOLD: 0.6,
  FACE_CONFIDENCE_THRESHOLD: 0.7,
  CLIP_DIMENSIONS: 512,
  CACHE_MAX_SIZE: 100,
  CACHE_DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_WORKERS: 4,
  BATCH_TIMEOUT: 300000, // 5 minutes
} as const;

export const MODEL_CONFIGS = {
  MEDIAPIPE_POSE: {
    name: 'MediaPipe Pose',
    version: 'v1.0.0',
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: true
  },
  MEDIAPIPE_FACE: {
    name: 'MediaPipe Face Mesh',
    version: 'v1.0.0',
    maxNumFaces: 5,
    refineLandmarks: true,
    minDetectionConfidence: 0.5
  },
  CLIP_VIT: {
    name: 'ViT-L/14@336px',
    version: 'v1.0.0',
    dimensions: 768,
    maxKbPerImage: 64,
    description: 'Vision Transformer for image embedding'
  }
} as const;

// Export type guards
export function isBlob(obj: any): obj is Blob {
  return obj instanceof Blob;
}

export function isImageDimensions(obj: any): obj is ImageDimensions {
  return obj && typeof obj.width === 'number' && typeof obj.height === 'number';
}

export function isColorPalette(obj: any): obj is ColorPalette {
  return obj &&
         typeof obj.hex === 'string' &&
         Array.isArray(obj.rgb) &&
         Array.isArray(obj.hsl) &&
         typeof obj.percentage === 'number';
}

export function isPoseFeatures(obj: any): obj is PoseFeatures {
  return obj &&
         typeof obj.detected === 'boolean' &&
         Array.isArray(obj.landmarks) &&
         typeof obj.confidence === 'number';
}

export function isFaceFeatures(obj: any): obj is FaceFeatures {
  return obj &&
         Array.isArray(obj.boundingBox) &&
         typeof obj.confidence === 'number' &&
         Array.isArray(obj.emotions);
}

// Validation functions
export function validateImageBlob(blob: Blob): void {
  if (!PHOTO_ANALYSIS_CONFIG.SUPPORTED_FORMATS.includes(blob.type as any)) {
    throw new PhotoAnalysisError(
      `Unsupported image format: ${blob.type}`,
      'UNSUPPORTED_FORMAT',
      { supportedFormats: PHOTO_ANALYSIS_CONFIG.SUPPORTED_FORMATS }
    );
  }

  if (blob.size > PHOTO_ANALYSIS_CONFIG.MAX_IMAGE_SIZE) {
    throw new PhotoAnalysisError(
      `Image too large: ${(blob.size / 1024 / 1024).toFixed(2)}MB`,
      'IMAGE_TOO_LARGE',
      { maxSize: PHOTO_ANALYSIS_CONFIG.MAX_IMAGE_SIZE, actualSize: blob.size }
    );
  }
}

export function validateImageDimensions(width: number, height: number): ImageDimensions {
  const dimensions = { width, height };

  if (width < PHOTO_ANALYSIS_CONFIG.MIN_WIDTH || height < PHOTO_ANALYSIS_CONFIG.MIN_HEIGHT) {
    throw new PhotoAnalysisError(
      `Image too small: ${width}x${height}`,
      'IMAGE_TOO_SMALL',
      { dimensions, minWidth: PHOTO_ANALYSIS_CONFIG.MIN_WIDTH, minHeight: PHOTO_ANALYSIS_CONFIG.MIN_HEIGHT }
    );
  }

  if (width > PHOTO_ANALYSIS_CONFIG.MAX_WIDTH || height > PHOTO_ANALYSIS_CONFIG.MAX_HEIGHT) {
    throw new PhotoAnalysisError(
      `Image too large: ${width}x${height}`,
      'IMAGE_TOO_LARGE',
      { dimensions, maxWidth: PHOTO_ANALYSIS_CONFIG.MAX_WIDTH, maxHeight: PHOTO_ANALYSIS_CONFIG.MAX_HEIGHT }
    );
  }

  return dimensions;
}
