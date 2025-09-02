/**
 * @fileOverview Advanced mood analysis system for Vibely tracks
 * Extracts sophisticated mood data from audio features and track metadata
 */

export type MoodCategory =
  | "Happy"
  | "Sad"
  | "Energetic"
  | "Chill"
  | "Calm"
  | "Confident"
  | "Romantic"
  | "Aggressive"
  | "Mysterious"
  | "Nostalgic";

export interface DetailedMood {
  primary: MoodCategory;
  secondary?: MoodCategory;
  confidence: number;
  emotions: string[];
  descriptors: string[];
  colorPalette: string[];
  visualThemes: string[];
}

export interface AudioFeatures {
  valence: number; // 0.0 - 1.0 (negativity to positivity)
  energy: number; // 0.0 - 1.0 (low to high energy)
  tempo: number; // BPM
  danceability: number; // 0.0 - 1.0
  acousticness: number; // 0.0 - 1.0
  instrumentalness: number; // 0.0 - 1.0
  liveness: number; // 0.0 - 1.0
  speechiness: number; // 0.0 - 1.0
  loudness: number; // dB (-60 to 0)
  mode: number; // 0 = minor, 1 = major
}

export interface TrackMetadata {
  title: string;
  artist: string;
  genre?: string;
  releaseYear?: number;
  popularity?: number;
}

/**
 * Analyzes track audio features and metadata to extract detailed mood information
 */
/**
 * Advanced track mood analysis with photo matching optimization
 */
export function analyzeTrackMood(
  audioFeatures: Partial<AudioFeatures>,
  metadata?: Partial<TrackMetadata>,
): DetailedMood {
  const valence = audioFeatures.valence ?? 0.5;
  const energy = audioFeatures.energy ?? 0.5;
  const tempo = audioFeatures.tempo ?? 120;
  const danceability = audioFeatures.danceability ?? 0.5;
  const acousticness = audioFeatures.acousticness ?? 0.5;
  const mode = audioFeatures.mode ?? 1;

  // Primary mood classification using multi-dimensional analysis
  let primary: MoodCategory;
  let secondary: MoodCategory | undefined;
  let confidence = 0.7; // Base confidence

  // Enhanced mood classification logic
  if (valence > 0.7 && energy > 0.7) {
    primary = "Happy";
    secondary = danceability > 0.7 ? "Energetic" : "Confident";
    confidence = 0.9;
  } else if (valence > 0.6 && energy > 0.6 && danceability > 0.6) {
    primary = "Energetic";
    secondary = valence > 0.8 ? "Happy" : "Confident";
    confidence = 0.85;
  } else if (valence < 0.4 && energy < 0.5) {
    primary = "Sad";
    secondary = acousticness > 0.6 ? "Calm" : "Mysterious";
    confidence = 0.8;
  } else if (energy < 0.4 && tempo < 100) {
    primary = "Calm";
    secondary = valence > 0.5 ? "Chill" : "Mysterious";
    confidence = 0.75;
  } else if (valence > 0.4 && valence < 0.7 && energy < 0.6) {
    primary = "Chill";
    secondary = acousticness > 0.5 ? "Calm" : "Nostalgic";
    confidence = 0.8;
  } else if (energy > 0.8 && tempo > 140) {
    primary = "Aggressive";
    secondary = valence > 0.5 ? "Energetic" : "Confident";
    confidence = 0.85;
  } else if (valence > 0.3 && valence < 0.8 && acousticness > 0.6) {
    primary = "Romantic";
    secondary = energy > 0.4 ? "Happy" : "Calm";
    confidence = 0.75;
  } else if (valence < 0.6 && mode === 0) {
    primary = "Mysterious";
    secondary = energy > 0.5 ? "Aggressive" : "Sad";
    confidence = 0.7;
  } else if (tempo < 90 && valence < 0.7) {
    primary = "Nostalgic";
    secondary = valence < 0.4 ? "Sad" : "Calm";
    confidence = 0.75;
  } else {
    primary = "Confident";
    secondary = energy > 0.6 ? "Energetic" : "Chill";
    confidence = 0.6;
  }

  // Generate emotional descriptors
  const emotions = generateEmotions(primary, secondary, { valence, energy, danceability });

  // Generate visual descriptors
  const descriptors = generateDescriptors(primary, secondary, audioFeatures, metadata);

  // Generate color palette suggestions
  const colorPalette = generateColorPalette(primary, { valence, energy, mode });

  // Generate visual themes for photo matching
  const visualThemes = generateVisualThemes(primary, secondary, audioFeatures);

  return {
    primary,
    secondary,
    confidence,
    emotions,
    descriptors,
    colorPalette,
    visualThemes,
  };
}

