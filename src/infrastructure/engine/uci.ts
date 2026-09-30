// © 2026 Riadh MNASRI
import type { BotLevel } from "../../domain/bot";

/** Canal texte vers un moteur UCI : une commande envoyée, des lignes reçues. */
export interface UciTransport {
  send(command: string): void;
  onLine(listener: (line: string) => void): () => void;
}

export class UciEngine {
  private queue: Promise<unknown> = Promise.resolve();
  private ready: Promise<void>;

  constructor(private readonly transport: UciTransport) {
    this.ready = this.handshake();
  }

  private waitFor(predicate: (line: string) => boolean, send?: string): Promise<string> {
    return new Promise((resolve) => {
      const stop = this.transport.onLine((line) => {
        if (!predicate(line)) return;
        stop();
        resolve(line);
      });
      if (send) this.transport.send(send);
    });
  }

  private async handshake(): Promise<void> {
    await this.waitFor((line) => line === "uciok", "uci");
    await this.waitFor((line) => line === "readyok", "isready");
  }

  /** Meilleur coup en notation UCI (ex. « e2e4 ») pour la position donnée. */
  bestMove(fen: string, level: BotLevel): Promise<string> {
    const run = async () => {
      await this.ready;
      this.transport.send(`setoption name Skill Level value ${level.skill}`);
      await this.waitFor((line) => line === "readyok", "isready");
      this.transport.send(`position fen ${fen}`);
      const line = await this.waitFor(
        (text) => text.startsWith("bestmove"),
        `go depth ${level.depth} movetime ${level.movetimeMs}`,
      );
      return line.split(/\s+/)[1] ?? "";
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }
}
