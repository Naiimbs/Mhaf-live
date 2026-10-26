import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentHost, logoutHost } from "@/lib/auth/session";
import { Video, Calendar, Clock, LogOut, ExternalLink, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = await getCurrentHost();
  if (!host) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="container flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Video className="h-4 w-4" />
              </div>
              <span className="text-base font-extrabold tracking-tight">
                MHAF <span className="text-muted-foreground font-medium">LIVE</span>
              </span>
            </Link>

            <nav aria-label="Dashboard Navigation" className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/availability"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Availability & Schedule
              </Link>
              <Link
                href="/dashboard/bookings"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Bookings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
              <User className="h-3 w-3 text-primary" />
              <span className="truncate max-w-[120px] sm:max-w-none">{host.email}</span>
              <span className="hidden sm:inline opacity-60">({host.timezone})</span>
            </div>

            <ThemeToggle id="dashboard-theme-toggle" />

            <form
              action={async () => {
                "use server";
                await logoutHost();
                redirect("/login");
              }}
            >
              <Button variant="outline" size="sm" type="submit" className="gap-1.5 text-xs">
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </Button>
            </form>
          </div>
        </div>

        {/* Mobile secondary tab strip */}
        <div className="flex sm:hidden overflow-x-auto border-t border-border px-4 py-2 gap-2 text-xs bg-muted/30">
          <Link href="/dashboard" className="px-2.5 py-1 rounded bg-card font-medium">
            Overview
          </Link>
          <Link href="/dashboard/availability" className="px-2.5 py-1 rounded text-muted-foreground">
            Availability
          </Link>
          <Link href="/dashboard/bookings" className="px-2.5 py-1 rounded text-muted-foreground">
            Bookings
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container max-w-7xl px-4 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
