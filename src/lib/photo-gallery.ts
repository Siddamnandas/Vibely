'use client';

interface PhotoFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  lastModified: Date;
  type: string;
}

interface PhotoGalleryConfig {
  maxFileSize: number; // in bytes
  allowedTypes: string[];
  maxPhotos: number;
}

const DEFAULT_CONFIG: PhotoGalleryConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
  maxPhotos: 50,
};

class PhotoGalleryService {
  private config: PhotoGalleryConfig;
  private selectedPhotos: Map<string, PhotoFile> = new Map();

  constructor(config: Partial<PhotoGalleryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Request permission to access photos (Web API doesn't require explicit permission)
   */
  async requestPermission(): Promise<boolean> {
    // Check if File API is supported
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
      console.warn('File APIs are not fully supported in this browser');
      return false;
    }

    // For web apps, we use file input instead of direct gallery access
    // This is privacy-compliant as it requires user interaction
    return true;
  }

  /**
   * Check if photo gallery access is available
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 
           'File' in window && 
           'FileReader' in window;
  }

  /**
   * Open file picker to select photos from device
   */
  async selectPhotosFromDevice(): Promise<PhotoFile[]> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        reject(new Error('Photo gallery access not available'));
        return;
      }

      // Create hidden file input
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = this.config.allowedTypes.join(',');
      input.style.display = 'none';

      input.addEventListener('change', async (event) => {
        try {
          const files = (event.target as HTMLInputElement).files;
          if (!files) {
            resolve([]);
            return;
          }

          const photoFiles = await this.processSelectedFiles(files);
          resolve(photoFiles);
        } catch (error) {
          reject(error);
        } finally {
          // Clean up
          document.body.removeChild(input);
        }
      });

      input.addEventListener('cancel', () => {
        document.body.removeChild(input);
        resolve([]);
      });

      // Add to DOM and trigger click
      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Process selected files and convert to PhotoFile objects
   */
  private async processSelectedFiles(files: FileList): Promise<PhotoFile[]> {
    const photoFiles: PhotoFile[] = [];
    const validFiles = Array.from(files).filter(file => this.validateFile(file));

    for (const file of validFiles.slice(0, this.config.maxPhotos)) {
      try {
        const url = await this.createObjectURL(file);
        const photoFile: PhotoFile = {
          id: this.generateId(),
          file,
          url,
          name: file.name,
          size: file.size,
          lastModified: new Date(file.lastModified),
          type: file.type,
        };

        photoFiles.push(photoFile);
        this.selectedPhotos.set(photoFile.id, photoFile);
      } catch (error) {
        console.error('Failed to process file:', file.name, error);
      }
    }

    return photoFiles;
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: File): boolean {
    // Check file type
    if (!this.config.allowedTypes.includes(file.type)) {
      console.warn(`Unsupported file type: ${file.type}`);
      return false;
    }

    // Check file size
    if (file.size > this.config.maxFileSize) {
      console.warn(`File too large: ${file.size} bytes (max: ${this.config.maxFileSize})`);
      return false;
    }

    return true;
  }

  /**
   * Create object URL for file preview
   */
  private createObjectURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const url = URL.createObjectURL(file);
        resolve(url);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert file to base64 data URL
   */
  async fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert file to array buffer for processing
   */
  async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Resize image for better performance
   */
  async resizeImage(file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get EXIF data from image (basic implementation)
   */
  async getImageMetadata(file: File): Promise<{
    width?: number;
    height?: number;
    orientation?: number;
    dateTaken?: Date;
  }> {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          // Basic metadata only - would need EXIF library for more
        });
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        resolve({});
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get selected photos
   */
  getSelectedPhotos(): PhotoFile[] {
    return Array.from(this.selectedPhotos.values());
  }

  /**
   * Clear selected photos and cleanup URLs
   */
  clearSelectedPhotos(): void {
    this.selectedPhotos.forEach(photo => {
      if (photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
    });
    this.selectedPhotos.clear();
  }

  /**
   * Remove specific photo
   */
  removePhoto(id: string): boolean {
    const photo = this.selectedPhotos.get(id);
    if (photo) {
      if (photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
      this.selectedPhotos.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Get supported file types for display
   */
  getSupportedTypes(): string[] {
    return [...this.config.allowedTypes];
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate unique ID for photos
   */
  private generateId(): string {
    return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Privacy compliance: Check for sensitive content warnings
   */
  async checkPrivacyCompliance(file: File): Promise<{
    isCompliant: boolean;
    warnings: string[];
    suggestions: string[];
  }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic file-based checks
    if (file.size > this.config.maxFileSize) {
      warnings.push('File size exceeds recommended limit');
      suggestions.push(`Resize image to under ${this.formatFileSize(this.config.maxFileSize)}`);
    }

    // Check filename for potential sensitive content
    const sensitiveKeywords = ['private', 'personal', 'id', 'passport', 'license'];
    const fileName = file.name.toLowerCase();
    
    if (sensitiveKeywords.some(keyword => fileName.includes(keyword))) {
      warnings.push('Filename may indicate sensitive content');
      suggestions.push('Ensure image does not contain personal identification');
    }

    return {
      isCompliant: warnings.length === 0,
      warnings,
      suggestions: [
        'Only upload photos you own or have permission to use',
        'Avoid photos with personal information visible',
        'Consider the privacy of others in the photo',
        ...suggestions,
      ],
    };
  }
}

// Export singleton instance
export const photoGallery = new PhotoGalleryService();

export type { PhotoFile, PhotoGalleryConfig };