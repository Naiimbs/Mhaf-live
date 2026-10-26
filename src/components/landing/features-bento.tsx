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
            Everything needed for modern video collaboration.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            A cohesive suite combining real-time WebRTC media, scheduling algorithms,
            and deterministic attendance analytics.
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
                High-Assurance Video Conferencing
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Built on LiveKit's Selective Forwarding Unit (SFU) architecture.
                Supports adaptive simulcast, dynacast, screen sharing, and reliable
                in-room data channels with sub-100ms latency.
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
                Mathematical slot generation eliminates double-booking. Configurable
                buffer periods, advance notice buffers, and direct room link generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                <span className="text-foreground font-semibold">GET /api/schedule/slots</span>
                <div className="mt-1 text-[11px] opacity-80">
                  Calculates open intervals across host availability rules & existing bookings atomically.
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
                Real-Time Auditing
              </Badge>
              <CardTitle className="text-xl">
                Attendance Timelines & Heatmaps
              </CardTitle>
              <CardDescription className="text-sm mt-2">
                Webhook-driven lifecycle tracking captures exact join/leave timestamps,
                reconnection events, and calculates verified net attendance duration.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Participant Retention</span>
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
                Verifiable Post-Meeting Intelligence
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Audio is captured via LiveKit Egress, transferred securely to cloud
                object storage, and processed asynchronously for speaker diarization,
                structured meeting summaries, and actionable tasks.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <span className="text-xs font-semibold text-foreground">1. Audio Egress</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Archived directly to S3 upon room close webhook.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <span className="text-xs font-semibold text-foreground">2. Diarized STT</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Speaker identity timestamped with high confidence.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <span className="text-xs font-semibold text-foreground">3. Action Items</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Structured JSON outputs with assigned owners.
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
