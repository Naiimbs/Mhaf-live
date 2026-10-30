"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

interface LanguageToggleProps {
  className?: string;
  variant?: "pill" | "compact" | "minimal";
}

export function LanguageToggle({ className = "", variant = "pill" }: LanguageToggleProps) {
  const { locale, setLocale } = useLanguage();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => setLocale(locale === "en" ? "fr" : "en")}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all duration-200 border border-border/80 bg-background/80 hover:bg-muted text-foreground/90 shadow-2xs ${className}`}
        title={locale === "en" ? "Passer en Français" : "Switch to English"}
        aria-label="Toggle language"
      >
        <Globe className="h-3.5 w-3.5 text-primary opacity-80" />
        <span className="font-bold uppercase tracking-wider">{locale}</span>
      </button>
    );
  }

  if (variant === "minimal") {
    return (
      <button
        type="button"
        onClick={() => setLocale(locale === "en" ? "fr" : "en")}
        className={`inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors ${className}`}
        title={locale === "en" ? "Passer en Français" : "Switch to English"}
      >
        <Globe className="h-3 w-3" />
        <span className="uppercase">{locale === "en" ? "FR" : "EN"}</span>
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-flex items-center p-0.5 rounded-xl border border-border/80 bg-muted/40 backdrop-blur-sm shadow-2xs ${className}`}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
          locale === "en"
            ? "bg-card text-foreground shadow-xs font-bold border border-border/60"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
          locale === "fr"
            ? "bg-card text-foreground shadow-xs font-bold border border-border/60"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        FR
      </button>
    </div>
  );
}
