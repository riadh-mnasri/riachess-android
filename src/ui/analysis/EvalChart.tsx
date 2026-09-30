// © 2026 Riadh MNASRI
import { Pressable } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { winChances, type Evaluation, type MoveJudgement } from "../../domain/analysis";
import { colors } from "../theme";

const JUDGEMENT_COLORS: Record<MoveJudgement, string> = {
  inaccuracy: colors.inaccuracy,
  mistake: colors.mistake,
  blunder: colors.blunder,
};

/**
 * Courbe des chances des Blancs coup après coup : au-dessus de la ligne médiane,
 * les Blancs mènent. Un appui sur la courbe va au coup correspondant.
 */
export function EvalChart({
  evaluations,
  judgements,
  ply,
  width,
  height = 80,
  onSelect,
}: {
  evaluations: readonly Evaluation[];
  judgements: readonly (MoveJudgement | null)[];
  ply: number;
  width: number;
  height?: number;
  onSelect: (ply: number) => void;
}) {
  const count = evaluations.length;
  const step = count > 1 ? width / (count - 1) : width;
  const x = (index: number) => index * step;
  const y = (evaluation: Evaluation) => ((1 - winChances(evaluation)) / 2) * height;
  const line = evaluations.map((evaluation, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(evaluation)}`).join(" ");
  const area = `${line} L${x(count - 1)},${height} L0,${height} Z`;

  return (
    <Pressable
      onPress={(event) => {
        const index = Math.round(event.nativeEvent.locationX / step);
        onSelect(Math.max(0, Math.min(count - 1, index)));
      }}
      accessibilityRole="adjustable"
    >
      <Svg width={width} height={height}>
        <Path d={`M0,0 H${width} V${height} H0 Z`} fill="#05080f" />
        <Path d={area} fill={colors.ivory} fillOpacity={0.9} />
        <Line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke={colors.faint} strokeDasharray="4 4" />
        {judgements.map((judgement, index) =>
          judgement ? (
            <Circle
              key={index}
              cx={x(index + 1)}
              cy={y(evaluations[index + 1])}
              r={3.5}
              fill={JUDGEMENT_COLORS[judgement]}
            />
          ) : null,
        )}
        <Line x1={x(ply)} x2={x(ply)} y1={0} y2={height} stroke={colors.gold} strokeWidth={2} />
      </Svg>
    </Pressable>
  );
}

export { JUDGEMENT_COLORS };
