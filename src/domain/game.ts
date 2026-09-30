// © 2026 Riadh MNASRI
import { Chess, type Square } from "chess.js";

export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PromotionPiece = "q" | "r" | "b" | "n";

export interface MoveInput {
  from: string;
  to: string;
  promotion?: PromotionPiece;
}

export type DrawReason = "stalemate" | "threefold" | "insufficient" | "fifty-moves";

export type GameStatus =
  | { kind: "playing"; turn: Color; inCheck: boolean }
  | { kind: "checkmate"; winner: Color }
  | { kind: "draw"; reason: DrawReason };

export interface GameState {
  readonly initialFen: string;
  readonly moves: readonly MoveInput[];
  readonly fen: string;
  readonly sanHistory: readonly string[];
  readonly status: GameStatus;
  readonly lastMove: { from: string; to: string } | null;
  readonly checkSquare: string | null;
}

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const PIECE_VALUES: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const STARTING_COUNT: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

function replay(initialFen: string, moves: readonly MoveInput[]): Chess {
  const chess = new Chess(initialFen);
  for (const move of moves) chess.move(move);
  return chess;
}

function statusOf(chess: Chess): GameStatus {
  const turn = chess.turn();
  if (chess.isCheckmate()) return { kind: "checkmate", winner: turn === "w" ? "b" : "w" };
  if (chess.isStalemate()) return { kind: "draw", reason: "stalemate" };
  if (chess.isInsufficientMaterial()) return { kind: "draw", reason: "insufficient" };
  if (chess.isThreefoldRepetition()) return { kind: "draw", reason: "threefold" };
  if (chess.isDrawByFiftyMoves()) return { kind: "draw", reason: "fifty-moves" };
  return { kind: "playing", turn, inCheck: chess.inCheck() };
}

function kingSquare(chess: Chess, color: Color): string | null {
  return chess.findPiece({ type: "k", color })[0] ?? null;
}

function snapshot(initialFen: string, moves: readonly MoveInput[], chess: Chess): GameState {
  const history = chess.history({ verbose: true });
  const last = history.at(-1);
  return {
    initialFen,
    moves,
    fen: chess.fen(),
    sanHistory: history.map((move) => move.san),
    status: statusOf(chess),
    lastMove: last ? { from: last.from, to: last.to } : null,
    checkSquare: chess.inCheck() ? kingSquare(chess, chess.turn()) : null,
  };
}

export function newGame(initialFen: string = START_FEN): GameState {
  return snapshot(initialFen, [], new Chess(initialFen));
}

export function legalDestinations(game: GameState, from: string): string[] {
  if (game.status.kind !== "playing") return [];
  const chess = new Chess(game.fen);
  return [...new Set(chess.moves({ square: from as Square, verbose: true }).map((move) => move.to))];
}

export function isPromotion(game: GameState, from: string, to: string): boolean {
  const chess = new Chess(game.fen);
  return chess
    .moves({ square: from as Square, verbose: true })
    .some((move) => move.to === to && move.promotion !== undefined);
}

export function playMove(game: GameState, input: MoveInput): GameState | null {
  if (game.status.kind !== "playing") return null;
  const chess = replay(game.initialFen, game.moves);
  try {
    chess.move(input);
  } catch {
    return null;
  }
  return snapshot(game.initialFen, [...game.moves, input], chess);
}

export function undoMove(game: GameState): GameState {
  if (game.moves.length === 0) return game;
  const moves = game.moves.slice(0, -1);
  return snapshot(game.initialFen, moves, replay(game.initialFen, moves));
}

export function pieceAt(game: GameState, square: string): { color: Color; type: PieceType } | null {
  return new Chess(game.fen).get(square as Square) ?? null;
}

export function turnOf(game: GameState): Color {
  return new Chess(game.fen).turn();
}

export interface CapturedMaterial {
  /** Pièces noires prises par les Blancs. */
  byWhite: PieceType[];
  /** Pièces blanches prises par les Noirs. */
  byBlack: PieceType[];
  /** Avantage matériel des Blancs (négatif si les Noirs mènent). */
  advantage: number;
}

export function capturedMaterial(game: GameState): CapturedMaterial {
  const remaining: Record<Color, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  let advantage = 0;
  for (const row of new Chess(game.fen).board()) {
    for (const piece of row) {
      if (!piece) continue;
      remaining[piece.color][piece.type] += 1;
      advantage += (piece.color === "w" ? 1 : -1) * PIECE_VALUES[piece.type];
    }
  }
  const missing = (color: Color): PieceType[] =>
    (["q", "r", "b", "n", "p"] as const).flatMap((type) =>
      Array<PieceType>(Math.max(0, STARTING_COUNT[type] - remaining[color][type])).fill(type),
    );
  return { byWhite: missing("b"), byBlack: missing("w"), advantage };
}

export function resultOf(status: GameStatus): "1-0" | "0-1" | "1/2-1/2" | "*" {
  if (status.kind === "checkmate") return status.winner === "w" ? "1-0" : "0-1";
  if (status.kind === "draw") return "1/2-1/2";
  return "*";
}

export function toPgn(
  game: GameState,
  options: { date: string; event?: string; white?: string; black?: string },
): string {
  const chess = replay(game.initialFen, game.moves);
  chess.setHeader("Event", options.event ?? "Partie amicale");
  chess.setHeader("Site", "RiaChess");
  chess.setHeader("Date", options.date);
  if (options.white) chess.setHeader("White", options.white);
  if (options.black) chess.setHeader("Black", options.black);
  chess.setHeader("Result", resultOf(game.status));
  if (game.initialFen !== START_FEN) {
    chess.setHeader("SetUp", "1");
    chess.setHeader("FEN", game.initialFen);
  }
  const pgn = chess.pgn();
  return /\s(1-0|0-1|1\/2-1\/2|\*)$/.test(pgn) ? pgn : `${pgn} ${resultOf(game.status)}`;
}

/** Importe une partie PGN ; null si le texte n'est pas une partie lisible. */
export function gameFromPgn(pgn: string): GameState | null {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn.trim());
  } catch {
    return null;
  }
  const initialFen = chess.getHeaders().FEN ?? START_FEN;
  const moves: MoveInput[] = chess.history({ verbose: true }).map((move) =>
    move.promotion
      ? { from: move.from, to: move.to, promotion: move.promotion as PromotionPiece }
      : { from: move.from, to: move.to },
  );
  if (moves.length === 0) return null;
  return snapshot(initialFen, moves, replay(initialFen, moves));
}

/** Position (FEN) après chaque demi-coup : l'indice 0 est la position de départ. */
export function positionsOf(game: GameState): string[] {
  const chess = new Chess(game.initialFen);
  const fens = [chess.fen()];
  for (const move of game.moves) {
    chess.move(move);
    fens.push(chess.fen());
  }
  return fens;
}

/** État de la partie arrêtée après `ply` demi-coups. */
export function truncate(game: GameState, ply: number): GameState {
  const moves = game.moves.slice(0, Math.max(0, ply));
  return snapshot(game.initialFen, moves, replay(game.initialFen, moves));
}
