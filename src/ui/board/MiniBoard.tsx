// © 2026 Riadh MNASRI
import { StyleSheet, View } from "react-native";
import { board as palette } from "../theme";
import { FILES, piecesFromFen } from "./geometry";
import { Piece } from "./Board";

/** Plateau décoratif, non interactif. */
export function MiniBoard({ fen, size }: { fen: string; size: number }) {
  const cell = size / 8;
  const pieces = piecesFromFen(fen);
  return (
    <View style={[styles.board, { width: size, height: size }]} pointerEvents="none">
      {Array.from({ length: 64 }, (_, index) => {
        const row = Math.floor(index / 8);
        const column = index % 8;
        const rank = 8 - row;
        const square = `${FILES[column]}${rank}`;
        const piece = pieces.get(square);
        return (
          <View
            key={square}
            style={{
              width: cell,
              height: cell,
              backgroundColor: (column + rank) % 2 === 0 ? palette.light : palette.dark,
            }}
          >
            {piece ? <Piece code={piece} size={cell} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 10,
    overflow: "hidden",
  },
});
