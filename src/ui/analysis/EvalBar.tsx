// © 2026 Riadh MNASRI
import { StyleSheet, Text, View } from "react-native";
import { formatEval, winChances, type Evaluation } from "../../domain/analysis";
import type { Color } from "../../domain/game";
import { colors } from "../theme";

/** Barre horizontale : la part claire représente les chances des Blancs. */
export function EvalBar({
  evaluation,
  orientation,
  width,
}: {
  evaluation: Evaluation | null;
  orientation: Color;
  width: number;
}) {
  const whiteShare = evaluation ? (winChances(evaluation) + 1) / 2 : 0.5;
  const leftShare = orientation === "w" ? whiteShare : 1 - whiteShare;
  const label = evaluation ? formatEval(evaluation) : "…";
  const whiteLeads = whiteShare >= 0.5;

  return (
    <View style={[styles.bar, { width }]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View
        style={[
          styles.fill,
          {
            width: `${leftShare * 100}%`,
            backgroundColor: orientation === "w" ? colors.ivory : "#05080f",
          },
        ]}
      />
      <View style={[StyleSheet.absoluteFill, styles.labelRow]}>
        <Text
          style={[
            styles.label,
            { color: whiteLeads === (orientation === "w") ? colors.canvas : colors.ivory },
            whiteLeads === (orientation === "w") ? { left: 8 } : { right: 8 },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 22,
    borderRadius: 6,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: "#05080f",
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: { height: "100%", backgroundColor: colors.ivory },
  labelRow: { justifyContent: "center" },
  label: { position: "absolute", fontSize: 12, fontWeight: "800" },
});
