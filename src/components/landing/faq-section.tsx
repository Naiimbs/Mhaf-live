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
      q: "Do meeting participants or guests need an account to join?",
      a: "No. Guests can enter meeting rooms immediately using a unique, cryptographically signed room link. The host mints a short-lived participant token on the server with restricted grants (canPublish: true, roomAdmin: false), allowing instant entry without passwords or profile setup.",
    },
    {
      q: "How does the scheduling engine prevent double-booking conflicts?",
      a: "Inspired by Cal.diy's scheduling math, the engine translates the host's operating windows, timezones, and existing bookings into discrete prospective intervals. When an attendee reserves a slot, an atomic database transaction verifies slot availability before writing the record, rejecting collisions deterministically.",
    },
    {
      q: "How is post-meeting speech transcription handled?",
      a: "Standard LiveKit webhooks report room lifecycle events (joined/left/closed), but do not transport speech or text. To ensure high fidelity and resilience, MHAF Live uses LiveKit Egress to export composite audio (.m4a) to S3 upon call conclusion, triggering an asynchronous speech-to-text pipeline (Deepgram / Whisper) for diarized speaker summaries.",
    },
    {
      q: "Can MHAF Live be deployed completely on-premise or self-hosted?",
      a: "Yes. The entire application server is a standard Next.js App Router application backed by PostgreSQL. The real-time media layer can connect to an open-source LiveKit SFU server deployed on Docker or Kubernetes, ensuring total data sovereignty.",
    },
    {
      q: "How are participant tokens and room privileges secured?",
      a: "Client browsers never possess LiveKit API keys or secrets. All access tokens are signed server-side in the /api/connection-details route handler using the LiveKit Server SDK. Administrative actions (muting remote participants, kicking, locking rooms) require verified host sessions.",
    },
    {
      q: "Does MHAF Live track continuous GPS or live location?",
      a: "No. MHAF Live is strictly a real-time video conferencing, calendar scheduling, and meeting intelligence platform. It does not perform continuous GPS tracking, live geolocation monitoring, or background mobile tracking.",
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
