"use client";

import { Check, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-context";

interface PricingTiersProps {
  onRequestDemo: () => void;
}

export function PricingTiers({ onRequestDemo }: PricingTiersProps) {
  const { isFr } = useLanguage();
  const tiers = [
    {
      name: isFr ? "Auto-hébergé" : "Self-hosted",
      badge: isFr ? "Option à l’étude" : "Under consideration",
      description: isFr
        ? "Pour les équipes qui souhaitent évaluer un déploiement avec leur propre infrastructure LiveKit compatible."
        : "For teams evaluating a deployment using their own compatible LiveKit infrastructure.",
      price: isFr ? "À définir" : "To be defined",
      period: isFr ? "selon le déploiement" : "per deployment",
      cta: isFr ? "Explorer l’aperçu" : "Explore the preview",
      ctaHref: "#preview",
      isOutline: true,
      features: isFr
        ? [
            "Socle de réunions vidéo en temps réel basé sur LiveKit",
            "Jetons d’accès aux réunions émis côté serveur",
            "Accès invité par lien, selon la configuration",
            "Hébergement et exploitation gérés par votre équipe",
          ]
        : [
            "LiveKit-based real-time video foundation",
            "Server-issued meeting access tokens",
            "Guest access through a link, depending on configuration",
            "Hosting and operations managed by your team",
          ],
    },
    {
      name: isFr ? "Service géré" : "Managed service",
      badge: isFr ? "Concept" : "Concept",
      popular: true,
      description: isFr
        ? "Une option future pour les professionnels et équipes qui préfèrent un service hébergé et administré."
        : "A potential future option for professionals and teams who prefer a hosted and operated service.",
      price: isFr ? "Non défini" : "Not set",
      period: isFr ? "tarification à étudier" : "pricing to be defined",
      cta: isFr ? "Discuter de votre besoin" : "Discuss your use case",
      onClick: onRequestDemo,
      isOutline: false,
      features: isFr
        ? [
            "Hébergement et gestion de l’infrastructure média (prévu)",
            "Administration centralisée des espaces (à définir)",
            "Enregistrement et intelligence de réunion (feuille de route)",
            "Aucune disponibilité commerciale annoncée",
          ]
        : [
            "Managed media infrastructure (planned)",
            "Centralized workspace administration (to be defined)",
            "Recording and meeting intelligence (roadmap)",
            "No commercial availability announced",
          ],
    },
    {
      name: isFr ? "Déploiement dédié" : "Dedicated deployment",
      badge: isFr ? "Étude entreprise" : "Enterprise evaluation",
      description: isFr
        ? "Pour les organisations qui doivent étudier l’isolation, l’identité et les exigences d’hébergement."
        : "For organizations evaluating isolation, identity, and hosting requirements.",
      price: isFr ? "Sur étude" : "By evaluation",
      period: isFr ? "selon les exigences" : "based on requirements",
      cta: isFr ? "Échanger avec nous" : "Talk to us",
      onClick: onRequestDemo,
      isOutline: true,
      features: isFr
        ? [
            "Architecture dédiée : à évaluer",
            "Intégrations SSO : non confirmées",
            "Résidence des données liée au choix d’hébergement",
            "Périmètre, SLA et support à définir",
          ]
        : [
            "Dedicated architecture: to be evaluated",
            "SSO integrations: not yet confirmed",
            "Data residency depends on hosting choices",
            "Scope, SLA, and support to be defined",
          ],
    },
  ];

  return (
    <section id="tiers" className="border-t border-border/60 bg-muted/20 py-20 md:py-28">
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Badge variant="outline" className="mb-3 font-mono text-xs">
            {isFr ? "Options de déploiement envisagées" : "Deployment models under consideration"}
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {isFr ? "Une approche adaptée à votre contexte." : "An approach shaped around your context."}
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            {isFr
              ? "Les modèles ci-dessous servent à cadrer les besoins. Ils ne constituent pas des offres commerciales disponibles."
              : "The models below help frame potential requirements. They are not commercial offers currently available."}
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Info className="h-3.5 w-3.5" />
            {isFr
              ? "Prix, disponibilité et périmètre restent à définir."
              : "Pricing, availability, and scope are still to be defined."}
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`flex flex-col justify-between border transition-all ${
                tier.popular
                  ? "border-primary bg-card shadow-xl ring-2 ring-primary/20"
                  : "border-border/80 bg-card/60 hover:border-border"
              }`}
            >
              <CardHeader className="p-6 sm:p-8">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={tier.popular ? "default" : "secondary"} className="text-[11px]">
                    {tier.badge}
                  </Badge>
                  {tier.popular && (
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                      {isFr ? "À explorer" : "Explore"}
                    </span>
                  )}
                </div>
                <CardTitle className="mt-4 text-xl sm:text-2xl">{tier.name}</CardTitle>
                <CardDescription className="mt-2 min-h-[60px] text-xs leading-relaxed sm:text-sm">
                  {tier.description}
                </CardDescription>
                <div className="mt-6 flex flex-wrap items-baseline gap-1">
                  <span className="font-mono text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                    {tier.price}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">/ {tier.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-6 pt-0 sm:p-8 sm:pt-0">
                <div className="border-t border-border/60 pt-6">
                  <span className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {isFr ? "Périmètre envisagé" : "Potential scope"}
                  </span>
                  <ul className="space-y-2.5 text-xs text-muted-foreground sm:text-sm">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0 sm:p-8 sm:pt-0">
                {tier.ctaHref ? (
                  <Button variant="outline" className="min-h-[44px] w-full" asChild>
                    <a href={tier.ctaHref}>{tier.cta}</a>
                  </Button>
                ) : (
                  <Button
                    variant={tier.isOutline ? "outline" : "default"}
                    className="min-h-[44px] w-full"
                    onClick={tier.onClick}
                  >
                    {tier.cta}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
