// © 2026 Riadh MNASRI
import { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { START_STOCKFISH_SOURCE } from "./bootstrap";
import { STOCKFISH_JS, STOCKFISH_WASM_BASE64 } from "./generated/stockfishBundle";
import { UciEngine } from "./uci";

const READY = "__riachess_engine_ready";

/** Échappe un texte pour l'insérer dans un <script> sans le refermer. */
const inline = (value: string) => JSON.stringify(value).replace(/<\//g, "<\\/");

function engineHtml(): string {
  return `<!doctype html><html><body><script>
const send = (${START_STOCKFISH_SOURCE})(${inline(STOCKFISH_JS)}, ${inline(STOCKFISH_WASM_BASE64)},
  (line) => window.ReactNativeWebView.postMessage(line));
window.__uci = send;
window.ReactNativeWebView.postMessage(${JSON.stringify(READY)});
</script></body></html>`;
}

/**
 * Android et iOS : Stockfish (WASM) tourne dans une WebView invisible.
 * Ça fonctionne dans Expo Go, sans module natif ; un moteur natif plus
 * rapide pourra remplacer cet adaptateur plus tard.
 */
export function EngineHost({ onReady }: { onReady: (engine: UciEngine) => void }) {
  const webView = useRef<WebView>(null);
  const listeners = useRef(new Set<(line: string) => void>()).current;
  const html = useMemo(engineHtml, []);

  const onMessage = (event: WebViewMessageEvent) => {
    const line = event.nativeEvent.data;
    if (line === READY) {
      onReady(
        new UciEngine({
          send: (command) => webView.current?.injectJavaScript(`window.__uci(${JSON.stringify(command)});true;`),
          onLine(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
        }),
      );
      return;
    }
    listeners.forEach((listener) => listener(line));
  };

  return (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        ref={webView}
        source={{ html, baseUrl: "https://riachess.fr/" }}
        originWhitelist={["*"]}
        onMessage={onMessage}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" },
});
