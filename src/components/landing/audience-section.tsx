"use client";

import { UserRound, Users, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";

interface AudienceSectionProps {
  onRequestDemo: () => void;
}

export function AudienceSection({ onRequestDemo }: AudienceSectionProps) {
  const { isFr } = useLanguage();

  const audiences = [
    {
      icon: UserRound,
      title: isFr ? "Indépendants et consultants" : "Independent professionals",
      description: isFr
        ? "Pour les consultants, coachs et experts qui organisent des échanges individuels avec leurs clients."
        : "For consultants, coaches, and specialists who arrange one-to-one conversations with clients.",
      need: isFr ? "Réservation client · Lien de réunion" : "Client booking · Meeting links",
    },
    {
      icon: Users,
      title: isFr ? "Équipes et agences" : "Teams and agencies",
      description: isFr
        ? "Pour les équipes qui alternent entre réunions planifiées, points de projet et appels spontanés."
        : "For teams moving between scheduled conversations, project check-ins, and quick calls.",
      need: isFr ? "Réunions planifiées · Appels directs" : "Scheduled meetings · Direct calls",
    },
    {
      icon: Building2,
      title: isFr ? "Organisations" : "Organizations",
      description: isFr
        ? "Pour les organisations qui souhaitent évaluer leurs besoins de déploiement, de contrôle d’accès et d’hébergement."
        : "For organizations evaluating deployment options, access controls, and hosting requirements.",
      need: isFr ? "Évaluation technique · Déploiement" : "Technical evaluation · Deployment",
    },
  ];

  return (
    <section id="audience" className="border-t border-border/60 py-20 md:py-24">
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isFr ? "Conçu pour vos échanges professionnels" : "Made for professional conversations"}
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {isFr ? "À qui s’adresse MHAF Live ?" : "Who is MHAF Live for?"}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {isFr
              ? "Un point de départ pour les professionnels et les équipes qui organisent régulièrement des réunions avec leurs clients ou collaborateurs."
              : "A starting point for professionals and teams who regularly arrange conversations with clients or colleagues."}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {audiences.map(({ icon: Icon, title, description, need }) => (
            <article key={title} className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
              <p className="mt-5 border-t border-border pt-4 text-xs font-medium text-muted-foreground">{need}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-muted/30 p-6 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {isFr ? "Vous avez un cas d’usage particulier ?" : "Have a specific meeting workflow in mind?"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFr ? "Parlons de vos besoins avant de définir la bonne approche." : "Tell us what you need before deciding on the right approach."}
            </p>
          </div>
          <Button onClick={onRequestDemo} className="min-h-11 shrink-0 gap-2">
            {isFr ? "Discuter de votre besoin" : "Discuss your use case"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
