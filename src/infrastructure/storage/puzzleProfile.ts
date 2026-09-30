// © 2026 Riadh MNASRI
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Progression du joueur sur les problèmes, gardée sur l'appareil. */
export interface PuzzleProfile {
  rating: number;
  done: string[];
  solvedCount: number;
  streak: number;
  bestStreak: number;
}

const KEY = "riachess.puzzles.v1";

export const DEFAULT_PROFILE: PuzzleProfile = { rating: 1200, done: [], solvedCount: 0, streak: 0, bestStreak: 0 };

export async function loadPuzzleProfile(): Promise<PuzzleProfile> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    return stored ? { ...DEFAULT_PROFILE, ...(JSON.parse(stored) as Partial<PuzzleProfile>) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function savePuzzleProfile(profile: PuzzleProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Stockage indisponible (navigation privée...) : la progression reste en mémoire.
  }
}

export function recordResult(profile: PuzzleProfile, puzzleId: string, rating: number, solved: boolean): PuzzleProfile {
  const streak = solved ? profile.streak + 1 : 0;
  return {
    rating,
    done: profile.done.includes(puzzleId) ? profile.done : [...profile.done, puzzleId],
    solvedCount: profile.solvedCount + (solved ? 1 : 0),
    streak,
    bestStreak: Math.max(profile.bestStreak, streak),
  };
}
