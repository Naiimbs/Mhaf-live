"use client";

import { CalendarClock, Users, BrainCircuit, Clock3, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-context";

export function AnalyticsPreview() {
  const { isFr } = useLanguage();

  const capabilities = [
    {
      icon: CalendarClock,
      title: isFr ? "Historique des réunions" : "Meeting history",
      description: isFr
        ? "Retrouvez les réunions passées, leur statut, leur durée et les informations essentielles de chaque session."
        : "Review past meetings, their status, duration, and the key details attached to each session.",
      detail: isFr ? "Historique par session" : "Session-by-session history",
    },
    {
      icon: Users,
      title: isFr ? "Fiche participant" : "Participant profile",
      description: isFr
        ? "Une fiche claire par participant avec les heures d’arrivée et de départ, les reconnexions et le temps de présence."
        : "A clear participant card with join and leave times, reconnections, and time spent in the meeting.",
      detail: isFr ? "Présence et chronologie" : "Attendance and timeline",
    },
    {
      icon: BrainCircuit,
      title: isFr ? "Intelligence après réunion" : "Post-meeting intelligence",
      description: isFr
        ? "Une évolution envisagée pour transformer les enregistrements en transcriptions, résumés, sujets clés et actions à suivre."
        : "A planned workflow to turn recordings into transcripts, summaries, key topics, and follow-up actions.",
      detail: isFr ? "Transcription · Résumé · Actions" : "Transcript · Summary · Action items",
    },
  ];

  return (
    <section id="analytics" className="border-t border-border/60 py-20 md:py-28">
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="outline" className="mb-3 font-mono text-xs">
            {isFr ? "Feuille de route" : "Product roadmap"}
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {isFr ? "Des réunions plus faciles à retrouver et à exploiter." : "Make meetings easier to revisit and act on."}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {isFr
              ? "Ces capacités sont prévues dans l’évolution de MHAF Live. Elles ne sont pas encore présentées comme des fonctionnalités disponibles."
              : "These capabilities are part of the MHAF Live roadmap. They are not being presented as available features yet."}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, description, detail }, index) => (
            <article key={title} className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {isFr ? "Prévu" : "Planned"}
                </Badge>
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
              <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-xs font-medium text-muted-foreground">
                {index === 0 ? <Clock3 className="h-4 w-4" /> : index === 1 ? <Users className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                {detail}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
