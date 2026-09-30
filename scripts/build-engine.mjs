// © 2026 Riadh MNASRI
// Embarque Stockfish (build « lite single-thread », WASM) dans un module TypeScript,
// pour qu'il tourne hors ligne dans un Web Worker (web) ou une WebView (Android, iOS).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "node_modules", "stockfish", "bin");
const script = readFileSync(join(bin, "stockfish-19-lite-single.js"), "utf8");
const wasm = readFileSync(join(bin, "stockfish-19-lite-single.wasm")).toString("base64");

const target = join(root, "src", "infrastructure", "engine", "generated");
mkdirSync(target, { recursive: true });
writeFileSync(
  join(target, "stockfishBundle.ts"),
  "// Fichier généré par scripts/build-engine.mjs, ne pas modifier.\n" +
    `export const STOCKFISH_JS = ${JSON.stringify(script)};\n` +
    `export const STOCKFISH_WASM_BASE64 = ${JSON.stringify(wasm)};\n`,
);
console.log(`Stockfish embarqué (${Math.round(wasm.length / 1024)} Ko en base64)`);
