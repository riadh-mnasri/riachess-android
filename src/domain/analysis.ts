// © 2026 Riadh MNASRI
import { Chess } from "chess.js";
import { parseUciMove } from "./bot";
import type { Color } from "./game";

/** Évaluation d'une position : centipions, ou mat en N coups (négatif si les Noirs matent). */
export type Evaluation = { kind: "cp"; value: number } | { kind: "mate"; value: number };

export type MoveJudgement = "inaccuracy" | "mistake" | "blunder";

/** Le moteur note du point de vue du camp au trait ; on ramène tout au point de vue des Blancs. */
export function toWhitePov(evaluation: Evaluation, sideToMove: Color): Evaluation {
  return sideToMove === "w" ? evaluation : { kind: evaluation.kind, value: -evaluation.value };
}

/**
 * Chances de gain des Blancs entre -1 et 1, avec la courbe utilisée par Lichess
 * pour convertir des centipions en probabilité.
 */
export function winChances(evaluation: Evaluation): number {
  if (evaluation.kind === "mate") return evaluation.value > 0 ? 1 : -1;
  const capped = Math.max(-1000, Math.min(1000, evaluation.value));
  return 2 / (1 + Math.exp(-0.00368208 * capped)) - 1;
}

/** Perte de chances de gain (de 0 à 2) subie par le camp qui vient de jouer. */
function loss(before: Evaluation, after: Evaluation, mover: Color): number {
  const sign = mover === "w" ? 1 : -1;
  return Math.max(0, sign * (winChances(before) - winChances(after)));
}

/** Seuils de Lichess : 0,1 imprécision, 0,2 erreur, 0,3 gaffe. */
export function classifyMove(before: Evaluation, after: Evaluation, mover: Color): MoveJudgement | null {
  const drop = loss(before, after, mover);
  if (drop >= 0.3) return "blunder";
  if (drop >= 0.2) return "mistake";
  if (drop >= 0.1) return "inaccuracy";
  return null;
}

/** Précision d'un coup en %, formule publiée par Lichess. */
export function moveAccuracy(before: Evaluation, after: Evaluation, mover: Color): number {
  const dropInPercent = loss(before, after, mover) * 50;
  const accuracy = 103.1668 * Math.exp(-0.04354 * dropInPercent) - 3.1669;
  return Math.max(0, Math.min(100, accuracy));
}

/**
 * Précision moyenne de chaque camp. `evaluations[i]` est l'évaluation de la
 * position après i demi-coups (0 = position de départ).
 */
export function gameAccuracy(evaluations: readonly Evaluation[]): Record<Color, number> {
  const scores: Record<Color, number[]> = { w: [], b: [] };
  for (let ply = 1; ply < evaluations.length; ply += 1) {
    const mover: Color = ply % 2 === 1 ? "w" : "b";
    scores[mover].push(moveAccuracy(evaluations[ply - 1], evaluations[ply], mover));
  }
  const average = (values: number[]) =>
    values.length === 0 ? 100 : values.reduce((sum, value) => sum + value, 0) / values.length;
  return { w: average(scores.w), b: average(scores.b) };
}

export function formatEval(evaluation: Evaluation): string {
  if (evaluation.kind === "mate") return `#${evaluation.value}`;
  const pawns = evaluation.value / 100;
  if (Math.abs(pawns) < 0.05) return "0.0";
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(1)}`;
}

/** Traduit une variante du moteur (UCI) en notation algébrique, jusqu'au premier coup invalide. */
export function uciLineToSan(fen: string, line: readonly string[]): string[] {
  const chess = new Chess(fen);
  const san: string[] = [];
  for (const uci of line) {
    const move = parseUciMove(uci);
    if (!move) break;
    try {
      san.push(chess.move(move).san);
    } catch {
      break;
    }
  }
  return san;
}
