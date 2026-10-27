"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstantMeetingButton({ className }: { className?: string }) {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const handleStartInstant = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Instant Consultation" }),
      });

      if (!res.ok) {
        throw new Error("Failed to create instant meeting");
      }

      const data = await res.json();
      router.push(data.roomUrl);
    } catch (err) {
      console.error(err);
      // Fallback: direct navigation with instant prefix
      const fallbackUid = `instant-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      router.push(`/rooms/${fallbackUid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleStartInstant}
      disabled={loading}
      size="sm"
      className={`gap-1.5 shadow-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white ${className || ""}`}
      id="start-instant-meeting-btn"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Video className="h-4 w-4" />
      )}
      Start Instant Meeting
    </Button>
  );
}
