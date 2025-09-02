"use server";

/**
 * @fileOverview Flow for generating album covers by replacing the original artwork with an AI-matched photo from the user's gallery.
 *
 * - generateAlbumCover - A function that generates an album cover.
 * - GenerateAlbumCoverInput - The input type for the generateAlbumCover function, which includes user photo, song details, and original cover.
 * - GenerateAlbumCoverOutput - The return type for the generateAlbumCover function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const GenerateAlbumCoverInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo from the user's gallery, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'.",
    ),
  songTitle: z.string().describe("The title of the song."),
  artistName: z.string().describe("The name of the artist."),
  originalCoverDataUri: z
    .string()
    .describe(
      "The original album cover as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'.",
    ),
});
export type GenerateAlbumCoverInput = z.infer<typeof GenerateAlbumCoverInputSchema>;

const GenerateAlbumCoverOutputSchema = z.object({
  generatedCoverUris: z.array(z.string()).describe("An array of generated album cover data URIs."),
});
export type GenerateAlbumCoverOutput = z.infer<typeof GenerateAlbumCoverOutputSchema>;

export async function generateAlbumCover(
  input: GenerateAlbumCoverInput,
): Promise<GenerateAlbumCoverOutput> {
  // Enhanced input validation and processing
  if (!input.originalCoverDataUri?.includes("data:image/")) {
    throw new Error("Original cover must be a valid data URI image");
  }
  if (!input.photoDataUri?.includes("data:image/")) {
    throw new Error("User photo must be a valid data URI image");
  }

  return generateAlbumCoverFlow(input);
}

const generateAlbumCoverFlow = ai.defineFlow(
  {
    name: "generateAlbumCoverFlow",
    inputSchema: GenerateAlbumCoverInputSchema,
    outputSchema: GenerateAlbumCoverOutputSchema,
  },
  async (input) => {
    const numberOfVariants = 3; // Define how many variants you want
    const generatedCoverUris: string[] = [];

    for (let i = 0; i < numberOfVariants; i++) {
      // You might slightly vary the prompt or add a random element here
      // to encourage different variations in the generated output.
      // For now, we'll use the same prompt for simplicity.
      const { media } = await ai.generate({
        model: "googleai/gemini-2.0-flash-preview-image-generation",
        prompt: [
          {
            text: `You are an expert album cover designer. Your task is to seamlessly integrate the user\'s photo into the original album cover.\n\n- **Main Objective**: Replace the central artwork of the original cover with the user\'s photo.\n- **Preserve Elements**: You MUST keep the original album\'s text (title, artist name), logos, and overall layout exactly as they are. Do not change fonts, text placement, or colors.\n- **Enhanced Quality**: Apply advanced photo editing techniques including:\n  * Facial inpainting with seamless boundary blending\n  * Hair and accessory preservation with natural texture matching\n  * Lighting adjustment to match the original scene\'s key, fill, and rim lighting\n  * Shadows/reflection preservation with occluder geometry preservation\n  * Film grain texture re-application for visual consistency\n  * Color palette adaptation to match the original color grading\n  * Edge refinement around hair, hats, and accessories\n- **Blend**: The final image should look like a cohesive, professional album cover that appears unchanged except for the person being replaced.\n\nSong Title: ${input.songTitle}\nArtist: ${input.artistName}\n\nNote: If the original cover contains multiple people, replace ONLY the primary subject while keeping other people\'s positions and appearance unchanged. Maintain exact spatial relationships between all subjects.`,
          },
          { media: { url: input.originalCoverDataUri } },
          { media: { url: input.photoDataUri } },
        ],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      });

      if (!media?.url) {
        console.warn(`Image generation failed for variant ${i + 1}.`);
        // Optionally handle this error, e.g., retry or skip this variant
      } else {
        generatedCoverUris.push(media.url);
      }
    }

    if (generatedCoverUris.length === 0) {
      throw new Error("Image generation failed to produce any output variants.");
    }

    return { generatedCoverUris: generatedCoverUris };
  },
);
