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
import { generatePhotoMatchingContext, type AudioFeatures } from "@/lib/mood-analyzer";

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
  songMood: z
    .string()
    .describe(
      "The detailed mood description of the song including emotions, descriptors, and visual themes.",
    ),
  tempo: z.number().optional().describe("The tempo of the song in BPM."),
  energy: z.number().optional().describe("The energy level of the song (0-1)."),
  valence: z.number().optional().describe("The emotional valence of the song (0-1)."),
  danceability: z.number().optional().describe("The danceability of the song (0-1)."),
  acousticness: z.number().optional().describe("The acousticness of the song (0-1)."),
  mode: z.number().optional().describe("The mode of the song (0=minor, 1=major)."),
  colorPalette: z.array(z.string()).optional().describe("Suggested color palette for the mood."),
  visualThemes: z.array(z.string()).optional().describe("Visual themes that match the song mood."),
  photoSelectionGuidance: z
    .string()
    .optional()
    .describe("Specific guidance for photo selection based on mood analysis."),
});
export type AnalyzeUserPhotosInput = z.infer<typeof AnalyzeUserPhotosInputSchema>;

const AnalyzeUserPhotosOutputSchema = z.object({
  matchedPhotoId: z.string().describe("The ID of the photo that best matches the song mood."),
  matchConfidence: z
    .number()
    .describe("A numerical value (0-1) indicating the confidence of the match."),
  matchJustification: z.string().describe("A detailed explanation for why the photo was chosen."),
  alternativePhotoId: z
    .string()
    .optional()
    .describe("The ID of a second-best matching photo for variety."),
  moodAlignment: z
    .object({
      emotionalResonance: z
        .number()
        .describe("How well the photo's emotion matches the song (0-1)."),
      colorHarmony: z.number().describe("How well the photo's colors complement the mood (0-1)."),
      visualThemeMatch: z.number().describe("How well the photo matches the visual themes (0-1)."),
      compositionSuitability: z
        .number()
        .describe("How suitable the photo is for album cover composition (0-1)."),
    })
    .describe("Detailed breakdown of how the photo aligns with the song mood."),
});
export type AnalyzeUserPhotosOutput = z.infer<typeof AnalyzeUserPhotosOutputSchema>;

export async function analyzeUserPhotos(
  input: AnalyzeUserPhotosInput,
): Promise<AnalyzeUserPhotosOutput> {
  try {
    // Enhanced input validation
    if (!input.photos || input.photos.length === 0) {
      throw new Error("No photos provided for analysis");
    }

    if (input.photos.length > 20) {
      console.warn("Too many photos provided, limiting to first 20");
      input.photos = input.photos.slice(0, 20);
    }

    return await analyzeUserPhotosFlow(input);
  } catch (error) {
    console.error("Photo analysis failed:", error);
    // Enhanced fallback with better reasoning
    const fallbackReason =
      error instanceof Error
        ? `Analysis failed due to: ${error.message}. Using first photo as safe fallback.`
        : "Unable to perform detailed analysis. Selected first available photo as fallback.";

    return {
      matchedPhotoId: input.photos[0]?.id || "unknown",
      matchConfidence: 0.3,
      matchJustification: fallbackReason,
      alternativePhotoId: input.photos[1]?.id,
      moodAlignment: {
        emotionalResonance: 0.3,
        colorHarmony: 0.3,
        visualThemeMatch: 0.3,
        compositionSuitability: 0.5,
      },
    };
  }
}

/**
 * Creates enhanced photo analysis input from audio features and metadata
 */
export async function createPhotoAnalysisInput(
  photos: Array<{ id: string; dataUri: string }>,
  audioFeatures: Partial<AudioFeatures>,
  metadata?: { title: string; artist: string; genre?: string },
): Promise<AnalyzeUserPhotosInput> {
  const context = generatePhotoMatchingContext(audioFeatures, metadata);

  return {
    photos,
    songMood: context.description,
    tempo: audioFeatures.tempo,
    energy: audioFeatures.energy,
    valence: audioFeatures.valence,
    danceability: audioFeatures.danceability,
    acousticness: audioFeatures.acousticness,
    mode: audioFeatures.mode,
    colorPalette: context.enhancedColorPalette,
    visualThemes: context.mood.visualThemes,
    photoSelectionGuidance: context.photoSelectionGuidance,
  };
}

const prompt = ai.definePrompt({
  name: "analyzeUserPhotosPrompt",
  input: { schema: AnalyzeUserPhotosInputSchema },
  output: { schema: AnalyzeUserPhotosOutputSchema },
  prompt: `You are an expert AI art director specializing in mood-based visual matching for album covers. Your task is to analyze a collection of user photos and select the best one to serve as an album cover for a song with specific mood characteristics.

**Analysis Framework:**

**Emotional Resonance (40% weight):** 
- Does the photo's emotional content match the song's feeling?
- Consider facial expressions, body language, and overall emotional atmosphere
- Look for energy levels that align with the song's intensity
- Assess whether the photo conveys the same emotional valence as the song

**Color Harmony (25% weight):** 
- Do the colors in the photo complement the mood's color palette?
- Consider lighting, saturation, and overall color temperature
- Warm vs cool tones should align with the mood's emotional temperature
- Look for color combinations that enhance the song's vibe

**Visual Theme Alignment (20% weight):** 
- Does the photo's setting/subject match the suggested visual themes?
- Consider indoor vs outdoor, urban vs natural, active vs peaceful settings
- Look for compositional elements that reinforce the mood
- Assess whether the photo's story matches the song's narrative

**Composition Suitability (15% weight):** 
- Is the photo visually interesting and suitable for a square album cover format?
- Consider rule of thirds, focal points, and visual balance
- Ensure there's space for text overlay if needed
- Evaluate overall visual impact and memorability

**Enhanced Context:**
- Song Mood: {{{songMood}}}
- Audio Features: 
  {{#if tempo}}- Tempo: {{tempo}} BPM {{/if}}
  {{#if energy}}- Energy Level: {{energy}} (0-1 scale) {{/if}}
  {{#if valence}}- Emotional Valence: {{valence}} (0-1 scale) {{/if}}
  {{#if danceability}}- Danceability: {{danceability}} (0-1 scale) {{/if}}
  {{#if acousticness}}- Acousticness: {{acousticness}} (0-1 scale) {{/if}}
  {{#if mode}}- Musical Mode: {{#if (eq mode 1)}}Major (bright){{else}}Minor (dark){{/if}} {{/if}}
- Enhanced Color Palette: {{#if colorPalette}}{{#each colorPalette}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
- Visual Themes: {{#if visualThemes}}{{#each visualThemes}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if photoSelectionGuidance}}- Photo Selection Guidance: {{{photoSelectionGuidance}}}{{/if}}

**Instructions:**
1. Analyze each photo against all four criteria
2. Provide detailed scoring for each matching dimension (0-1 scale)
3. Consider the enhanced audio features for more precise matching
4. If multiple photos score similarly, prefer the one with better composition
5. Provide a comprehensive justification explaining your choice
6. Include an alternative photo if there's a close second option

Photos to analyze:
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
