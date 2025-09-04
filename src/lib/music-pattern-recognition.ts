/**
 * @fileOverview Advanced music pattern recognition system for Vibely
 * Identifies complex musical patterns, structural elements, and emotional contours
 */

import { VibelyTrack, convertSpotifyToVibelyTrack } from "./data";
import { SpotifyAudioFeatures, SpotifyTrack } from "./spotify";
import { analyzeTrackMood, type AudioFeatures, type DetailedMood } from "./mood-analyzer";

export enum PatternType {
  RepetitiveHook = "repetitive_hook", // Hook or chorus repetitions
  BuildDrop = "build_drop", // Build-up to drop pattern
  PeakValley = "peak_valley", // Emotional peaks and valleys
  TensionRelease = "tension_release", // Tension building and release
  CallResponse = "call_response", // Call and response patterns
  Layering = "layering", // Instrumentation layering
  TempoRamp = "tempo_ramp", // Tempo changes over time
  KeyModulation = "key_modulation", // Key changes
}

export interface MusicalPattern {
  type: PatternType;
  startTime: number; // Relative to track start in seconds
  endTime: number;
  confidence: number; // 0-1
  description: string;
  intensity: number; // 0-1
  emotionalImpact: "negative" | "neutral" | "positive";
}

export interface TrackStructure {
  intro: { start: number; end: number; type: string };
  verses: Array<{ start: number; end: number; type: string }>;
  chorus: Array<{ start: number; end: number; type: string }>;
  bridge: Array<{ start: number; end: number; type: string }>;
  outro: { start: number; end: number; type: string };
  sections: Array<{ start: number; end: number; type: string; confidence: number }>;
}

export interface PlaybackPattern {
  timestamp: number;
  event: "play" | "pause" | "skip" | "seek";
  position: number;
  mood: DetailedMood;
  context: string; // What triggered the pattern
}

export interface UserListeningPattern {
  skipRate: number;
  preferredMoodSequence: string[];
  energyToleranceRange: [number, number];
  tempoPreferenceRange: [number, number];
  replayPatterns: Array<{ trackId: string; replayCount: number; intervals: number[] }>;
  moodTransitions: Array<{ from: string; to: string; frequency: number }>;
  contextPreferences: {
    timeOfDay: string[];
    activity: string[];
    mood: string[];
  };
}

export class MusicPatternRecognizer {
  private patternHistory = new Map<string, MusicalPattern[]>();
  private listeningPatterns = new Map<string, PlaybackPattern[]>();

  /**
   * Analyzes track for structural and musical patterns
   */
  async analyzeTrackPatterns(
    track: VibelyTrack,
    audioFeatures?: SpotifyAudioFeatures
  ): Promise<{
    patterns: MusicalPattern[];
    structure: TrackStructure;
    patternsFound: number;
    confidence: number;
  }> {
    const patterns: MusicalPattern[] = [];

    // Analyze based on available audio features
    const rawFeatures = audioFeatures || track.audioFeatures;
    if (!rawFeatures) {
      return { patterns: [], structure: this.getDefaultStructure(track.duration || 180000), patternsFound: 0, confidence: 0.1 };
    }

    // Normalize audio features to match AudioFeatures type
    const features: AudioFeatures = {
      valence: rawFeatures.valence || 0.5,
      energy: rawFeatures.energy || 0.5,
      tempo: track.tempo,
      danceability: rawFeatures.danceability || 0.5,
      acousticness: rawFeatures.acousticness || 0.5,
      instrumentalness: rawFeatures.instrumentalness || 0.0,
      liveness: rawFeatures.liveness || 0.0,
      speechiness: rawFeatures.speechiness || 0.0,
      loudness: rawFeatures.loudness || -60,
      mode: rawFeatures.mode ?? 1,
    };

    // Detect repetitive hook patterns
    const hookPatterns = await this.detectHookPatterns(track, features);
    patterns.push(...hookPatterns);

    // Detect build-drop patterns
    const buildDropPatterns = await this.detectBuildDropPatterns(track, features);
    patterns.push(...buildDropPatterns);

    // Detect emotional peak-valley patterns
    const emotionalPatterns = await this.detectEmotionalPatterns(track, features);
    patterns.push(...emotionalPatterns);

    // Detect tension-release cycles
    const tensionPatterns = await this.detectTensionReleasePatterns(track, features);
    patterns.push(...tensionPatterns);

    // Analyze track structure
    const structure = await this.analyzeTrackStructure(track, features);

    const confidence = this.calculateOverallConfidence(patterns);
    const patternsFound = patterns.length;

    // Cache results
    this.patternHistory.set(track.id, patterns);

    return {
      patterns,
      structure,
      patternsFound,
      confidence,
    };
  }

