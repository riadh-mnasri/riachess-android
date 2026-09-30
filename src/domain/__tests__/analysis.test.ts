// © 2026 Riadh MNASRI
import {
  classifyMove,
  formatEval,
  gameAccuracy,
  moveAccuracy,
  toWhitePov,
  uciLineToSan,
  winChances,
  type Evaluation,
} from "../analysis";

const cp = (value: number): Evaluation => ({ kind: "cp", value });
const mate = (value: number): Evaluation => ({ kind: "mate", value });

describe("toWhitePov", () => {
  it("garde le score quand les Blancs ont le trait", () => {
    // Given / When / Then
    expect(toWhitePov(cp(40), "w")).toEqual(cp(40));
  });

  it("inverse le score quand les Noirs ont le trait", () => {
    // Given / When / Then
    expect(toWhitePov(cp(40), "b")).toEqual(cp(-40));
    expect(toWhitePov(mate(2), "b")).toEqual(mate(-2));
  });
});

describe("winChances", () => {
  it("vaut 0 à égalité et tend vers 1 pour un gros avantage blanc", () => {
    // Given / When / Then
    expect(winChances(cp(0))).toBe(0);
    expect(winChances(cp(1000))).toBeGreaterThan(0.9);
    expect(winChances(cp(-1000))).toBeLessThan(-0.9);
  });

  it("vaut 1 ou -1 en cas de mat annoncé", () => {
    // Given / When / Then
    expect(winChances(mate(3))).toBe(1);
    expect(winChances(mate(-1))).toBe(-1);
  });
});

describe("classifyMove", () => {
  it("ne signale rien pour un coup qui garde l'évaluation", () => {
    // Given / When / Then
    expect(classifyMove(cp(30), cp(20), "w")).toBeNull();
  });

  it("classe une gaffe des Blancs qui perd une pièce", () => {
    // Given / When / Then
    expect(classifyMove(cp(30), cp(-300), "w")).toBe("blunder");
  });

  it("juge un coup noir du point de vue des Noirs", () => {
    // Given : avant le coup noir égalité, après les Blancs gagnent nettement
    // When / Then
    expect(classifyMove(cp(0), cp(250), "b")).toBe("blunder");
    expect(classifyMove(cp(0), cp(-250), "b")).toBeNull();
  });

  it("distingue imprécision et erreur", () => {
    // Given / When / Then
    expect(classifyMove(cp(0), cp(-60), "w")).toBe("inaccuracy");
    expect(classifyMove(cp(0), cp(-130), "w")).toBe("mistake");
  });

  it("classe comme gaffe un coup qui laisse un mat", () => {
    // Given / When / Then
    expect(classifyMove(cp(50), mate(-2), "w")).toBe("blunder");
  });
});

describe("moveAccuracy et gameAccuracy", () => {
  it("donne environ 100 % à un coup parfait et bien moins à une gaffe", () => {
    // Given / When
    const perfect = moveAccuracy(cp(20), cp(20), "w");
    const blunder = moveAccuracy(cp(20), cp(-500), "w");

    // Then
    expect(perfect).toBeGreaterThan(99);
    expect(blunder).toBeLessThan(30);
  });

  it("calcule la précision de chaque camp sur une partie", () => {
    // Given : trois évaluations successives, Blancs parfaits, Noirs qui gaffent
    const evals = [cp(20), cp(20), cp(600)];

    // When
    const accuracy = gameAccuracy(evals);

    // Then
    expect(accuracy.w).toBeGreaterThan(99);
    expect(accuracy.b).toBeLessThan(30);
  });
});

describe("formatEval", () => {
  it("affiche les centipions en pions avec un signe", () => {
    // Given / When / Then
    expect(formatEval(cp(34))).toBe("+0.3");
    expect(formatEval(cp(-150))).toBe("-1.5");
    expect(formatEval(cp(0))).toBe("0.0");
  });

  it("affiche un mat annoncé", () => {
    // Given / When / Then
    expect(formatEval(mate(3))).toBe("#3");
    expect(formatEval(mate(-2))).toBe("#-2");
  });
});

describe("uciLineToSan", () => {
  it("traduit une variante UCI en notation algébrique", () => {
    // Given
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    // When / Then
    expect(uciLineToSan(fen, ["e2e4", "e7e5", "g1f3"])).toEqual(["e4", "e5", "Nf3"]);
  });

  it("s'arrête au premier coup illégal", () => {
    // Given
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    // When / Then
    expect(uciLineToSan(fen, ["e2e4", "e2e4"])).toEqual(["e4"]);
  });
});