/**
 * Generates comprehensive mood data for photo analysis AI
 */
export function generatePhotoMatchingContext(
  audioFeatures: Partial<AudioFeatures>,
  metadata?: Partial<TrackMetadata>,
): {
  mood: DetailedMood;
  description: string;
  enhancedColorPalette: string[];
  photoSelectionGuidance: string;
} {
  const mood = analyzeTrackMood(audioFeatures, metadata);
  const description = generateMoodDescription(mood, audioFeatures);
  const enhancedColorPalette = generateEnhancedColorPalette(mood, audioFeatures);

  // Generate specific guidance for photo selection
  const photoSelectionGuidance = generatePhotoSelectionGuidance(mood, audioFeatures);

  return {
    mood,
    description,
    enhancedColorPalette,
    photoSelectionGuidance,
  };
}

/**
 * Generates specific guidance for photo selection based on mood analysis
 */
function generatePhotoSelectionGuidance(
  mood: DetailedMood,
  audioFeatures?: Partial<AudioFeatures>,
): string {
  let guidance = `Look for photos that capture ${mood.primary.toLowerCase()} energy`;

  if (mood.secondary) {
    guidance += ` with hints of ${mood.secondary.toLowerCase()} feeling`;
  }

  guidance += ". ";

  // Add specific photo criteria
  if (audioFeatures?.energy && audioFeatures.energy > 0.7) {
    guidance += "Prefer dynamic, active photos with movement or high energy poses. ";
  } else if (audioFeatures?.energy && audioFeatures.energy < 0.3) {
    guidance += "Look for calm, still photos with peaceful or contemplative expressions. ";
  }

  if (audioFeatures?.valence && audioFeatures.valence > 0.6) {
    guidance += "Choose photos with positive expressions, bright settings, or uplifting scenes. ";
  } else if (audioFeatures?.valence && audioFeatures.valence < 0.4) {
    guidance +=
      "Consider photos with more serious expressions, dramatic lighting, or introspective moods. ";
  }

  // Add color guidance
  guidance += `Color preference: ${mood.colorPalette.slice(0, 3).join(", ")}. `;

  // Add composition guidance
  guidance += `Visual themes to prioritize: ${mood.visualThemes.slice(0, 3).join(", ")}.`;

  return guidance;
}

/**
 * Generates emotional descriptors based on mood categories and audio features
 */
function generateEmotions(
  primary: MoodCategory,
  secondary: MoodCategory | undefined,
  features: { valence: number; energy: number; danceability: number },
): string[] {
  const emotionMap: Record<MoodCategory, string[]> = {
    Happy: ["joyful", "uplifting", "cheerful", "optimistic", "euphoric"],
    Sad: ["melancholic", "somber", "wistful", "bittersweet", "reflective"],
    Energetic: ["dynamic", "powerful", "intense", "vigorous", "electric"],
    Chill: ["relaxed", "laid-back", "mellow", "peaceful", "serene"],
    Calm: ["tranquil", "soothing", "gentle", "meditative", "zen"],
    Confident: ["bold", "assertive", "strong", "determined", "empowered"],
    Romantic: ["passionate", "intimate", "loving", "sensual", "tender"],
    Aggressive: ["fierce", "intense", "raw", "driving", "rebellious"],
    Mysterious: ["enigmatic", "dark", "intriguing", "atmospheric", "ethereal"],
    Nostalgic: ["wistful", "longing", "reminiscent", "vintage", "timeless"],
  };

  const emotions = [...emotionMap[primary]];
  if (secondary) {
    emotions.push(...emotionMap[secondary].slice(0, 2));
  }

  // Add intensity modifiers based on energy
  if (features.energy > 0.8) {
    emotions.push("intense", "explosive");
  } else if (features.energy < 0.3) {
    emotions.push("subtle", "gentle");
  }

  return emotions.slice(0, 6);
}

