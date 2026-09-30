// © 2026 Riadh MNASRI
import { getLocales } from "expo-localization";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { en, fr, type Messages } from "./messages";

export type Language = "fr" | "en";

interface I18nValue {
  language: Language;
  t: Messages;
  toggleLanguage: () => void;
}

const I18nContext = createContext<I18nValue | null>(null);

function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === "fr" ? "fr" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(deviceLanguage);
  const value = useMemo<I18nValue>(
    () => ({
      language,
      t: language === "fr" ? fr : en,
      toggleLanguage: () => setLanguage((current) => (current === "fr" ? "en" : "fr")),
    }),
    [language],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n doit être utilisé dans un I18nProvider");
  return value;
}
