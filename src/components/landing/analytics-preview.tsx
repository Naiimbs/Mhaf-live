import * as React from "react";
import { BarChart3, Clock, Users, ArrowDownRight, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-context";

export function AnalyticsPreview() {
  const { isFr } = useLanguage();
  const participants = [
    { name: "Amine (Host)", joined: "00:00", left: "45:00", duration: "45 min", pct: 100, status: "Active Speaker" },
    { name: "Sarah K. (Product)", joined: "02:15", left: "45:00", duration: "42 min 45s", pct: 95, status: "Unmuted / Video" },
    { name: "Karim T. (Engineering)", joined: "00:30", left: "38:20", duration: "37 min 50s", pct: 84, status: "Screen Share" },
    { name: "Nadia M. (Client Rep)", joined: "05:10", left: "44:30", duration: "39 min 20s", pct: 87, status: "Participant" },
  ];

  return (
    <section id="analytics" className="py-20 md:py-28">
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="font-mono text-xs mb-3">
            {isFr ? "Suivi et vérification" : "Auditing & Verification"}
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {isFr ? "Analyse de présence et cartes de participation" : "Granular Attendance Analytics & Heatmaps"}
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            {isFr ? "Conçu pour présenter les arrivées, départs, reconnexions et durées de présence lorsque le pipeline analytique sera connecté." : "Designed to present participant join/leave events, reconnections, and session duration once the analytics pipeline is connected."}
          </p>
        </div>

        {/* Notice of Simulation */}
        <div className="max-w-4xl mx-auto mb-6 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 px-4 text-xs text-amber-700 dark:text-amber-400">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            <strong>{isFr ? "Exemple illustratif uniquement :" : "Illustrative sample only:"}</strong> {isFr ? "Les noms, la chronologie et les mesures ci-dessous sont fictifs. Il ne s’agit pas de statistiques réelles." : "The names, timeline, and metrics below are demonstration data. They are not live attendee analytics."}
          </span>
        </div>

        <Card className="max-w-4xl mx-auto border-border/80 shadow-lg">
          <CardHeader className="border-b border-border/60 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    Session: #SES-9821-LIVE
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    Oct 25, 2026 · 45 mins total
                  </span>
                </div>
                <CardTitle className="text-xl sm:text-2xl mt-2">
                  Sprint Retrospective & Technical Review
                </CardTitle>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-xs text-muted-foreground font-medium">{isFr ? "Engagement moyen" : "Avg Engagement"}</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    91.5%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">{isFr ? "Participants nets" : "Net Attendees"}</div>
                  <div className="text-xl font-bold font-mono text-foreground">
                    4 / 4
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Timeline Axis */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground pb-1 border-b border-border">
                <span>00:00 (Start)</span>
                <span>15:00</span>
                <span>30:00</span>
                <span>45:00 (End)</span>
              </div>
            </div>

            {/* Heatmap Bars */}
            <div className="space-y-4">
              {participants.map((p, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">{p.name}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {p.duration} ({p.pct}%) · {p.status}
                    </span>
                  </div>

                  {/* Visual Timeline Bar */}
                  <div className="relative h-4 w-full rounded bg-muted/60 overflow-hidden border border-border/40">
                    <div
                      className="h-full bg-primary/80 dark:bg-primary/90 rounded transition-all duration-500"
                      style={{
                        width: `${p.pct}%`,
                        marginLeft: idx === 1 ? "5%" : idx === 3 ? "11%" : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Insights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-xs text-muted-foreground block">{isFr ? "Durée audio transcrite" : "Diarized Audio Duration"}</span>
                <span className="text-base font-bold font-mono text-foreground mt-0.5 block">
                  38m 42s
                </span>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-xs text-muted-foreground block">{isFr ? "Déconnexions en réunion" : "Mid-Call Disconnects"}</span>
                <span className="text-base font-bold font-mono text-emerald-500 mt-0.5 block">
                  {isFr ? "0 déconnexion" : "0 Dropouts"}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-xs text-muted-foreground block">{isFr ? "Actions identifiées" : "Action Items Captured"}</span>
                <span className="text-base font-bold font-mono text-foreground mt-0.5 block">
                  {isFr ? "5 actions clés" : "5 Key Deliverables"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
