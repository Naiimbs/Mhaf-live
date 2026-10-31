"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, AlertCircle, CheckCircle2, Mail, User, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n/language-context";

const COMMON_TIMEZONES = [
  "UTC",
  "Africa/Tunis",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
];

export default function RegisterPage() {
  const { isFr, locale } = useLanguage();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [timezone, setTimezone] = React.useState("UTC");
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const requestedEmail = new URLSearchParams(window.location.search).get("email");
    if (requestedEmail) setEmail(requestedEmail.trim().toLowerCase());

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTimezone) setTimezone(userTimezone);
    } catch {
      // Keep UTC as the fallback.
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, timezone, locale }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || (isFr ? "Impossible d'envoyer le lien." : "Could not send your sign-in link."));
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isFr ? "Une erreur inattendue est survenue." : "An unexpected error occurred."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4">
        <LanguageToggle variant="compact" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <Link href="/" className="inline-flex items-center" aria-label="MHAF Live home">
            <BrandLogo size="large" priority />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isFr ? "Créer un compte hôte" : "Create a host account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isFr
              ? "Aucun mot de passe à retenir. Confirmez votre adresse e-mail pour accéder à votre espace."
              : "No password to remember. Verify your email address to access your host workspace."}
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="space-y-4 text-center" role="status">
              <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-500" />
              <h2 className="font-semibold text-foreground">
                {isFr ? "Vérifiez votre boîte e-mail" : "Check your inbox"}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {isFr
                  ? <>Si cette adresse peut recevoir un lien de connexion, un e-mail sera envoyé à <strong>{email}</strong>. Le lien expire dans 15 minutes et ne peut être utilisé qu’une seule fois.</>
                  : <>If this address can receive a sign-in link, an email will be sent to <strong>{email}</strong>. The link expires in 15 minutes and can only be used once.</>}
              </p>
              <button type="button" onClick={() => setSent(false)} className="text-sm font-semibold text-primary hover:underline">
                {isFr ? "Utiliser une autre adresse" : "Use a different email"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="register-name" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {isFr ? "Nom et prénom" : "Full name"}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input id="register-name" type="text" required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Jordan Hayes" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-email" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {isFr ? "Adresse e-mail" : "Email address"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input id="register-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-timezone" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {isFr ? "Fuseau horaire" : "Timezone"}
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <select id="register-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    {!COMMON_TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
                    {COMMON_TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                  </select>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="mt-2 w-full gap-2" id="submit-register-button">
                {loading
                  ? (isFr ? "Envoi du lien..." : "Sending your link...")
                  : (isFr ? "Recevoir mon lien de création" : "Email me a sign-up link")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-xs leading-5 text-muted-foreground">
                {isFr ? "En continuant, vous confirmez que vous avez accès à cette adresse e-mail." : "By continuing, you confirm that you have access to this email address."}
              </p>
            </form>
          )}
        </section>

        <div className="space-y-2 text-center text-xs text-muted-foreground">
          <p>
            {isFr ? "Vous avez déjà un compte ?" : "Already have an account?"}{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              {isFr ? "Se connecter" : "Sign in"}
            </Link>
          </p>
          <p><Link href="/" className="hover:underline">{isFr ? "← Retour à l’accueil" : "← Back to home"}</Link></p>
        </div>
      </div>
    </main>
  );
}
