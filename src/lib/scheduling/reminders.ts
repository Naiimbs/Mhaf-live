export type BookingReminderOffset = 15 | 5;

export function getDueBookingReminderOffsets(
  startTime: Date,
  now: Date,
  sent: { fifteenMinute: boolean; fiveMinute: boolean },
): BookingReminderOffset[] {
  if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(now.getTime()) || startTime.getTime() <= now.getTime()) {
    return [];
  }

  const due: BookingReminderOffset[] = [];
  const windows: Array<{ offset: BookingReminderOffset; sent: boolean }> = [
    { offset: 15, sent: sent.fifteenMinute },
    { offset: 5, sent: sent.fiveMinute },
  ];

  for (const window of windows) {
    const target = startTime.getTime() - window.offset * 60_000;
    if (!window.sent && now.getTime() >= target && now.getTime() < target + 3 * 60_000) {
      due.push(window.offset);
    }
  }

  return due;
}
