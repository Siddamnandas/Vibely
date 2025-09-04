/**
 * P1 HIGH PRIORITY: Centralized Error Handling System
 * Fixes inconsistent error handling across the application
 */

export enum ErrorType {
  // Authentication & Authorization
  AUTH_ERROR = 'AUTH_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // API & Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_TIMEOUT = 'API_TIMEOUT',

  // Database & Redis
  DATABASE_ERROR = 'DATABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
  QUEUE_ERROR = 'QUEUE_ERROR',

  // AI & Processing
  AI_GENERATION_FAILED = 'AI_GENERATION_FAILED',
  IMAGE_PROCESSING_ERROR = 'IMAGE_PROCESSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // File & System
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',

  // Application Specific
  SONG_NOT_FOUND = 'SONG_NOT_FOUND',
  COVER_GENERATION_FAILED = 'COVER_GENERATION_FAILED',
  USER_DATA_INCOMPLETE = 'USER_DATA_INCOMPLETE'
}

export interface AppError {
  type: ErrorType;
  message: string;
  statusCode: number;
  userMessage: string;
  retryable: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  originalError?: Error;
  metadata?: Record<string, any>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private getErrorConfig(errorType: ErrorType): Omit<AppError, 'message' | 'originalError' | 'metadata'> {
    const configs: Record<ErrorType, Omit<AppError, 'message' | 'originalError' | 'metadata'>> = {
      // Authentication
      [ErrorType.AUTH_ERROR]: {
        type: ErrorType.AUTH_ERROR,
        statusCode: 401,
        userMessage: 'Please sign in to continue',
        retryable: false,
        logLevel: 'info'
      },
      [ErrorType.UNAUTHORIZED]: {
        type: ErrorType.UNAUTHORIZED,
        statusCode: 401,
        userMessage: 'You don\'t have permission to access this resource',
        retryable: false,
        logLevel: 'warn'
      },
      [ErrorType.FORBIDDEN]: {
        type: ErrorType.FORBIDDEN,
        statusCode: 403,
        userMessage: 'This action is not allowed',
        retryable: false,
        logLevel: 'warn'
      },

      // API & Network
      [ErrorType.NETWORK_ERROR]: {
        type: ErrorType.NETWORK_ERROR,
        statusCode: 0,
        userMessage: 'Please check your internet connection and try again',
        retryable: true,
        logLevel: 'info'
      },
      [ErrorType.API_RATE_LIMITED]: {
        type: ErrorType.API_RATE_LIMITED,
        statusCode: 429,
        userMessage: 'Too many requests. Please try again in a moment',
        retryable: true,
        logLevel: 'info'
      },
      [ErrorType.API_TIMEOUT]: {
        type: ErrorType.API_TIMEOUT,
        statusCode: 408,
        userMessage: 'Request timed out. Please try again',
        retryable: true,
        logLevel: 'info'
      },

      // Database & Redis
      [ErrorType.DATABASE_ERROR]: {
        type: ErrorType.DATABASE_ERROR,
        statusCode: 500,
        userMessage: 'Service temporarily unavailable. Please try again',
        retryable: true,
        logLevel: 'error'
      },
      [ErrorType.REDIS_ERROR]: {
        type: ErrorType.REDIS_ERROR,
        statusCode: 500,
        userMessage: 'Queue service is temporarily unavailable',
        retryable: true,
        logLevel: 'error'
      },
      [ErrorType.QUEUE_ERROR]: {
        type: ErrorType.QUEUE_ERROR,
        statusCode: 500,
        userMessage: 'Processing queue is temporarily unavailable',
        retryable: true,
        logLevel: 'error'
      },

      // AI & Processing
      [ErrorType.AI_GENERATION_FAILED]: {
        type: ErrorType.AI_GENERATION_FAILED,
        statusCode: 500,
        userMessage: 'Unable to generate cover. Please try with different settings',
        retryable: true,
        logLevel: 'warn'
      },
      [ErrorType.IMAGE_PROCESSING_ERROR]: {
        type: ErrorType.IMAGE_PROCESSING_ERROR,
        statusCode: 500,
        userMessage: 'Unable to process image. Please try again',
        retryable: true,
        logLevel: 'warn'
      },
      [ErrorType.VALIDATION_ERROR]: {
        type: ErrorType.VALIDATION_ERROR,
        statusCode: 400,
        userMessage: 'Please check your input and try again',
        retryable: false,
        logLevel: 'info'
      },

      // File & System
      [ErrorType.FILE_UPLOAD_ERROR]: {
        type: ErrorType.FILE_UPLOAD_ERROR,
        statusCode: 400,
        userMessage: 'Unable to upload file. Please try again',
        retryable: true,
        logLevel: 'warn'
      },
      [ErrorType.SYSTEM_ERROR]: {
        type: ErrorType.SYSTEM_ERROR,
        statusCode: 500,
        userMessage: 'Service temporarily unavailable. Please try again later',
        retryable: true,
        logLevel: 'error'
      },
      [ErrorType.CONFIGURATION_ERROR]: {
        type: ErrorType.CONFIGURATION_ERROR,
        statusCode: 500,
        userMessage: 'Service configuration error. Please contact support',
        retryable: false,
        logLevel: 'error'
      },

      // Application Specific
      [ErrorType.SONG_NOT_FOUND]: {
        type: ErrorType.SONG_NOT_FOUND,
        statusCode: 404,
        userMessage: 'Song not found. Please check the track information',
        retryable: false,
        logLevel: 'info'
      },
      [ErrorType.COVER_GENERATION_FAILED]: {
        type: ErrorType.COVER_GENERATION_FAILED,
        statusCode: 500,
        userMessage: 'Unable to create cover. Please try again',
        retryable: true,
        logLevel: 'warn'
      },
      [ErrorType.USER_DATA_INCOMPLETE]: {
        type: ErrorType.USER_DATA_INCOMPLETE,
        statusCode: 400,
        userMessage: 'Please complete your profile to continue',
        retryable: false,
        logLevel: 'info'
      }
    };

    return configs[errorType] || {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'An unexpected error occurred',
      retryable: true,
      logLevel: 'error'
    };
  }