/**
 * Generates descriptive terms for mood characterization
 */
function generateDescriptors(
  primary: MoodCategory,
  secondary: MoodCategory | undefined,
  audioFeatures: Partial<AudioFeatures>,
  metadata?: Partial<TrackMetadata>,
): string[] {
  const descriptors: string[] = [];

  // Tempo-based descriptors
  const tempo = audioFeatures.tempo ?? 120;
  if (tempo > 140) descriptors.push("fast-paced", "driving");
  else if (tempo < 80) descriptors.push("slow", "deliberate");
  else descriptors.push("moderate", "steady");

  // Energy-based descriptors
  const energy = audioFeatures.energy ?? 0.5;
  if (energy > 0.8) descriptors.push("high-energy", "explosive");
  else if (energy < 0.3) descriptors.push("low-energy", "ambient");

  // Genre-based descriptors
  if (metadata?.genre) {
    const genre = metadata.genre.toLowerCase();
    if (genre.includes("electronic")) descriptors.push("synthetic", "digital");
    if (genre.includes("acoustic")) descriptors.push("organic", "natural");
    if (genre.includes("rock")) descriptors.push("raw", "powerful");
    if (genre.includes("pop")) descriptors.push("catchy", "mainstream");
  }

  // Mood-specific descriptors
  const moodDescriptors: Record<MoodCategory, string[]> = {
    Happy: ["bright", "uplifting", "sunny", "vibrant"],
    Sad: ["dark", "moody", "introspective", "melancholic"],
    Energetic: ["dynamic", "explosive", "intense", "electric"],
    Chill: ["relaxed", "smooth", "flowing", "easy-going"],
    Calm: ["peaceful", "serene", "gentle", "soothing"],
    Confident: ["bold", "strong", "assertive", "empowering"],
    Romantic: ["warm", "intimate", "passionate", "sensual"],
    Aggressive: ["intense", "raw", "fierce", "driving"],
    Mysterious: ["dark", "atmospheric", "enigmatic", "ethereal"],
    Nostalgic: ["vintage", "timeless", "reminiscent", "classic"],
  };

  descriptors.push(...moodDescriptors[primary].slice(0, 3));
  if (secondary) {
    descriptors.push(...moodDescriptors[secondary].slice(0, 2));
  }

  return [...new Set(descriptors)].slice(0, 8);
}

function generateColorPalette(
  primary: MoodCategory,
  features: { valence: number; energy: number; mode: number },
): string[] {
  const colorMaps: Record<MoodCategory, string[]> = {
    Happy: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"],
    Sad: ["#6C7B7F", "#A8B2B8", "#5D737E", "#708090", "#2F4F4F"],
    Energetic: ["#FF4757", "#FF6348", "#FF9FF3", "#54A0FF", "#5F27CD"],
    Chill: ["#00D2D3", "#FF9F19", "#FF6B6B", "#C7ECEE", "#A8E6CF"],
    Calm: ["#E8F8F5", "#D5DBDB", "#AED6F1", "#D2B4DE", "#F8C471"],
    Confident: ["#2C3E50", "#E74C3C", "#F39C12", "#8E44AD", "#C0392B"],
    Romantic: ["#FF69B4", "#FFB6C1", "#FFC0CB", "#F08080", "#CD5C5C"],
    Aggressive: ["#8B0000", "#FF4500", "#DC143C", "#B22222", "#800000"],
    Mysterious: ["#2F1B69", "#44318D", "#6C5CE7", "#A55EEA", "#4834D4"],
    Nostalgic: ["#D4AC0D", "#F4D03F", "#F8C471", "#E6B800", "#B7950B"],
  };

  let colors = [...colorMaps[primary]];

  // Adjust colors based on valence and energy
  if (features.valence > 0.7) {
    // Add brighter colors for positive valence
    colors = colors.map((color) => lightenColor(color, 0.1));
  } else if (features.valence < 0.3) {
    // Add darker colors for negative valence
    colors = colors.map((color) => darkenColor(color, 0.1));
  }

  return colors.slice(0, 5);
}

