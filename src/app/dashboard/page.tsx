import * as React from "react";
import Link from "next/link";
import { requireHostAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Calendar, Clock, ExternalLink, Users, PlusCircle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstantMeetingButton } from "@/components/dashboard/instant-meeting-button";

export default async function DashboardPage() {
  const host = await requireHostAuth();
  const eventTypes = await db.getEventTypesByHostId(host.id);
  const bookings = await db.getBookingsByHostId(host.id);
  const activeBookings = bookings.filter((b) => b.status === "CONFIRMED");

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Host Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, <strong>{host.name || host.email}</strong>. Manage your availability
            rules and shareable booking links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InstantMeetingButton />
          <Badge variant="outline" className="font-mono text-xs py-1">
            IANA Timezone: {host.timezone}
          </Badge>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/availability">Edit Working Hours</Link>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-5 pb-2">
            <CardDescription className="text-xs uppercase font-mono">
              Active Event Types
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              {eventTypes.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs text-muted-foreground">
            Configured meeting intervals
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-2">
            <CardDescription className="text-xs uppercase font-mono">
              Confirmed Bookings
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-primary">
              {activeBookings.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs text-muted-foreground">
            Scheduled across calendar
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-2">
            <CardDescription className="text-xs uppercase font-mono">
              Database Persistence
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ACID Active
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs text-muted-foreground">
            Atomic concurrency lock enabled
          </CardContent>
        </Card>
      </div>

      {/* Shareable Booking Links */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Shareable Event Types
            </h2>
            <p className="text-xs text-muted-foreground">
              Send these links to clients or attendees to let them book available slots directly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eventTypes.map((et) => {
            const bookingPath = `/book/${host.id}/${et.slug}`;
            return (
              <Card key={et.id} className="border-border hover:border-primary/50 transition-colors">
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg">
                      {et.title}
                    </CardTitle>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {et.durationMinutes} mins
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1 leading-relaxed">
                    {et.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3 font-mono">
                    <span>Buffer: {et.bufferAfterMin} min after</span>
                    <span className="text-emerald-500 font-semibold">Active & Bookable</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" asChild>
                      <Link href={bookingPath} target="_blank">
                        Preview Booking Page <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Upcoming Confirmed Bookings */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">
            Upcoming Booked Sessions
          </h2>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link href="/dashboard/bookings">View All Bookings →</Link>
          </Button>
        </div>

        {activeBookings.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto opacity-40 mb-2" />
            <p className="text-sm font-medium">No confirmed bookings yet.</p>
            <p className="text-xs opacity-75 mt-1">
              Share your booking link above to start accepting calendar reservations.
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {activeBookings.slice(0, 5).map((b) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {b.attendeeName}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({b.attendeeEmail})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(b.startTime).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: host.timezone,
                      })}
                    </span>
                    <span className="font-mono text-[11px] opacity-75">
                      UID: {b.uid}
                    </span>
                  </div>
                </div>

                <Badge variant="live" className="text-xs w-fit">
                  Confirmed
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
