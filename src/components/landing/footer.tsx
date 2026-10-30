"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { useLanguage } from "@/lib/i18n/language-context";

export function Footer() {
  const { isFr } = useLanguage();

  return (
    <footer className="border-t border-border bg-card text-card-foreground">
      <div className="container max-w-7xl px-4 py-8 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center" aria-label="meet home">
              <BrandLogo size="small" />
            </Link>
            <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
              {isFr
                ? "Un espace unifié de calendrier et visioconférence pour réservations, réunions planifiées et appels instantanés."
                : "A calendar and video-meeting workspace for bookings, scheduled conversations, and instant calls."}
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <Link href="/register" className="hover:text-foreground">
              {isFr ? "Créer un compte" : "Create account"}
            </Link>
            <Link href="/login" className="hover:text-foreground">
              {isFr ? "Se connecter" : "Sign in"}
            </Link>
            <Link href="#workflow" className="hover:text-foreground">
              {isFr ? "Comment ça marche" : "How it works"}
            </Link>
            <Link href="https://github.com/Naiimbs/Mhaf-live" target="_blank" rel="noreferrer" className="hover:text-foreground">
              GitHub
            </Link>
            <Link href="#security" className="hover:text-foreground">
              {isFr ? "Sécurité" : "Security"}
            </Link>
          </nav>
        </div>
        <div className="mt-6 border-t border-border pt-4 text-[11px] text-muted-foreground">© {new Date().getFullYear()} MHAF Live</div>
      </div>
    </footer>
  );
}

