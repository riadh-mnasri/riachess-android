// © 2026 Riadh MNASRI
import { BOT_LEVELS, chooseBotMove, parseUciMove } from "../bot";
import { legalDestinations, newGame } from "../game";

describe("BOT_LEVELS", () => {
  it("propose 8 niveaux de plus en plus forts", () => {
    // Given / When
    const skills = BOT_LEVELS.map((level) => level.skill);
    const depths = BOT_LEVELS.map((level) => level.depth);

    // Then
    expect(BOT_LEVELS).toHaveLength(8);
    expect([...skills].sort((a, b) => a - b)).toEqual(skills);
    expect([...depths].sort((a, b) => a - b)).toEqual(depths);
    expect(BOT_LEVELS[0].randomMoveRate).toBeGreaterThan(BOT_LEVELS[7].randomMoveRate);
  });
});

describe("parseUciMove", () => {
  it("lit un coup UCI simple", () => {
    // Given / When / Then
    expect(parseUciMove("e2e4")).toEqual({ from: "e2", to: "e4" });
  });

  it("lit une promotion", () => {
    // Given / When / Then
    expect(parseUciMove("a7a8q")).toEqual({ from: "a7", to: "a8", promotion: "q" });
  });

  it("refuse un texte qui n'est pas un coup", () => {
    // Given / When / Then
    expect(parseUciMove("(none)")).toBeNull();
  });
});

describe("chooseBotMove", () => {
  it("joue le coup du moteur quand le tirage ne déclenche pas de coup au hasard", () => {
    // Given
    const game = newGame();

    // When
    const move = chooseBotMove(game, "g1f3", BOT_LEVELS[0], () => 0.99);

    // Then
    expect(move).toEqual({ from: "g1", to: "f3" });
  });

  it("joue un coup légal au hasard quand le tirage le demande", () => {
    // Given
    const game = newGame();

    // When
    const move = chooseBotMove(game, "g1f3", BOT_LEVELS[0], () => 0);

    // Then
    expect(move).not.toBeNull();
    expect(legalDestinations(game, move!.from)).toContain(move!.to);
  });

  it("ne joue jamais au hasard au niveau maximum", () => {
    // Given
    const game = newGame();

    // When
    const move = chooseBotMove(game, "e2e4", BOT_LEVELS[7], () => 0);

    // Then
    expect(move).toEqual({ from: "e2", to: "e4" });
  });
});
