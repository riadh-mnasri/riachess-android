// © 2026 Riadh MNASRI
import type { Evaluation } from "../../domain/analysis";
import type { BotLevel } from "../../domain/bot";

/** Canal texte vers un moteur UCI : une commande envoyée, des lignes reçues. */
export interface UciTransport {
  send(command: string): void;
  onLine(listener: (line: string) => void): () => void;
}

/** Ligne « info » du moteur, score du point de vue du camp au trait. */
export interface EngineInfo {
  depth: number;
  score: Evaluation;
  pv: string[];
}

export function parseInfoLine(line: string): EngineInfo | null {
  if (!line.startsWith("info ") || !line.includes(" pv ")) return null;
  const depth = /\bdepth (\d+)/.exec(line);
  const score = /\bscore (cp|mate) (-?\d+)/.exec(line);
  const pv = / pv (.+)$/.exec(line);
  if (!depth || !score || !pv) return null;
  return {
    depth: Number(depth[1]),
    score: { kind: score[1] as "cp" | "mate", value: Number(score[2]) },
    pv: pv[1].trim().split(/\s+/),
  };
}

export interface AnalysisLimits {
  depth: number;
  movetimeMs?: number;
}

export interface AnalysisHandle {
  /** Dernière info reçue avant la fin de la recherche (null si le moteur n'a rien renvoyé). */
  result: Promise<EngineInfo | null>;
  /** Arrête la recherche au plus vite ; `result` se résout avec la dernière info. */
  stop: () => void;
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

  /** Les demandes passent l'une après l'autre : le moteur ne mène qu'une recherche à la fois. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async setSkill(skill: number): Promise<void> {
    this.transport.send(`setoption name Skill Level value ${skill}`);
    await this.waitFor((line) => line === "readyok", "isready");
  }

  /** Meilleur coup en notation UCI (ex. « e2e4 ») pour la position donnée. */
  bestMove(fen: string, level: BotLevel): Promise<string> {
    return this.enqueue(async () => {
      await this.ready;
      await this.setSkill(level.skill);
      this.transport.send(`position fen ${fen}`);
      const line = await this.waitFor(
        (text) => text.startsWith("bestmove"),
        `go depth ${level.depth} movetime ${level.movetimeMs}`,
      );
      return line.split(/\s+/)[1] ?? "";
    });
  }

  /** Analyse à pleine force ; `onInfo` reçoit chaque amélioration de la recherche. */
  analyse(fen: string, limits: AnalysisLimits, onInfo?: (info: EngineInfo) => void): AnalysisHandle {
    let stopped = false;
    let running = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (running) this.transport.send("stop");
    };
    const result = this.enqueue(async () => {
      if (stopped) return null;
      await this.ready;
      await this.setSkill(20);
      if (stopped) return null;
      let latest: EngineInfo | null = null;
      const unsubscribe = this.transport.onLine((line) => {
        const info = parseInfoLine(line);
        if (!info) return;
        latest = info;
        onInfo?.(info);
      });
      this.transport.send(`position fen ${fen}`);
      running = true;
      const go = limits.movetimeMs ? `go depth ${limits.depth} movetime ${limits.movetimeMs}` : `go depth ${limits.depth}`;
      await this.waitFor((line) => line.startsWith("bestmove"), go);
      running = false;
      unsubscribe();
      return latest;
    });
    return { result, stop };
  }
}
