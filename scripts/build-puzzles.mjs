// © 2026 Riadh MNASRI
// Extrait une sélection de puzzles de la base Lichess (CC0) pour les embarquer dans l'appli.
//
//   curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
//   node scripts/build-puzzles.mjs lichess_db_puzzle.csv.zst
//
// Nécessite l'outil `zstd` : le fichier de Lichess commence par un bloc
// que le décompresseur intégré à Node ne sait pas lire.
//
// Critères : puzzles populaires et beaucoup joués, classement fiable,
// répartis de façon égale par tranche de 100 points de 400 à 2800.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source) {
  console.error("Usage : node scripts/build-puzzles.mjs <lichess_db_puzzle.csv.zst>");
  process.exit(1);
}

const MIN_RATING = 400;
const MAX_RATING = 2800;
const BUCKET = 100;
const PER_BUCKET = 125;

// Tirage déterministe : relancer le script donne la même sélection.
let seed = 20260930;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const buckets = new Map();
const seen = new Map();
let total = 0;

const zstd = spawn("zstd", ["-dc", source], { stdio: ["ignore", "pipe", "inherit"] });
const lines = createInterface({ input: zstd.stdout });
for await (const line of lines) {
  if (line.startsWith("PuzzleId")) continue;
  total += 1;
  const [id, fen, moves, rating, deviation, popularity, plays, themes] = line.split(",");
  const value = Number(rating);
  if (value < MIN_RATING || value >= MAX_RATING) continue;
  if (Number(deviation) > 80 || Number(popularity) < 85 || Number(plays) < 2000) continue;
  const bucket = Math.floor(value / BUCKET);
  const pool = buckets.get(bucket) ?? [];
  const count = (seen.get(bucket) ?? 0) + 1;
  seen.set(bucket, count);
  const entry = [id, fen, moves, value, themes];
  // Échantillonnage par réservoir : chaque puzzle éligible a la même chance d'être gardé.
  if (pool.length < PER_BUCKET) pool.push(entry);
  else {
    const slot = Math.floor(random() * count);
    if (slot < PER_BUCKET) pool[slot] = entry;
  }
  buckets.set(bucket, pool);
}

const selection = [...buckets.keys()]
  .sort((a, b) => a - b)
  .flatMap((bucket) => buckets.get(bucket).sort((a, b) => a[3] - b[3]));

const target = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "puzzles.json");
writeFileSync(target, JSON.stringify(selection));
console.log(`${selection.length} puzzles retenus sur ${total} lus`);
