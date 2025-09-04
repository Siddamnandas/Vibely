/**
 * @fileOverview AI Configuration for Vibely
 * Central configuration for all AI services and model settings
 */

// External API Configuration
export const API_CONFIG = {
  huggingFace: {
    baseUrl: 'https://api-inference.huggingface.co/models',
    apiKey: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || '',
  },
  replicate: {
    baseUrl: 'https://api.replicate.com/v1',
    apiKey: process.env.REPLICATE_API_TOKEN || '',
  },
  modal: {
    baseUrl: 'https://api.modal.com/v1',
    workspace: process.env.MODAL_WORKSPACE_ID || '',
  }
};

// CLIP Model Configuration
export const CLIP_MODEL_CONFIG = {
  visionModel: 'openai/clip-vit-base-patch32',
  textModel: 'openai/clip-vit-base-patch32',
  embeddingSize: 512,
  batchSize: 16,
  maxImagesPerBatch: 20
};

// MediaPipe Configuration
export const MEDIAPIPE_CONFIG = {
  pose: {
    modelComplexity: 1,
    enableSegmentation: true,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  },
  face: {
    modelComplexity: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    maxFaces: 1
  },
  hands: {
    modelComplexity: 1,
    maxNumHands: 2,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  }
};

// Stable Diffusion Model Configuration
export const STABLE_DIFFUSION_CONFIG = {
  model: 'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
  denoising: {
    guidanceScale: 7.5,
    inferenceSteps: 25,
    strength: 0.8
  },
  controlNet: {
    poseModel: 'lllyasviel/controlnet_v11p_sd15_openpose',
    cannyModel: 'lllyasviel/controlnet_v11p_sd15_canny',
    depthModel: 'lllyasviel/controlnet_v11p_sd15_depth',
    lineartModel: 'lllyasviel/controlnet_v11p_sd15_lineart_anime'
  }
};

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  image: {
    maxResolution: 1024,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    quality: {
      low: 0.6,
      medium: 0.8,
      high: 0.95
    }
  },
  analysis: {
    batchSize: 5,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    cacheExpiry: 24 * 60 * 60 * 1000 // 24 hours
  },
  processing: {
    workerConcurrency: 3,
    queueTimeout: 60000,
    maxRetries: 5
  }
};

// Feature Flags
export const FEATURE_FLAGS = {
  // Phase 1 Features
  usaRealTimeAudioAnalysis: true,
  useRealTimeVisualization: true,
  useMastering: true,
  useMusicPatternRecognition: true,

  // Phase 2 Features
  usePoseDetection: true,
  useCLIPEmbeddings: true,
  useBackgroundRemoval: true,
  useCompositionAnalysis: true,

  // Phase 3 Features
  useStableDiffusionGeneration: false,
  useIPAdapterFacePreservation: false,
  useTypographyPreservation: false,
  useStyleTransfer: false,
};

// Error Handling Configuration
export const ERROR_CONFIG = {
  timeouts: {
    imageLoad: 10000,
    apiCall: 30000,
    processing: 60000
  },
  retries: {
    imageOperations: 3,
    apiCalls: 2,
    networkOperations: 5
  },
  fallbacks: {
    useMockData: process.env.NODE_ENV === 'development',
    enableOfflineMode: true,
    gracefulDegradation: true
  }
};

// Development Mode Configuration
export const DEV_MODE = {
  mockAPIs: process.env.NODE_ENV === 'development',
  skipRealModels: process.env.NODE_ENV === 'development' && process.env.SKIP_MODELS === 'true',
  enableDevTools: process.env.NODE_ENV === 'development',
  simulateDelays: {
    poseDetection: 500,
    clipEmbedding: 1500,
    backgroundRemoval: 1000,
    imageGeneration: 3000
  }
};
