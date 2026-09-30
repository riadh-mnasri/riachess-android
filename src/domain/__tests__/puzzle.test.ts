// © 2026 Riadh MNASRI
import {
  PUZZLE_THEMES,
  pickPuzzle,
  playOpponentReply,
  startPuzzle,
  submitMove,
  updateRating,
  type Puzzle,
} from "../puzzle";

// Puzzle Lichess réel (00008) : après 1...Rxb2?? les Blancs gagnent la dame par un échec intermédiaire.
const puzzle: Puzzle = {
  id: "00008",
  fen: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24",
  moves: ["f2g3", "e6e7", "b2b1", "b3c1", "b1c1", "h6c1"],
  rating: 1900,
  themes: ["crushing", "hangingPiece", "long", "middlegame"],
};

// Mat en 1 : le joueur doit mater, n'importe quel coup qui mate est accepté.
const mateInOne: Puzzle = {
  id: "mate1",
  fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1",
  moves: ["g8h8", "a1a8"],
  rating: 600,
  themes: ["mate", "mateIn1", "backRankMate"],
};

describe("startPuzzle", () => {
  it("joue le premier coup de l'adversaire et donne la main au joueur", () => {
    // Given / When
    const state = startPuzzle(puzzle);

    // Then
    expect(state.player).toBe("w");
    expect(state.game.sanHistory).toEqual(["Bxg3"]);
    expect(state.status).toBe("playing");
    expect(state.expected).toBe(1);
  });
});

describe("submitMove", () => {
  it("accepte le bon coup et attend la réponse de l'adversaire", () => {
    // Given
    const state = startPuzzle(puzzle);

    // When
    const next = submitMove(state, { from: "e6", to: "e7" });

    // Then
    expect(next.status).toBe("opponent");
    expect(next.game.sanHistory.at(-1)).toBe("Rxe7");
  });

  it("marque l'échec sur un mauvais coup sans le jouer", () => {
    // Given
    const state = startPuzzle(puzzle);

    // When
    const next = submitMove(state, { from: "h6", to: "h7" });

    // Then
    expect(next.status).toBe("failed");
    expect(next.game.sanHistory).toEqual(["Bxg3"]);
  });

  it("résout le puzzle quand toute la solution est jouée", () => {
    // Given
    let state = startPuzzle(puzzle);

    // When
    state = playOpponentReply(submitMove(state, { from: "e6", to: "e7" }));
    state = playOpponentReply(submitMove(state, { from: "b3", to: "c1" }));
    state = submitMove(state, { from: "h6", to: "c1" });

    // Then
    expect(state.status).toBe("solved");
  });

  it("accepte un autre coup s'il donne mat", () => {
    // Given : deux tours pourraient mater, la solution n'en cite qu'une
    const state = startPuzzle({ ...mateInOne, fen: "6k1/5ppp/8/8/8/8/5PPP/RR4K1 b - - 0 1" });

    // When
    const next = submitMove(state, { from: "b1", to: "b8" });

    // Then
    expect(next.status).toBe("solved");
  });
});

describe("updateRating", () => {
  it("fait monter le classement après une réussite et baisser après un échec", () => {
    // Given / When / Then
    expect(updateRating(1500, 1500, true)).toBe(1516);
    expect(updateRating(1500, 1500, false)).toBe(1484);
  });

  it("récompense davantage un puzzle plus difficile", () => {
    // Given / When
    const hard = updateRating(1500, 1900, true) - 1500;
    const easy = updateRating(1500, 1100, true) - 1500;

    // Then
    expect(hard).toBeGreaterThan(easy);
  });
});

describe("pickPuzzle", () => {
  const pool: Puzzle[] = [
    { ...mateInOne, id: "a", rating: 800 },
    { ...mateInOne, id: "b", rating: 1500, themes: ["fork"] },
    { ...mateInOne, id: "c", rating: 1520, themes: ["fork"] },
    { ...mateInOne, id: "d", rating: 2400, themes: ["fork"] },
  ];

  it("choisit un puzzle proche du classement du joueur", () => {
    // Given / When
    const picked = pickPuzzle(pool, { rating: 1500, solved: new Set(), theme: "all" }, () => 0);

    // Then
    expect(["b", "c"]).toContain(picked?.id);
  });

  it("évite les puzzles déjà faits et respecte le thème", () => {
    // Given / When
    const picked = pickPuzzle(pool, { rating: 1500, solved: new Set(["b", "c"]), theme: "fork" }, () => 0);

    // Then
    expect(picked?.id).toBe("d");
  });

  it("reconnaît les thèmes de mat", () => {
    // Given / When
    const picked = pickPuzzle(pool, { rating: 1500, solved: new Set(), theme: "mate" }, () => 0);

    // Then
    expect(picked?.id).toBe("a");
    expect(PUZZLE_THEMES).toContain("mate");
  });
});
