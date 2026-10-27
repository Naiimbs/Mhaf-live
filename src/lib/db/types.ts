export type UserRole = "ADMIN" | "HOST" | "MEMBER";

export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  passwordHash: string;
  role: UserRole;
  timezone: string; // IANA timezone e.g. "UTC", "Africa/Tunis", "Europe/Paris"
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  createdAt: Date;
}

export interface EventType {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  isActive: boolean;
  hostId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Availability {
  id: string;
  userId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "HH:mm" e.g. "09:00"
  endTime: string;   // "HH:mm" e.g. "17:00"
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface Booking {
  id: string;
  uid: string;
  eventTypeId: string;
  hostId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeNotes: string | null;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type MeetingSource = "BOOKING" | "MANUAL" | "INSTANT";
export type MeetingStatus = "SCHEDULED" | "LIVE" | "CANCELLED" | "COMPLETED";

export interface Meeting {
  id: string;
  uid: string;
  hostId: string;
  title: string;
  source: MeetingSource;
  bookingId: string | null;
  attendeeName: string | null;
  attendeeEmail: string | null;
  startTime: Date;
  endTime: Date;
  status: MeetingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  targetResource: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}
