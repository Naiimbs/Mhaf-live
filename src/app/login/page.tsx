"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("host@mhaf.live");
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center" aria-label="meet home">
            <BrandLogo size="large" priority />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Host Portal Authentication
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage scheduling availability, event types, and bookings.
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="login-password">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 mt-2"
              id="submit-login-button"
            >
              {loading ? "Authenticating..." : "Sign In to Host Dashboard"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick seed account helper (Development & local staging only) */}
          {(process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" ||
            process.env.NODE_ENV !== "production") && (
            <div className="mt-6 pt-5 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Local Dev Sandbox Host</span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="font-medium text-primary hover:underline"
                  id="fill-demo-creds-btn"
                >
                  Auto-fill credentials
                </button>
              </div>
              <div className="rounded-lg bg-muted/60 p-2.5 text-xs font-mono text-muted-foreground flex items-center justify-between">
                <span>host@mhaf.live / Password123!</span>
                <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Dev Only
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer links */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>
            Don't have an account yet?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Create a host account
            </Link>
          </p>
          <p>
            <Link href="/" className="hover:underline">
              ← Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
