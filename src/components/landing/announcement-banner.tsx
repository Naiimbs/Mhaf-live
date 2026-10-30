"use client";

import * as React from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export function AnnouncementBanner() {
  const { isFr } = useLanguage();
  const [dismissed, setDismissed] = React.useState(false);
  const storageKey = "mhaf-announcement-dismissed-v1";

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "true");
    } catch {
      // Keep the banner available for this visit when storage is unavailable.
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // Ignore storage restrictions.
    }
  };

  if (dismissed) return null;

  return (
    <aside
      aria-label="Announcement"
      className="relative z-40 flex items-center justify-between border-b border-border/40 bg-muted/60 px-4 py-2 text-xs transition-colors backdrop-blur-sm sm:px-6"
    >
      <div className="mx-auto flex items-center gap-2 text-center text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
          <Sparkles className="h-3 w-3" /> MHAF Live
        </span>
        <span className="hidden sm:inline">
          {isFr ? "La planification et les réunions vidéo réunies dans un seul parcours." : "Scheduling and video meetings, brought into one workflow."}
        </span>
        <a
          href="#audience"
          className="inline-flex items-center font-medium text-foreground underline-offset-4 hover:underline"
        >
          {isFr ? "À qui s’adresse la plateforme ?" : "See who it’s for"} <ArrowRight className="ml-1 h-3 w-3" />
        </a>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
}
