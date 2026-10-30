"use client";

import * as React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export function FaqSection() {
  const faqs = [
    {
      q: "Do guests need an account to join a meeting?",
      a: "No account is required for invited guests. A guest joins through a room link, and the application issues a restricted participant token on the server. Hosts still use an authenticated workspace to manage meetings.",
    },
    {
      q: "How does scheduling handle conflicting bookings?",
      a: "The current scheduling flow calculates availability using the host's schedule and existing bookings, then checks for conflicts when a booking is submitted. Database-level, cross-instance atomic reservation is a planned hardening step; we do not claim that guarantee yet.",
    },
    {
      q: "Are attendance analytics and meeting summaries available today?",
      a: "Not yet. The landing-page analytics view is illustrative. Verified webhook ingestion is being introduced first; participant history, attendance dashboards, recording, transcription, and AI summaries will be marked available only after their end-to-end flows are implemented and tested.",
    },
    {
      q: "Can MHAF Live use a self-hosted LiveKit server?",
      a: "The application reads its LiveKit connection settings from server-side environment configuration, so it can be configured for a compatible LiveKit deployment. Data residency also depends on where the application, database, and any future recording storage are hosted.",
    },
    {
      q: "How are room tokens protected?",
      a: "LiveKit tokens are signed on the server using the LiveKit Server SDK. The browser does not receive the LiveKit API secret, and guest tokens are issued without room-administrator privileges.",
    },
    {
      q: "Does MHAF Live track continuous GPS or live location?",
      a: "No. MHAF Live is designed for video meetings, scheduling, and meeting workflows. It does not require continuous GPS tracking or background location monitoring.",
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="container max-w-4xl px-4 sm:px-8">
        <div className="text-center mb-12">
          <Badge variant="outline" className="font-mono text-xs mb-3">
            Questions & Architecture Details
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Clear technical answers regarding security, media streaming, and deployment.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-base font-semibold text-foreground py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
