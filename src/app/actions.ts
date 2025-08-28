"use server";

import { analyzeUserPhotos } from "@/ai/flows/analyze-user-photos";
import { generateAlbumCover } from "@/ai/flows/generate-album-cover";
import { songs, userPhotos, savedStories, user } from "@/lib/data";
import { revalidatePath } from "next/cache";

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
  if (user.subscriptionTier === "Freemium" && user.coversGeneratedThisMonth >= 3) {
    return {
      ...prevState,
      error:
        "You've reached your monthly limit of 3 free covers. Please upgrade to Premium to continue.",
    };
  }

  const songId = formData.get("songId") as string;
  const photoIds = formData.getAll("photoIds") as string[];

  const song = songs.find((s) => s.id === songId);
  if (!song) {
    return { ...prevState, error: "Song not found." };
  }

  const photos = userPhotos.filter((p) => photoIds.includes(p.id));
  if (photos.length === 0) {
    return { ...prevState, error: "No photos provided." };
  }

  try {
    const photosWithDataUris = await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        dataUri: await urlToDataUri(p.url),
      })),
    );

    const originalCoverDataUri = await urlToDataUri(song.originalCoverUrl);

    const analysisResult = await analyzeUserPhotos({
      photos: photosWithDataUris,
      songMood: song.mood,
    });

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

    // In a real app, this would be an atomic DB update.
    if (user.subscriptionTier === "Freemium") {
      user.coversGeneratedThisMonth++;
    }

    return {
      ...prevState,
      generatedCoverUri: generationResult.generatedCoverUri,
      matchedPhotoId: analysisResult.matchedPhotoId,
      error: null,
    };
  } catch (error) {
    console.error("An error occurred during album art generation:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { ...prevState, error: `Generation failed: ${errorMessage}` };
  }
}

export async function saveStoryAction(formData: FormData) {
  const generatedCoverUri = formData.get("generatedCoverUri") as string;
  const songId = formData.get("songId") as string;

  const song = songs.find((s) => s.id === songId);
  if (!song) {
    return { success: false, error: "Song not found." };
  }

  const newStory = {
    id: `s${Date.now()}`,
    title: song.title,
    artist: song.artist,
    generatedCoverUrl: generatedCoverUri,
  };

  savedStories.unshift(newStory);

  revalidatePath("/stories");

  return { success: true, error: null };
}
