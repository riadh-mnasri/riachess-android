// © 2026 Riadh MNASRI
import { StyleSheet, Text } from "react-native";
import { colors } from "./theme";

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <Text style={[styles.wordmark, { fontSize: size }]} accessibilityRole="header">
      <Text style={{ color: colors.gold }}>Ria</Text>
      <Text style={{ color: colors.ivory }}>Chess</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
});
