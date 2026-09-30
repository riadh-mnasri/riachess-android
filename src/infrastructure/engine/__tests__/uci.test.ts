// © 2026 Riadh MNASRI
import { BOT_LEVELS } from "../../../domain/bot";
import { UciEngine, type UciTransport } from "../uci";

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
        emit("info depth 1 score cp 30");
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
