"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarCheck,
  Clock,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  Rocket,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

interface DashboardLayoutShellProps {
  host: {
    id: string;
    email: string;
    name?: string | null;
    timezone?: string;
  };
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}

const navItems = [
  {
    label: "Calendar",
    href: "/dashboard",
    icon: CalendarDays,
    matchExact: true,
  },
  {
    label: "Bookings",
    href: "/dashboard/bookings",
    icon: CalendarCheck,
    matchExact: false,
  },
  {
    label: "Availability",
    href: "/dashboard/availability",
    icon: Clock,
    matchExact: false,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    matchExact: false,
  },
];

export function DashboardLayoutShell({
  host,
  logoutAction,
  children,
}: DashboardLayoutShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Restore sidebar state preference from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("mhaf_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mhaf_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isNavActive = (href: string, matchExact: boolean) => {
    if (matchExact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-brand-blue selection:text-white">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Modern Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#081F3D] text-slate-100 transition-all duration-300 ease-in-out lg:static ${
          mobileMenuOpen
            ? "translate-x-0 w-64 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-[76px]" : "lg:w-64"} border-r border-slate-800/80`}
      >
        {/* Sidebar Header / Brand Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 overflow-hidden"
            title="mhaf meet"
          >
            {collapsed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <span className="font-bold text-white tracking-wider text-base">m</span>
                <span className="text-[#FD2E2D] font-bold text-base">•</span>
              </div>
            ) : (
              <BrandLogo size="medium" variant="white" priority />
            )}
          </Link>

          {/* Toggle button on desktop */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          {/* Close button on mobile drawer */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items (Cute & Modern) */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const active = isNavActive(item.href, item.matchExact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-[#1D4ED8] text-white shadow-lg shadow-blue-600/30 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    active ? "text-white" : "text-slate-400 group-hover:text-white"
                  }`}
                />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {/* Active indicator bar */}
                {active && !collapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Cute Bottom Promo Card (matching Image 2) */}
        {!collapsed && (
          <div className="p-3.5 mt-auto">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-4 text-center backdrop-blur-sm relative overflow-hidden shadow-inner">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 ring-1 ring-blue-400/30 mb-2.5">
                <Rocket className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-white leading-tight">
                Your meetings, in one week.
              </p>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex justify-center">
                <BrandLogo size="compact" variant="white" />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open sidebar"
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb / Nav Tabs matching Image 2 */}
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  pathname === "/dashboard"
                    ? "bg-primary/10 text-primary border border-primary/20 font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendar
              </Link>
              <Link
                href="/dashboard/availability"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  pathname.startsWith("/dashboard/availability")
                    ? "bg-primary/10 text-primary border border-primary/20 font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Availability
              </Link>
              <Link
                href="/dashboard/bookings"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  pathname.startsWith("/dashboard/bookings")
                    ? "bg-primary/10 text-primary border border-primary/20 font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                Bookings
              </Link>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* User pill */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border font-medium">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {host.email}
              </span>
              <span className="hidden md:inline text-[11px] opacity-70">
                ({host.timezone || "UTC"})
              </span>
            </div>

            <ThemeToggle id="dashboard-theme-toggle" />

            <form action={logoutAction}>
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="gap-1.5 text-xs rounded-lg"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </form>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
