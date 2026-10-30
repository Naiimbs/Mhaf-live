"use client";

import * as React from "react";
import { Settings, User, Clock, ShieldCheck, Mail, CheckCircle2, Globe, Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { LanguageToggle } from "@/components/language-toggle";

interface SettingsClientProps {
  email?: string;
  timezone?: string;
}

export function SettingsClient({ email, timezone }: SettingsClientProps) {
  const { locale, setLocale, isFr } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          {isFr ? "Paramètres du compte & réunions" : "Account & Meeting Settings"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isFr
            ? "Gérez votre profil d'hôte, vos préférences de langue et vos paramètres de sécurité."
            : "Manage your host profile, language preferences, and security defaults."}
        </p>
      </div>

      {/* Language Preference Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              {isFr ? "Langue de l'interface" : "Interface Language"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isFr
                ? "Choisissez la langue d'affichage de votre tableau de bord, des e-mails et des pages de réservation."
                : "Select the display language for your dashboard, emails, and booking pages."}
            </p>
          </div>
          <LanguageToggle variant="pill" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`p-4 rounded-xl border text-left transition-all flex items-start justify-between ${
              locale === "en"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div>
              <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span>English</span>
                {locale === "en" && <span className="text-[10px] bg-primary/10 text-primary font-mono px-1.5 py-0.5 rounded font-bold">Active</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">English (US/UK) interface & notifications</p>
            </div>
            {locale === "en" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => setLocale("fr")}
            className={`p-4 rounded-xl border text-left transition-all flex items-start justify-between ${
              locale === "fr"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div>
              <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span>Français</span>
                {locale === "fr" && <span className="text-[10px] bg-primary/10 text-primary font-mono px-1.5 py-0.5 rounded font-bold">Actif</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Interface et e-mails en français</p>
            </div>
            {locale === "fr" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
          </button>
        </div>
      </div>

      {/* Host Identity Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            {isFr ? "Identité de l'hôte" : "Host Identity"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isFr
              ? "Vos identifiants d'hôte utilisés dans les salons vidéo et invitations."
              : "Your host credentials used across video rooms and booking invites."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {isFr ? "E-mail du compte" : "Account Email"}
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{email}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {isFr ? "Fuseau horaire" : "Timezone"}
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{timezone || "UTC"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          {isFr ? "Sécurité des réunions de bout en bout" : "End-to-End Meeting Security"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isFr
            ? "Les sessions meet utilisent des salons isolés avec des canaux audio/vidéo chiffrés. L'accès des invités est strictement vérifié et les salles expirent automatiquement après utilisation."
            : "mhaf meet sessions use isolated peer rooms with encrypted audio/video channels. Guest access is strictly validated and rooms expire automatically after completion."}
        </p>
        <div className="flex items-center gap-2 pt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          {isFr
            ? "Chiffrement matériel & WebRTC LiveKit actifs"
            : "Hardware encryption & P2P WebRTC active"}
        </div>
      </div>
    </div>
  );
}
