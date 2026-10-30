"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { useLanguage } from "@/lib/i18n/language-context";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { isFr, t } = useLanguage();

  const navLinks = [
    { label: isFr ? "Fonctionnalités" : "How it works", href: "#workflow" },
    { label: isFr ? "Calendrier" : "Calendar", href: "#calendar" },
    { label: isFr ? "Réunions" : "Meetings", href: "#meeting-types" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center" aria-label="mhaf meet home">
          <BrandLogo size="medium" priority />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageToggle />
          <ThemeToggle id="desktop-theme-toggle" />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/onboarding">{t("nav.signIn")}</Link>
          </Button>
          <Button size="sm" asChild className="shadow-sm">
            <Link href="/register">{isFr ? "Créer un compte" : "Create account"}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle variant="compact" />
          <ThemeToggle id="mobile-theme-toggle" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div id="mobile-nav" className="border-t border-border bg-background px-5 py-5 shadow-lg md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-4">
              <Button variant="outline" asChild className="min-h-11">
                <Link href="/onboarding" onClick={() => setMobileMenuOpen(false)}>
                  {t("nav.signIn")}
                </Link>
              </Button>
              <Button asChild className="min-h-11">
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  {isFr ? "Créer un compte" : "Create account"}
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
