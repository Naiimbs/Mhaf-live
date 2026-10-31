"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Globe2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";

interface HeroSectionProps { onRequestDemo: () => void; }

export function HeroSection({ onRequestDemo }: HeroSectionProps) {
  const { t, isFr } = useLanguage();
  const previewEvents = [
    { time: "09:30", title: isFr ? "Consultation produit" : "Product consultation", person: "Maya Laurent", tone: "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300" },
    { time: "11:00", title: isFr ? "Point d'équipe" : "Project check-in", person: isFr ? "Planification équipe" : "Team planning", tone: "bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300" },
    { time: "14:00", title: isFr ? "Sync express" : "Quick sync", person: isFr ? "Réunion instantanée" : "Instant meeting", tone: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300" },
  ];

  return (
    <section className="relative overflow-hidden pb-20 pt-16 md:pb-28 md:pt-24">
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-[32rem] w-[55rem] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {t("landing.heroBadge")}
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {t("landing.heroTitle1")}<br /><span className="text-primary">{t("landing.heroTitle2")}</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">{t("landing.heroSubtitle")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="gap-2 shadow-sm">
                <Link href="/register">{t("landing.ctaStart")} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" onClick={onRequestDemo}>
                {isFr ? "Discuter de votre besoin" : "Discuss your use case"}
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {isFr
                ? "Vos invités rejoignent la réunion via le lien que vous partagez. Vous gardez la gestion de l’espace hôte."
                : "Guests join through the link you share. Hosts manage the meeting from their workspace."}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {isFr ? "Vous avez déjà un compte ?" : "Already have an account?"}{" "}
              <Link href="/login" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
                {isFr ? "Se connecter" : "Sign in"}
              </Link>
            </p>
          </div>
          <div id="calendar" className="relative rounded-2xl border border-border bg-card p-4 shadow-xl shadow-black/5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{isFr ? "Espace hôte" : "Host workspace"}</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight">{isFr ? "Votre semaine en un coup d'œil" : "Your week, at a glance"}</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"><Globe2 className="h-3 w-3" /> Africa/Tunis</span>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground sm:gap-2 sm:text-xs">
              {(isFr ? ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"] : ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]).map((day, index) => (
                <div key={day} className={`rounded-lg py-2 ${index === 1 ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}>
                  <span className="block font-semibold">{day}</span><span className="mt-1 block opacity-80">{20 + index}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-[48px_1fr] gap-3 sm:grid-cols-[58px_1fr]">
              <div className="flex flex-col justify-between pb-1 pt-1 text-[10px] text-muted-foreground sm:text-xs"><span>09:00</span><span>11:00</span><span>13:00</span><span>15:00</span></div>
              <div className="relative min-h-[228px] overflow-hidden rounded-xl border border-border bg-background/70 p-3">
                <div className="absolute inset-x-0 top-[25%] border-t border-dashed border-border" />
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
                <div className="absolute inset-x-0 top-[75%] border-t border-dashed border-border" />
                <div className="relative ml-[17%] space-y-3">
                  {previewEvents.map((event) => (
                    <div key={event.title} className={`rounded-lg border px-3 py-2.5 ${event.tone}`}>
                      <div className="flex items-center gap-2 text-[10px] font-semibold sm:text-xs"><Clock3 className="h-3 w-3" />{event.time}<span className="h-1 w-1 rounded-full bg-current opacity-50" /><span className="truncate">{event.title}</span></div>
                      <p className="mt-1 truncate text-[10px] opacity-80 sm:text-[11px]">{event.person}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" />{isFr ? "Réservations" : "Bookings"}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" />{isFr ? "Réunions planifiées" : "Scheduled meetings"}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />{isFr ? "Réunions instantanées" : "Instant meetings"}</span>
              <span className="ml-auto inline-flex items-center gap-1.5"><Video className="h-3.5 w-3.5" />{isFr ? "Aperçu interactif" : "Static preview"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
