/**
 * @fileOverview Advanced photo-mood matching service for Vibely
 * Integrates detailed mood analysis with photo selection and confidence scoring
 */

import { analyzeUserPhotos, createPhotoAnalysisInput } from "@/ai/flows/analyze-user-photos";
import {
  generateMoodDescription,
  generatePhotoMatchingContext,
  type DetailedMood,
} from "./mood-analyzer";
import { getMoodForPhotoSelection, type VibelyTrack } from "./data";

export interface PhotoMatchResult {
  matchedPhotoId: string;
  alternativePhotoId?: string;
  confidence: number;
  justification: string;
  detailedScoring: {
    emotionalResonance: number;
    colorHarmony: number;
    visualThemeMatch: number;
    compositionSuitability: number;
  };
  recommendedVariants: number; // 1-3 variants suggested
}

export interface PhotoData {
  id: string;
  dataUri: string;
  url?: string;
}

export interface BatchMatchResult {
  results: Record<string, PhotoMatchResult>; // trackId -> result
  overallConfidence: number;
  processingStats: {
    totalTracks: number;
    successfulMatches: number;
    failedMatches: number;
    averageConfidence: number;
    processingTimeMs: number;
  };
}

export class PhotoMoodMatcher {
  private cache = new Map<string, PhotoMatchResult>();
  private retryAttempts = 3;

  /**
   * Matches a single track with user photos using advanced mood analysis
   */
  async matchTrackWithPhotos(
    track: VibelyTrack,
    photos: PhotoData[],
    options: {
      useCache?: boolean;
      minConfidence?: number;
      preferAlternatives?: boolean;
    } = {},
  ): Promise<PhotoMatchResult> {
    const { useCache = true, minConfidence = 0.5, preferAlternatives = true } = options;

    // Create cache key based on track mood and photo IDs
    const cacheKey = this.createCacheKey(track, photos);

    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const startTime = Date.now();

    try {
      // Get detailed mood description for better photo matching
      let analysisInput;

      if (track.audioFeatures) {
        // Use enhanced mood analysis with full audio features
        analysisInput = await createPhotoAnalysisInput(
          photos.map((p) => ({ id: p.id, dataUri: p.dataUri })),
          track.audioFeatures,
          {
            title: track.title,
            artist: track.artist,
            genre: track.genre,
          },
        );
      } else {
        // Fallback to basic mood description
        const moodDescription = track.detailedMood
          ? generateMoodDescription(track.detailedMood)
          : getMoodForPhotoSelection(track);

        const audioFeatures = track.audioFeatures as
          | {
              valence?: number;
              danceability?: number;
              acousticness?: number;
              mode?: number;
            }
          | undefined;

        analysisInput = {
          photos: photos.map((p) => ({ id: p.id, dataUri: p.dataUri })),
          songMood: moodDescription,
          tempo: track.tempo,
          energy: track.energy,
          valence: audioFeatures?.valence || 0.5,
          danceability: audioFeatures?.danceability || 0.5,
          acousticness: audioFeatures?.acousticness || 0.5,
          mode: audioFeatures?.mode || 1,
          colorPalette: track.detailedMood?.colorPalette,
          visualThemes: track.detailedMood?.visualThemes,
        };
      }

      const result = await this.analyzeWithRetry(analysisInput);

      // Validate result quality
      if (result.matchConfidence < minConfidence) {
        console.warn(`Low confidence match (${result.matchConfidence}) for track ${track.id}`);
      }

      const matchResult: PhotoMatchResult = {
        matchedPhotoId: result.matchedPhotoId,
        alternativePhotoId: result.alternativePhotoId,
        confidence: result.matchConfidence,
        justification: result.matchJustification,
        detailedScoring: result.moodAlignment,
        recommendedVariants: this.calculateRecommendedVariants(
          result.moodAlignment,
          track.detailedMood,
        ),
      };

      // Cache successful results
      if (useCache && result.matchConfidence >= minConfidence) {
        this.cache.set(cacheKey, matchResult);
      }

      return matchResult;
    } catch (error) {
      console.error(`Photo matching failed for track ${track.id}:`, error);

      // Return fallback result
      return {
        matchedPhotoId: photos[0]?.id || "unknown",
        confidence: 0.3,
        justification: "Fallback selection due to analysis failure",
        detailedScoring: {
          emotionalResonance: 0.3,
          colorHarmony: 0.3,
          visualThemeMatch: 0.3,
          compositionSuitability: 0.5,
        },
        recommendedVariants: 1,
      };
    }
  }

