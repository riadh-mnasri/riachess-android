// © 2026 Riadh MNASRI
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chess } from "chess.js";
import {
  classifyMove,
  formatEval,
  gameAccuracy,
  toWhitePov,
  uciLineToSan,
  type Evaluation,
  type MoveJudgement,
} from "../domain/analysis";
import { parseUciMove } from "../domain/bot";
import {
  gameFromPgn,
  legalDestinations,
  newGame,
  pieceAt,
  playMove,
  positionsOf,
  truncate,
  type Color,
  type GameState,
  type MoveInput,
} from "../domain/game";
import { useI18n } from "../i18n";
import { EngineHost } from "../infrastructure/engine/EngineHost";
import type { EngineInfo, UciEngine } from "../infrastructure/engine/uci";
import { EvalBar } from "../ui/analysis/EvalBar";
import { EvalChart, JUDGEMENT_COLORS } from "../ui/analysis/EvalChart";
import { Board } from "../ui/board/Board";
import { colors, radius } from "../ui/theme";

const LIVE_DEPTH = 18;
const REVIEW_LIMITS = { depth: 12, movetimeMs: 400 };
const JUDGEMENT_SYMBOLS: Record<MoveJudgement, string> = { inaccuracy: "?!", mistake: "?", blunder: "??" };

const sideToMove = (fen: string): Color => (fen.split(" ")[1] === "b" ? "b" : "w");

/** Évaluation d'une position sans coup possible (mat ou pat), où le moteur ne renvoie pas de score. */
function terminalEvaluation(fen: string): Evaluation {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) return { kind: "mate", value: chess.turn() === "w" ? -1 : 1 };
  return { kind: "cp", value: 0 };
}

interface Review {
  evaluations: Evaluation[];
  judgements: (MoveJudgement | null)[];
  accuracy: Record<Color, number>;
}

