// © 2026 Riadh MNASRI
import { useEffect } from "react";
import { START_STOCKFISH_SOURCE, type StartStockfish } from "./bootstrap";
import { STOCKFISH_JS, STOCKFISH_WASM_BASE64 } from "./generated/stockfishBundle";
import { UciEngine } from "./uci";

// eslint-disable-next-line no-new-func
const startStockfish = new Function(`return (${START_STOCKFISH_SOURCE})`)() as StartStockfish;

/** Web : Stockfish tourne dans un Web Worker de la page. */
export function EngineHost({ onReady }: { onReady: (engine: UciEngine) => void }) {
  useEffect(() => {
    const listeners = new Set<(line: string) => void>();
    const send = startStockfish(STOCKFISH_JS, STOCKFISH_WASM_BASE64, (line) =>
      listeners.forEach((listener) => listener(line)),
    );
    onReady(
      new UciEngine({
        send,
        onLine(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      }),
    );
    return () => send("quit");
  }, [onReady]);
  return null;
}
