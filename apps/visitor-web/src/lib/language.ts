export type AppLanguage = "en" | "sr";

const STORAGE_KEY = "decoy-language";

export function readLanguage(): AppLanguage {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "en" || value === "sr") return value;
  } catch {
    // private mode
  }
  return "en";
}

export function writeLanguage(language: AppLanguage): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // ignore
  }
}
