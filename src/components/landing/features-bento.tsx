import * as React from "react";
import { Video, Calendar, BarChart3, Bot, CheckCircle2, Sliders, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function FeaturesBento() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="font-mono text-xs mb-3">
            Platform Capabilities
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            The essentials for a more connected meeting workflow.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            A connected workflow for real-time meetings and scheduling, with attendance and intelligence capabilities being developed in measured stages.
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
                Live video meetings
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Built on LiveKit's Selective Forwarding Unit (SFU) architecture.
                Supports adaptive simulcast, dynacast, screen sharing, and reliable
                in-room data channels. Actual call quality depends on network conditions and deployment.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground mt-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> PreJoin hardware staging & audio meter
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Zero account registration for guests
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Dynamic speaker spotlight & screen share
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Host moderation: mute, kick, room lock
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
                Cal.diy Architecture
              </Badge>
              <CardTitle className="text-xl">
                Timezone-Aware Scheduling
              </CardTitle>
              <CardDescription className="text-sm mt-2">
                Timezone-aware availability and booking conflict checks help hosts coordinate meetings. Cross-instance atomic booking protection remains a hardening item.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                <span className="text-foreground font-semibold">GET /api/schedule/slots</span>
                <div className="mt-1 text-[11px] opacity-80">
                  Calculates candidate intervals from host availability and existing bookings.
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
                Roadmap capability
              </Badge>
              <CardTitle className="text-xl">
                Attendance Timelines & Heatmaps
              </CardTitle>
              <CardDescription className="text-sm mt-2">
                Designed to turn verified LiveKit lifecycle events into participant timelines and attendance duration. The analytics dashboard is not yet operational.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Illustrative retention</span>
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
                  Async AI Pipeline
                </Badge>
              </div>
              <CardTitle className="text-xl sm:text-2xl mt-4">
                Post-Meeting Intelligence
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Planned pipeline: capture meeting audio, process it asynchronously, and produce speaker-aware transcripts, structured summaries, and action items. Recording and AI processing are not yet enabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <span className="text-xs font-semibold text-foreground">1. Audio Egress</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Planned: archive audio after the room ends.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <span className="text-xs font-semibold text-foreground">2. Diarized STT</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Planned: speaker-labelled text with timestamps.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <span className="text-xs font-semibold text-foreground">3. Action Items</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Planned: structured action items for follow-up.
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
