import * as React from "react";
import { Video, Calendar, BarChart3, Bot, CheckCircle2, Sliders, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-context";

export function FeaturesBento() {
  const { isFr } = useLanguage();
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="font-mono text-xs mb-3">
            {isFr ? "Capacités de la plateforme" : "Platform Capabilities"}
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {isFr ? "Les essentiels pour mieux organiser vos réunions." : "The essentials for a more connected meeting workflow."}
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            {isFr ? "Un parcours qui relie les réunions vidéo et la planification, avec des fonctions de suivi et d’intelligence développées progressivement." : "A connected workflow for real-time meetings and scheduling, with attendance and intelligence capabilities being developed in measured stages."}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 (Large - Spans 2 cols): LiveKit Real-Time Media Engine */}
          <Card className="md:col-span-2 relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Video className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  WebRTC SFU
                </Badge>
              </div>
              <CardTitle className="text-xl sm:text-2xl mt-4">
                {isFr ? "Réunions vidéo en direct" : "Live video meetings"}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {isFr ? "Basé sur l’architecture SFU de LiveKit, avec prise en charge du partage d’écran et des flux adaptatifs. La qualité réelle dépend du réseau et du déploiement." : "Built on LiveKit's Selective Forwarding Unit (SFU) architecture. Supports adaptive simulcast, dynacast, screen sharing, and reliable in-room data channels. Actual call quality depends on network conditions and deployment."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground mt-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {isFr ? "Préparation des appareils avant l’appel" : "PreJoin hardware staging & audio meter"}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {isFr ? "Accès invité sans création de compte" : "Zero account registration for guests"}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {isFr ? "Mise en avant de l’intervenant et partage d’écran" : "Dynamic speaker spotlight & screen share"}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {isFr ? "Contrôles de modération de l’hôte" : "Host moderation: mute, kick, room lock"}
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Card 2: Autonomous Scheduling */}
          <Card id="scheduling" className="border-border/80">
            <CardHeader className="p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="w-fit font-mono text-[11px] mb-2">
                {isFr ? "Architecture de planification" : "Scheduling architecture"}
              </Badge>
              <CardTitle className="text-xl">
                {isFr ? "Planification selon le fuseau horaire" : "Timezone-Aware Scheduling"}
              </CardTitle>
              <CardDescription className="text-sm mt-2">
                {isFr ? "Les disponibilités tiennent compte du fuseau horaire et des réservations existantes. La protection atomique contre les réservations simultanées reste à renforcer." : "Timezone-aware availability and booking conflict checks help hosts coordinate meetings. Cross-instance atomic booking protection remains a hardening item."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                <span className="text-foreground font-semibold">GET /api/schedule/slots</span>
                <div className="mt-1 text-[11px] opacity-80">
                  {isFr ? "Calcule les créneaux possibles selon les disponibilités et les réservations existantes." : "Calculates candidate intervals from host availability and existing bookings."}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Attendance Analytics & Heatmaps */}
          <Card className="border-border/80">
            <CardHeader className="p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <BarChart3 className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="w-fit font-mono text-[11px] mb-2">
                {isFr ? "Fonctionnalité prévue" : "Roadmap capability"}
              </Badge>
              <CardTitle className="text-xl">
                {isFr ? "Historique de présence et cartes de participation" : "Attendance Timelines & Heatmaps"}
              </CardTitle>
              <CardDescription className="text-sm mt-2">
                {isFr ? "Prévu pour transformer les événements LiveKit vérifiés en historiques de présence et durées de participation. Le tableau de bord analytique n’est pas encore opérationnel." : "Designed to turn verified LiveKit lifecycle events into participant timelines and attendance duration. The analytics dashboard is not yet operational."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>{isFr ? "Taux de présence illustratif" : "Illustrative retention"}</span>
                  <span className="text-emerald-500 font-semibold">96.4%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[96.4%]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4 (Spans 2 cols): Post-Call AI Intelligence */}
          <Card className="md:col-span-2 border-border/80 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Bot className="h-6 w-6" />
                </div>
                <Badge variant="proposal" className="font-mono text-[11px]">
                  {isFr ? "Pipeline IA asynchrone" : "Async AI Pipeline"}
                </Badge>
              </div>
              <CardTitle className="text-xl sm:text-2xl mt-4">
                {isFr ? "Intelligence après réunion" : "Post-Meeting Intelligence"}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {isFr ? "Pipeline prévu : enregistrer l’audio, le traiter de façon asynchrone et produire des transcriptions par intervenant, des résumés structurés et des actions. L’enregistrement et le traitement IA ne sont pas encore activés." : "Planned pipeline: capture meeting audio, process it asynchronously, and produce speaker-aware transcripts, structured summaries, and action items. Recording and AI processing are not yet enabled."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <span className="text-xs font-semibold text-foreground">{isFr ? "1. Archivage audio" : "1. Audio Egress"}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFr ? "Prévu : archiver l’audio après la réunion." : "Planned: archive audio after the room ends."}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <span className="text-xs font-semibold text-foreground">{isFr ? "2. Transcription par intervenant" : "2. Diarized STT"}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFr ? "Prévu : texte horodaté et attribué aux intervenants." : "Planned: speaker-labelled text with timestamps."}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <span className="text-xs font-semibold text-foreground">{isFr ? "3. Actions à suivre" : "3. Action Items"}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFr ? "Prévu : actions structurées pour le suivi." : "Planned: structured action items for follow-up."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
