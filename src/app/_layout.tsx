// © 2026 Riadh MNASRI
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "../i18n";
import { colors } from "../ui/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <SafeAreaProvider>
        <I18nProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.canvas },
              animation: "slide_from_right",
            }}
          />
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
