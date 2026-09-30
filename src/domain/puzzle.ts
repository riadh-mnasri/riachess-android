// © 2026 Riadh MNASRI
import { parseUciMove } from "./bot";
import { newGame, playMove, turnOf, type Color, type GameState, type MoveInput } from "./game";

/**
 * Puzzle au format de la base Lichess : `fen` est la position AVANT le coup de
 * l'adversaire, `moves[0]` est ce coup, puis la solution alterne joueur et adversaire.
 */
export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
}

export type PuzzleStatus = "playing" | "opponent" | "solved" | "failed";

export interface PuzzleState {
  puzzle: Puzzle;
  game: GameState;
  player: Color;
  /** Indice dans `puzzle.moves` du prochain coup attendu. */
  expected: number;
  status: PuzzleStatus;
}

export const PUZZLE_THEMES = ["all", "mate", "fork", "pin", "skewer", "sacrifice", "endgame"] as const;
export type PuzzleTheme = (typeof PUZZLE_THEMES)[number];

function apply(game: GameState, uci: string): GameState {
  const move = parseUciMove(uci);
  const next = move ? playMove(game, move) : null;
  if (!next) throw new Error(`coup de puzzle invalide : ${uci}`);
  return next;
}

export function startPuzzle(puzzle: Puzzle): PuzzleState {
  const game = apply(newGame(puzzle.fen), puzzle.moves[0]);
  return { puzzle, game, player: turnOf(game), expected: 1, status: "playing" };
}

const sameMove = (move: MoveInput, uci: string) => {
  const expected = parseUciMove(uci);
  return (
    !!expected &&
    expected.from === move.from &&
    expected.to === move.to &&
    (expected.promotion ?? "q") === (move.promotion ?? "q")
  );
};

/** Coup du joueur : bon coup, ou tout coup qui donne mat, comme sur Lichess. */
export function submitMove(state: PuzzleState, move: MoveInput): PuzzleState {
  if (state.status !== "playing") return state;
  const played = playMove(state.game, move);
  if (!played) return state;
  const isMate = played.status.kind === "checkmate";
  if (!isMate && !sameMove(move, state.puzzle.moves[state.expected])) {
    return { ...state, status: "failed" };
  }
  const expected = state.expected + 1;
  const finished = isMate || expected >= state.puzzle.moves.length;
  return { ...state, game: played, expected, status: finished ? "solved" : "opponent" };
}

export function playOpponentReply(state: PuzzleState): PuzzleState {
  if (state.status !== "opponent") return state;
  const game = apply(state.game, state.puzzle.moves[state.expected]);
  return { ...state, game, expected: state.expected + 1, status: "playing" };
}

/** Joue tout le reste de la solution, pour la montrer après un échec. */
export function revealSolution(state: PuzzleState): GameState {
  let game = state.game;
  for (let index = state.expected; index < state.puzzle.moves.length; index += 1) {
    game = apply(game, state.puzzle.moves[index]);
  }
  return game;
}

/** Mise à jour de type Elo, K = 32. */
export function updateRating(playerRating: number, puzzleRating: number, solved: boolean): number {
  const expectedScore = 1 / (1 + 10 ** ((puzzleRating - playerRating) / 400));
  return Math.round(playerRating + 32 * ((solved ? 1 : 0) - expectedScore));
}

function matchesTheme(puzzle: Puzzle, theme: PuzzleTheme): boolean {
  if (theme === "all") return true;
  if (theme === "mate") return puzzle.themes.some((value) => value === "mate" || value.startsWith("mateIn"));
  return puzzle.themes.includes(theme);
}

/** Tire un puzzle pas encore fait, du thème voulu, au plus près du classement du joueur. */
export function pickPuzzle(
  puzzles: readonly Puzzle[],
  options: { rating: number; solved: ReadonlySet<string>; theme: PuzzleTheme },
  random: () => number = Math.random,
): Puzzle | null {
  const candidates = puzzles.filter((puzzle) => matchesTheme(puzzle, options.theme) && !options.solved.has(puzzle.id));
  if (candidates.length === 0) return null;
  for (const window of [100, 200, 400, 800]) {
    const near = candidates.filter((puzzle) => Math.abs(puzzle.rating - options.rating) <= window);
    if (near.length > 0) return near[Math.floor(random() * near.length)];
  }
  return [...candidates].sort(
    (a, b) => Math.abs(a.rating - options.rating) - Math.abs(b.rating - options.rating),
  )[0];
}
