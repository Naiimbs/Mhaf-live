"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send the sign-in link.");
      setSent(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center" aria-label="mhaf meet home">
            <BrandLogo size="large" priority />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to mhaf meet</h1>
          <p className="text-sm text-muted-foreground">
            Enter your host email and we’ll send you a secure sign-in link.
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
            <div className="space-y-3 text-center" role="status">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h2 className="font-semibold text-foreground">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, a sign-in link is on its way.
                The link expires in 15 minutes and can only be used once.
              </p>
              <button type="button" onClick={() => setSent(false)} className="text-sm font-semibold text-primary hover:underline">
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="login-email">
                  Host Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@domain.com"
                    className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full gap-2 mt-2" id="submit-login-button">
                {loading ? "Sending sign-in link..." : "Email me a sign-in link"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>
            Don’t have an account yet?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">Create a host account</Link>
          </p>
          <p><Link href="/" className="hover:underline">← Back to Home</Link></p>
        </div>
      </div>
    </div>
  );
}