  /**
   * Tracks user playback patterns to learn listening habits
   */
  trackUserPattern(
    userId: string,
    trackId: string,
    event: PlaybackPattern["event"],
    position: number,
    currentMood: DetailedMood,
    context?: string
  ): void {
    const pattern: PlaybackPattern = {
      timestamp: Date.now(),
      event,
      position,
      mood: currentMood,
      context: context || "unknown",
    };

    const userPatterns = this.listeningPatterns.get(userId) || [];
    userPatterns.push(pattern);
    this.listeningPatterns.set(userId, userPatterns);
  }

  /**
   * Analyzes user's listening habits and preferences
   */
  getUserListeningProfile(userId: string): UserListeningPattern {
    const patterns = this.listeningPatterns.get(userId) || [];
    if (patterns.length === 0) {
      return this.getDefaultUserProfile();
    }

    // Calculate skip rate
    const totalPlays = patterns.filter(p => p.event === "play").length;
    const skips = patterns.filter(p => p.event === "skip").length;
    const skipRate = totalPlays > 0 ? skips / totalPlays : 0;

    // Analyze mood preferences
    const moodSequences = this.extractMoodSequences(patterns);
    const preferredMoods = this.findMostCommonMoods(patterns);

    // Calculate energy and tempo ranges
    const energyRange = this.calculatePreferredEnergyRange(patterns);
    const tempoRange = this.calculatePreferredTempoRange(patterns);

    // Analyze replay patterns
    const replayPatterns = this.analyzeReplayPatterns(patterns);

    // Analyze mood transitions
    const moodTransitions = this.analyzeMoodTransitions(patterns);

    // Analyze context preferences
    const contextPreferences = this.analyzeContextPreferences(patterns);

    return {
      skipRate,
      preferredMoodSequence: preferredMoods,
      energyToleranceRange: energyRange,
      tempoPreferenceRange: tempoRange,
      replayPatterns,
      moodTransitions,
      contextPreferences,
    };
  }

