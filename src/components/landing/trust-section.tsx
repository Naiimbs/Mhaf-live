import * as React from "react";
import { ShieldCheck, Lock, Server, Cpu } from "lucide-react";

export function TrustSection() {
  const principles = [
    {
      icon: Lock,
      title: "Signed Room Tokens",
      description:
        "Every session access token is minted server-side with strict grants (roomAdmin, canPublish, canSubscribe). Zero client secret exposure.",
    },
    {
      icon: Server,
      title: "Self-Hostable SFU",
      description:
        "Designed to deploy either against managed LiveKit Cloud or your own Dockerized LiveKit instance for complete data sovereignty.",
    },
    {
      icon: ShieldCheck,
      title: "Zero Third-Party Telemetry",
      description:
        "No invasive third-party analytics scripts or trackers injected into meeting rooms. All logs remain inside your PostgreSQL cluster.",
    },
    {
      icon: Cpu,
      title: "Isolated AI Pipeline",
      description:
        "Audio egress and speech transcription operate asynchronously in segregated worker queues, keeping the real-time media SFU unburdened.",
    },
  ];

  return (
    <section className="border-y border-border/60 bg-muted/30 py-12">
      <div className="container max-w-7xl px-4 sm:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Architecture Commitments & Security Architecture
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Built on verifiable engineering, not marketing claims.
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
