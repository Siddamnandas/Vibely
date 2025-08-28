"use client";

import { useState, useCallback, useEffect } from "react";
import { photoGallery, PhotoFile } from "@/lib/photo-gallery";

interface PhotoGalleryState {
  photos: PhotoFile[];
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  isSupported: boolean;
}

export function usePhotoGallery() {
  const [state, setState] = useState<PhotoGalleryState>({
    photos: [],
    isLoading: false,
    error: null,
    hasPermission: false,
    isSupported: false,
  });

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      const isSupported = photoGallery.isAvailable();
      const hasPermission = isSupported ? await photoGallery.requestPermission() : false;

      setState((prev) => ({
        ...prev,
        isSupported,
        hasPermission,
      }));
    };

    checkAvailability();
  }, []);

  // Select photos from device
  const selectPhotos = useCallback(async () => {
    if (!state.isSupported || !state.hasPermission) {
      setState((prev) => ({
        ...prev,
        error: "Photo gallery access not available or permission denied",
      }));
      return [];
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const selectedPhotos = await photoGallery.selectPhotosFromDevice();

      setState((prev) => ({
        ...prev,
        photos: [...prev.photos, ...selectedPhotos],
        isLoading: false,
      }));

      return selectedPhotos;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to select photos",
      }));
      return [];
    }
  }, [state.isSupported, state.hasPermission]);

  // Remove photo by ID
  const removePhoto = useCallback((photoId: string) => {
    const success = photoGallery.removePhoto(photoId);

    if (success) {
      setState((prev) => ({
        ...prev,
        photos: prev.photos.filter((photo) => photo.id !== photoId),
      }));
    }

    return success;
  }, []);

  // Clear all photos
  const clearPhotos = useCallback(() => {
    photoGallery.clearSelectedPhotos();
    setState((prev) => ({
      ...prev,
      photos: [],
    }));
  }, []);

  // Convert photo to data URL
  const getPhotoDataURL = useCallback(async (photo: PhotoFile): Promise<string> => {
    try {
      return await photoGallery.fileToDataURL(photo.file);
    } catch (error) {
      throw new Error(
        `Failed to convert photo to data URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, []);

  // Resize photo for better performance
  const resizePhoto = useCallback(
    async (
      photo: PhotoFile,
      maxWidth: number = 800,
      maxHeight: number = 800,
      quality: number = 0.8,
    ): Promise<Blob> => {
      try {
        return await photoGallery.resizeImage(photo.file, maxWidth, maxHeight, quality);
      } catch (error) {
        throw new Error(
          `Failed to resize photo: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
    [],
  );

  // Get image metadata
  const getPhotoMetadata = useCallback(async (photo: PhotoFile) => {
    try {
      return await photoGallery.getImageMetadata(photo.file);
    } catch (error) {
      console.error("Failed to get photo metadata:", error);
      return {};
    }
  }, []);

  // Check privacy compliance
  const checkPhotoPrivacy = useCallback(async (photo: PhotoFile) => {
    try {
      return await photoGallery.checkPrivacyCompliance(photo.file);
    } catch (error) {
      return {
        isCompliant: false,
        warnings: ["Failed to check privacy compliance"],
        suggestions: ["Please manually verify photo privacy"],
      };
    }
  }, []);

  // Get supported file types
  const getSupportedTypes = useCallback(() => {
    return photoGallery.getSupportedTypes();
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    return photoGallery.formatFileSize(bytes);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    ...state,

    // Actions
    selectPhotos,
    removePhoto,
    clearPhotos,
    clearError,

    // Utils
    getPhotoDataURL,
    resizePhoto,
    getPhotoMetadata,
    checkPhotoPrivacy,
    getSupportedTypes,
    formatFileSize,
  };
}
