import * as React from "react";
import { getCurrentHost } from "@/lib/auth/session";
import { Settings, User, Clock, ShieldCheck, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const host = await getCurrentHost();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Account & Meeting Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your host profile, communication preferences, and security defaults.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Host Identity
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your host credentials used across video rooms and booking invites.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Account Email</span>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{host?.email}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Timezone</span>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{host?.timezone || "UTC"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          End-to-End Meeting Security
        </h2>
        <p className="text-xs text-muted-foreground">
          mhaf meet sessions use isolated peer rooms with encrypted audio/video channels.
          Guest access is strictly validated and rooms expire automatically after completion.
        </p>
        <div className="flex items-center gap-2 pt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Hardware encryption & P2P WebRTC active
        </div>
      </div>
    </div>
  );
}