  /**
   * Predicts next tracks based on patterns and listening behavior
   */
  predictNextTracks(
    userId: string,
    currentTrack: VibelyTrack,
    candidateTracks: VibelyTrack[],
    maxSuggestions: number = 5
  ): Array<{ track: VibelyTrack; confidence: number; reasoning: string }> {
    const userProfile = this.getUserListeningProfile(userId);
    const currentPatterns = this.patternHistory.get(currentTrack.id) || [];

    const scored = candidateTracks.map(track => {
      let score = 0;
      let reasons: string[] = [];

      // Mood transition scoring
      const moodMatch = this.calculateMoodTransitionScore(currentTrack.mood, track.mood, userProfile);
      score += moodMatch.score * 0.3;
      reasons.push(...moodMatch.reasons);

      // Energy progression scoring
      const energyMatch = this.calculateEnergyProgressionScore(currentTrack.energy || 0.5, track.energy || 0.5, userProfile);
      score += energyMatch.score * 0.25;
      reasons.push(...energyMatch.reasons);

      // Pattern continuation scoring
      const patternMatch = this.calculatePatternSimilarityScore(currentPatterns, track);
      score += patternMatch.score * 0.25;
      reasons.push(...patternMatch.reasons);

      // Tempo flow scoring
      const tempoMatch = this.calculateTempoFlowScore(currentTrack.tempo, track.tempo, userProfile);
      score += tempoMatch.score * 0.2;
      reasons.push(...tempoMatch.reasons);

      return {
        track,
        confidence: Math.min(score, 1),
        reasoning: reasons.slice(0, 3).join("; "),
      };
    });

    return scored
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);
  }

  /**
   * Generates playlist suggestions based on detected patterns
   */
  generatePlaylistFromPatterns(
    seedTracks: VibelyTrack[],
    userProfile: UserListeningPattern,
    targetLength: number = 20
  ): {
    tracks: VibelyTrack[];
    playlistRationale: string;
    moodFlow: string;
    energyDistribution: string;
  } {
    const tracks: VibelyTrack[] = [...seedTracks];
    let currentMood = seedTracks[0]?.mood || "Chill";
    let currentEnergy = seedTracks[0]?.energy || 0.5;

    // Build playlist following user's preferred patterns
    for (let i = tracks.length; i < targetLength; i++) {
      const nextTrack = this.selectNextTrack(
        tracks[tracks.length - 1],
        currentMood,
        currentEnergy,
        userProfile
      );

      if (nextTrack) {
        tracks.push(nextTrack);
        currentMood = nextTrack.mood;
        currentEnergy = nextTrack.energy || 0.5;
      }
    }

    const moodFlow = this.generateMoodFlowDescription(tracks);
    const energyDistribution = this.generateEnergyDistributionDescription(tracks);
    const playlistRationale = this.generatePlaylistRationale(tracks, userProfile);

    return {
      tracks,
      playlistRationale,
      moodFlow,
      energyDistribution,
    };
  }

  // Private methods for pattern detection

  private async detectHookPatterns(track: VibelyTrack, features: AudioFeatures): Promise<MusicalPattern[]> {
    const patterns: MusicalPattern[] = [];
    const trackDuration = track.duration ? track.duration / 1000 : 180; // Convert to seconds

    // Look for repetitive energy patterns in high valence tracks
    if (features.valence > 0.6 && features.danceability > 0.6) {
      // Potential hook sections every 15-30 seconds in danceable tracks
      const hookSections = Math.floor(trackDuration / 30);

      for (let i = 1; i < hookSections; i++) {
        const hookStart = i * 30;
        if (hookStart < trackDuration) {
          patterns.push({
            type: PatternType.RepetitiveHook,
            startTime: hookStart,
            endTime: Math.min(hookStart + 15, trackDuration),
            confidence: 0.75,
            description: `Potential hook repetition at ${hookStart}s`,
            intensity: features.energy > 0.7 ? 0.8 : 0.6,
            emotionalImpact: "positive",
          });
        }
      }
    }

    return patterns;
  }

  private async detectBuildDropPatterns(track: VibelyTrack, features: AudioFeatures): Promise<MusicalPattern[]> {
    const patterns: MusicalPattern[] = [];

    // EDM/electronic tracks often have build-drop patterns
    if (features.energy > 0.7 && track.tempo > 120) {
      const trackDuration = track.duration ? track.duration / 1000 : 180;

      // Look for energy drops and builds throughout the track
      const segmentDuration = trackDuration / 8;

      for (let i = 0; i < 7; i++) {
        const segmentStart = i * segmentDuration;

        patterns.push({
          type: i % 2 === 0 ? PatternType.BuildDrop : PatternType.PeakValley,
          startTime: segmentStart,
          endTime: segmentStart + segmentDuration,
          confidence: 0.65,
          description: i % 2 === 0 ? "Energy build phase" : "Drop and recovery",
          intensity: i % 2 === 0 ? 0.9 : 0.7,
          emotionalImpact: i % 2 === 0 ? "positive" : "neutral",
        });
      }
    }

    return patterns;
  }

  private async detectEmotionalPatterns(track: VibelyTrack, features: AudioFeatures): Promise<MusicalPattern[]> {
    const patterns: MusicalPattern[] = [];
    const trackDuration = track.duration ? track.duration / 1000 : 180;

    // Analyze emotional intensity variations
    const segments = 6;
    const segmentDuration = trackDuration / segments;

    for (let i = 0; i < segments; i++) {
      const progress = i / segments;
      const intensity = this.calculateEmotionalIntensity(features, progress);

      patterns.push({
        type: PatternType.PeakValley,
        startTime: i * segmentDuration,
        endTime: (i + 1) * segmentDuration,
        confidence: 0.7,
        description: intensity > 0.6 ? "Emotional peak" : intensity < 0.4 ? "Emotional valley" : "Emotional steady",
        intensity,
        emotionalImpact: intensity > 0.6 ? "positive" : intensity < 0.4 ? "negative" : "neutral",
      });
    }

    return patterns;
  }

  private async detectTensionReleasePatterns(track: VibelyTrack, features: AudioFeatures): Promise<MusicalPattern[]> {
    const patterns: MusicalPattern[] = [];
    const trackDuration = track.duration ? track.duration / 1000 : 180;

    // Look for tension-release cycles using mode and loudness variations
    if (features.mode === 0) { // Minor key suggests more tension
      const cycles = Math.floor(trackDuration / 45); // Tension cycles every ~45 seconds

      for (let i = 0; i < cycles; i++) {
        const cycleStart = i * 45;

        patterns.push({
          type: PatternType.TensionRelease,
          startTime: cycleStart,
          endTime: Math.min(cycleStart + 15, trackDuration),
          confidence: 0.6,
          description: "Tension building phase",
          intensity: features.energy,
          emotionalImpact: "negative",
        });

        if (cycleStart + 30 < trackDuration) {
          patterns.push({
            type: PatternType.TensionRelease,
            startTime: cycleStart + 15,
            endTime: Math.min(cycleStart + 45, trackDuration),
            confidence: 0.6,
            description: "Tension release phase",
            intensity: features.energy * 0.7,
            emotionalImpact: "positive",
          });
        }
      }
    }

    return patterns;
  }

  private analyzeTrackStructure(track: VibelyTrack, features: AudioFeatures): TrackStructure {
    // Simplified structure analysis - in a real implementation this would use
    // more advanced audio analysis techniques
    const duration = track.duration || 180000;
    const totalSeconds = duration / 1000;

    return {
      intro: { start: 0, end: totalSeconds * 0.1, type: "introduction" },
      verses: [
        { start: totalSeconds * 0.1, end: totalSeconds * 0.3, type: "verse" },
        { start: totalSeconds * 0.4, end: totalSeconds * 0.6, type: "verse" }
      ],
      chorus: [
        { start: totalSeconds * 0.3, end: totalSeconds * 0.4, type: "chorus" },
        { start: totalSeconds * 0.6, end: totalSeconds * 0.75, type: "chorus" }
      ],
      bridge: [
        { start: totalSeconds * 0.75, end: totalSeconds * 0.85, type: "bridge" }
      ],
      outro: { start: totalSeconds * 0.85, end: totalSeconds, type: "outro" },
      sections: [
        { start: 0, end: totalSeconds * 0.1, type: "intro", confidence: 0.8 },
        { start: totalSeconds * 0.1, end: totalSeconds * 0.3, type: "verse1", confidence: 0.7 },
        { start: totalSeconds * 0.3, end: totalSeconds * 0.4, type: "chorus1", confidence: 0.85 },
        { start: totalSeconds * 0.4, end: totalSeconds * 0.6, type: "verse2", confidence: 0.7 },
        { start: totalSeconds * 0.6, end: totalSeconds * 0.75, type: "chorus2", confidence: 0.85 },
        { start: totalSeconds * 0.75, end: totalSeconds * 0.85, type: "bridge", confidence: 0.75 },
        { start: totalSeconds * 0.85, end: totalSeconds, type: "outro", confidence: 0.8 }
      ]
    };
  }

  private getDefaultStructure(duration: number): TrackStructure {
    const seconds = duration / 1000;
    return {
      intro: { start: 0, end: seconds * 0.1, type: "introduction" },
      verses: [],
      chorus: [],
      bridge: [],
      outro: { start: seconds * 0.9, end: seconds, type: "outro" },
      sections: []
    };
  }

  private calculateEmotionalIntensity(features: AudioFeatures, progress: number): number {
    // Calculate emotional intensity based on various factors
    const baseIntensity = features.energy * 0.4 + features.valence * 0.4 + features.danceability * 0.2;

    // Add some variation over time (songs typically have emotional arcs)
    const progressionFactor = Math.sin(progress * Math.PI) * 0.2 + 0.8;

    return Math.min(1, baseIntensity * progressionFactor);
  }

  private calculateOverallConfidence(patterns: MusicalPattern[]): number {
    if (patterns.length === 0) return 0;

    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const confidenceBoost = Math.min(patterns.length / 10, 0.3); // More patterns = higher confidence

    return Math.min(avgConfidence + confidenceBoost, 1);
  }

  // User behavior analysis methods

  private getDefaultUserProfile(): UserListeningPattern {
    return {
      skipRate: 0.15,
      preferredMoodSequence: ["Chill", "Happy", "Energetic"],
      energyToleranceRange: [0.3, 0.8],
      tempoPreferenceRange: [90, 140],
      replayPatterns: [],
      moodTransitions: [],
      contextPreferences: {
        timeOfDay: ["morning", "evening"],
        activity: ["chilling", "working"],
        mood: ["relaxed", "focused"],
      },
    };
  }

  private extractMoodSequences(patterns: PlaybackPattern[]): string[][] {
    // Group patterns by session and extract sequential moods
    return [];
  }

  private findMostCommonMoods(patterns: PlaybackPattern[]): string[] {
    const moodCounts = new Map<string, number>();

    patterns.forEach(pattern => {
      const mood = pattern.mood.primary;
      moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1);
    });

    return Array.from(moodCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([mood]) => mood);
  }

  private calculatePreferredEnergyRange(patterns: PlaybackPattern[]): [number, number] {
    // Simplified energy range calculation
    return [0.3, 0.8];
  }

  private calculatePreferredTempoRange(patterns: PlaybackPattern[]): [number, number] {
    // Simplified tempo range calculation
    return [90, 140];
  }

  private analyzeReplayPatterns(patterns: PlaybackPattern[]): Array<{ trackId: string; replayCount: number; intervals: number[] }> {
    // Simplified replay pattern analysis
    return [];
  }

  private analyzeMoodTransitions(patterns: PlaybackPattern[]): Array<{ from: string; to: string; frequency: number }> {
    // Simplified mood transition analysis
    return [];
  }

  private analyzeContextPreferences(patterns: PlaybackPattern[]): UserListeningPattern["contextPreferences"] {
    return {
      timeOfDay: [],
      activity: [],
      mood: [],
    };
  }

  // Pattern matching methods

  private calculateMoodTransitionScore(
    currentMood: string,
    nextMood: string,
    userProfile: UserListeningPattern
  ): { score: number; reasons: string[] } {
    const preferredTransitions = userProfile.moodTransitions;
    const transition = preferredTransitions.find(t => t.from === currentMood && t.to === nextMood);

    if (transition) {
      return { score: Math.min(transition.frequency, 1), reasons: [`Frequent ${currentMood} → ${nextMood} pattern`] };
    }

    return { score: 0.5, reasons: [`Neutral transition from ${currentMood} to ${nextMood}`] };
  }

  private calculateEnergyProgressionScore(
    currentEnergy: number,
    nextEnergy: number,
    userProfile: UserListeningPattern
  ): { score: number; reasons: string[] } {
    const [minPreferred, maxPreferred] = userProfile.energyToleranceRange;

    if (nextEnergy >= minPreferred && nextEnergy <= maxPreferred) {
      return { score: 0.8, reasons: ["Energy level within preferred range"] };
    }

    const distance = Math.min(Math.abs(nextEnergy - maxPreferred), Math.abs(nextEnergy - minPreferred));
    const score = Math.max(0.3, 1 - distance);

    return { score, reasons: [`Energy transition: ${currentEnergy.toFixed(1)} → ${nextEnergy.toFixed(1)}`] };
  }

  private calculatePatternSimilarityScore (
    currentPatterns: MusicalPattern[],
    nextTrack: VibelyTrack
  ): { score: number; reasons: string[] } {
    return { score: 0.5, reasons: ["Pattern similarity analysis"] };
  }

  private calculateTempoFlowScore(
    currentTempo: number,
    nextTempo: number,
    userProfile: UserListeningPattern
  ): { score: number; reasons: string[] } {
    const [minPreferred, maxPreferred] = userProfile.tempoPreferenceRange;

    if (nextTempo >= minPreferred && nextTempo <= maxPreferred) {
      const tempoDiff = Math.abs(currentTempo - nextTempo);
      return {
        score: tempoDiff < 20 ? 0.9 : tempoDiff < 40 ? 0.7 : 0.5,
        reasons: [`Tempo within preferred range, ${tempoDiff} BPM difference`],
      };
    }

    return { score: 0.3, reasons: ["Tempo outside preferred range"] };
  }

  private selectNextTrack(
    currentTrack: VibelyTrack,
    currentMood: string,
    currentEnergy: number,
    userProfile: UserListeningPattern
  ): VibelyTrack | null {
    // In a real implementation, this would select from a larger track database
    // For now, return a placeholder
    return null;
  }

  private generateMoodFlowDescription(tracks: VibelyTrack[]): string {
    if (tracks.length < 2) return "Single track selection";

    const moods = tracks.map(t => t.mood);
    const transitions = moods.slice(1).map((mood, i) => `${moods[i]} → ${mood}`).join(", ");

    return `Flow: ${transitions}`;
  }

  private generateEnergyDistributionDescription(tracks: VibelyTrack[]): string {
    const energies = tracks.map(t => t.energy || 0.5).sort((a, b) => a - b);
    const lowEnergy = energies[0];
    const peakEnergy = energies[energies.length - 1];
    const averageEnergy = energies.reduce((sum, e) => sum + e, 0) / energies.length;

    return `Energy range: ${lowEnergy.toFixed(1)} - ${peakEnergy.toFixed(1)}, average: ${averageEnergy.toFixed(1)}/1.0`;
  }

  private generatePlaylistRationale(tracks: VibelyTrack[], userProfile: UserListeningPattern): string {
    return `Based on your listening patterns with ${(1 - userProfile.skipRate).toFixed(1)}% engagement rate and preferred mood sequence: ${userProfile.preferredMoodSequence.slice(0, 3).join(" → ")}`;
  }
}

// Singleton instance for app-wide use
export const musicPatternRecognizer = new MusicPatternRecognizer();

// Utility functions
export function calculatePatternComplexity(patterns: MusicalPattern[]): number {
  if (patterns.length === 0) return 0;

  const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
  const uniqueTypes = new Set(patterns.map(p => p.type)).size;

  return (avgConfidence * 0.6) + (uniqueTypes / 8) * 0.4;
}

export function getPatternsByType(patterns: MusicalPattern[], type: PatternType): MusicalPattern[] {
  return patterns.filter(p => p.type === type);
}

export function getPatternIntensityTrend(patterns: MusicalPattern[]): "increasing" | "decreasing" | "fluctuating" | "stable" {
  if (patterns.length < 3) return "stable";

  const sorted = patterns.sort((a, b) => a.startTime - b.startTime);
  const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

  const firstAvg = firstHalf.reduce((sum, p) => sum + p.intensity, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, p) => sum + p.intensity, 0) / secondHalf.length;

  if (Math.abs(secondAvg - firstAvg) < 0.1) return "stable";
  if (secondAvg - firstAvg > 0.1) return "increasing";
  if (firstAvg - secondAvg > 0.1) return "decreasing";

  return "fluctuating";
}
