"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Video, Calendar, ShieldCheck, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavbarProps {
  onRequestDemo: () => void;
}

export function Navbar({ onRequestDemo }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { label: "Platform", href: "#features" },
    { label: "Scheduling", href: "#scheduling" },
    { label: "Room Engine", href: "#preview" },
    { label: "Analytics", href: "#analytics" },
    { label: "Tiers", href: "#tiers" },
    { label: "Host Portal", href: "/dashboard" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/85 backdrop-blur-md transition-colors">
      <div className="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        {/* Brand Identity */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 border border-border/80 overflow-hidden shadow-sm">
            <Image
              src="/mhaf-logo.webp"
              alt="MHAF Live"
              width={36}
              height={36}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold leading-none tracking-tight">
              MHAF <span className="text-muted-foreground font-medium">LIVE</span>
            </span>
            <span className="text-[10px] tracking-wider text-muted-foreground font-mono uppercase">
              WebRTC Media
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2 py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Controls & Theme Toggle */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle id="desktop-theme-toggle" />
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestDemo}
            id="nav-demo-btn"
          >
            Request Demo
          </Button>
          <Button
            size="sm"
            asChild
            className="shadow-sm"
          >
            <a href="#preview">Instant Room</a>
          </Button>
        </div>

        {/* Mobile Hamburger & Controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle id="mobile-theme-toggle" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav"
          className="border-b border-border bg-background px-6 py-6 md:hidden transition-all shadow-lg animate-in slide-in-from-top-2"
        >
          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center py-2 text-base font-medium text-foreground hover:text-primary transition-colors min-h-[44px]"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full justify-center min-h-[44px]"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onRequestDemo();
                }}
              >
                Request Enterprise Demo
              </Button>
              <Button
                className="w-full justify-center min-h-[44px]"
                onClick={() => setMobileMenuOpen(false)}
                asChild
              >
                <a href="#preview">Launch Instant Room</a>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
