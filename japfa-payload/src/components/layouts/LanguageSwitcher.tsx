"use client";

import { useEffect, useState } from "react";

type Lang = "vi" | "en";

const STORAGE_KEY = "japfa.lang";

const LANGUAGES: Array<{ code: Lang; label: string; name: string }> = [
  { code: "vi", label: "VI", name: "Tieng Viet" },
  { code: "en", label: "EN", name: "English" },
];

export function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<Lang>("vi");

  useEffect(() => {
    const applyStoredLanguage = () => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "vi" || saved === "en") {
        setCurrentLang(saved);
      }
    };

    const onLanguageChanged = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "vi" || detail === "en") {
        setCurrentLang(detail);
      }
    };

    applyStoredLanguage();
    window.addEventListener("app-language-change", onLanguageChanged);
    window.addEventListener("storage", applyStoredLanguage);
    return () => {
      window.removeEventListener("app-language-change", onLanguageChanged);
      window.removeEventListener("storage", applyStoredLanguage);
    };
  }, []);

  const handleChange = (lang: Lang) => {
    setCurrentLang(lang);
    window.localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent("app-language-change", { detail: lang }));
  };

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => handleChange(lang.code)}
          aria-pressed={currentLang === lang.code}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            currentLang === lang.code
              ? "bg-primary text-white"
              : "text-ink-soft hover:bg-background-soft hover:text-ink"
          }`}
          aria-label={lang.name}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
