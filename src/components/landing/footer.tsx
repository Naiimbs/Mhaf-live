import * as React from "react";
import Link from "next/link";
import { Video, Github, Shield, Terminal, BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card text-card-foreground">
      <div className="container max-w-7xl px-4 py-14 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Video className="h-3.5 w-3.5" />
              </div>
              <span className="text-base font-extrabold tracking-tight">
                MHAF <span className="text-muted-foreground font-medium">LIVE</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Open-source reference implementation for low-latency WebRTC video
              meetings, autonomous multi-timezone scheduling, and verifiable attendance analytics.
            </p>
            <div className="pt-2 text-[11px] font-mono text-muted-foreground">
              v1.0.0 · Blueprint Edition
            </div>
          </div>

          {/* Navigation Columns */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  WebRTC Media SFU
                </a>
              </li>
              <li>
                <a href="#scheduling" className="hover:text-foreground transition-colors">
                  Cal.diy Scheduling Engine
                </a>
              </li>
              <li>
                <a href="#preview" className="hover:text-foreground transition-colors">
                  PreJoin Hardware Staging
                </a>
              </li>
              <li>
                <a href="#analytics" className="hover:text-foreground transition-colors">
                  Attendance Heatmaps
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
              Documentation & Architecture
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="text-foreground/90 font-mono">docs/reference-audit.md</span>
              </li>
              <li>
                <span className="text-foreground/90 font-mono">docs/landing-page-spec.md</span>
              </li>
              <li>
                <span className="text-foreground/90 font-mono">docs/architecture.md</span>
              </li>
              <li>
                <span className="text-foreground/90 font-mono">docs/data-model.md</span>
              </li>
              <li>
                <span className="text-foreground/90 font-mono">docs/implementation-roadmap.md</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
              Open-Source Foundations
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" /> LiveKit Meet (Apache-2.0)
              </li>
              <li className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" /> Cal.diy (MIT License)
              </li>
              <li className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" /> shadcn/ui Template (MIT)
              </li>
              <li className="flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-emerald-500" /> REA Audit Workflow
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            © {new Date().getFullYear()} MHAF Live. All rights reserved. Built for privacy and verifiable engineering.
          </div>
          <div className="flex items-center gap-6">
            <span className="font-mono text-[11px]">
              No Live GPS Tracking · No Invasive Telemetry
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