function generateVisualThemes(
  primary: MoodCategory,
  secondary: MoodCategory | undefined,
  audioFeatures: Partial<AudioFeatures>,
): string[] {
  const visualThemes: string[] = [];

  // Enhanced mood-based themes with more specific guidance
  switch (primary) {
    case "Happy":
      visualThemes.push(
        "bright sunlight and golden hour",
        "outdoor festivals and celebrations",
        "colorful scenes with vibrant energy",
        "smiling faces and joyful expressions",
        "group photos with positive energy",
      );
      break;
    case "Sad":
      visualThemes.push(
        "moody lighting and soft shadows",
        "rainy windows and reflective surfaces",
        "empty spaces and solitude",
        "contemplative expressions",
        "black and white or desaturated colors",
      );
      break;
    case "Energetic":
      visualThemes.push(
        "dynamic motion and movement",
        "neon lights and urban nightlife",
        "action shots and sports",
        "dance poses and active scenes",
        "bright bold colors and high contrast",
      );
      break;
    case "Chill":
      visualThemes.push(
        "soft natural lighting",
        "nature scenes and landscapes",
        "cozy interiors and comfortable spaces",
        "sunset/sunrise and golden hour",
        "relaxed poses and casual settings",
      );
      break;
    case "Calm":
      visualThemes.push(
        "minimalist compositions",
        "water scenes and peaceful landscapes",
        "soft textures and gentle lighting",
        "meditation poses and zen moments",
        "pastel colors and subtle tones",
      );
      break;
    case "Confident":
      visualThemes.push(
        "strong poses and assertive body language",
        "architectural lines and geometric shapes",
        "bold colors and striking contrasts",
        "portrait style with direct gaze",
        "professional and polished settings",
      );
      break;
    case "Romantic":
      visualThemes.push(
        "warm intimate lighting",
        "couple photos and close connections",
        "soft focus and dreamy aesthetics",
        "candlelight and romantic settings",
        "gentle expressions and tender moments",
      );
      break;
    case "Aggressive":
      visualThemes.push(
        "high contrast and dramatic lighting",
        "dramatic angles and bold compositions",
        "industrial settings and urban grit",
        "intense expressions and strong poses",
        "dark shadows and powerful presence",
      );
      break;
    case "Mysterious":
      visualThemes.push(
        "low light and atmospheric scenes",
        "silhouettes and shadowy figures",
        "fog/mist and ethereal elements",
        "dramatic shadows and hidden faces",
        "noir aesthetics and dark moods",
      );
      break;
    case "Nostalgic":
      visualThemes.push(
        "vintage filters and retro aesthetics",
        "sepia tones and aged colors",
        "retro settings and classic poses",
        "film grain and analog feel",
        "childhood memories and timeless moments",
      );
      break;
  }

  // Add energy-based themes with more specificity
  const energy = audioFeatures.energy ?? 0.5;
  if (energy > 0.8) {
    visualThemes.push(
      "explosive energy and intense activity",
      "vibrant saturated colors",
      "dynamic movement blur",
    );
  } else if (energy > 0.6) {
    visualThemes.push(
      "moderate activity and engagement",
      "bright cheerful colors",
      "casual movement",
    );
  } else if (energy < 0.3) {
    visualThemes.push("static peaceful poses", "calm muted compositions", "soft subtle tones");
  } else {
    visualThemes.push("gentle moderate energy", "balanced compositions", "natural color palette");
  }

  // Add tempo-based themes with photo-specific guidance
  const tempo = audioFeatures.tempo ?? 120;
  if (tempo > 140) {
    visualThemes.push(
      "fast-paced action scenes",
      "motion blur and activity",
      "high-energy group photos",
    );
  } else if (tempo > 100) {
    visualThemes.push(
      "moderate movement and walking",
      "casual activity photos",
      "steady rhythm visuals",
    );
  } else if (tempo < 80) {
    visualThemes.push(
      "still contemplative poses",
      "slow deliberate movements",
      "peaceful stationary scenes",
    );
  }

  // Add secondary mood influences
  if (secondary) {
    switch (secondary) {
      case "Romantic":
        visualThemes.push("intimate close-up shots", "soft romantic lighting");
        break;
      case "Mysterious":
        visualThemes.push("artistic shadows and silhouettes", "enigmatic expressions");
        break;
      case "Energetic":
        visualThemes.push("dynamic poses and movement", "bright active scenes");
        break;
    }
  }

  return visualThemes.slice(0, 10); // Return up to 10 detailed themes
}

