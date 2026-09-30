// © 2026 Riadh MNASRI
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  capturedMaterial,
  isPromotion,
  legalDestinations,
  newGame,
  pieceAt,
  playMove,
  toPgn,
  turnOf,
  undoMove,
  type Color,
  type GameState,
  type PieceType,
  type PromotionPiece,
} from "../../domain/game";
import { useI18n } from "../../i18n";
import { Board, Piece } from "../../ui/board/Board";
import type { PieceCode } from "../../ui/board/pieces";
import { colors, radius } from "../../ui/theme";

function haptic(kind: "move" | "end") {
  if (Platform.OS === "web") return;
  if (kind === "move") void Haptics.selectionAsync();
  else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

function pgnDate(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
}

const pieceCode = (color: Color, type: PieceType) => `${color}${type.toUpperCase()}` as PieceCode;

export default function LocalGame() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const boardSize = Math.floor(Math.min(width - 24, height - insets.top - insets.bottom - 330, 560));

  const [game, setGame] = useState<GameState>(() => newGame());
  const [orientation, setOrientation] = useState<Color>("w");
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const movesScroll = useRef<ScrollView>(null);

  const turn = turnOf(game);
  const material = useMemo(() => capturedMaterial(game), [game]);
  const isOver = game.status.kind !== "playing";

  const canPick = useCallback(
    (square: string) => !isOver && pieceAt(game, square)?.color === turn,
    [game, isOver, turn],
  );
  const destinations = useCallback((square: string) => legalDestinations(game, square), [game]);

  const commit = (from: string, to: string, promotion?: PromotionPiece) => {
    const next = playMove(game, { from, to, promotion });
    if (!next) return;
    setGame(next);
    haptic(next.status.kind === "playing" ? "move" : "end");
  };

  const onMove = (from: string, to: string) => {
    if (isPromotion(game, from, to)) {
      setPendingPromotion({ from, to });
      return;
    }
    commit(from, to);
  };

  const restart = () => {
    setPendingPromotion(null);
    setGame(newGame());
  };

  const copyPgn = async () => {
    await Clipboard.setStringAsync(toPgn(game, { date: pgnDate() }));
    setToast(t.game.copied);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    movesScroll.current?.scrollToEnd({ animated: true });
  }, [game.sanHistory.length]);

  const colorName = (color: Color) => (color === "w" ? t.game.white : t.game.black);

  const statusText = (() => {
    const status = game.status;
    if (status.kind === "checkmate") return t.game.checkmate(colorName(status.winner));
    if (status.kind === "draw") return t.game.draw[status.reason];
    if (status.inCheck) return `${t.game.check} ${colorName(status.turn)} ${t.game.toMove}`;
    if (game.sanHistory.length === 0) return t.game.noMoves;
    return `${colorName(status.turn)} ${t.game.toMove}`;
  })();

  const playerBar = (color: Color) => {
    const captured = color === "w" ? material.byWhite : material.byBlack;
    const lead = color === "w" ? material.advantage : -material.advantage;
    const active = !isOver && turn === color;
    return (
      <View style={[styles.player, active && styles.playerActive]}>
        <View style={[styles.playerDot, { backgroundColor: color === "w" ? colors.ivory : "#05080f" }]} />
        <Text style={[styles.playerName, active && { color: colors.ivory }]}>{colorName(color)}</Text>
        <View style={styles.captured}>
          {captured.map((type, index) => (
            <View key={`${type}${index}`} style={styles.capturedPiece}>
              <Piece code={pieceCode(color === "w" ? "b" : "w", type)} size={20} />
            </View>
          ))}
          {lead > 0 ? <Text style={styles.lead}>+{lead}</Text> : null}
        </View>
        {active ? <View style={styles.turnPip} /> : null}
      </View>
    );
  };

  const opposite: Color = orientation === "w" ? "b" : "w";

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={[styles.header, { width: boardSize }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ivory} />
        </Pressable>
        <Text style={styles.title}>{t.game.title}</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={{ width: boardSize, gap: 10 }}>
        {playerBar(opposite)}

        <View style={styles.boardFrame}>
          <Board
            fen={game.fen}
            size={boardSize}
            orientation={orientation}
            lastMove={game.lastMove}
            checkSquare={game.checkSquare}
            canPick={canPick}
            destinations={destinations}
            onMove={onMove}
          />

          {pendingPromotion ? (
            <View style={styles.overlay}>
              <View style={styles.sheet}>
                <Text style={styles.sheetTitle}>{t.game.promoteTitle}</Text>
                <View style={styles.promotionRow}>
                  {(["q", "r", "b", "n"] as const).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => {
                        commit(pendingPromotion.from, pendingPromotion.to, type);
                        setPendingPromotion(null);
                      }}
                      style={({ pressed }) => [styles.promotionChoice, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={type}
                    >
                      <Piece code={pieceCode(turn, type)} size={boardSize / 7} />
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {isOver ? (
            <View style={styles.overlay} pointerEvents="box-none">
              <View style={styles.sheet}>
                <Ionicons
                  name={game.status.kind === "checkmate" ? "trophy" : "git-compare-outline"}
                  size={30}
                  color={colors.gold}
                />
                <Text style={styles.resultText}>{statusText}</Text>
                <Pressable
                  onPress={restart}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <Ionicons name="refresh" size={16} color={colors.canvas} />
                  <Text style={styles.primaryButtonText}>{t.game.rematch}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {playerBar(orientation)}

        <Text
          style={[styles.status, game.status.kind === "playing" && game.status.inCheck && { color: colors.danger }]}
          accessibilityLiveRegion="polite"
        >
          {statusText}
        </Text>

        <ScrollView
          ref={movesScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.moves}
          contentContainerStyle={styles.movesContent}
        >
          {game.sanHistory.map((san, index) => {
            const isLast = index === game.sanHistory.length - 1;
            return (
              <View key={index} style={styles.moveItem}>
                {index % 2 === 0 ? <Text style={styles.moveNumber}>{index / 2 + 1}.</Text> : null}
                <Text style={[styles.moveSan, isLast && styles.moveSanLast]}>{san}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.actions}>
          <ActionButton icon="arrow-undo" label={t.game.undo} disabled={game.sanHistory.length === 0} onPress={() => { setPendingPromotion(null); setGame(undoMove(game)); }} />
          <ActionButton icon="swap-vertical" label={t.game.flip} onPress={() => setOrientation(opposite)} />
          <ActionButton icon="add-circle-outline" label={t.game.newGame} disabled={game.sanHistory.length === 0} onPress={restart} />
          <ActionButton icon="copy-outline" label={t.game.copyPgn} disabled={game.sanHistory.length === 0} onPress={copyPgn} />
        </View>
      </View>

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 90 }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
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
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={colors.ivory} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, alignItems: "center", gap: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.ivory, fontSize: 17, fontWeight: "800" },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  pressed: { opacity: 0.65 },
  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: 44,
  },
  playerActive: { borderColor: colors.borderStrong, backgroundColor: colors.surfaceHigh },
  playerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  playerName: { color: colors.muted, fontWeight: "700", fontSize: 15 },
  captured: { flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  capturedPiece: { marginRight: -6 },
  lead: { color: colors.muted, fontSize: 12, fontWeight: "700", marginLeft: 10 },
  turnPip: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  boardFrame: {
    borderRadius: 8,
    padding: 0,
    boxShadow: "0 16px 36px rgba(0, 0, 0, 0.45)",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 18, 38, 0.55)",
    borderRadius: 6,
  },
  sheet: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.5)",
    maxWidth: "86%",
  },
  sheetTitle: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  promotionRow: { flexDirection: "row", gap: 8 },
  promotionChoice: { borderRadius: radius.sm, backgroundColor: colors.surfaceHigh, padding: 4 },
  resultText: { color: colors.ivory, fontSize: 17, fontWeight: "800", textAlign: "center" },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.gold,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  primaryButtonText: { color: colors.canvas, fontWeight: "800", fontSize: 15 },
  status: { color: colors.muted, fontSize: 14, textAlign: "center", minHeight: 20 },
  moves: {
    flexGrow: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  movesContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 10, minHeight: 40, alignItems: "center" },
  moveItem: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  moveNumber: { color: colors.faint, fontSize: 13, fontWeight: "600" },
  moveSan: { color: colors.ivory, fontSize: 14, fontWeight: "600", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5 },
  moveSanLast: { backgroundColor: colors.goldSoft, color: colors.gold },
  actions: { flexDirection: "row", gap: 8 },
  action: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPressed: { backgroundColor: colors.surfaceHigh, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.35 },
  actionLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  toast: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toastText: { color: colors.ivory, fontWeight: "600", fontSize: 13 },
});