export default function AnalysisScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ pgn?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const boardSize = Math.floor(Math.min(width - 24, height - insets.top - insets.bottom - 300, 560));

  const initial = useMemo(() => (params.pgn ? gameFromPgn(params.pgn) : null), [params.pgn]);
  const [game, setGame] = useState<GameState | null>(initial);
  const [ply, setPly] = useState(initial ? initial.moves.length : 0);
  const [orientation, setOrientation] = useState<Color>("w");
  const [engine, setEngine] = useState<UciEngine | null>(null);
  const [engineOn, setEngineOn] = useState(true);
  const [live, setLive] = useState<{ fen: string; info: EngineInfo } | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewProgress, setReviewProgress] = useState<number | null>(null);
  const [pgnText, setPgnText] = useState("");
  const [importError, setImportError] = useState(false);
  const reviewRun = useRef(0);

  const onEngineReady = useCallback((ready: UciEngine) => setEngine(ready), []);
  const positions = useMemo(() => (game ? positionsOf(game) : []), [game]);
  const current = useMemo(() => (game ? truncate(game, ply) : null), [game, ply]);
  const fen = positions[ply] ?? "";
  const reviewing = reviewProgress !== null;

  // Analyse en continu de la position affichée ; arrêtée dès qu'elle change.
  useEffect(() => {
    if (!engine || !engineOn || !fen || reviewing) return;
    const handle = engine.analyse(fen, { depth: LIVE_DEPTH }, (info) => setLive({ fen, info }));
    return () => handle.stop();
  }, [engine, engineOn, fen, reviewing]);

  useEffect(() => () => void (reviewRun.current += 1), []);

  const liveInfo = live && live.fen === fen ? live.info : null;
  const liveEval = liveInfo ? toWhitePov(liveInfo.score, sideToMove(fen)) : null;
  const isTerminal = current !== null && current.status.kind !== "playing";
  const shownEval = review?.evaluations[ply] ?? (isTerminal ? terminalEvaluation(fen) : liveEval);
  const bestMove = liveInfo ? parseUciMove(liveInfo.pv[0] ?? "") : null;
  const bestLine = liveInfo ? uciLineToSan(fen, liveInfo.pv.slice(0, 8)) : [];

  const loadPgn = () => {
    const imported = gameFromPgn(pgnText);
    if (!imported) {
      setImportError(true);
      return;
    }
    setImportError(false);
    setGame(imported);
    setPly(imported.moves.length);
    setReview(null);
  };

  const onMove = (from: string, to: string) => {
    if (!game || !current) return;
    const move: MoveInput = { from, to, promotion: pieceAt(current, from)?.type === "p" && /[18]$/.test(to) ? "q" : undefined };
    const next = game.moves[ply];
    if (next && next.from === from && next.to === to) {
      setPly(ply + 1);
      return;
    }
    // Un coup différent de la partie ouvre une nouvelle suite à partir d'ici.
    const branched = playMove(current, move);
    if (!branched) return;
    reviewRun.current += 1;
    setReviewProgress(null);
    setReview(null);
    setGame(branched);
    setPly(ply + 1);
  };

  const startReview = async () => {
    if (!engine || !game) return;
    const run = ++reviewRun.current;
    const evaluations: Evaluation[] = [];
    setReviewProgress(0);
    for (const position of positions) {
      const info = await engine.analyse(position, REVIEW_LIMITS).result;
      if (run !== reviewRun.current) return;
      evaluations.push(info ? toWhitePov(info.score, sideToMove(position)) : terminalEvaluation(position));
      setReviewProgress(evaluations.length);
    }
    const judgements = evaluations
      .slice(1)
      .map((after, index) => classifyMove(evaluations[index], after, index % 2 === 0 ? "w" : "b"));
    setReview({ evaluations, judgements, accuracy: gameAccuracy(evaluations) });
    setReviewProgress(null);
  };

  const canPick = useCallback(
    (square: string) => !!current && pieceAt(current, square)?.color === sideToMove(fen),
    [current, fen],
  );
  const destinations = useCallback(
    (square: string) => (current ? legalDestinations(current, square) : []),
    [current],
  );

  const header = (
    <View style={[styles.header, { width: boardSize }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t.game.back}
      >
        <Ionicons name="chevron-back" size={22} color={colors.ivory} />
      </Pressable>
      <Text style={styles.title}>{t.analysis.title}</Text>
      {game ? (
        <Pressable
          onPress={() => setEngineOn(!engineOn)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="switch"
          accessibilityState={{ checked: engineOn }}
          accessibilityLabel={t.analysis.toggleEngine}
        >
          <Ionicons name="hardware-chip-outline" size={20} color={engineOn ? colors.gold : colors.faint} />
        </Pressable>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );

  if (!game || !current) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        {header}
        <View style={[styles.importCard, { width: boardSize }]}>
          <Text style={styles.importTitle}>{t.analysis.importTitle}</Text>
          <Text style={styles.muted}>{t.analysis.importHint}</Text>
          <TextInput
            value={pgnText}
            onChangeText={(text) => {
              setPgnText(text);
              setImportError(false);
            }}
            placeholder={t.analysis.placeholder}
            placeholderTextColor={colors.faint}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          {importError ? <Text style={styles.error}>{t.analysis.invalidPgn}</Text> : null}
          <Pressable
            onPress={loadPgn}
            disabled={pgnText.trim().length === 0}
            style={({ pressed }) => [styles.primaryButton, pgnText.trim().length === 0 && styles.disabled, pressed && styles.pressed]}
          >
            <Ionicons name="analytics" size={16} color={colors.canvas} />
            <Text style={styles.primaryText}>{t.analysis.analyse}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setGame(newGame());
              setPly(0);
            }}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Ionicons name="grid-outline" size={16} color={colors.ivory} />
            <Text style={styles.secondaryText}>{t.analysis.freeBoard}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const pairs = [];
  for (let index = 0; index < current.sanHistory.length || index < game.sanHistory.length; index += 2) {
    pairs.push(index);
  }

  const moveChip = (index: number) => {
    const san = game.sanHistory[index];
    if (!san) return null;
    const judgement = review?.judgements[index] ?? null;
    const active = ply === index + 1;
    return (
      <Pressable
        key={index}
        onPress={() => setPly(index + 1)}
        style={[styles.moveChip, active && styles.moveChipActive]}
        accessibilityRole="button"
      >
        <Text style={[styles.moveSan, active && { color: colors.gold }]}>{san}</Text>
        {judgement ? (
          <Text style={[styles.judgement, { color: JUDGEMENT_COLORS[judgement] }]}>{JUDGEMENT_SYMBOLS[judgement]}</Text>
        ) : null}
      </Pressable>
    );
  };

  const counts = (color: Color) => {
    const result: Record<MoveJudgement, number> = { inaccuracy: 0, mistake: 0, blunder: 0 };
    review?.judgements.forEach((judgement, index) => {
      if (judgement && (index % 2 === 0 ? "w" : "b") === color) result[judgement] += 1;
    });
    return result;
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <EngineHost onReady={onEngineReady} />
      {header}

      <View style={{ width: boardSize, gap: 8 }}>
        <EvalBar evaluation={engineOn || review ? shownEval : null} orientation={orientation} width={boardSize} />
        <Board
          fen={fen}
          size={boardSize}
          orientation={orientation}
          lastMove={current.lastMove}
          checkSquare={current.checkSquare}
          canPick={canPick}
          destinations={destinations}
          onMove={onMove}
          arrows={engineOn && bestMove ? [bestMove] : []}
        />
      </View>

      <ScrollView style={{ width: boardSize, flex: 1 }} contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
        <View style={styles.engineLine}>
          {!engineOn ? (
            <Text style={styles.muted}>{t.analysis.engineOff}</Text>
          ) : liveInfo && liveEval ? (
            <>
              <Text style={styles.engineEval}>{formatEval(liveEval)}</Text>
              <Text style={styles.engineMoves} numberOfLines={2}>
                {bestLine.join(" ")}
              </Text>
              <Text style={styles.engineDepth}>{t.analysis.depth(liveInfo.depth)}</Text>
            </>
          ) : isTerminal ? (
            <Text style={styles.muted}>{t.analysis.gameOver}</Text>
          ) : (
            <>
              <ActivityIndicator size="small" color={colors.gold} />
              <Text style={styles.muted}>{t.analysis.thinking}</Text>
            </>
          )}
        </View>

        {review ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.analysis.review}</Text>
            <EvalChart
              evaluations={review.evaluations}
              judgements={review.judgements}
              ply={ply}
              width={boardSize - 28}
              onSelect={setPly}
            />
            <View style={styles.summaryRow}>
              {(["w", "b"] as const).map((color) => {
                const summary = counts(color);
                return (
                  <View key={color} style={styles.summary}>
                    <View style={styles.summaryHead}>
                      <View style={[styles.dot, { backgroundColor: color === "w" ? colors.ivory : "#05080f" }]} />
                      <Text style={styles.summaryName}>{color === "w" ? t.game.white : t.game.black}</Text>
                    </View>
                    <Text style={styles.accuracy}>{Math.round(review.accuracy[color])} %</Text>
                    <Text style={styles.muted}>{t.analysis.accuracy}</Text>
                    {(["inaccuracy", "mistake", "blunder"] as const).map((kind) => (
                      <Text key={kind} style={[styles.countLine, { color: JUDGEMENT_COLORS[kind] }]}>
                        {t.analysis.count(t.analysis[kind], summary[kind])}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          </View>
        ) : game.moves.length > 0 ? (
          <Pressable
            onPress={startReview}
            disabled={!engine || reviewing}
            style={({ pressed }) => [styles.reviewButton, (!engine || reviewing) && styles.disabled, pressed && styles.pressed]}
          >
            {reviewing ? (
              <ActivityIndicator size="small" color={colors.gold} />
            ) : (
              <Ionicons name="sparkles-outline" size={18} color={colors.gold} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewTitle}>
                {reviewing ? t.analysis.reviewing(reviewProgress ?? 0, positions.length) : t.analysis.review}
              </Text>
              {!reviewing ? <Text style={styles.muted}>{t.analysis.reviewHint}</Text> : null}
            </View>
          </Pressable>
        ) : null}

        {game.sanHistory.length > 0 ? (
          <View style={styles.moves}>
            {pairs.map((index) => (
              <View key={index} style={styles.moveRow}>
                <Text style={styles.moveNumber}>{index / 2 + 1}.</Text>
                {moveChip(index)}
                {moveChip(index + 1)}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.navBar, { width: boardSize }]}>
        <NavButton icon="play-skip-back" label={t.analysis.start} disabled={ply === 0} onPress={() => setPly(0)} />
        <NavButton icon="chevron-back" label={t.analysis.previous} disabled={ply === 0} onPress={() => setPly(ply - 1)} />
        <NavButton icon="swap-vertical" label={t.game.flip} onPress={() => setOrientation(orientation === "w" ? "b" : "w")} />
        <NavButton icon="chevron-forward" label={t.analysis.next} disabled={ply >= game.moves.length} onPress={() => setPly(ply + 1)} />
        <NavButton icon="play-skip-forward" label={t.analysis.end} disabled={ply >= game.moves.length} onPress={() => setPly(game.moves.length)} />
      </View>
    </View>
  );
}

function NavButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.navButton, pressed && styles.navPressed, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={colors.ivory} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, alignItems: "center", gap: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.ivory, fontSize: 17, fontWeight: "800" },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.35 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  importCard: {
    marginTop: 12,
    gap: 12,
    padding: 18,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  importTitle: { color: colors.ivory, fontSize: 18, fontWeight: "800" },
  input: {
    minHeight: 140,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.ivory,
    fontSize: 14,
    textAlignVertical: "top",
    fontFamily: "monospace",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.gold,
    paddingVertical: 12,
    borderRadius: radius.sm,
  },
  primaryText: { color: colors.canvas, fontWeight: "800", fontSize: 15 },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.ivory, fontWeight: "700", fontSize: 14 },
  engineLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  engineEval: { color: colors.gold, fontWeight: "800", fontSize: 15, minWidth: 44 },
  engineMoves: { flex: 1, color: colors.ivory, fontSize: 13, fontWeight: "600" },
  engineDepth: { color: colors.faint, fontSize: 11 },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  reviewTitle: { color: colors.ivory, fontWeight: "800", fontSize: 15 },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.ivory, fontWeight: "800", fontSize: 15 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summary: {
    flex: 1,
    gap: 2,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
  },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.borderStrong },
  summaryName: { color: colors.ivory, fontWeight: "700", fontSize: 13 },
  accuracy: { color: colors.gold, fontSize: 24, fontWeight: "800" },
  countLine: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  moves: {
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moveRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 1 },
  moveNumber: { width: 34, color: colors.faint, fontSize: 13, fontWeight: "600" },
  moveChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  moveChipActive: { backgroundColor: colors.goldSoft },
  moveSan: { color: colors.ivory, fontSize: 14, fontWeight: "600" },
  judgement: { fontSize: 13, fontWeight: "800" },
  navBar: { flexDirection: "row", gap: 6 },
  navButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navPressed: { backgroundColor: colors.surfaceHigh },
});
