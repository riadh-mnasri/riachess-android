// © 2026 Riadh MNASRI
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PUZZLES } from "../data/puzzles";
import { parseUciMove } from "../domain/bot";
import { legalDestinations, pieceAt, type GameState, type MoveInput } from "../domain/game";
import {
  PUZZLE_THEMES,
  pickPuzzle,
  playOpponentReply,
  revealSolution,
  startPuzzle,
  submitMove,
  updateRating,
  type Puzzle,
  type PuzzleState,
  type PuzzleTheme,
} from "../domain/puzzle";
import { useI18n } from "../i18n";
import {
  DEFAULT_PROFILE,
  loadPuzzleProfile,
  recordResult,
  savePuzzleProfile,
  type PuzzleProfile,
} from "../infrastructure/storage/puzzleProfile";
import { Board } from "../ui/board/Board";
import { haptic } from "../ui/game/GameView";
import { colors, radius } from "../ui/theme";

const OPPONENT_DELAY_MS = 450;

export default function PuzzlesScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const boardSize = Math.floor(Math.min(width - 24, height - insets.top - insets.bottom - 350, 560));

  const [profile, setProfile] = useState<PuzzleProfile | null>(null);
  const [theme, setTheme] = useState<PuzzleTheme>("all");
  const [state, setState] = useState<PuzzleState | null>(null);
  const [shown, setShown] = useState<GameState | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  // Le classement ne bouge qu'au premier résultat d'un puzzle, pas après « Réessayer ».
  const [rated, setRated] = useState(false);

  useEffect(() => {
    void loadPuzzleProfile().then(setProfile);
  }, []);

  const next = useCallback(
    (current: PuzzleProfile, chosenTheme: PuzzleTheme) => {
      const puzzle = pickPuzzle(PUZZLES, { rating: current.rating, solved: new Set(current.done), theme: chosenTheme });
      setState(puzzle ? startPuzzle(puzzle) : null);
      setShown(null);
      setDelta(null);
      setRated(false);
    },
    [],
  );

  useEffect(() => {
    if (profile && !state) next(profile, theme);
    // Premier puzzle seulement, une fois le profil chargé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Réponse de l'adversaire après un court délai, pour qu'on la voie jouer.
  useEffect(() => {
    if (state?.status !== "opponent") return;
    const timer = setTimeout(() => setState(playOpponentReply(state)), OPPONENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const rate = (puzzle: Puzzle, solved: boolean) => {
    if (!profile || rated) return;
    const rating = updateRating(profile.rating, puzzle.rating, solved);
    const updated = recordResult(profile, puzzle.id, rating, solved);
    setDelta(rating - profile.rating);
    setRated(true);
    setProfile(updated);
    void savePuzzleProfile(updated);
  };

  const onMove = (from: string, to: string) => {
    if (!state) return;
    const expected = parseUciMove(state.puzzle.moves[state.expected] ?? "");
    const promotes = pieceAt(state.game, from)?.type === "p" && /[18]$/.test(to);
    const move: MoveInput = promotes
      ? { from, to, promotion: expected?.from === from && expected.to === to ? (expected.promotion ?? "q") : "q" }
      : { from, to };
    const result = submitMove(state, move);
    setState(result);
    if (result.status === "solved") {
      haptic("end");
      rate(state.puzzle, true);
    } else if (result.status === "failed") {
      rate(state.puzzle, false);
    } else {
      haptic("move");
    }
  };

  const changeTheme = (value: PuzzleTheme) => {
    setTheme(value);
    if (profile) next(profile, value);
  };

  const game = shown ?? state?.game ?? null;
  const canPick = useCallback(
    (square: string) => !!state && !shown && state.status === "playing" && pieceAt(state.game, square)?.color === state.player,
    [state, shown],
  );
  const destinations = useCallback(
    (square: string) => (state && !shown ? legalDestinations(state.game, square) : []),
    [state, shown],
  );

  const sideName = state?.player === "b" ? t.game.black : t.game.white;
  const finished = state?.status === "solved" || state?.status === "failed";

  const banner = useMemo(() => {
    if (!state) return null;
    if (state.status === "solved") return { icon: "checkmark-circle" as const, color: colors.success, text: t.puzzles.solvedTitle };
    if (state.status === "failed") return { icon: "close-circle" as const, color: colors.danger, text: t.puzzles.failedTitle };
    if (state.expected > 1) return { icon: "checkmark" as const, color: colors.success, text: t.puzzles.good };
    return { icon: "flash" as const, color: colors.gold, text: t.puzzles.yourTurn(sideName) };
  }, [state, sideName, t]);

  const current = profile ?? DEFAULT_PROFILE;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: 8 }]}>
      <View style={[styles.header, { width: boardSize }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t.game.back}
        >
          <Ionicons name="chevron-back" size={22} color={colors.ivory} />
        </Pressable>
        <Text style={styles.title}>{t.puzzles.title}</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={[styles.stats, { width: boardSize }]}>
        <Stat label={t.puzzles.rating} value={String(current.rating)} extra={delta !== null ? delta : null} />
        <Stat label={t.puzzles.streak} value={String(current.streak)} icon="flame" />
        <Stat label={t.puzzles.solved} value={String(current.solvedCount)} icon="checkmark-done" />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ width: boardSize, flexGrow: 0 }}
        contentContainerStyle={styles.themes}
      >
        {PUZZLE_THEMES.map((value) => (
          <Pressable
            key={value}
            onPress={() => changeTheme(value)}
            style={({ pressed }) => [styles.themeChip, value === theme && styles.themeChipActive, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ selected: value === theme }}
          >
            <Text style={[styles.themeText, value === theme && styles.themeTextActive]}>{t.puzzles.themes[value]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {!profile ? (
        <View style={[styles.placeholder, { width: boardSize, height: boardSize }]}>
          <ActivityIndicator color={colors.gold} />
          <Text style={styles.muted}>{t.puzzles.loading}</Text>
        </View>
      ) : !state || !game ? (
        <View style={[styles.placeholder, { width: boardSize, height: boardSize }]}>
          <Ionicons name="extension-puzzle-outline" size={36} color={colors.faint} />
          <Text style={styles.muted}>{t.puzzles.empty}</Text>
        </View>
      ) : (
        <Board
          fen={game.fen}
          size={boardSize}
          orientation={state.player}
          lastMove={game.lastMove}
          checkSquare={game.checkSquare}
          canPick={canPick}
          destinations={destinations}
          onMove={onMove}
        />
      )}

      {banner ? (
        <View style={[styles.banner, { width: boardSize, borderColor: banner.color }]} accessibilityLiveRegion="polite">
          <Ionicons name={banner.icon} size={20} color={banner.color} />
          <Text style={styles.bannerText}>{banner.text}</Text>
          {finished && state ? <Text style={styles.puzzleRating}>{t.puzzles.puzzleRating(state.puzzle.rating)}</Text> : null}
        </View>
      ) : null}

      {finished && state ? (
        <View style={[styles.actions, { width: boardSize }]}>
          {state.status === "failed" ? (
            <>
              <ActionButton
                icon="refresh"
                label={t.puzzles.retry}
                onPress={() => {
                  setShown(null);
                  setState(startPuzzle(state.puzzle));
                }}
              />
              <ActionButton icon="eye-outline" label={t.puzzles.solution} onPress={() => setShown(revealSolution(state))} />
            </>
          ) : null}
          <ActionButton icon="arrow-forward" label={t.puzzles.next} primary onPress={() => profile && next(profile, theme)} />
        </View>
      ) : null}
    </View>
  );
}

function Stat({
  label,
  value,
  icon,
  extra = null,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  extra?: number | null;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statRow}>
        {icon ? <Ionicons name={icon} size={15} color={colors.gold} /> : null}
        <Text style={styles.statValue}>{value}</Text>
        {extra !== null && extra !== 0 ? (
          <Text style={[styles.delta, { color: extra > 0 ? colors.success : colors.danger }]}>
            {extra > 0 ? `+${extra}` : extra}
          </Text>
        ) : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, primary && styles.actionPrimary, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={17} color={primary ? colors.canvas : colors.ivory} />
      <Text style={[styles.actionText, primary && { color: colors.canvas }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, alignItems: "center", gap: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.ivory, fontSize: 17, fontWeight: "800" },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  pressed: { opacity: 0.65 },
  muted: { color: colors.muted, fontSize: 13, textAlign: "center" },
  stats: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statValue: { color: colors.ivory, fontSize: 18, fontWeight: "800" },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: "600", marginTop: 1 },
  delta: { fontSize: 12, fontWeight: "800" },
  themes: { gap: 6 },
  themeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeChipActive: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  themeText: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  themeTextActive: { color: colors.gold },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
  },
  bannerText: { flex: 1, color: colors.ivory, fontWeight: "700", fontSize: 14 },
  puzzleRating: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8 },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPrimary: { backgroundColor: colors.gold, borderColor: colors.gold },
  actionText: { color: colors.ivory, fontWeight: "700", fontSize: 14 },
});
