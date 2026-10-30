"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

function VerifyMagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      if (!response.ok) throw new Error(data.error || "This sign-in link is invalid or has expired.");
      setVerified(true);
      router.replace("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Unable to verify this sign-in link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <BrandLogo size="large" priority />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {verified ? <CheckCircle2 className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Confirm your sign-in</h1>
          <p className="text-sm text-muted-foreground">
            Continue to securely sign in to your mhaf meet host dashboard.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {!token ? (
            <p className="text-sm text-muted-foreground text-center">This sign-in link is missing its token. Request a new one from the login page.</p>
          ) : (
            <Button type="button" className="w-full" onClick={handleContinue} disabled={loading || verified}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : "Continue to dashboard"}
            </Button>
          )}
          <p className="text-xs text-center text-muted-foreground">For your security, the link can only be used once and expires after 15 minutes.</p>
        </div>
      </div>
    </main>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <React.Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading sign-in link...
          </div>
        </main>
      }
    >
      <VerifyMagicLinkContent />
    </React.Suspense>
  );
}
