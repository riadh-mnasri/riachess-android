// © 2026 Riadh MNASRI
import { BOT_LEVELS } from "../../../domain/bot";
import { parseInfoLine, UciEngine, type UciTransport } from "../uci";

/** Faux moteur : répond aux commandes UCI comme Stockfish, avec un coup fixe. */
function fakeEngine(best = "e2e4") {
  const listeners = new Set<(line: string) => void>();
  const sent: string[] = [];
  const emit = (line: string) => queueMicrotask(() => listeners.forEach((listener) => listener(line)));
  const transport: UciTransport = {
    send(command) {
      sent.push(command);
      if (command === "uci") emit("uciok");
      if (command === "isready") emit("readyok");
      if (command.startsWith("go")) {
        emit("info depth 1 score cp 30 pv e2e4");
        emit(`bestmove ${best} ponder e7e5`);
      }
    },
    onLine(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return { transport, sent };
}

describe("UciEngine", () => {
  it("initialise le moteur puis renvoie le meilleur coup", async () => {
    // Given
    const { transport, sent } = fakeEngine("g1f3");
    const engine = new UciEngine(transport);

    // When
    const move = await engine.bestMove("startpos-fen", BOT_LEVELS[3]);

    // Then
    expect(move).toBe("g1f3");
    expect(sent).toEqual([
      "uci",
      "isready",
      "setoption name Skill Level value 5",
      "isready",
      "position fen startpos-fen",
      "go depth 5 movetime 200",
    ]);
  });

  it("traite les demandes l'une après l'autre", async () => {
    // Given
    const { transport, sent } = fakeEngine();
    const engine = new UciEngine(transport);

    // When
    await Promise.all([engine.bestMove("fen-1", BOT_LEVELS[0]), engine.bestMove("fen-2", BOT_LEVELS[0])]);

    // Then
    const positions = sent.filter((command) => command.startsWith("position") || command.startsWith("go"));
    expect(positions).toEqual([
      "position fen fen-1",
      "go depth 1 movetime 50",
      "position fen fen-2",
      "go depth 1 movetime 50",
    ]);
  });
});

describe("parseInfoLine", () => {
  it("lit la profondeur, le score et la variante", () => {
    // Given
    const line = "info depth 12 seldepth 18 multipv 1 score cp -34 nodes 1200 nps 90000 pv e7e5 g1f3 b8c6";

    // When / Then
    expect(parseInfoLine(line)).toEqual({
      depth: 12,
      score: { kind: "cp", value: -34 },
      pv: ["e7e5", "g1f3", "b8c6"],
    });
  });

  it("lit un mat annoncé", () => {
    // Given / When
    const info = parseInfoLine("info depth 5 score mate -2 pv h5f7");

    // Then
    expect(info?.score).toEqual({ kind: "mate", value: -2 });
  });

  it("ignore les lignes sans variante", () => {
    // Given / When / Then
    expect(parseInfoLine("info string NNUE evaluation enabled")).toBeNull();
    expect(parseInfoLine("bestmove e2e4")).toBeNull();
  });
});

describe("UciEngine.analyse", () => {
  it("renvoie la dernière info avant bestmove, à pleine force", async () => {
    // Given
    const { transport, sent } = fakeEngine();
    const engine = new UciEngine(transport);
    const infos: number[] = [];

    // When
    const info = await engine.analyse("some-fen", { depth: 10 }, (update) => infos.push(update.depth)).result;

    // Then
    expect(info).toEqual({ depth: 1, score: { kind: "cp", value: 30 }, pv: ["e2e4"] });
    expect(infos).toEqual([1]);
    expect(sent).toContain("setoption name Skill Level value 20");
    expect(sent).toContain("go depth 10");
  });

  it("n'envoie rien au moteur pour une analyse arrêtée avant de démarrer", async () => {
    // Given
    const { transport, sent } = fakeEngine();
    const engine = new UciEngine(transport);

    // When
    const handle = engine.analyse("some-fen", { depth: 10 });
    handle.stop();

    // Then
    expect(await handle.result).toBeNull();
    expect(sent).not.toContain("position fen some-fen");
  });
});
