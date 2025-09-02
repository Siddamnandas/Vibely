"use server";

import { analyzeUserPhotos } from "@/ai/flows/analyze-user-photos";
import { generateAlbumCover } from "@/ai/flows/generate-album-cover";
import { songs, userPhotos, savedStories, user, getMoodForPhotoSelection } from "@/lib/data";
import { photoMoodMatcher, type PhotoData } from "@/lib/photo-mood-matcher";
import { revalidatePath } from "next/cache";
import { track as trackEvent } from "@/lib/analytics";

async function urlToDataUri(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText} from ${url}`);
    }
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    const dataUri = `data:${blob.type};base64,${buffer.toString("base64")}`;
    return dataUri;
  } catch (error) {
    console.error("Error converting URL to Data URI:", error);
    throw new Error("Could not process image URL.");
  }
}

export async function generateCoverAction(prevState: any, formData: FormData) {
  if (
    user.subscriptionTier === "Freemium" &&
    user.coversGeneratedThisMonth >= user.maxCoversPerMonth
  ) {
    return {
      ...prevState,
      error: `You've reached your monthly limit of ${user.maxCoversPerMonth} free covers. Please upgrade to Premium to continue.`,
    };
  }

  const songId = formData.get("songId") as string;
  const photoIds = formData.getAll("photoIds") as string[];
  const useAdvancedMatching = formData.get("useAdvancedMatching") === "true";

  const song = songs.find((s) => s.id === songId);
  if (!song) {
    return { ...prevState, error: "Song not found." };
  }

  const photos = userPhotos.filter((p) => photoIds.includes(p.id));
  if (photos.length === 0) {
    return { ...prevState, error: "No photos provided." };
  }

  try {
    const photosWithDataUris: PhotoData[] = await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        dataUri: await urlToDataUri(p.url),
        url: p.url,
      })),
    );

    const originalCoverDataUri = await urlToDataUri(song.originalCoverUrl);

    let matchResult;
    let analysisResult;

    if (useAdvancedMatching && song.detailedMood) {
      // Use the new advanced photo-mood matching system
      matchResult = await photoMoodMatcher.matchTrackWithPhotos(song, photosWithDataUris, {
        minConfidence: 0.4,
        preferAlternatives: true,
      });

      analysisResult = {
        matchedPhotoId: matchResult.matchedPhotoId,
        matchConfidence: matchResult.confidence,
        matchJustification: matchResult.justification,
        moodAlignment: matchResult.detailedScoring,
      };

      trackEvent("advanced_photo_matching_used", {
        song_id: songId,
        confidence: matchResult.confidence,
        mood: song.detailedMood.primary,
        photo_count: photos.length,
      });
    } else {
      const moodDescription = getMoodForPhotoSelection(song);

      analysisResult = await analyzeUserPhotos({
        photos: photosWithDataUris.map((p) => ({ id: p.id, dataUri: p.dataUri })),
        songMood: moodDescription,
        tempo: song.tempo,
        energy: song.energy,
        colorPalette: song.detailedMood?.colorPalette,
        visualThemes: song.detailedMood?.visualThemes,
      });
    }

    if (!analysisResult.matchedPhotoId) {
      return { ...prevState, error: "AI could not determine a matching photo." };
    }

    const matchedPhoto = photosWithDataUris.find((p) => p.id === analysisResult.matchedPhotoId);
    if (!matchedPhoto) {
      return { ...prevState, error: "Matched photo data not found." };
    }

    const generationResult = await generateAlbumCover({
      photoDataUri: matchedPhoto.dataUri,
      songTitle: song.title,
      artistName: song.artist,
      originalCoverDataUri: originalCoverDataUri,
    });

    trackEvent("cover_generated", {
      song_id: songId,
      photo_id: analysisResult.matchedPhotoId,
      confidence: analysisResult.matchConfidence,
      subscription_tier: user.subscriptionTier,
      advanced_matching: useAdvancedMatching,
    });

    // Update user usage count
    if (user.subscriptionTier === "Freemium") {
      user.coversGeneratedThisMonth++;
    }

    return {
      ...prevState,
      generatedCoverUri: generationResult.generatedCoverUris?.[0] || null,
      matchedPhotoId: analysisResult.matchedPhotoId,
      confidence: analysisResult.matchConfidence,
      moodAlignment: analysisResult.moodAlignment,
      alternativePhotoId: matchResult?.alternativePhotoId,
      recommendedVariants: matchResult?.recommendedVariants || 1,
      error: null,
    };
  } catch (error) {
    console.error("An error occurred during album art generation:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    trackEvent("cover_generation_failed", {
      song_id: songId,
      error: errorMessage,
      subscription_tier: user.subscriptionTier,
    });

    return { ...prevState, error: `Generation failed: ${errorMessage}` };
  }
}

export async function saveStoryAction(formData: FormData) {
  const generatedCoverUri = formData.get("generatedCoverUri") as string;
  const songId = formData.get("songId") as string;
  const confidence = parseFloat(formData.get("confidence") as string) || 0;
  const matchedPhotoId = formData.get("matchedPhotoId") as string;

  const song = songs.find((s) => s.id === songId);
  if (!song) {
    return { success: false, error: "Song not found." };
  }

  const newStory = {
    id: `s${Date.now()}`,
    title: song.title,
    artist: song.artist,
    generatedCoverUrl: generatedCoverUri,
    confidence,
    matchedPhotoId,
    createdAt: new Date().toISOString(),
    mood: song.detailedMood?.primary || song.mood,
  };

  savedStories.unshift(newStory);

  // Track story saving
  trackEvent("story_saved", {
    song_id: songId,
    confidence,
    mood: newStory.mood,
  });

  revalidatePath("/stories");

  return { success: true, error: null };
}

/**
 * Batch regenerate covers for multiple tracks using advanced photo matching
 */
export async function batchRegenerateCoverAction(
  tracks: { id: string; title: string; artist: string }[],
  photoIds: string[],
  progressCallback?: (completed: number, total: number) => void,
) {
  if (user.subscriptionTier === "Freemium") {
    const remainingCovers = user.maxCoversPerMonth - user.coversGeneratedThisMonth;
    if (tracks.length > remainingCovers) {
      return {
        success: false,
        error: `You can only generate ${remainingCovers} more covers this month. Upgrade to Premium for unlimited covers.`,
      };
    }
  }

  try {
    const vibelyTracks = tracks
      .map((t) => songs.find((s) => s.id === t.id))
      .filter(Boolean) as any[];
    const photos = userPhotos.filter((p) => photoIds.includes(p.id));

    const photosWithDataUris: PhotoData[] = await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        dataUri: await urlToDataUri(p.url),
        url: p.url,
      })),
    );

    // Use batch matching for efficiency
    const batchResult = await photoMoodMatcher.batchMatchTracks(vibelyTracks, photosWithDataUris, {
      concurrency: 2, // Process 2 tracks at a time
      progressCallback,
      minConfidence: 0.3,
    });

    // Track batch operation
    trackEvent("batch_regeneration_completed", {
      track_count: tracks.length,
      success_rate:
        batchResult.processingStats.successfulMatches / batchResult.processingStats.totalTracks,
      average_confidence: batchResult.processingStats.averageConfidence,
      processing_time_ms: batchResult.processingStats.processingTimeMs,
    });

    return {
      success: true,
      results: batchResult.results,
      stats: batchResult.processingStats,
      error: null,
    };
  } catch (error) {
    console.error("Batch regeneration failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Batch regeneration failed",
    };
  }
}
