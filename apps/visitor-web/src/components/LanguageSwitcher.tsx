import { useLanguage } from "../hooks/useLanguage.ts";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="lang-switch" role="group" aria-label={t({ sr: "Jezik", en: "Language" })}>
      <button
        type="button"
        className={language === "en" ? "lang-btn is-active" : "lang-btn"}
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={language === "sr" ? "lang-btn is-active" : "lang-btn"}
        aria-pressed={language === "sr"}
        onClick={() => setLanguage("sr")}
      >
        SR
      </button>
    </div>
  );
}
