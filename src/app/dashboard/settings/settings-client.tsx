"use client";

import * as React from "react";
import { Settings, User, Clock, ShieldCheck, Mail, CheckCircle2, Globe, Languages, Save, Loader2, Compass } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";

const COMMON_TIMEZONES = [
  "Europe/Paris",
  "Africa/Tunis",
  "Africa/Casablanca",
  "Africa/Algiers",
  "Europe/Brussels",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Montreal",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

interface SettingsClientProps {
  email?: string;
  timezone?: string;
}

export function SettingsClient({ email, timezone }: SettingsClientProps) {
  const { locale, setLocale, isFr } = useLanguage();
  const [currentTimezone, setCurrentTimezone] = React.useState(timezone || "Europe/Paris");
  const [savingTz, setSavingTz] = React.useState(false);
  const [tzMessage, setTzMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleDetectTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setCurrentTimezone(detected);
        setTzMessage({
          type: "success",
          text: isFr ? `Fuseau détecté : ${detected}` : `Detected timezone: ${detected}`,
        });
      }
    } catch {
      // ignore
    }
  };

  const handleSaveTimezone = async () => {
    setSavingTz(true);
    setTzMessage(null);
    try {
      const res = await fetch("/api/auth/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: currentTimezone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update timezone.");
      setTzMessage({
        type: "success",
        text: isFr
          ? `Fuseau horaire mis à jour avec succès (${currentTimezone}). Vos réunions et e-mails utiliseront cet horaire.`
          : `Timezone updated successfully (${currentTimezone}). Your meetings and emails will use this time.`,
      });
    } catch (err: any) {
      setTzMessage({
        type: "error",
        text: err?.message || (isFr ? "Erreur lors de la mise à jour." : "Update failed."),
      });
    } finally {
      setSavingTz(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          {isFr ? "Paramètres du compte & réunions" : "Account & Meeting Settings"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isFr
            ? "Gérez votre profil d'hôte, votre fuseau horaire, vos préférences de langue et vos paramètres de sécurité."
            : "Manage your host profile, timezone, language preferences, and security defaults."}
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

      {/* Host Timezone & Identity Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            {isFr ? "Identité & Fuseau horaire de l'hôte" : "Host Identity & Timezone"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isFr
              ? "Configurez votre fuseau horaire exact pour que les e-mails de confirmation et les créneaux correspondent parfaitement à votre heure locale."
              : "Configure your exact timezone so confirmation emails and booking slots match your local wall-clock time."}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
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
            <div className="flex items-center justify-between">
              <label htmlFor="host-tz-select" className="text-xs font-medium text-muted-foreground">
                {isFr ? "Fuseau horaire de vos réunions" : "Meeting Timezone"}
              </label>
              <button
                type="button"
                onClick={handleDetectTimezone}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
                title="Detect from browser"
              >
                <Compass className="h-3 w-3" />
                {isFr ? "Détecter" : "Auto-detect"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                id="host-tz-select"
                value={currentTimezone}
                onChange={(e) => setCurrentTimezone(e.target.value)}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
              >
                {!COMMON_TIMEZONES.includes(currentTimezone) && (
                  <option value={currentTimezone}>{currentTimezone}</option>
                )}
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={handleSaveTimezone}
                disabled={savingTz}
                size="sm"
                className="shrink-0"
              >
                {savingTz ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {isFr ? "Enregistrer" : "Save"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {tzMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              tzMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {tzMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 shrink-0" />
            )}
            <span>{tzMessage.text}</span>
          </div>
        )}
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
