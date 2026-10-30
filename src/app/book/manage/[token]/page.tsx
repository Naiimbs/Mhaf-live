"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Calendar, Clock, Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

type BookingData = {
  uid: string; attendeeName: string; attendeeEmail: string; startTime: string; endTime: string; title: string; hostName: string;
};

export default function ManageBookingPage() {
  const params = useParams();
  const token = params.token as string;
  const [booking, setBooking] = React.useState<BookingData | null>(null);
  const [pendingRequest, setPendingRequest] = React.useState<{ type: string; createdAt: string } | null>(null);
  const [type, setType] = React.useState<"CANCEL" | "RESCHEDULE">("CANCEL");
  const [reason, setReason] = React.useState("");
  const [requestedStartTime, setRequestedStartTime] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const minDateTime = React.useMemo(() => {
    const date = new Date(Date.now() + 30 * 60_000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }, []);

  React.useEffect(() => {
    fetch("/api/schedule/manage/" + encodeURIComponent(token))
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load this booking.");
        setBooking(data.booking);
        setPendingRequest(data.pendingRequest);
      })
      .catch((err) => setError(err.message || "Unable to load this booking."))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        type,
        reason,
        ...(type === "RESCHEDULE" ? { requestedStartTime: new Date(requestedStartTime).toISOString() } : {}),
      };
      const res = await fetch("/api/schedule/manage/" + encodeURIComponent(token), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to submit your request.");
      setSuccess(true);
      setPendingRequest({ type, createdAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit your request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3"><div className="mx-auto max-w-2xl"><BrandLogo size="small" /></div></header>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
          <div><p className="text-xs uppercase tracking-wider text-muted-foreground">MHAF Live · Booking management</p><h1 className="mt-2 text-2xl font-bold">Manage your booking</h1><p className="mt-1 text-sm text-muted-foreground">Request a cancellation or suggest another time. Your host must approve the request before anything changes.</p></div>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div> : !booking ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">{error || "Booking not found."}</div> : <>
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <p className="font-semibold">{booking.title}</p>
              <p className="text-sm text-muted-foreground">With {booking.hostName}</p>
              <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-primary" />{new Date(booking.startTime).toLocaleDateString()}</div>
              <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" />{new Date(booking.startTime).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} – {new Date(booking.endTime).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" />{booking.attendeeEmail}</div>
            </div>
            {success ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm"><CheckCircle2 className="inline h-4 w-4 mr-2 text-emerald-500" />Your request was sent to the host. The booking will remain unchanged until the host reviews it.</div> : pendingRequest ? <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">A {pendingRequest.type.toLowerCase()} request is already waiting for host approval. You will receive an email when it is reviewed.</div> : <form onSubmit={submit} className="space-y-4">
              <label className="block space-y-1.5"><span className="text-sm font-medium">What would you like to do?</span><select value={type} onChange={(e) => setType(e.target.value as "CANCEL" | "RESCHEDULE")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="CANCEL">Request cancellation</option><option value="RESCHEDULE">Request a new date and time</option></select></label>
              {type === "RESCHEDULE" && <label className="block space-y-1.5"><span className="text-sm font-medium">Preferred new date and time (your local timezone)</span><input type="datetime-local" required value={requestedStartTime} onChange={(e) => setRequestedStartTime(e.target.value)} min={minDateTime} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>}
              <label className="block space-y-1.5"><span className="text-sm font-medium">Reason <span className="text-destructive">*</span></span><textarea required minLength={10} maxLength={1500} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Please explain why you need to change or cancel this booking (at least 10 characters)." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /><span className="text-xs text-muted-foreground">{reason.trim().length}/1500 characters</span></label>
              {error && <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
              <Button type="submit" disabled={submitting || reason.trim().length < 10 || (type === "RESCHEDULE" && !requestedStartTime)} className="w-full">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Send request to host"}</Button>
            </form>}
          </>}
          <p className="text-xs text-muted-foreground">Submitting a request does not cancel or change your booking. Your host will review it and notify you by email.</p>
        </div>
      </div>
    </main>
  );
}