  /**
   * Batch process multiple tracks for playlist regeneration
   */
  async batchMatchTracks(
    tracks: VibelyTrack[],
    photos: PhotoData[],
    options: {
      concurrency?: number;
      progressCallback?: (completed: number, total: number) => void;
      minConfidence?: number;
    } = {},
  ): Promise<BatchMatchResult> {
    const { concurrency = 3, progressCallback, minConfidence = 0.5 } = options;
    const startTime = Date.now();

    const results: Record<string, PhotoMatchResult> = {};
    const chunks = this.chunkArray(tracks, concurrency);

    let completed = 0;
    let successfulMatches = 0;
    let failedMatches = 0;
    let totalConfidence = 0;

    for (const chunk of chunks) {
      const promises = chunk.map(async (track) => {
        try {
          const result = await this.matchTrackWithPhotos(track, photos, { minConfidence });
          results[track.id] = result;

          if (result.confidence >= minConfidence) {
            successfulMatches++;
          } else {
            failedMatches++;
          }
          totalConfidence += result.confidence;

          completed++;
          progressCallback?.(completed, tracks.length);

          return result;
        } catch (error) {
          console.error(`Batch matching failed for track ${track.id}:`, error);
          failedMatches++;
          completed++;
          progressCallback?.(completed, tracks.length);
          throw error;
        }
      });

      await Promise.allSettled(promises);
    }

    const processingTimeMs = Date.now() - startTime;
    const averageConfidence = tracks.length > 0 ? totalConfidence / tracks.length : 0;

    return {
      results,
      overallConfidence: averageConfidence,
      processingStats: {
        totalTracks: tracks.length,
        successfulMatches,
        failedMatches,
        averageConfidence,
        processingTimeMs,
      },
    };
  }

  /**
   * Get recommended photo for a track with fallback options
   */
  async getRecommendedPhoto(
    track: VibelyTrack,
    photos: PhotoData[],
    options: {
      includeAlternatives?: boolean;
      minConfidence?: number;
    } = {},
  ): Promise<{ primary: PhotoData; alternatives: PhotoData[]; confidence: number }> {
    const { includeAlternatives = true, minConfidence = 0.5 } = options;

    const matchResult = await this.matchTrackWithPhotos(track, photos, { minConfidence });

    const primaryPhoto = photos.find((p) => p.id === matchResult.matchedPhotoId);
    const alternativePhoto = matchResult.alternativePhotoId
      ? photos.find((p) => p.id === matchResult.alternativePhotoId)
      : null;

    const alternatives: PhotoData[] = [];

    if (includeAlternatives) {
      // Add the alternative photo if available
      if (alternativePhoto) {
        alternatives.push(alternativePhoto);
      }

      // Add other high-scoring photos based on individual criteria
      const scoredPhotos = await this.scoreAllPhotos(track, photos);
      const highScoringAlternatives = scoredPhotos
        .filter(
          (p) => p.id !== matchResult.matchedPhotoId && p.id !== matchResult.alternativePhotoId,
        )
        .filter((p) => p.averageScore >= 0.6)
        .slice(0, 2)
        .map((p) => photos.find((photo) => photo.id === p.id)!)
        .filter(Boolean);

      alternatives.push(...highScoringAlternatives);
    }

    return {
      primary: primaryPhoto || photos[0],
      alternatives,
      confidence: matchResult.confidence,
    };
  }

  /**
   * Clear the matching cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would track hits/misses in production
    };
  }

  // Private helper methods

  private createCacheKey(track: VibelyTrack, photos: PhotoData[]): string {
    const photoIds = photos
      .map((p) => p.id)
      .sort()
      .join(",");
    const moodKey = track.detailedMood
      ? `${track.detailedMood.primary}-${track.detailedMood.confidence}`
      : track.mood;
    return `${track.id}-${moodKey}-${photoIds}`;
  }

  private async analyzeWithRetry(input: any): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await analyzeUserPhotos(input);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Photo analysis attempt ${attempt} failed:`, error);

        if (attempt < this.retryAttempts) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error("All retry attempts failed");
  }

  private calculateRecommendedVariants(
    scoring: {
      emotionalResonance: number;
      colorHarmony: number;
      visualThemeMatch: number;
      compositionSuitability: number;
    },
    detailedMood?: DetailedMood,
  ): number {
    const averageScore = Object.values(scoring).reduce((sum, score) => sum + score, 0) / 4;

    // High confidence matches get more variants
    if (averageScore >= 0.8) return 3;
    if (averageScore >= 0.6) return 2;
    return 1;
  }

  private async scoreAllPhotos(
    track: VibelyTrack,
    photos: PhotoData[],
  ): Promise<Array<{ id: string; averageScore: number }>> {
    // This would ideally call the AI to score each photo individually
    // For now, return mock scores based on photo order
    return photos.map((photo, index) => ({
      id: photo.id,
      averageScore: Math.max(0.3, 1 - index * 0.1),
    }));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Singleton instance for app-wide use
export const photoMoodMatcher = new PhotoMoodMatcher();
