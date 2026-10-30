"use client";

import * as React from "react";
import Link from "next/link";
import { AnnouncementBanner } from "@/components/landing/announcement-banner";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { TrustSection } from "@/components/landing/trust-section";
import { FeaturesBento } from "@/components/landing/features-bento";
import { ProductSections } from "@/components/landing/product-sections";
import { InteractivePreview } from "@/components/landing/interactive-preview";
import { AnalyticsPreview } from "@/components/landing/analytics-preview";
import { PricingTiers } from "@/components/landing/pricing-tiers";
import { FaqSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { RequestDemoModal } from "@/components/landing/request-demo-modal";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";

export function LandingPageClient() {
  const [demoOpen, setDemoOpen] = React.useState(false);
  const { isFr } = useLanguage();
  const openDemo = React.useCallback(() => setDemoOpen(true), []);

  return (
    <div className="landing-shell flex min-h-screen flex-col bg-background pb-16 text-foreground md:pb-0">
      <AnnouncementBanner />
      <Navbar onRequestDemo={openDemo} />
      <main className="flex-1">
        <HeroSection onRequestDemo={openDemo} />
        <TrustSection />
        <FeaturesBento />
        <ProductSections />
        <InteractivePreview />
        <AnalyticsPreview />
        <PricingTiers onRequestDemo={openDemo} />
        <FaqSection />
      </main>
      <Footer />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          <Button asChild className="min-h-11">
            <Link href="/register">{isFr ? "Créer un compte" : "Create account"}</Link>
          </Button>
          <Button variant="outline" className="min-h-11" onClick={openDemo}>
            {isFr ? "Demander une démo" : "Request demo"}
          </Button>
        </div>
      </div>
      <RequestDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
