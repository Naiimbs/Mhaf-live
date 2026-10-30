"use client";

import * as React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-context";

export function FaqSection() {
  const { isFr } = useLanguage();
  const faqs = [
    {
      q: {isFr ? "Les invités ont-ils besoin d’un compte pour rejoindre une réunion ?" : "Do guests need an account to join a meeting?"},
      a: {isFr ? "Non. Les invités peuvent rejoindre une réunion avec le lien partagé, sans créer de compte. Les hôtes utilisent un espace authentifié pour gérer leurs réunions." : "No account is required for invited guests. A guest joins through a room link, and the application issues a restricted participant token on the server. Hosts still use an authenticated workspace to manage meetings."},
    },
    {
      q: {isFr ? "Comment la planification gère-t-elle les conflits de réservation ?" : "How does scheduling handle conflicting bookings?"},
      a: {isFr ? "Le parcours actuel calcule les disponibilités à partir de l’agenda de l’hôte et des réservations existantes, puis vérifie les conflits lors de la demande. La protection atomique au niveau de la base de données reste une étape de renforcement prévue." : "The current scheduling flow calculates availability using the host's schedule and existing bookings, then checks for conflicts when a booking is submitted. Database-level, cross-instance atomic reservation is a planned hardening step; we do not claim that guarantee yet."},
    },
    {
      q: {isFr ? "Les statistiques de présence et les résumés sont-ils déjà disponibles ?" : "Are attendance analytics and meeting summaries available today?"},
      a: {isFr ? "Pas encore. Les statistiques affichées sur cette page sont des exemples. L’ingestion vérifiée des événements LiveKit est une première étape ; l’historique des participants, les tableaux de présence, l’enregistrement, la transcription et les résumés IA ne seront annoncés qu’après leur implémentation et leurs tests de bout en bout." : "Not yet. The landing-page analytics view is illustrative. Verified webhook ingestion is being introduced first; participant history, attendance dashboards, recording, transcription, and AI summaries will be marked available only after their end-to-end flows are implemented and tested."},
    },
    {
      q: {isFr ? "MHAF Live peut-il utiliser un serveur LiveKit auto-hébergé ?" : "Can MHAF Live use a self-hosted LiveKit server?"},
      a: {isFr ? "L’application lit sa configuration LiveKit depuis les variables d’environnement côté serveur et peut donc être configurée pour une installation compatible. La résidence des données dépend aussi de l’hébergement de l’application, de la base de données et du stockage d’enregistrements éventuel." : "The application reads its LiveKit connection settings from server-side environment configuration, so it can be configured for a compatible LiveKit deployment. Data residency also depends on where the application, database, and any future recording storage are hosted."},
    },
    {
      q: {isFr ? "Comment les jetons d’accès aux salles sont-ils protégés ?" : "How are room tokens protected?"},
      a: {isFr ? "Les jetons LiveKit sont signés côté serveur avec le SDK LiveKit Server. Le navigateur ne reçoit pas le secret API et les jetons invités ne donnent pas de privilèges d’administration de salle." : "LiveKit tokens are signed on the server using the LiveKit Server SDK. The browser does not receive the LiveKit API secret, and guest tokens are issued without room-administrator privileges."},
    },
    {
      q: {isFr ? "MHAF Live est-il prêt pour un lancement en production ?" : "Is MHAF Live ready for production?"},
      a: {isFr ? "Le produit est développé par étapes. La stabilisation de la planification, les tests de sécurité et les vérifications de bout en bout doivent être terminés avant le lancement public." : "The product is being developed in phases. Scheduling hardening, security review, and end-to-end validation must be completed before a public production launch."},
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="container max-w-4xl px-4 sm:px-8">
        <div className="text-center mb-12">
          <Badge variant="outline" className="font-mono text-xs mb-3">
            {isFr ? "Questions et détails techniques" : "Questions & Architecture Details"}
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {isFr ? "Questions fréquentes" : "Frequently Asked Questions"}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            {isFr ? "Des réponses claires sur la sécurité, les réunions vidéo et les options de déploiement." : "Clear technical answers regarding security, media streaming, and deployment."}
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
