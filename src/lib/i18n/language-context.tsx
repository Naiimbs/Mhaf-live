"use client";

import * as React from "react";
import { type Locale, translations, type TranslationDictionary } from "./translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isFr: boolean;
  isEn: boolean;
  t: (path: string, params?: Record<string, string | number>) => string;
  dictionary: TranslationDictionary;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: any, path: string): string | undefined {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("en");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // 1. Check cookie
    const cookieMatch = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    const cookieLocale = cookieMatch?.[1] as Locale | undefined;

    // 2. Check localStorage
    const saved = localStorage.getItem("mhaf_locale") as Locale | null;

    // 3. Check browser preference
    const browserLang = navigator.language?.toLowerCase() || "";
    const detected: Locale =
      cookieLocale === "fr" || cookieLocale === "en"
        ? cookieLocale
        : saved === "fr" || saved === "en"
        ? saved
        : browserLang.startsWith("fr")
        ? "fr"
        : "en";

    setLocaleState(detected);
    setMounted(true);
    document.documentElement.lang = detected;
  }, []);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem("mhaf_locale", next);
      document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = next;
    } catch {
      // ignore
    }
  }, []);

  const t = React.useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const dict = translations[locale] || translations.en;
      let text = getNestedValue(dict, path);

      if (!text) {
        // Fallback to English if missing in target locale
        text = getNestedValue(translations.en, path) || path;
      }

      if (params) {
        for (const [key, value] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
        }
      }

      return text;
    },
    [locale]
  );

  const value = React.useMemo<LanguageContextType>(
    () => ({
      locale,
      setLocale,
      isFr: locale === "fr",
      isEn: locale === "en",
      t,
      dictionary: translations[locale] || translations.en,
    }),
    [locale, setLocale, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = React.useContext(LanguageContext);
  if (!context) {
    // Graceful fallback outside provider
    return {
      locale: "en",
      setLocale: () => {},
      isFr: false,
      isEn: true,
      t: (path: string, params?: Record<string, string | number>) => {
        let text = getNestedValue(translations.en, path) || path;
        if (params) {
          for (const [key, val] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
          }
        }
        return text;
      },
      dictionary: translations.en,
    };
  }
  return context;
}
