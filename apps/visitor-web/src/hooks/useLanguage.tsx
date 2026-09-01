import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CopyPair } from "../copy/index.ts";
import { readLanguage, writeLanguage, type AppLanguage } from "../lib/language.ts";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (pair: CopyPair) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    typeof window === "undefined" ? "en" : readLanguage(),
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "en" ? "What do you see?" : "Šta ti vidiš?";
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (next) => {
        setLanguageState(next);
        writeLanguage(next);
      },
      t: (pair) => pair[language],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return value;
}
