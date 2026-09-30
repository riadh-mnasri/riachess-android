// © 2026 Riadh MNASRI
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BOT_LEVELS, chooseBotMove } from "../../domain/bot";
import {
  newGame,
  playMove,
  turnOf,
  undoMove,
  type Color,
  type GameState,
  type MoveInput,
} from "../../domain/game";
import { useI18n } from "../../i18n";
import { EngineHost } from "../../infrastructure/engine/EngineHost";
import type { UciEngine } from "../../infrastructure/engine/uci";
import { Piece } from "../../ui/board/Board";
import { GameView, haptic } from "../../ui/game/GameView";
import { colors, radius } from "../../ui/theme";

type ColorChoice = Color | "random";

export default function BotGame() {
  const { t } = useI18n();
  const [engine, setEngine] = useState<UciEngine | null>(null);
  const [level, setLevel] = useState(3);
  const [choice, setChoice] = useState<ColorChoice>("w");
  const [human, setHuman] = useState<Color>("w");
  const [started, setStarted] = useState(false);
  const [game, setGame] = useState<GameState>(() => newGame());
  const [orientation, setOrientation] = useState<Color>("w");
  const [thinking, setThinking] = useState(false);
  // Chaque partie ou reprise de coup invalide la réflexion en cours de l'ordinateur.
  const generation = useRef(0);

  const onEngineReady = useCallback((ready: UciEngine) => setEngine(ready), []);
  const bot: Color = human === "w" ? "b" : "w";
  const botLevel = BOT_LEVELS[level - 1];

  useEffect(() => {
    if (!started || !engine || game.status.kind !== "playing" || turnOf(game) !== bot) return;
    const current = ++generation.current;
    setThinking(true);
    engine
      .bestMove(game.fen, botLevel)
      .then((uci) => {
        if (current !== generation.current) return;
        const move = chooseBotMove(game, uci, botLevel);
        const next = move ? playMove(game, move) : null;
        if (next) {
          setGame(next);
          haptic(next.status.kind === "playing" ? "move" : "end");
        }
      })
      .finally(() => {
        if (current === generation.current) setThinking(false);
      });
  }, [started, engine, game, bot, botLevel]);

  const onMove = (move: MoveInput) => {
    const next = playMove(game, move);
    if (!next) return;
    setGame(next);
    haptic(next.status.kind === "playing" ? "move" : "end");
  };

  const onUndo = () => {
    generation.current += 1;
    setThinking(false);
    // Reprend le coup de l'ordinateur et celui du joueur, pour lui rendre la main.
    let previous = undoMove(game);
    if (turnOf(previous) !== human) previous = undoMove(previous);
    setGame(previous);
  };

  const start = () => {
    const color: Color = choice === "random" ? (Math.random() < 0.5 ? "w" : "b") : choice;
    generation.current += 1;
    setHuman(color);
    setOrientation(color);
    setGame(newGame());
    setThinking(false);
    setStarted(true);
  };

  const restart = () => {
    generation.current += 1;
    setThinking(false);
    setStarted(false);
    setGame(newGame());
  };

  const names: Record<Color, string> =
    human === "w"
      ? { w: t.bot.you, b: t.bot.computer(level) }
      : { w: t.bot.computer(level), b: t.bot.you };

  return (
    <>
      <EngineHost onReady={onEngineReady} />
      <GameView
        title={t.bot.title}
        game={game}
        orientation={orientation}
        onFlip={() => setOrientation(orientation === "w" ? "b" : "w")}
        playerNames={names}
        canMove={(color) => started && color === human && !thinking}
        onMove={onMove}
        onUndo={onUndo}
        onRestart={restart}
        thinking={thinking ? bot : null}
        pgnEvent={t.bot.title}
      >
        {started ? null : (
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t.bot.setupTitle}</Text>

            <Text style={styles.label}>
              {t.bot.level} {level} · <Text style={styles.hint}>{t.bot.levelHints[level - 1]}</Text>
            </Text>
            <View style={styles.levels}>
              {BOT_LEVELS.map(({ level: value }) => (
                <Pressable
                  key={value}
                  onPress={() => setLevel(value)}
                  style={({ pressed }) => [styles.levelChip, value === level && styles.chipActive, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === level }}
                >
                  <Text style={[styles.levelText, value === level && styles.chipTextActive]}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t.bot.color}</Text>
            <View style={styles.colors}>
              {(["w", "random", "b"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setChoice(value)}
                  style={({ pressed }) => [styles.colorChip, value === choice && styles.chipActive, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === choice }}
                  accessibilityLabel={value === "w" ? t.bot.white : value === "b" ? t.bot.black : t.bot.random}
                >
                  {value === "random" ? (
                    <Ionicons name="shuffle" size={26} color={value === choice ? colors.gold : colors.muted} />
                  ) : (
                    <Piece code={value === "w" ? "wK" : "bK"} size={34} />
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={start}
              disabled={!engine}
              style={({ pressed }) => [styles.startButton, !engine && styles.disabled, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              {engine ? (
                <>
                  <Ionicons name="play" size={16} color={colors.canvas} />
                  <Text style={styles.startText}>{t.bot.start}</Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="small" color={colors.canvas} />
                  <Text style={styles.startText}>{t.bot.loading}</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </GameView>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: "88%",
    maxWidth: 360,
    gap: 12,
    padding: 18,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.5)",
  },
  sheetTitle: { color: colors.ivory, fontSize: 18, fontWeight: "800", textAlign: "center" },
  label: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  hint: { color: colors.gold, fontWeight: "700" },
  levels: { flexDirection: "row", gap: 6 },
  levelChip: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelText: { color: colors.muted, fontWeight: "800", fontSize: 15 },
  colors: { flexDirection: "row", gap: 10 },
  colorChip: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  chipTextActive: { color: colors.gold },
  startButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.gold,
    paddingVertical: 12,
    borderRadius: radius.sm,
  },
  startText: { color: colors.canvas, fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.7 },
});
