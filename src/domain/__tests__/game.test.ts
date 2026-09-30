// © 2026 Riadh MNASRI
import {
  capturedMaterial,
  isPromotion,
  legalDestinations,
  newGame,
  playMove,
  toPgn,
  undoMove,
} from "../game";

function playAll(moves: Array<[string, string]>) {
  return moves.reduce((state, [from, to]) => {
    const next = playMove(state, { from, to });
    if (!next) throw new Error(`coup refusé : ${from}-${to}`);
    return next;
  }, newGame());
}

describe("newGame", () => {
  it("démarre à la position initiale, trait aux Blancs", () => {
    // Given / When
    const game = newGame();

    // Then
    expect(game.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(game.status).toEqual({ kind: "playing", turn: "w", inCheck: false });
    expect(game.sanHistory).toEqual([]);
    expect(game.lastMove).toBeNull();
  });
});

describe("legalDestinations", () => {
  it("liste les cases atteignables par une pièce du camp au trait", () => {
    // Given
    const game = newGame();

    // When
    const targets = legalDestinations(game, "g1");

    // Then
    expect(targets.sort()).toEqual(["f3", "h3"]);
  });

  it("ne renvoie rien pour une pièce du camp qui n'a pas le trait", () => {
    // Given
    const game = newGame();

    // When
    const targets = legalDestinations(game, "e7");

    // Then
    expect(targets).toEqual([]);
  });
});

describe("playMove", () => {
  it("joue un coup légal et enregistre la notation SAN", () => {
    // Given
    const game = newGame();

    // When
    const next = playMove(game, { from: "e2", to: "e4" });

    // Then
    expect(next?.sanHistory).toEqual(["e4"]);
    expect(next?.lastMove).toEqual({ from: "e2", to: "e4" });
    expect(next?.status).toEqual({ kind: "playing", turn: "b", inCheck: false });
  });

  it("refuse un coup illégal sans modifier la partie", () => {
    // Given
    const game = newGame();

    // When
    const next = playMove(game, { from: "e2", to: "e5" });

    // Then
    expect(next).toBeNull();
    expect(game.sanHistory).toEqual([]);
  });

  it("détecte le mat du berger", () => {
    // Given / When
    const game = playAll([
      ["e2", "e4"],
      ["e7", "e5"],
      ["f1", "c4"],
      ["b8", "c6"],
      ["d1", "h5"],
      ["g8", "f6"],
      ["h5", "f7"],
    ]);

    // Then
    expect(game.status).toEqual({ kind: "checkmate", winner: "w" });
    expect(game.checkSquare).toBe("e8");
  });

  it("signale l'échec et la case du roi attaqué", () => {
    // Given / When
    const game = playAll([
      ["e2", "e4"],
      ["f7", "f6"],
      ["d1", "h5"],
    ]);

    // Then
    expect(game.status).toEqual({ kind: "playing", turn: "b", inCheck: true });
    expect(game.checkSquare).toBe("e8");
  });

  it("détecte le pat", () => {
    // Given : Roi noir en h8, Dame blanche qui va en g6
    const game = newGame("7k/8/5Q2/8/8/8/8/6K1 w - - 0 1");

    // When
    const next = playMove(game, { from: "f6", to: "g6" });

    // Then
    expect(next?.status).toEqual({ kind: "draw", reason: "stalemate" });
  });

  it("promeut un pion dans la pièce choisie", () => {
    // Given
    const game = newGame("8/P6k/8/8/8/8/8/K7 w - - 0 1");

    // When
    const next = playMove(game, { from: "a7", to: "a8", promotion: "n" });

    // Then
    expect(next?.sanHistory).toEqual(["a8=N"]);
  });
});

describe("isPromotion", () => {
  it("reconnaît un pion qui atteint la dernière rangée", () => {
    // Given
    const game = newGame("8/P6k/8/8/8/8/8/K7 w - - 0 1");

    // When / Then
    expect(isPromotion(game, "a7", "a8")).toBe(true);
    expect(isPromotion(game, "a1", "a2")).toBe(false);
  });
});

describe("undoMove", () => {
  it("revient à la position précédente", () => {
    // Given
    const game = playAll([
      ["e2", "e4"],
      ["e7", "e5"],
    ]);

    // When
    const previous = undoMove(game);

    // Then
    expect(previous.sanHistory).toEqual(["e4"]);
    expect(previous.lastMove).toEqual({ from: "e2", to: "e4" });
  });

  it("ne fait rien au premier coup", () => {
    // Given
    const game = newGame();

    // When / Then
    expect(undoMove(game)).toBe(game);
  });
});

describe("capturedMaterial", () => {
  it("compte les pièces prises et l'avantage matériel", () => {
    // Given : 1.e4 d5 2.exd5
    const game = playAll([
      ["e2", "e4"],
      ["d7", "d5"],
      ["e4", "d5"],
    ]);

    // When
    const material = capturedMaterial(game);

    // Then
    expect(material.byWhite).toEqual(["p"]);
    expect(material.byBlack).toEqual([]);
    expect(material.advantage).toBe(1);
  });
});

describe("toPgn", () => {
  it("exporte les coups avec le résultat", () => {
    // Given
    const game = playAll([
      ["f2", "f3"],
      ["e7", "e5"],
      ["g2", "g4"],
      ["d8", "h4"],
    ]);

    // When
    const pgn = toPgn(game, { date: "2026.09.30" });

    // Then
    expect(pgn).toContain('[Site "RiaChess"]');
    expect(pgn).toContain('[Result "0-1"]');
    expect(pgn).toContain("1. f3 e5 2. g4 Qh4# 0-1");
  });
});
