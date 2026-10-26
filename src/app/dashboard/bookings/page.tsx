"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Clock, User, Mail, AlertTriangle, CheckCircle, XCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingItem {
  id: string;
  uid: string;
  eventTypeId: string;
  hostId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeNotes: string | null;
  startTime: string;
  endTime: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
}

export default function HostBookingsPage() {
  const [bookings, setBookings] = React.useState<BookingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"ALL" | "CONFIRMED" | "CANCELLED">("CONFIRMED");

  const loadBookings = async () => {
    try {
      const res = await fetch("/api/schedule/bookings");
      if (!res.ok) throw new Error("Failed to load bookings");
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadBookings();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking? The slot will immediately become available again.")) {
      return;
    }

    setCancellingId(bookingId);
    try {
      const res = await fetch("/api/schedule/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action: "CANCEL" }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to cancel booking");
        return;
      }

      await loadBookings();
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === "ALL") return true;
    return b.status === filter;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">
          Loading scheduled bookings...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Scheduled Bookings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review attendees, meeting times, and manage active booking reservations.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="inline-flex rounded-lg border border-border bg-card p-1 text-xs">
          {(["CONFIRMED", "CANCELLED", "ALL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "CONFIRMED" ? "Active" : tab === "CANCELLED" ? "Cancelled" : "All"}
            </button>
          ))}
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-base font-semibold text-foreground">No bookings found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {filter === "CONFIRMED"
              ? "You currently have no active upcoming meetings scheduled. Share your public booking link to receive reservations."
              : "No bookings match this filter criterion."}
          </p>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                View Event Links <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const start = new Date(b.startTime);
            const end = new Date(b.endTime);
            const isConfirmed = b.status === "CONFIRMED";

            return (
              <div
                key={b.id}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
                id={`booking-row-${b.id}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                        isConfirmed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {isConfirmed ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {b.status}
                    </span>

                    <span className="text-xs font-mono text-muted-foreground">
                      UID: {b.uid}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {b.attendeeName}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({b.attendeeEmail})
                      </span>
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{start.toDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {b.attendeeNotes && (
                    <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground max-w-xl">
                      <span className="font-semibold text-foreground">Attendee Notes: </span>
                      {b.attendeeNotes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link href={`/book/confirmation/${b.uid}`} target="_blank">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      View Confirmation <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </Link>

                  {isConfirmed && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={cancellingId === b.id}
                      onClick={() => handleCancelBooking(b.id)}
                      className="text-xs"
                      id={`cancel-btn-${b.id}`}
                    >
                      {cancellingId === b.id ? "Cancelling..." : "Cancel Meeting"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
