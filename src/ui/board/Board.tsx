// © 2026 Riadh MNASRI
import { Fragment, memo, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Line, Polygon, SvgXml } from "react-native-svg";
import type { Color } from "../../domain/game";
import { board as palette } from "../theme";
import { FILES, piecesFromFen, screenCell, squareAt } from "./geometry";
import { PIECE_SVG, type PieceCode } from "./pieces";

export interface BoardProps {
  fen: string;
  size: number;
  orientation: Color;
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  /** Vrai si le joueur peut prendre cette pièce en main. */
  canPick: (square: string) => boolean;
  destinations: (square: string) => string[];
  onMove: (from: string, to: string) => void;
  /** Flèches dessinées sur le plateau (meilleur coup du moteur...). */
  arrows?: { from: string; to: string }[];
}

export const Piece = memo(function Piece({ code, size }: { code: PieceCode; size: number }) {
  return <SvgXml xml={PIECE_SVG[code]} width={size} height={size} />;
});

const DRAG_THRESHOLD = 4;

interface DragState {
  from: string;
  startX: number;
  startY: number;
  moved: boolean;
  wasSelected: boolean;
}

export function Board({
  fen,
  size,
  orientation,
  lastMove,
  checkSquare,
  canPick,
  destinations,
  onMove,
  arrows = [],
}: BoardProps) {
  const cell = size / 8;
  const pieces = useMemo(() => piecesFromFen(fen), [fen]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<DragState | null>(null);
  const floating = useRef(new Animated.ValueXY()).current;

  const targets = useMemo(
    () => (selected ? new Set(destinations(selected)) : new Set<string>()),
    [selected, destinations],
  );

  // Le geste est créé une seule fois : le recréer à chaque rendu l'interrompt
  // en plein glisser sur le web. Il lit donc l'état courant via cette ref.
  const latest = useRef({ size, orientation, selected, targets, canPick, destinations, onMove });
  latest.current = { size, orientation, selected, targets, canPick, destinations, onMove };

  const pan = useMemo(() => {
    const clear = () => {
      setSelected(null);
      setDraggingFrom(null);
      setHover(null);
      drag.current = null;
    };
    const play = (from: string, to: string) => {
      clear();
      latest.current.onMove(from, to);
    };
    return Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin(({ x, y }) => {
        const { size, orientation, selected, targets, canPick } = latest.current;
        const square = squareAt(x, y, size, orientation);
        if (!square) return;
        if (selected && square !== selected && targets.has(square)) {
          play(selected, square);
          return;
        }
        if (!canPick(square)) {
          clear();
          return;
        }
        drag.current = { from: square, startX: x, startY: y, moved: false, wasSelected: square === selected };
        floating.setValue({ x: x - size / 16, y: y - size / 16 });
        setSelected(square);
      })
      .onUpdate(({ x, y }) => {
        const current = drag.current;
        if (!current) return;
        const { size, orientation } = latest.current;
        if (!current.moved && Math.hypot(x - current.startX, y - current.startY) > DRAG_THRESHOLD) {
          current.moved = true;
          setDraggingFrom(current.from);
        }
        if (!current.moved) return;
        floating.setValue({ x: x - size / 16, y: y - size / 16 });
        const over = squareAt(x, y, size, orientation);
        setHover((previous) => (previous === over ? previous : over));
      })
      .onFinalize(({ x, y }) => {
        const current = drag.current;
        drag.current = null;
        setDraggingFrom(null);
        setHover(null);
        if (!current) return;
        const { size, orientation, destinations } = latest.current;
        if (current.moved) {
          const target = squareAt(x, y, size, orientation);
          if (target && target !== current.from && destinations(current.from).includes(target)) {
            play(current.from, target);
          }
          return;
        }
        if (current.wasSelected) setSelected(null);
      });
  }, [floating]);

  const squares = [];
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const fileIndex = orientation === "w" ? column : 7 - column;
      const rank = orientation === "w" ? 8 - row : row + 1;
      const square = `${FILES[fileIndex]}${rank}`;
      const isLight = (fileIndex + rank) % 2 === 0;
      const piece = pieces.get(square);
      const isTarget = targets.has(square);
      const showCoordinateRank = column === 0;
      const showCoordinateFile = row === 7;
      const coordinateColor = isLight ? palette.dark : palette.light;

      squares.push(
        <View
          key={square}
          style={[
            styles.square,
            { left: column * cell, top: row * cell, width: cell, height: cell },
            { backgroundColor: isLight ? palette.light : palette.dark },
          ]}
        >
          {lastMove && (lastMove.from === square || lastMove.to === square) ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.lastMove }]} />
          ) : null}
          {selected === square ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.selected }]} />
          ) : null}
          {hover === square && isTarget ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.hover }]} />
          ) : null}
          {checkSquare === square ? (
            <View
              style={[
                styles.check,
                { width: cell * 0.9, height: cell * 0.9, borderRadius: cell, boxShadow: `0 0 ${cell * 0.35}px ${palette.check}` },
              ]}
            />
          ) : null}
          {showCoordinateRank ? (
            <Text style={[styles.rankLabel, { color: coordinateColor, fontSize: cell * 0.2 }]}>{rank}</Text>
          ) : null}
          {showCoordinateFile ? (
            <Text style={[styles.fileLabel, { color: coordinateColor, fontSize: cell * 0.2 }]}>
              {FILES[fileIndex]}
            </Text>
          ) : null}
          {piece && draggingFrom !== square ? <Piece code={piece} size={cell} /> : null}
          {isTarget && !piece ? (
            <View
              style={{ width: cell * 0.3, height: cell * 0.3, borderRadius: cell, backgroundColor: palette.hint }}
            />
          ) : null}
          {isTarget && piece ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: cell, borderWidth: cell * 0.08, borderColor: palette.hint },
              ]}
            />
          ) : null}
        </View>,
      );
    }
  }

  const draggedPiece = draggingFrom ? pieces.get(draggingFrom) : undefined;

  return (
    <GestureDetector gesture={pan}>
      <View
        style={[styles.board, { width: size, height: size }]}
        accessibilityRole="image"
        accessibilityLabel={`Échiquier, position ${fen}`}
      >
        {squares}
        {arrows.length > 0 ? (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none" width={size} height={size}>
            {arrows.map(({ from, to }) => {
              const center = (square: string) => {
                const { column, row } = screenCell(square, orientation);
                return { x: (column + 0.5) * cell, y: (row + 0.5) * cell };
              };
              const start = center(from);
              const end = center(to);
              const length = Math.hypot(end.x - start.x, end.y - start.y);
              const ux = (end.x - start.x) / length;
              const uy = (end.y - start.y) / length;
              const head = cell * 0.42;
              const baseX = end.x - ux * head;
              const baseY = end.y - uy * head;
              const half = cell * 0.22;
              return (
                <Fragment key={`${from}${to}`}>
                  <Line
                    x1={start.x + ux * cell * 0.2}
                    y1={start.y + uy * cell * 0.2}
                    x2={baseX}
                    y2={baseY}
                    stroke={palette.arrow}
                    strokeWidth={cell * 0.16}
                    strokeLinecap="round"
                  />
                  <Polygon
                    points={`${end.x},${end.y} ${baseX - uy * half},${baseY + ux * half} ${baseX + uy * half},${baseY - ux * half}`}
                    fill={palette.arrow}
                  />
                </Fragment>
              );
            })}
          </Svg>
        ) : null}
        {draggedPiece ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.floating,
              { width: cell, height: cell, transform: [...floating.getTranslateTransform(), { scale: 1.18 }] },
            ]}
          >
            <Piece code={draggedPiece} size={cell} />
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  board: {
    position: "relative",
    borderRadius: 6,
    overflow: "hidden",
    userSelect: "none",
  },
  square: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    position: "absolute",
    backgroundColor: "rgba(224, 100, 92, 0.45)",
  },
  rankLabel: {
    position: "absolute",
    top: 2,
    left: 3,
    fontWeight: "700",
  },
  fileLabel: {
    position: "absolute",
    bottom: 1,
    right: 4,
    fontWeight: "700",
  },
  floating: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 10,
  },
});
