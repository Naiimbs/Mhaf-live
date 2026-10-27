"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstantMeetingButton({ className }: { className?: string }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  const handleStartInstant = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Instant meeting" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create instant meeting.");
      router.push(data.roomUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create instant meeting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        onClick={handleStartInstant}
        disabled={loading}
        size="sm"
        className={`gap-1.5 shadow-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 ${className || ""}`}
        id="start-instant-meeting-btn"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
        Start Instant Meeting
      </Button>
      {error && <p className="max-w-xs text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
