"use client";

import * as React from "react";
import { AnnouncementBanner } from "@/components/landing/announcement-banner";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { TrustSection } from "@/components/landing/trust-section";
import { FeaturesBento } from "@/components/landing/features-bento";
import { InteractivePreview } from "@/components/landing/interactive-preview";
import { AnalyticsPreview } from "@/components/landing/analytics-preview";
import { PricingTiers } from "@/components/landing/pricing-tiers";
import { FaqSection } from "@/components/landing/faq-section";
import { RequestDemoModal } from "@/components/landing/request-demo-modal";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  const [demoModalOpen, setDemoModalOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors">
      {/* 1. Top Announcement Pill */}
      <AnnouncementBanner />

      {/* 2. Sticky Navbar with Theme Toggle & CTAs */}
      <Navbar onRequestDemo={() => setDemoModalOpen(true)} />

      {/* Main Page Flow */}
      <main className="flex-1">
        {/* 3. Hero Section with Interactive Room Visual */}
        <HeroSection onRequestDemo={() => setDemoModalOpen(true)} />

        {/* 4. Verified Trust & Architectural Commitments */}
        <TrustSection />

        {/* 5. Platform Pillars Bento Grid */}
        <FeaturesBento />

        {/* 6. Live Interactive Scheduling & PreJoin Staging Preview */}
        <InteractivePreview />

        {/* 7. Granular Attendance Heatmap Simulation */}
        <AnalyticsPreview />

        {/* 8. Deployment Tiers (Proposed) */}
        <PricingTiers onRequestDemo={() => setDemoModalOpen(true)} />

        {/* 9. Architectural FAQs */}
        <FaqSection />
      </main>

      {/* 10. Footer with Open Source Acknowledgments */}
      <Footer />

      {/* Modal: Request Enterprise Demo with Honest Verification */}
      <RequestDemoModal
        open={demoModalOpen}
        onOpenChange={setDemoModalOpen}
      />
    </div>
  );
}
