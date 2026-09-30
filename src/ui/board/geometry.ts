// © 2026 Riadh MNASRI
import type { Color } from "../../domain/game";
import type { PieceCode } from "./pieces";

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

/** Case sous le point (x, y), en pixels depuis le coin haut gauche du plateau. */
export function squareAt(x: number, y: number, size: number, orientation: Color): string | null {
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  const cell = size / 8;
  const column = Math.floor(x / cell);
  const row = Math.floor(y / cell);
  const fileIndex = orientation === "w" ? column : 7 - column;
  const rank = orientation === "w" ? 8 - row : row + 1;
  return `${FILES[fileIndex]}${rank}`;
}

/** Position (colonne, ligne) à l'écran d'une case, 0 en haut à gauche. */
export function screenCell(square: string, orientation: Color): { column: number; row: number } {
  const fileIndex = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = Number(square[1]);
  return orientation === "w"
    ? { column: fileIndex, row: 8 - rank }
    : { column: 7 - fileIndex, row: rank - 1 };
}

/** Lit la partie « placement » d'un FEN : case vers pièce. */
export function piecesFromFen(fen: string): Map<string, PieceCode> {
  const pieces = new Map<string, PieceCode>();
  const ranks = fen.split(" ")[0].split("/");
  ranks.forEach((rankText, index) => {
    const rank = 8 - index;
    let fileIndex = 0;
    for (const char of rankText) {
      if (/\d/.test(char)) {
        fileIndex += Number(char);
        continue;
      }
      const color = char === char.toUpperCase() ? "w" : "b";
      pieces.set(`${FILES[fileIndex]}${rank}`, `${color}${char.toUpperCase()}` as PieceCode);
      fileIndex += 1;
    }
  });
  return pieces;
}
