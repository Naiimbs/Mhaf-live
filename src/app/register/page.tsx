"use client";

import * as React from "react";
import Link from "next/link";
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
  "Africa/Tunis",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function RegisterPage() {
  const { locale, isFr } = useLanguage();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [timezone, setTimezone] = React.useState("UTC");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  React.useEffect(() => {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTz) setTimezone(userTz);
    } catch {
      // Keep UTC fallback.
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, timezone, locale }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (isFr ? "Impossible d'envoyer le lien." : "Could not send the sign-in link."));
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isFr ? "Une erreur inattendue est survenue." : "An unexpected error occurred."));
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
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center" aria-label="MHAF Live home">
            <BrandLogo size="large" priority />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isFr ? "Créer un compte hôte" : "Create your host workspace"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isFr
              ? "Saisissez votre nom et votre e-mail. Nous vous enverrons un lien sécurisé pour confirmer votre adresse et accéder à votre espace."
              : "Enter your name and email. We’ll send you a secure link to verify your address and access your workspace."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="space-y-4 py-3 text-center" role="status">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="font-semibold text-foreground">{isFr ? "Vérifiez votre boîte e-mail" : "Check your inbox"}</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {isFr ? "Si cette adresse peut être utilisée, un lien de connexion sécurisé a été envoyé à" : "If this email can be used, a secure sign-in link has been sent to"}{" "}
                <strong className="text-foreground">{email}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                {isFr ? "Le lien est valable 15 minutes et ne peut être utilisé qu'une seule fois." : "The link expires in 15 minutes and can only be used once."}
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                {isFr ? "Utiliser une autre adresse" : "Use a different email"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="register-name">
                  {isFr ? "Nom et prénom" : "Full Name"}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input id="register-name" type="text" required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Jordan Hayes" className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="register-email">
                  {isFr ? "Adresse e-mail" : "Email Address"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input id="register-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="register-tz">
                  {isFr ? "Fuseau horaire" : "Timezone"}
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <select id="register-tz" value={timezone} onChange={(event) => setTimezone(event.target.value)} className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    {!COMMON_TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
                    {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2 mt-2" id="submit-register-button">
                {loading
                  ? (isFr ? "Envoi du lien en cours..." : "Sending secure link...")
                  : (isFr ? "Recevoir mon lien de création" : "Email me a setup link")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {isFr ? "Aucun mot de passe requis. Le lien est à usage unique." : "No password required. Your sign-in link is single-use."}
              </p>
            </form>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>
            {isFr ? "Vous avez déjà un compte ?" : "Already have an account?"}{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              {isFr ? "Se connecter" : "Sign in"}
            </Link>
          </p>
          <p><Link href="/" className="hover:underline">{isFr ? "← Retour à l'accueil" : "← Back to Home"}</Link></p>
        </div>
      </div>
    </div>
  );
}