// Helper functions for color manipulation
function lightenColor(color: string, amount: number): string {
  // Simple color lightening - would use a proper color library in production
  return color;
}

function darkenColor(color: string, amount: number): string {
  // Simple color darkening - would use a proper color library in production
  return color;
}

/**
 * Generates a natural language description of the mood for AI prompts
 */
export function generateMoodDescription(
  mood: DetailedMood,
  audioFeatures?: Partial<AudioFeatures>,
): string {
  const { primary, secondary, emotions, descriptors, visualThemes } = mood;

  let description = `${primary} mood`;

  if (secondary) {
    description += ` with ${secondary.toLowerCase()} undertones`;
  }

  description += `. The song evokes ${emotions.slice(0, 3).join(", ")} feelings`;
  description += ` and has a ${descriptors.slice(0, 3).join(", ")} quality.`;

  if (audioFeatures) {
    const tempo = audioFeatures.tempo ?? 120;
    const energy = audioFeatures.energy ?? 0.5;
    const valence = audioFeatures.valence ?? 0.5;
    const danceability = audioFeatures.danceability ?? 0.5;

    description += ` Musical characteristics: ${tempo} BPM tempo`;
    description += `, ${energy > 0.7 ? "high" : energy > 0.4 ? "moderate" : "low"} energy level`;
    description += `, ${valence > 0.6 ? "positive" : valence < 0.4 ? "negative" : "neutral"} emotional valence`;

    if (danceability > 0.7) {
      description += ", very danceable and rhythmic";
    } else if (danceability < 0.3) {
      description += ", contemplative and non-danceable";
    }
  }

  description += `. Ideal photo themes: ${visualThemes.slice(0, 5).join(", ")}.`;

  return description;
}

/**
 * Generates enhanced color palette suggestions for photo matching
 */
export function generateEnhancedColorPalette(
  mood: DetailedMood,
  audioFeatures?: Partial<AudioFeatures>,
): string[] {
  const colors = [...mood.colorPalette];

  // Add energy-based color modifications
  if (audioFeatures?.energy) {
    if (audioFeatures.energy > 0.8) {
      colors.push("electric blue", "neon green", "bright magenta", "vibrant orange");
    } else if (audioFeatures.energy < 0.3) {
      colors.push("soft gray", "muted blue", "pale pink", "cream white");
    }
  }

  // Add valence-based color adjustments
  if (audioFeatures?.valence) {
    if (audioFeatures.valence > 0.7) {
      colors.push("sunny yellow", "bright white", "clear blue", "fresh green");
    } else if (audioFeatures.valence < 0.3) {
      colors.push("deep blue", "charcoal gray", "muted purple", "dark brown");
    }
  }

  // Add mode-based color suggestions (major vs minor)
  if (audioFeatures?.mode === 0) {
    // Minor key
    colors.push("deep purple", "dark blue", "forest green", "burgundy");
  } else if (audioFeatures?.mode === 1) {
    // Major key
    colors.push("bright yellow", "sky blue", "light green", "warm orange");
  }

  return [...new Set(colors)].slice(0, 8); // Remove duplicates and limit to 8
}
