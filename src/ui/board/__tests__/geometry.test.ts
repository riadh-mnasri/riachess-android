// © 2026 Riadh MNASRI
import { piecesFromFen, screenCell, squareAt } from "../geometry";

describe("squareAt", () => {
  it("trouve la case touchée côté Blancs", () => {
    // Given : plateau de 800 px, cases de 100 px

    // When / Then
    expect(squareAt(10, 10, 800, "w")).toBe("a8");
    expect(squareAt(450, 750, 800, "w")).toBe("e1");
  });

  it("inverse les cases quand le plateau est retourné", () => {
    // Given / When / Then
    expect(squareAt(10, 10, 800, "b")).toBe("h1");
    expect(squareAt(450, 750, 800, "b")).toBe("d8");
  });

  it("renvoie null hors du plateau", () => {
    // Given / When / Then
    expect(squareAt(-1, 10, 800, "w")).toBeNull();
    expect(squareAt(10, 800, 800, "w")).toBeNull();
  });
});

describe("screenCell", () => {
  it("place une case selon l'orientation", () => {
    // Given / When / Then
    expect(screenCell("a1", "w")).toEqual({ column: 0, row: 7 });
    expect(screenCell("a1", "b")).toEqual({ column: 7, row: 0 });
  });
});

describe("piecesFromFen", () => {
  it("lit les pièces de la position initiale", () => {
    // Given
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    // When
    const pieces = piecesFromFen(fen);

    // Then
    expect(pieces.size).toBe(32);
    expect(pieces.get("e1")).toBe("wK");
    expect(pieces.get("d8")).toBe("bQ");
    expect(pieces.get("e4")).toBeUndefined();
  });
});
