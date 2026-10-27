export interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      calendar: "iso8601",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    getFormatter(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const fields: Record<string, number> = {};
  for (const part of getFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") fields[part.type] = Number(part.value);
  }
  return {
    year: fields.year,
    month: fields.month,
    day: fields.day,
    hour: fields.hour,
    minute: fields.minute,
    second: fields.second,
  };
}

export function getLocalDateString(date: Date, timeZone: string): string {
  const parts = getZonedDateParts(date, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function getWeekdayForLocalDate(dateString: string): number | null {
  const parsed = parseDate(dateString);
  return parsed ? new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay() : null;
}

function parseDate(dateString: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function parseTime(timeString: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeString);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function hasSameLocalMinute(parts: ZonedDateParts, target: ZonedDateParts): boolean {
  return (
    parts.year === target.year &&
    parts.month === target.month &&
    parts.day === target.day &&
    parts.hour === target.hour &&
    parts.minute === target.minute
  );
}

/**
 * Converts a wall-clock date/time in an IANA time zone to a UTC instant.
 * Returns null for invalid input and for nonexistent local times during a DST gap.
 * If the wall-clock time occurs twice during a DST fold, the earlier instant is chosen.
 */
export function localDateTimeToUtc(
  dateString: string,
  timeString: string,
  timeZone: string
): Date | null {
  const date = parseDate(dateString);
  const time = parseTime(timeString);
  if (!date || !time || !isValidTimeZone(timeZone)) return null;

  const target: ZonedDateParts = {
    ...date,
    ...time,
    second: 0,
  };
  const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute);
  let guess = targetAsUtc;

  // Offset correction converges for standard IANA offsets and across ordinary date boundaries.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const observed = getZonedDateParts(new Date(guess), timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second
    );
    const correction = targetAsUtc - observedAsUtc;
    guess += correction;
    if (correction === 0) break;
  }

  // A fall-back fold can yield two valid instants. Check nearby offsets and choose the earlier one.
  const candidates = [-120, -90, -60, -30, 0, 30, 60, 90, 120]
    .map((offsetMinutes) => guess + offsetMinutes * 60_000)
    .filter((candidate) => hasSameLocalMinute(getZonedDateParts(new Date(candidate), timeZone), target))
    .sort((a, b) => a - b);

  return candidates.length ? new Date(candidates[0]) : null;
}
