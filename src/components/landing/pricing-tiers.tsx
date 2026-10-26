import * as React from "react";
import { Check, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PricingTiersProps {
  onRequestDemo: () => void;
}

export function PricingTiers({ onRequestDemo }: PricingTiersProps) {
  const tiers = [
    {
      name: "Community / Self-Host",
      badge: "Open Reference",
      description: "For engineering teams hosting their own LiveKit SFU and PostgreSQL instance.",
      price: "Free",
      period: "forever",
      cta: "Read Architecture",
      ctaHref: "#preview",
      isOutline: true,
      features: [
        "Unlimited peer-to-peer / SFU video rooms",
        "Autonomous scheduling & booking engine",
        "Zero guest account barrier",
        "Standard PreJoin hardware testing",
        "MIT-licensed foundational code",
      ],
    },
    {
      name: "Pro Managed",
      badge: "Proposed Tier",
      popular: true,
      description: "Fully managed real-time WebRTC infrastructure with automated cloud recording.",
      price: "$29",
      period: "per host / month",
      cta: "Join Pilot Waitlist",
      onClick: onRequestDemo,
      isOutline: false,
      features: [
        "All Community features included",
        "Managed LiveKit Cloud media routing",
        "S3 audio/video composite egress",
        "Automated attendance timeline heatmaps",
        "Diarized AI transcripts & action item extraction",
        "Custom subdomain & branded rooms",
      ],
    },
    {
      name: "Enterprise Dedicated",
      badge: "Custom Architecture",
      description: "For organizations requiring isolated SFU clusters, SAML SSO, and strict residency.",
      price: "Custom",
      period: "annual commitment",
      cta: "Contact Enterprise Sales",
      onClick: onRequestDemo,
      isOutline: true,
      features: [
        "Dedicated multi-region SFU clusters",
        "Single Sign-On (SAML 2.0 / Okta / Azure AD)",
        "Zero-retention AI transcription options",
        "Custom SLA & 24/7 engineering support",
        "Custom data residency (EU / US / MEA)",
      ],
    },
  ];

  return (
    <section id="tiers" className="py-20 md:py-28 border-t border-border/60 bg-muted/20">
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="font-mono text-xs mb-3">
            Deployment & Licensing Options
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Transparent, flexible deployment models.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Whether deploying on sovereign bare-metal servers or managed cloud infrastructure,
            MHAF Live adapts to your compliance posture.
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 font-medium">
            <Info className="h-3.5 w-3.5" /> Note: Commercial tiers represent proposed pricing targets for upcoming releases.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {tiers.map((tier, idx) => (
            <Card
              key={idx}
              className={`flex flex-col justify-between border transition-all ${
                tier.popular
                  ? "border-primary shadow-xl ring-2 ring-primary/20 bg-card"
                  : "border-border/80 bg-card/60 hover:border-border"
              }`}
            >
              <CardHeader className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <Badge variant={tier.popular ? "default" : "secondary"} className="text-[11px]">
                    {tier.badge}
                  </Badge>
                  {tier.popular && (
                    <span className="text-[11px] font-semibold text-primary font-mono uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}
                </div>

                <CardTitle className="text-xl sm:text-2xl mt-4">
                  {tier.name}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-2 leading-relaxed min-h-[40px]">
                  {tier.description}
                </CardDescription>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
                    {tier.price}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    /{tier.period}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 sm:p-8 pt-0 flex-1">
                <div className="border-t border-border/60 pt-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-3">
                    Features Included
                  </span>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                    {tier.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="p-6 sm:p-8 pt-0">
                {tier.ctaHref ? (
                  <Button
                    variant={tier.isOutline ? "outline" : "default"}
                    className="w-full min-h-[44px]"
                    asChild
                  >
                    <a href={tier.ctaHref}>{tier.cta}</a>
                  </Button>
                ) : (
                  <Button
                    variant={tier.isOutline ? "outline" : "default"}
                    className="w-full min-h-[44px]"
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
