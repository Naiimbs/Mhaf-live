"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n/language-context";

function VerifyMagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isFr } = useLanguage();
  const token = searchParams.get("token") || "";
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [verified, setVerified] = React.useState(false);

  const handleContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/magic-link/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (isFr ? "Ce lien est invalide ou a expiré." : "This sign-in link is invalid or has expired."));
      setVerified(true);
      router.replace("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isFr ? "Impossible de vérifier ce lien." : "Unable to verify this sign-in link."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4"><LanguageToggle variant="compact" /></div>
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-3 text-center">
          <Link href="/" className="inline-flex items-center" aria-label="MHAF Live home"><BrandLogo size="large" priority /></Link>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {verified ? <CheckCircle2 className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{isFr ? "Confirmer votre adresse e-mail" : "Confirm your email address"}</h1>
          <p className="text-sm text-muted-foreground">
            {isFr
              ? "Continuez pour vérifier votre adresse et accéder à votre espace hôte mhaf meet."
              : "Continue to verify your email and access your mhaf meet host workspace."}
          </p>
        </div>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}
          {!token ? (
            <p className="text-center text-sm text-muted-foreground">
              {isFr ? "Le lien ne contient pas de jeton. Demandez-en un nouveau depuis la page de connexion." : "This link is missing its token. Request a new one from the sign-in page."}
            </p>
          ) : (
            <Button type="button" className="w-full" onClick={handleContinue} disabled={loading || verified}>
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" />{isFr ? "Vérification..." : "Verifying..."}</>
                : (isFr ? "Confirmer et continuer" : "Confirm and continue")}
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            {isFr ? "Pour votre sécurité, ce lien ne peut être utilisé qu’une seule fois et expire après 15 minutes." : "For your security, this link can only be used once and expires after 15 minutes."}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/login" className="font-semibold text-primary hover:underline">{isFr ? "Retour à la connexion" : "Back to sign in"}</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <React.Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      </main>
    }>
      <VerifyMagicLinkContent />
    </React.Suspense>
  );
}
