// © 2026 Riadh MNASRI
import { Chess } from "chess.js";
import type { GameState, MoveInput, PromotionPiece } from "./game";

export interface BotLevel {
  level: number;
  /** Option UCI « Skill Level » de Stockfish, de 0 à 20. */
  skill: number;
  depth: number;
  movetimeMs: number;
  /**
   * Part de coups joués au hasard. Même au Skill Level 0, Stockfish reste trop
   * fort pour un débutant : les premiers niveaux laissent passer des erreurs.
   */
  randomMoveRate: number;
}

export const BOT_LEVELS: readonly BotLevel[] = [
  { level: 1, skill: 0, depth: 1, movetimeMs: 50, randomMoveRate: 0.45 },
  { level: 2, skill: 0, depth: 2, movetimeMs: 100, randomMoveRate: 0.25 },
  { level: 3, skill: 2, depth: 3, movetimeMs: 150, randomMoveRate: 0.12 },
  { level: 4, skill: 5, depth: 5, movetimeMs: 200, randomMoveRate: 0.05 },
  { level: 5, skill: 8, depth: 6, movetimeMs: 300, randomMoveRate: 0 },
  { level: 6, skill: 11, depth: 8, movetimeMs: 400, randomMoveRate: 0 },
  { level: 7, skill: 15, depth: 12, movetimeMs: 600, randomMoveRate: 0 },
  { level: 8, skill: 20, depth: 18, movetimeMs: 1000, randomMoveRate: 0 },
];

export function parseUciMove(uci: string): MoveInput | null {
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci.trim());
  if (!match) return null;
  const [, from, to, promotion] = match;
  return promotion ? { from, to, promotion: promotion as PromotionPiece } : { from, to };
}

/** Choisit le coup de l'ordinateur : celui du moteur, ou parfois un coup légal au hasard. */
export function chooseBotMove(
  game: GameState,
  engineUci: string,
  level: BotLevel,
  random: () => number = Math.random,
): MoveInput | null {
  if (random() < level.randomMoveRate) {
    const moves = new Chess(game.fen).moves({ verbose: true });
    if (moves.length > 0) {
      const move = moves[Math.floor(random() * moves.length) % moves.length];
      return move.promotion
        ? { from: move.from, to: move.to, promotion: move.promotion as PromotionPiece }
        : { from: move.from, to: move.to };
    }
  }
  return parseUciMove(engineUci);
}
