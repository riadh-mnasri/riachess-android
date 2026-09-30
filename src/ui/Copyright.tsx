// © 2026 Riadh MNASRI
import { StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "./theme";

/** Mention de copyright affichée en bas de tous les écrans. */
export function Copyright() {
  const insets = useSafeAreaInsets();
  return (
    <Text style={[styles.text, { paddingBottom: insets.bottom + 6 }]} accessibilityRole="text">
      © {new Date().getFullYear()} Riadh MNASRI · RiaChess
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.faint,
    fontSize: 11,
    textAlign: "center",
    paddingTop: 4,
    backgroundColor: colors.canvas,
  },
});
