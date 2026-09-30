// © 2026 Riadh MNASRI
import type { Puzzle } from "../domain/puzzle";
import raw from "./puzzles.json";

/**
 * Sélection de la base de puzzles Lichess (CC0), générée par scripts/build-puzzles.mjs.
 * Format compact : [id, fen, coups UCI, classement, thèmes].
 */
export const PUZZLES: readonly Puzzle[] = (raw as [string, string, string, number, string][]).map(
  ([id, fen, moves, rating, themes]) => ({
    id,
    fen,
    moves: moves.split(" "),
    rating,
    themes: themes.split(" "),
  }),
);
