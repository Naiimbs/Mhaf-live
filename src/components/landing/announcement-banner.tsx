"use client";

import * as React from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <aside
      aria-label="Announcement"
      className="relative z-40 flex items-center justify-between border-b border-border/40 bg-muted/60 px-4 py-2 text-xs transition-colors backdrop-blur-sm sm:px-6"
    >
      <div className="mx-auto flex items-center gap-2 text-center text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
          <Sparkles className="h-3 w-3" /> Architecture Blueprint
        </span>
        <span className="hidden sm:inline">
          MHAF Live v1.0 specifications & reference audit are published.
        </span>
        <a
          href="#preview"
          className="inline-flex items-center font-medium text-foreground underline-offset-4 hover:underline"
        >
          Explore Live Preview <ArrowRight className="ml-1 h-3 w-3" />
        </a>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
}
