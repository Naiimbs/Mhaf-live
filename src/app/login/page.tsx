"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);

  React.useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("magicLink");
    if (status === "invalid") setError("This sign-in link is invalid, expired, or has already been used. Request a new one.");
    if (status === "error") setError("We could not complete sign-in. Please request a new link.");
  }, []);

  const requestMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send your sign-in link.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPasswordLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center" aria-label="MHAF Live home">
            <BrandLogo size="large" priority />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to MHAF Live</h1>
          <p className="text-sm text-muted-foreground">Use a secure email link to access your host dashboard.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="text-center space-y-3 py-3" role="status">
              <CheckCircle2 className="h-9 w-9 text-emerald-500 mx-auto" />
              <h2 className="font-semibold text-foreground">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, a sign-in link will arrive shortly. It expires in 15 minutes and can only be used once.
              </p>
              <button type="button" onClick={() => setSent(false)} className="text-sm font-semibold text-primary hover:underline">Try another email</button>
            </div>
          ) : (
            <form onSubmit={requestMagicLink} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="magic-login-email">Host Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input id="magic-login-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@domain.com" className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full gap-2 mt-2" id="magic-link-submit">
                {loading ? "Sending sign-in link..." : "Email me a sign-in link"}<ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">Or use your password</span></div>
          </div>

          <form onSubmit={signInWithPassword} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="login-email">Account Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input id="login-email" type="email" required maxLength={254} autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@domain.com" className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="login-password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••••" className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <Button type="submit" disabled={passwordLoading} variant="outline" className="w-full gap-2" id="submit-login-button">
              {passwordLoading ? "Authenticating..." : "Sign in with password"}<ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Don’t have an account yet? <Link href="/register" className="font-semibold text-primary hover:underline">Create a host account</Link></p>
          <p><Link href="/" className="hover:underline">← Back to Home</Link></p>
        </div>
      </div>
    </div>
  );
}
