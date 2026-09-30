// © 2026 Riadh MNASRI
// Identité RiaChess : bleu nuit et or, comme riachess.fr.
export const colors = {
  canvas: "#0b1226",
  surface: "#131c36",
  surfaceHigh: "#1b2748",
  border: "rgba(212, 175, 55, 0.16)",
  borderStrong: "rgba(212, 175, 55, 0.4)",
  gold: "#d4af37",
  goldSoft: "rgba(212, 175, 55, 0.14)",
  ivory: "#f3ecd9",
  muted: "#98a2bf",
  faint: "#5d6886",
  danger: "#e0645c",
  success: "#6fbf8e",
} as const;

export const board = {
  light: "#e8dfc8",
  dark: "#51678c",
  lastMove: "rgba(212, 175, 55, 0.42)",
  selected: "rgba(212, 175, 55, 0.62)",
  hover: "rgba(243, 236, 217, 0.35)",
  hint: "rgba(11, 18, 38, 0.28)",
  check: "rgba(224, 100, 92, 0.85)",
} as const;

export const radius = { sm: 8, md: 14, lg: 22 } as const;
