import * as React from "react";
import { ShieldCheck, Lock, Server, Cpu } from "lucide-react";

export function TrustSection() {
  const principles = [
    {
      icon: Lock,
      title: "Server-Signed Room Access",
      description:
        "LiveKit access tokens are minted on the server. API keys and signing secrets are never sent to the browser.",
    },
    {
      icon: Server,
      title: "Flexible Media Deployment",
      description:
        "The media connection is configurable for a managed LiveKit service or a compatible self-hosted LiveKit deployment.",
    },
    {
      icon: ShieldCheck,
      title: "Privacy-Conscious Room Access",
      description:
        "Meeting access is controlled through scoped, short-lived tokens rather than exposing media-server credentials to participants.",
    },
    {
      icon: Cpu,
      title: "Meeting Intelligence Roadmap",
      description:
        "Attendance insights, audio archival, transcription, and summaries are planned capabilities. They are not presented as live features until verified end to end.",
    },
  ];

  return (
    <section id="security" className="border-y border-border/60 bg-muted/30 py-12">
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Security & deployment principles
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Designed around clear trust boundaries and honest capability status.
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {principles.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex flex-col rounded-xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:border-border hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