  // Create standardized error
  createError(
    errorType: ErrorType,
    message: string,
    originalError?: Error,
    metadata?: Record<string, any>
  ): AppError {
    const config = this.getErrorConfig(errorType);

    return {
      ...config,
      message,
      originalError,
      metadata
    };
  }

  // Handle and log errors consistently
  handleError(
    error: unknown,
    context?: string,
    metadata?: Record<string, any>
  ): AppError {

    // Try to determine error type from error message/pattern
    let errorType = ErrorType.SYSTEM_ERROR;
    let message = 'An error occurred';

    if (error instanceof Error) {
      message = error.message;

      // Categorize based on error message
      if (message.includes('timeout')) {
        errorType = ErrorType.API_TIMEOUT;
      } else if (message.includes('rate limit')) {
        errorType = ErrorType.API_RATE_LIMITED;
      } else if (message.includes('network')) {
        errorType = ErrorType.NETWORK_ERROR;
      } else if (message.includes('redis') || message.includes('Redis')) {
        errorType = ErrorType.REDIS_ERROR;
      } else if (message.includes('AI') || message.includes('stable-diffusion')) {
        errorType = ErrorType.AI_GENERATION_FAILED;
      } else if (message.includes('validation')) {
        errorType = ErrorType.VALIDATION_ERROR;
      }
    }

    const appError = this.createError(errorType, message, error as Error, metadata);

    // Log error appropriately
    this.logError(appError, context);

    return appError;
  }

  // Centralized logging with appropriate levels
  private logError(appError: AppError, context?: string): void {
    const logMessage = context
      ? `[${context}] ${appError.message}`
      : appError.message;

    const logData = {
      type: appError.type,
      status: appError.statusCode,
      metadata: appError.metadata
    };

    switch (appError.logLevel) {
      case 'debug':
        console.debug(logMessage, logData);
        break;
      case 'info':
        console.info(logMessage, logData);
        break;
      case 'warn':
        console.warn(logMessage, logData);
        break;
      case 'error':
      default:
        console.error(logMessage, logData);
        break;
    }

    // Additional logging for critical errors
    if (appError.logLevel === 'error' && appError.statusCode >= 500) {
      console.error('🔴 CRITICAL ERROR:', {
        ...logData,
        stack: appError.originalError?.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Helper for API responses
  toAPIResponse(appError: AppError): { error: { message: string; code: string } } {
    return {
      error: {
        message: appError.userMessage,
        code: appError.type
      }
    };
  }

  // Helper for user-facing display
  toUserDisplay(appError: AppError): string {
    return appError.userMessage;
  }

  // Check if error is retryable
  isRetryable(appError: AppError): boolean {
    // Add intelligent retry logic based on error type
    if (appError.type === ErrorType.AI_GENERATION_FAILED && appError.metadata?.attempts) {
      // Limit AI retries to prevent API abuse
      return appError.metadata.attempts < 3;
    }

    return appError.retryable;
  }
}

// Export singleton instance for easy use
export const errorHandler = ErrorHandler.getInstance();

// Convenience function for quick error handling
export const handleError = (
  error: unknown,
  context?: string,
  metadata?: Record<string, any>
): AppError => {
  return errorHandler.handleError(error, context, metadata);
};

// Trigger error for component rendering
export const createError = (
  errorType: ErrorType,
  message: string,
  originalError?: Error,
  metadata?: Record<string, any>
): AppError => {
  return errorHandler.createError(errorType, message, originalError, metadata);
};
