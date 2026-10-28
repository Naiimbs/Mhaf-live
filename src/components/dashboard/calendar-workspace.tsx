"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe2,
  Loader2,
  Plus,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getLocalDateString,
  getWeekdayForLocalDate,
  getZonedDateParts,
} from "@/lib/scheduling/timezone";

interface CalendarEvent {
  id: string;
  uid: string;
  title: string;
  source: "BOOKING" | "MANUAL" | "INSTANT";
  bookingId: string | null;
  attendeeName: string | null;
  attendeeEmail: string | null;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "LIVE" | "CANCELLED" | "COMPLETED" | "CONFIRMED";
}

interface CalendarWorkspaceProps {
  hostId?: string;
  hostTimeZone: string;
  eventTypes: Array<{ id: string; slug: string; title: string; durationMinutes: number; description?: string | null }>;
}

const HOUR_START = 7;
const HOUR_END = 21;
const HOUR_HEIGHT = 64;

function getVisibleHourRange(events: CalendarEvent[], timeZone: string) {
  let start = HOUR_START;
  let end = HOUR_END;
  for (const event of events) {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const startParts = getZonedDateParts(eventStart, timeZone);
    const endParts = getZonedDateParts(eventEnd, timeZone);
    const startDate = getLocalDateString(eventStart, timeZone);
    const endDate = getLocalDateString(eventEnd, timeZone);
    start = Math.min(start, startParts.hour);
    const endMinute = endDate === startDate ? endParts.hour * 60 + endParts.minute : 24 * 60;
    end = Math.max(end, Math.ceil(endMinute / 60));
  }
  start = Math.max(0, start);
  end = Math.min(24, Math.max(start + 1, end));
  return {
    start,
    end,
    hours: Array.from({ length: end - start + 1 }, (_, index) => start + index),
  };
}

