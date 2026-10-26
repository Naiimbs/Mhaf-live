"use client";

import * as React from "react";
import { Clock, Globe, Save, CheckCircle2, AlertCircle, Info, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const DAYS_OF_WEEK = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 0, name: "Sunday" },
];

const TIME_OPTIONS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00"
];

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

interface DaySchedule {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export default function AvailabilityPage() {
  const [schedule, setSchedule] = React.useState<DaySchedule[]>(
    DAYS_OF_WEEK.map((d) => ({
      dayOfWeek: d.id,
      enabled: d.id >= 1 && d.id <= 5, // Mon-Fri default enabled
      startTime: "09:00",
      endTime: "17:00",
    }))
  );
  const [timezone, setTimezone] = React.useState("UTC");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/schedule/availability");
        if (!res.ok) throw new Error("Failed to load availability configuration.");
        const data = await res.json();

        if (data.host?.timezone) {
          setTimezone(data.host.timezone);
        }

        if (Array.isArray(data.availabilities) && data.availabilities.length > 0) {
          setSchedule((prev) =>
            prev.map((item) => {
              const matched = data.availabilities.find(
                (a: any) => a.dayOfWeek === item.dayOfWeek
              );
              if (matched) {
                return {
                  dayOfWeek: item.dayOfWeek,
                  enabled: true,
                  startTime: matched.startTime,
                  endTime: matched.endTime,
                };
              } else {
                return {
                  ...item,
                  enabled: false,
                };
              }
            })
          );
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to load schedule." });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((item) =>
        item.dayOfWeek === dayOfWeek ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleTimeChange = (dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    setSchedule((prev) =>
      prev.map((item) =>
        item.dayOfWeek === dayOfWeek ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    // Validation
    const activeDays = schedule.filter((d) => d.enabled);
    for (const day of activeDays) {
      if (day.endTime <= day.startTime) {
        const dayName = DAYS_OF_WEEK.find((d) => d.id === day.dayOfWeek)?.name;
        setMessage({
          type: "error",
          text: `Invalid hours for ${dayName}: End time (${day.endTime}) must be after start time (${day.startTime}).`,
        });
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        timezone,
        availabilities: activeDays.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          timezone,
        })),
      };

      const res = await fetch("/api/schedule/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update availability schedule.");
      }

      setMessage({
        type: "success",
        text: "Weekly availability and operating timezone saved successfully.",
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">
          Loading availability configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Weekly Availability Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the recurring time windows during which attendees can book meetings with you.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 shadow-sm"
          id="save-availability-btn"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving Schedule..." : "Save Availability"}
        </Button>
      </div>

      {message && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
          role="alert"
          id="availability-feedback-alert"
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Timezone Configuration Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Operating Timezone
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              All weekly recurring hours are evaluated against this authoritative IANA timezone.
            </p>
          </div>
        </div>

        <div className="max-w-md">
          <select
            id="host-timezone-select"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {!COMMON_TIMEZONES.includes(timezone) && (
              <option value={timezone}>{timezone}</option>
            )}
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Weekly Schedule Days */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Daily Operating Hours
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Check the days you are available and select your standard working window.
          </p>
        </div>

        <div className="divide-y divide-border">
          {DAYS_OF_WEEK.map((day) => {
            const current = schedule.find((s) => s.dayOfWeek === day.id)!;
            return (
              <div
                key={day.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
              >
                {/* Day Checkbox & Label */}
                <div className="flex items-center gap-3 w-40">
                  <input
                    type="checkbox"
                    id={`day-toggle-${day.id}`}
                    checked={current.enabled}
                    onChange={() => handleToggleDay(day.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                  />
                  <label
                    htmlFor={`day-toggle-${day.id}`}
                    className={`text-sm font-semibold cursor-pointer ${
                      current.enabled ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {day.name}
                  </label>
                </div>

                {/* Hours Selectors */}
                {current.enabled ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      id={`start-time-${day.id}`}
                      value={current.startTime}
                      onChange={(e) =>
                        handleTimeChange(day.id, "startTime", e.target.value)
                      }
                      className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-ring"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>

                    <span className="text-muted-foreground text-xs font-medium">to</span>

                    <select
                      id={`end-time-${day.id}`}
                      value={current.endTime}
                      onChange={(e) =>
                        handleTimeChange(day.id, "endTime", e.target.value)
                      }
                      className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-ring"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-muted-foreground italic">
                    Unavailable
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Informational callout */}
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Authoritative Server Availability</p>
          <p className="mt-0.5">
            When an attendee views your booking link, the server computes available slots by
            intersecting these active windows with your confirmed bookings, daylight-saving time shifts,
            and existing buffer times. No conflicting slot can ever be reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
