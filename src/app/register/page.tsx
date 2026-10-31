"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, User, Globe, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n/language-context";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Africa/Casablanca",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function RegisterPage() {
  const router = useRouter();
  const { isFr } = useLanguage();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [timezone, setTimezone] = React.useState("UTC");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTz) {
        setTimezone(userTz);
      }
    } catch {
      // fallback to UTC
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, timezone, locale: isFr ? "fr" : "en" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isFr ? "Échec de l'inscription." : "Registration failed."));
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || (isFr ? "Une erreur inattendue est survenue." : "An unexpected error occurred."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4 py-12 relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle variant="compact" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center" aria-label="meet home">
            <BrandLogo size="large" priority />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isFr ? "Créer un compte hôte" : "Create Host Account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isFr
              ? "Créez votre espace hôte avec votre adresse e-mail. Aucun mot de passe nécessaire."
              : "Create your host workspace with your email address. No password required."}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="space-y-3 text-center" role="status">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h2 className="font-semibold text-foreground">{isFr ? "Vérifiez votre boîte de réception" : "Check your inbox"}</h2>
              <p className="text-sm text-muted-foreground">
                {isFr ? "Si cette adresse peut être utilisée, un lien sécurisé vous sera envoyé pour confirmer votre e-mail et activer votre espace hôte." : "If this address can be used, we’ll send a secure link to verify your email and activate your host workspace."}
              </p>
              <p className="text-xs text-muted-foreground">{email}</p>
              <Link href="/login" className="text-sm font-semibold text-primary hover:underline">{isFr ? "Déjà inscrit ? Se connecter" : "Already registered? Sign in"}</Link>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="register-name">
                {isFr ? "Nom et prénom" : "Full Name"}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="register-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jordan Hayes"
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="register-email">
                {isFr ? "Adresse e-mail de l'hôte" : "Host Email Address"}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@domain.com"
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>


            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="register-tz">
                {isFr ? "Fuseau horaire (IANA)" : "Operating Timezone (IANA)"}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <select
                  id="register-tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {!COMMON_TIMEZONES.includes(timezone) && (
                    <option value={timezone}>{timezone}</option>
                  )}
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 mt-2"
              id="submit-register-button"
            >
              {loading
                ? (isFr ? "Envoi du lien en cours..." : "Sending your sign-up link...")
                : (isFr ? "Créer mon compte par e-mail" : "Continue with email")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          )}
        </div>

        {/* Footer links */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>
            {isFr ? "Vous avez déjà un compte ?" : "Already have an account?"}{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              {isFr ? "Se connecter à votre espace" : "Sign in to your dashboard"}
            </Link>
          </p>
          <p>
            <Link href="/" className="hover:underline">
              {isFr ? "← Retour à l'accueil" : "← Back to Home"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