function addDays(dateString: string, amount: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function mondayOf(dateString: string): string {
  const weekday = getWeekdayForLocalDate(dateString) ?? 1;
  return addDays(dateString, -((weekday + 6) % 7));
}

function dateAtUtcNoon(dateString: string): Date {
  return new Date(`${dateString}T12:00:00.000Z`);
}

function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

function sourceStyles(source: CalendarEvent["source"]) {
  if (source === "BOOKING") return "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200";
  if (source === "MANUAL") return "border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-200";
  return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200";
}

function sourceLabel(source: CalendarEvent["source"]) {
  return source === "BOOKING" ? "BOOKING" : source === "MANUAL" ? "SCHEDULED" : "INSTANT";
}

function roomPath(url: string): string {
  return new URL(url, "https://mhaf.invalid").pathname;
}

export function CalendarWorkspace({ hostId, hostTimeZone, eventTypes }: CalendarWorkspaceProps) {
  const [weekStart, setWeekStart] = React.useState(() => mondayOf(getLocalDateString(new Date(), hostTimeZone)));
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [createdRoomUrl, setCreatedRoomUrl] = React.useState<string | null>(null);
  const [copyMessage, setCopyMessage] = React.useState<string | null>(null);
  const [startingInstant, setStartingInstant] = React.useState(false);
  const [instantRoomUrl, setInstantRoomUrl] = React.useState<string | null>(null);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  // Booking links state
  const [bookingTypes, setBookingTypes] = React.useState(eventTypes);
  const [createLinkOpen, setCreateLinkOpen] = React.useState(false);
  const [creatingLink, setCreatingLink] = React.useState(false);
  const [createLinkError, setCreateLinkError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setBookingTypes(eventTypes);
  }, [eventTypes]);

  const copyBookingLink = async (href: string) => {
    try {
      const full = `${window.location.origin}${href}`;
      await navigator.clipboard.writeText(full);
      setCopyMessage("Booking link copied to clipboard!");
    } catch {
      setCopyMessage("Failed to copy link");
    }
    window.setTimeout(() => setCopyMessage(null), 2500);
  };

  const submitNewBookingLink = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setCreatingLink(true);
    setCreateLinkError(null);
    const form = new FormData(formEvent.currentTarget);
    const payload = {
      title: String(form.get("title") || "").trim(),
      durationMinutes: Number(form.get("durationMinutes") || 30),
      description: String(form.get("description") || "").trim(),
    };
    try {
      const res = await fetch("/api/schedule/event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create booking link.");
      setBookingTypes((prev) => [...prev, data.eventType]);
      setCreateLinkOpen(false);
      setCopyMessage(`Booking link created: “${data.eventType.title}”`);
    } catch (err: any) {
      setCreateLinkError(err.message || "Failed to create booking link.");
    } finally {
      setCreatingLink(false);
    }
  };

  const days = React.useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const weekEnd = days[6];
  const hourRange = React.useMemo(() => getVisibleHourRange(events, hostTimeZone), [events, hostTimeZone]);

  const refreshEvents = React.useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const query = new URLSearchParams({ from: weekStart, to: weekEnd });
      const response = await fetch(`/api/calendar?${query.toString()}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load calendar events.");
      setEvents(body.events || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not load calendar events.");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  React.useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const eventsForDay = React.useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const day of days) grouped.set(day, []);
    for (const event of events) {
      const eventDay = getLocalDateString(new Date(event.startTime), hostTimeZone);
      grouped.get(eventDay)?.push(event);
    }
    return grouped;
  }, [days, events, hostTimeZone]);

  const formatRange = () => {
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const first = formatter.format(dateAtUtcNoon(weekStart));
    const last = formatter.format(dateAtUtcNoon(weekEnd));
    const year = dateAtUtcNoon(weekEnd).getUTCFullYear();
    return `${first} – ${last}, ${year}`;
  };

  const copyRoomLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Link copied");
    } catch {
      setCopyMessage("Copy failed — select and copy the link above.");
    }
    window.setTimeout(() => setCopyMessage(null), 2500);
  };

  const startInstantMeeting = async () => {
    setStartingInstant(true);
    setPageError(null);
    try {
      const response = await fetch("/api/rooms/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Instant meeting" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not start an instant meeting.");
      const roomUrl = `${window.location.origin}${body.roomUrl}`;
      setInstantRoomUrl(roomUrl);
      const meetingDay = mondayOf(getLocalDateString(new Date(body.meeting.startTime), hostTimeZone));
      await refreshEvents();
      setWeekStart(meetingDay);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not start an instant meeting.");
    } finally {
      setStartingInstant(false);
    }
  };

  const submitScheduledMeeting = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setSaving(true);
    setCreateError(null);
    setCreatedRoomUrl(null);
    const form = new FormData(formEvent.currentTarget);
    const payload = {
      title: String(form.get("title") || ""),
      date: String(form.get("date") || ""),
      time: String(form.get("time") || ""),
      durationMinutes: Number(form.get("durationMinutes") || 30),
      attendeeName: String(form.get("attendeeName") || ""),
      attendeeEmail: String(form.get("attendeeEmail") || ""),
    };
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not schedule this meeting.");
      const roomUrl = `${window.location.origin}${body.roomUrl}`;
      setCreatedRoomUrl(roomUrl);
      const meetingDay = mondayOf(getLocalDateString(new Date(body.meeting.startTime), hostTimeZone));
      await refreshEvents();
      setWeekStart(meetingDay);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not schedule this meeting.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEvent = async (event: CalendarEvent) => {
    if (!window.confirm(`Cancel “${event.title}”?`)) return;
    setCancellingId(event.id);
    try {
      const isBooking = event.source === "BOOKING";
      const response = await fetch(isBooking ? "/api/schedule/bookings" : "/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isBooking ? { action: "CANCEL", bookingId: event.bookingId || event.id } : { action: "CANCEL", meetingId: event.id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not cancel event.");
      await refreshEvents();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not cancel event.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary"><CalendarDays className="h-4 w-4" />Calendar</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Your meetings, in one week.</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bookings and meetings shown in your host time zone.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-2 text-xs text-muted-foreground"><Globe2 className="h-3.5 w-3.5 text-primary" />{hostTimeZone}</span>
          <Button variant="outline" onClick={() => { setCreateError(null); setCreatedRoomUrl(null); setCreateOpen(true); }} className="gap-1.5"><CalendarPlus className="h-4 w-4" />Schedule meeting</Button>
          <Button onClick={startInstantMeeting} disabled={startingInstant} className="gap-1.5">
            {startingInstant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            Start instant
          </Button>
        </div>
      </section>

      {(pageError || instantRoomUrl) && (
        <div className={`rounded-xl border p-4 ${pageError ? "border-destructive/30 bg-destructive/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
          {pageError ? <p className="text-sm text-destructive" role="alert">{pageError}</p> : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold text-foreground">Instant room is ready</p><p className="mt-1 break-all text-xs text-muted-foreground">{instantRoomUrl}</p></div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => copyRoomLink(instantRoomUrl!)} className="gap-1.5"><Copy className="h-3.5 w-3.5" />Copy link</Button>
                <Button size="sm" asChild className="gap-1.5"><Link href={roomPath(instantRoomUrl!)}><Video className="h-3.5 w-3.5" />Enter room</Link></Button>
                <button type="button" className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Dismiss" onClick={() => setInstantRoomUrl(null)}><X className="h-4 w-4" /></button>
              </div>
            </div>
          )}
          {copyMessage && <p className="mt-2 text-xs text-muted-foreground" role="status">{copyMessage}</p>}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-label="Weekly calendar">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">{formatRange()}</h2><p className="mt-0.5 text-xs text-muted-foreground">Week starts Monday · {events.length} event{events.length === 1 ? "" : "s"}</p></div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setWeekStart(mondayOf(getLocalDateString(new Date(), hostTimeZone)))}>Today</Button>
            <div className="flex items-center">
              <Button size="icon" variant="outline" aria-label="Previous week" onClick={() => setWeekStart((current) => addDays(current, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" className="ml-1" aria-label="Next week" onClick={() => setWeekStart((current) => addDays(current, 7))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-72 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading calendar…</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[58px_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/20">
                <div className="border-r border-border p-2 text-[10px] text-muted-foreground">{hostTimeZone}</div>
                {days.map((day) => {
                  const date = dateAtUtcNoon(day);
                  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date);
                  return <div key={day} className={`border-r border-border px-2 py-2 text-center ${day === getLocalDateString(new Date(), hostTimeZone) ? "bg-primary/5" : ""}`}>
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">{weekday}</div>
                    <div className="mt-0.5 text-sm font-semibold">{date.getUTCDate()}</div>
                  </div>;
                })}
              </div>
              <div className="grid grid-cols-[58px_repeat(7,minmax(0,1fr))]">
                <div className="relative border-r border-border" style={{ height: `${(hourRange.end - hourRange.start) * HOUR_HEIGHT}px` }}>
                  {hourRange.hours.slice(0, -1).map((hour) => <div key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground" style={{ top: `${(hour - hourRange.start) * HOUR_HEIGHT}px` }}>{String(hour).padStart(2, "0")}:00</div>)}
                </div>
                {days.map((day) => {
                  const dayEvents = eventsForDay.get(day) || [];
                  return <div key={day} className="relative border-r border-border" style={{ height: `${(hourRange.end - hourRange.start) * HOUR_HEIGHT}px` }}>
                    {hourRange.hours.slice(0, -1).map((hour) => <div key={hour} className="absolute inset-x-0 border-t border-border/60" style={{ top: `${(hour - hourRange.start) * HOUR_HEIGHT}px` }} />)}
                    {dayEvents.map((event) => {
                      const local = getZonedDateParts(new Date(event.startTime), hostTimeZone);
                      const minuteOfDay = local.hour * 60 + local.minute;
                      const top = ((minuteOfDay - hourRange.start * 60) / 60) * HOUR_HEIGHT;
                      if (top < 0 || top >= (hourRange.end - hourRange.start) * HOUR_HEIGHT) return null;
                      const durationMinutes = Math.max(20, (Date.parse(event.endTime) - Date.parse(event.startTime)) / 60_000);
                      const height = Math.max(34, Math.min(durationMinutes / 60 * HOUR_HEIGHT, (hourRange.end - hourRange.start) * HOUR_HEIGHT - top));
                      const cancelled = event.status === "CANCELLED" || event.status === "COMPLETED";
                      return (
                        <article key={event.id} className={`absolute left-1 right-1 z-10 overflow-hidden rounded-lg border px-2 py-1.5 shadow-sm ${cancelled ? "border-border bg-muted/60 text-muted-foreground opacity-70" : sourceStyles(event.source)}`} style={{ top: `${top + 2}px`, height: `${height - 4}px` }}>
                          <div className="flex items-start justify-between gap-1">
                            {cancelled ? <span className="truncate text-[11px] font-semibold line-through">{event.title}</span> : <Link href={`/rooms/${event.uid}`} className="truncate text-[11px] font-semibold hover:underline" title={`Open ${event.title}`}>{event.title}</Link>}
                            {!cancelled && <button type="button" onClick={() => cancelEvent(event)} disabled={cancellingId === event.id} aria-label={`Cancel ${event.title}`} title="Cancel event" className="shrink-0 rounded p-0.5 opacity-70 hover:bg-black/5 hover:opacity-100 disabled:opacity-40"><X className="h-3 w-3" /></button>}
                          </div>
                          <p className="mt-0.5 truncate text-[10px] opacity-80">{formatClock(event.startTime, hostTimeZone)} · {event.attendeeName || sourceLabel(event.source)}</p>
                          <span className="mt-1 inline-flex text-[9px] font-bold tracking-wide opacity-75">{cancelled ? event.status : sourceLabel(event.source)}</span>
                        </article>
                      );
                    })}
                  </div>;
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Your booking links</h2>
              <p className="mt-1 text-xs text-muted-foreground">Share these links with clients to let them pick an available slot on your calendar.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setCreateLinkOpen(true)} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                New booking link
              </Button>
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
          </div>
          {bookingTypes.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No active booking types are available yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {bookingTypes.map((type) => {
                const href = `/book/${hostId || "me"}/${type.slug}`;
                return (
                  <div key={type.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{type.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {type.durationMinutes} minutes{type.description ? ` • ${type.description}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyBookingLink(href)}
                        className="gap-1.5 text-xs"
                        title="Copy direct booking link for client"
                      >
                        <Copy className="h-3 w-3" />
                        Copy link
                      </Button>
                      <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs">
                        <Link href={href} target="_blank">
                          Open <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-muted/20 p-5">
          <h2 className="font-semibold">Three ways to meet</h2>
          <ul className="mt-3 space-y-3 text-xs text-muted-foreground">
            <li className="flex gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" /><span><strong className="text-foreground">Booking</strong> — a guest reserves through your public page.</span></li>
            <li className="flex gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500" /><span><strong className="text-foreground">Scheduled</strong> — you pick a time and share the room link.</span></li>
            <li className="flex gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" /><span><strong className="text-foreground">Instant</strong> — start a room now; no booking is created.</span></li>
          </ul>
        </div>
      </section>

      {/* Create New Booking Link Dialog */}
      <Dialog open={createLinkOpen} onOpenChange={setCreateLinkOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create a booking link</DialogTitle>
            <DialogDescription>
              Clients will use this link to view your real-time availability and reserve an appointment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitNewBookingLink} className="space-y-4">
            {createLinkError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                {createLinkError}
              </p>
            )}
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Link title</span>
              <input
                name="title"
                required
                minLength={2}
                maxLength={100}
                placeholder="e.g. Consultation 30 min"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Meeting duration</span>
              <select
                name="durationMinutes"
                defaultValue="30"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes (1 hour)</option>
                <option value="90">90 minutes</option>
                <option value="120">2 hours</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Description (optional)</span>
              <textarea
                name="description"
                rows={2}
                maxLength={300}
                placeholder="Brief instructions or purpose for your client..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              A shareable URL will be created. You can copy and send it directly via WhatsApp, SMS, or Email.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCreateLinkOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingLink} className="gap-2">
                {creatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create link
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule a meeting</DialogTitle>
            <DialogDescription>Create a meeting in {hostTimeZone}. This will not create a booking reservation.</DialogDescription>
          </DialogHeader>
          {createdRoomUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Check className="h-4 w-4 text-emerald-600" />Meeting scheduled</p>
                <p className="mt-2 break-all rounded-md bg-background px-3 py-2 font-mono text-xs text-muted-foreground">{createdRoomUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-1.5" onClick={() => copyRoomLink(createdRoomUrl)}><Copy className="h-4 w-4" />Copy room link</Button>
                <Button asChild className="gap-1.5"><Link href={roomPath(createdRoomUrl)}><Video className="h-4 w-4" />Enter room</Link></Button>
              </div>
              {copyMessage && <p className="text-xs text-muted-foreground" role="status">{copyMessage}</p>}
            </div>
          ) : (
            <form onSubmit={submitScheduledMeeting} className="space-y-4">
              {createError && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{createError}</p>}
              <label className="block space-y-1.5"><span className="text-xs font-medium">Meeting title</span><input name="title" required minLength={2} maxLength={100} placeholder="Project check-in" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5"><span className="text-xs font-medium">Date ({hostTimeZone})</span><input type="date" name="date" required min={getLocalDateString(new Date(), hostTimeZone)} defaultValue={getLocalDateString(new Date(), hostTimeZone)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
                <label className="block space-y-1.5"><span className="text-xs font-medium">Start time</span><input type="time" name="time" required defaultValue="09:00" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
              </div>
              <label className="block space-y-1.5"><span className="text-xs font-medium">Duration</span><select name="durationMinutes" defaultValue="30" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">2 hours</option></select></label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5"><span className="text-xs font-medium">Invitee name (optional)</span><input name="attendeeName" maxLength={120} placeholder="Name" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
                <label className="block space-y-1.5"><span className="text-xs font-medium">Invitee email (optional)</span><input name="attendeeEmail" type="email" maxLength={254} placeholder="name@example.com" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
              </div>
              <p className="text-xs text-muted-foreground">A room link will be created. Share it with invitees; email invitations are not sent automatically.</p>
              <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create meeting</Button></div>
            </form>
          )}
          {copyMessage && !createdRoomUrl && <p className="text-xs text-muted-foreground" role="status">{copyMessage}</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
