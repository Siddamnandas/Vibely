"use server";

/**
 * @fileOverview An AI agent that analyzes user photos and matches them to song moods.
 *
 * - analyzeUserPhotos - A function that handles the photo analysis and mood matching process.
 * - AnalyzeUserPhotosInput - The input type for the analyzeUserPhotos function.
 * - AnalyzeUserPhotosOutput - The return type for the analyzeUserPhotos function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const AnalyzeUserPhotosInputSchema = z.object({
  photos: z
    .array(
      z.object({
        id: z.string().describe("The unique identifier for the photo."),
        dataUri: z
          .string()
          .describe("The photo data URI, which must include a MIME type and use Base64 encoding."),
      }),
    )
    .describe("An array of photo objects to be analyzed."),
  songMood: z.string().describe("The mood of the song (e.g., happy, chill, sad, energetic)."),
});
export type AnalyzeUserPhotosInput = z.infer<typeof AnalyzeUserPhotosInputSchema>;

const AnalyzeUserPhotosOutputSchema = z.object({
  matchedPhotoId: z.string().describe("The ID of the photo that best matches the song mood."),
  matchConfidence: z
    .number()
    .describe("A numerical value (0-1) indicating the confidence of the match."),
  matchJustification: z.string().describe("A brief explanation for why the photo was chosen."),
});
export type AnalyzeUserPhotosOutput = z.infer<typeof AnalyzeUserPhotosOutputSchema>;

export async function analyzeUserPhotos(
  input: AnalyzeUserPhotosInput,
): Promise<AnalyzeUserPhotosOutput> {
  return analyzeUserPhotosFlow(input);
}

const prompt = ai.definePrompt({
  name: "analyzeUserPhotosPrompt",
  input: { schema: AnalyzeUserPhotosInputSchema },
  output: { schema: AnalyzeUserPhotosOutputSchema },
  prompt: `You are an expert AI art director. Your task is to analyze a collection of user photos and select the single best one to serve as an album cover for a song with a specific mood.

Consider the following when making your choice:
- **Emotional Resonance:** How well does the photo's feeling match the song's mood?
- **Color Harmony:** Do the colors in the photo complement the described mood?
- **Subject Matter:** Is the subject of the photo (person, place, object) a good fit for the mood?
- **Composition:** Is the photo visually interesting and suitable for a square album cover format?

You will be given a song mood and an array of photo objects, each with an 'id' and a 'dataUri'.

Your task is to select the photo that best matches the song's mood. Return the 'id' of the selected photo, a confidence score (0-1), and a brief, one-sentence justification for your choice.

Song Mood: {{{songMood}}}

Photos:
{{#each photos}}
- ID: {{{this.id}}}, Photo: {{media url=this.dataUri}}
{{/each}}`,
});

const analyzeUserPhotosFlow = ai.defineFlow(
  {
    name: "analyzeUserPhotosFlow",
    inputSchema: AnalyzeUserPhotosInputSchema,
    outputSchema: AnalyzeUserPhotosOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  },
);
