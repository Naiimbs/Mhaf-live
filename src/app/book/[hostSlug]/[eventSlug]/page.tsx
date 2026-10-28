"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Video,
  Clock,
  Calendar,
  Globe,
  User,
  Mail,
  FileText,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocalDateString } from "@/lib/scheduling/timezone";

interface SlotItem {
  slotId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  displayTime: string;
  durationMinutes: number;
  available: boolean;
}

function addIsoDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Africa/Casablanca",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function PublicBookingPage() {
  const params = useParams();
  const router = useRouter();
  const hostSlug = params.hostSlug as string;
  const eventSlug = params.eventSlug as string;

  // Selected state
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return addIsoDays(getLocalDateString(new Date(), timezone), 1);
  });
  const userSelectedDate = React.useRef(false);
  const initializedHostDate = React.useRef(false);
  const [attendeeTimezone, setAttendeeTimezone] = React.useState("UTC");
  const [selectedSlot, setSelectedSlot] = React.useState<SlotItem | null>(null);

  // Form inputs
  const [attendeeName, setAttendeeName] = React.useState("");
  const [attendeeEmail, setAttendeeEmail] = React.useState("");
  const [attendeeNotes, setAttendeeNotes] = React.useState("");

  // Async state
  const [hostInfo, setHostInfo] = React.useState<{ id: string; name: string | null; timezone: string } | null>(null);
  const [eventType, setEventType] = React.useState<any | null>(null);
  const [slots, setSlots] = React.useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [conflictError, setConflictError] = React.useState<string | null>(null);
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // Auto-detect browser timezone
  React.useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setAttendeeTimezone(tz);
    } catch {
      // fallback to UTC
    }
  }, []);

  // Fetch slots whenever date or timezone changes
  const fetchSlots = React.useCallback(async () => {
    if (!hostSlug || !eventSlug || !selectedDate) return;

    setLoadingSlots(true);
    setConflictError(null);
    setSelectedSlot(null);

    try {
      const query = new URLSearchParams({
        hostId: hostSlug,
        eventSlug,
        date: selectedDate,
        timezone: attendeeTimezone,
      });

      const res = await fetch(`/api/schedule/slots?${query.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load slots for this date.");
      }

      setHostInfo(data.host);
      if (!initializedHostDate.current) {
        initializedHostDate.current = true;
        if (!userSelectedDate.current) {
          setSelectedDate(addIsoDays(getLocalDateString(new Date(), data.host.timezone || "UTC"), 1));
        }
      }
      setEventType(data.eventType);
      setSlots(data.slots || []);
    } catch (err: any) {
      setGeneralError(err.message || "An error occurred fetching slots.");
    } finally {
      setLoadingSlots(false);
    }
  }, [hostSlug, eventSlug, selectedDate, attendeeTimezone]);

  React.useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Handle Booking Submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !eventType || !hostInfo) return;

    setSubmitting(true);
    setConflictError(null);
    setGeneralError(null);

    try {
      const payload = {
        eventTypeId: eventType.id,
        hostId: hostInfo.id,
        startTimeUtc: selectedSlot.startTimeUtc,
        endTimeUtc: selectedSlot.endTimeUtc,
        attendeeName,
        attendeeEmail,
        attendeeNotes: attendeeNotes || null,
      };

      const res = await fetch("/api/schedule/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setConflictError(
            data.error || "This time slot was just booked by another attendee. Please select a different time slot."
          );
          // Refresh slots so conflicted slot disappears
          fetchSlots();
          return;
        }
        throw new Error(data.error || "Booking failed.");
      }

      // Success -> Redirect to confirmation
      router.push(`/book/confirmation/${data.booking.uid}`);
    } catch (err: any) {
      setGeneralError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md px-4 py-3">
        <div className="container max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Video className="h-3.5 w-3.5" />
            </div>
            <span>MHAF LIVE</span>
          </Link>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded">
            Autonomous Scheduling
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
          {/* Left Column: Host & Event Context */}
          <div className="p-6 sm:p-8 md:col-span-5 border-b md:border-b-0 md:border-r border-border bg-muted/20 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
                  Meeting Host
                </span>
                <h2 className="text-lg font-bold text-foreground">
                  {hostInfo?.name || "Host Consultation"}
                </h2>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                  {eventType?.title || "Session Consultation"}
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {eventType?.description ||
                    "Select a time slot on the calendar to schedule a high-assurance video consultation."}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2 text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{eventType?.durationMinutes || 30} minutes duration</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Host Zone: {hostInfo?.timezone || "UTC"}</span>
                </div>
              </div>
            </div>

            {/* Timezone Selector for Attendee */}
            <div className="pt-6 border-t border-border space-y-2">
              <label
                htmlFor="attendee-tz-select"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <Globe className="h-3.5 w-3.5 text-primary" />
                Your Viewing Timezone
              </label>
              <select
                id="attendee-tz-select"
                value={attendeeTimezone}
                onChange={(e) => setAttendeeTimezone(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring"
              >
                {!COMMON_TIMEZONES.includes(attendeeTimezone) && (
                  <option value={attendeeTimezone}>{attendeeTimezone}</option>
                )}
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column: Slot Picker / Booking Form */}
          <div className="p-6 sm:p-8 md:col-span-7 flex flex-col justify-between">
            {conflictError && (
              <div
                className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive"
                role="alert"
                id="booking-conflict-alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Reservation Conflict</span>
                  <p>{conflictError}</p>
                </div>
              </div>
            )}

            {generalError && (
              <div
                className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{generalError}</span>
              </div>
            )}

            {!selectedSlot ? (
              // Step 1: Pick Date & Slot
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Select a Date
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose a date in the host’s timezone; available times are shown in your selected timezone.
                  </p>

                  <div className="mt-3 max-w-xs">
                    <input
                      type="date"
                      id="booking-date-picker"
                      value={selectedDate}
                      min={getLocalDateString(new Date(), hostInfo?.timezone || "UTC")}
                      onChange={(e) => {
                        userSelectedDate.current = true;
                        setSelectedDate(e.target.value);
                      }}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground mb-3 flex items-center justify-between">
                    <span>Available Time Slots</span>
                    <span className="text-xs font-mono font-normal text-muted-foreground">
                      {slots.length} available
                    </span>
                  </h3>

                  {loadingSlots ? (
                    <div className="py-12 text-center text-xs text-muted-foreground animate-pulse font-mono">
                      Computing authoritative slot availability...
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-xs space-y-1">
                      <p className="font-semibold text-foreground">No available slots on this date.</p>
                      <p>Please select another day from the calendar above.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                      {slots.map((slot) => (
                        <button
                          key={slot.slotId}
                          type="button"
                          id={`slot-btn-${slot.slotId}`}
                          onClick={() => setSelectedSlot(slot)}
                          className="px-4 py-2.5 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 text-sm font-semibold text-foreground transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>{slot.displayTime}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Step 2: Attendee Details Form
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <span className="text-xs uppercase font-mono text-muted-foreground">
                      Selected Time
                    </span>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      {selectedSlot.displayTime} ({attendeeTimezone})
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Date: {new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: attendeeTimezone }).format(new Date(selectedSlot.startTimeUtc))}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSlot(null)}
                    className="text-xs gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Change Time
                  </Button>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="attendee-name-input"
                      className="text-xs font-semibold text-foreground uppercase tracking-wider"
                    >
                      Your Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        id="attendee-name-input"
                        type="text"
                        required
                        value={attendeeName}
                        onChange={(e) => setAttendeeName(e.target.value)}
                        placeholder="Sarah Connor"
                        className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="attendee-email-input"
                      className="text-xs font-semibold text-foreground uppercase tracking-wider"
                    >
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        id="attendee-email-input"
                        type="email"
                        required
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                        placeholder="sarah@example.com"
                        className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="attendee-notes-input"
                      className="text-xs font-semibold text-foreground uppercase tracking-wider"
                    >
                      Meeting Notes or Agenda (Optional)
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <textarea
                        id="attendee-notes-input"
                        rows={3}
                        value={attendeeNotes}
                        onChange={(e) => setAttendeeNotes(e.target.value)}
                        placeholder="Please share what you would like to discuss..."
                        className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full gap-2 mt-4"
                    id="confirm-booking-btn"
                  >
                    {submitting ? "Securing Reservation..." : "Confirm & Schedule Meeting"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
