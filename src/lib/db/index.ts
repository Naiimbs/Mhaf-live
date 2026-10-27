import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import {
  User,
  Session,
  EventType,
  Availability,
  Booking,
  AuditLog,
} from "./types";

interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  eventTypes: EventType[];
  availabilities: Availability[];
  bookings: Booking[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "mhaf_live_db.json");

// In-memory Mutex Lock to guarantee atomic operations under concurrent load
class AsyncLock {
  private queue: Promise<void> = Promise.resolve();

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.queue;
    this.queue = next;

    await previous;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

const globalLock = new AsyncLock();

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
    this.seedDefaultHostIfEmpty();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        // Deserialize dates
        return {
          users: (parsed.users || []).map((u: any) => ({
            ...u,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt),
          })),
          sessions: (parsed.sessions || []).map((s: any) => ({
            ...s,
            expires: new Date(s.expires),
            createdAt: new Date(s.createdAt),
          })),
          eventTypes: (parsed.eventTypes || []).map((e: any) => ({
            ...e,
            createdAt: new Date(e.createdAt),
            updatedAt: new Date(e.updatedAt),
          })),
          availabilities: (parsed.availabilities || []).map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            updatedAt: new Date(a.updatedAt),
          })),
          bookings: (parsed.bookings || []).map((b: any) => ({
            ...b,
            startTime: new Date(b.startTime),
            endTime: new Date(b.endTime),
            createdAt: new Date(b.createdAt),
            updatedAt: new Date(b.updatedAt),
          })),
          auditLogs: (parsed.auditLogs || []).map((l: any) => ({
            ...l,
            timestamp: new Date(l.timestamp),
          })),
        };
      }
    } catch (err) {
      console.error("[DatabaseStore] Failed to read database file, initializing empty:", err);
    }

    return {
      users: [],
      sessions: [],
      eventTypes: [],
      availabilities: [],
      bookings: [],
      auditLogs: [],
    };
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("[DatabaseStore] Error persisting database file:", err);
    }
  }

  private seedDefaultHostIfEmpty() {
    if (this.data.users.length === 0) {
      const isProduction = process.env.NODE_ENV === "production";
      const initialEmail = process.env.INITIAL_HOST_EMAIL?.trim();
      const initialPassword = process.env.INITIAL_HOST_PASSWORD?.trim();
      const allowDemoSeed = process.env.SEED_DEMO_HOST === "true" || !isProduction;

      const now = new Date();
      let hostId = "host_default_01";
      let hostName = "Amine L.";
      let hostEmail = "host@mhaf.live";
      let passwordHash = "";

      if (initialEmail && initialPassword) {
        // Production bootstrap with administrator-provided credentials from environment
        hostId = "host_admin_01";
        hostName = process.env.INITIAL_HOST_NAME?.trim() || "MHAF Administrator";
        hostEmail = initialEmail;
        passwordHash = bcrypt.hashSync(initialPassword, 12);
      } else if (allowDemoSeed) {
        // Local development sandbox only
        passwordHash = bcrypt.hashSync("Password123!", 10);
      } else {
        console.log(
          "[DatabaseStore] Production mode: Development demo host seeding skipped. Create your initial host account via /register."
        );
        return;
      }

      const defaultHost: User = {
        id: hostId,
        name: hostName,
        email: hostEmail,
        emailVerified: now,
        passwordHash,
        role: "HOST",
        timezone: "UTC",
        createdAt: now,
        updatedAt: now,
      };

      const defaultEventType: EventType = {
        id: "evt_30min_01",
        slug: "30min",
        title: "30 Min Architecture Sync",
        description: "Technical consultation and architecture review on MHAF Live.",
        durationMinutes: 30,
        bufferBeforeMin: 0,
        bufferAfterMin: 10,
        isActive: true,
        hostId,
        createdAt: now,
        updatedAt: now,
      };

      // Monday (1) through Friday (5) available 09:00 - 17:00
      const defaultAvailabilities: Availability[] = [1, 2, 3, 4, 5].map((day) => ({
        id: `avail_host_${day}`,
        userId: hostId,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00",
        timezone: "UTC",
        createdAt: now,
        updatedAt: now,
      }));

      this.data.users.push(defaultHost);
      this.data.eventTypes.push(defaultEventType);
      this.data.availabilities.push(...defaultAvailabilities);
      this.persist();
    }
  }

  // --- Users & Auth ---
  async findUserByEmail(email: string): Promise<User | null> {
    const user = this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  async findUserById(id: string): Promise<User | null> {
    const user = this.data.users.find((u) => u.id === id);
    return user || null;
  }

  async createUser(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    return globalLock.acquire(async () => {
      const existing = this.data.users.find(
        (u) => u.email.toLowerCase() === data.email.toLowerCase()
      );
      if (existing) {
        throw new Error("A user with this email address already exists.");
      }

      const now = new Date();
      const user: User = {
        ...data,
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };

      this.data.users.push(user);

      // Create default 30min event type for new host
      const eventType: EventType = {
        id: `evt_${Date.now()}`,
        slug: "30min",
        title: "30-Minute Meeting",
        description: "Standard 30-minute consultation window.",
        durationMinutes: 30,
        bufferBeforeMin: 0,
        bufferAfterMin: 10,
        isActive: true,
        hostId: user.id,
        createdAt: now,
        updatedAt: now,
      };
      this.data.eventTypes.push(eventType);

      // Default Mon-Fri 09:00-17:00 availability
      for (const day of [1, 2, 3, 4, 5]) {
        this.data.availabilities.push({
          id: `avail_${user.id}_${day}`,
          userId: user.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          timezone: user.timezone,
          createdAt: now,
          updatedAt: now,
        });
      }

      this.persist();
      return user;
    });
  }

  // --- Sessions ---
  async createSession(userId: string, sessionToken: string, expires: Date): Promise<Session> {
    return globalLock.acquire(async () => {
      const session: Session = {
        id: `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sessionToken,
        userId,
        expires,
        createdAt: new Date(),
      };
      this.data.sessions.push(session);
      this.persist();
      return session;
    });
  }

  async findSessionByToken(token: string): Promise<(Session & { user: User }) | null> {
    const session = this.data.sessions.find(
      (s) => s.sessionToken === token && s.expires.getTime() > Date.now()
    );
    if (!session) return null;

    const user = this.data.users.find((u) => u.id === session.userId);
    if (!user) return null;

    return { ...session, user };
  }

  async deleteSession(token: string): Promise<void> {
    await globalLock.acquire(async () => {
      this.data.sessions = this.data.sessions.filter((s) => s.sessionToken !== token);
      this.persist();
    });
  }

  // --- Event Types ---
  async getEventTypesByHostId(hostId: string): Promise<EventType[]> {
    return this.data.eventTypes.filter((e) => e.hostId === hostId && e.isActive);
  }

  async getEventTypeBySlug(hostId: string, slug: string): Promise<EventType | null> {
    const et = this.data.eventTypes.find(
      (e) => e.hostId === hostId && e.slug.toLowerCase() === slug.toLowerCase() && e.isActive
    );
    return et || null;
  }

  async getEventTypeById(id: string): Promise<EventType | null> {
    const et = this.data.eventTypes.find((e) => e.id === id);
    return et || null;
  }

  // --- Availability ---
  async getAvailabilityByHostId(hostId: string): Promise<Availability[]> {
    return this.data.availabilities.filter((a) => a.userId === hostId);
  }

  async updateAvailability(
    hostId: string,
    availabilities: Array<{ dayOfWeek: number; startTime: string; endTime: string; timezone: string }>
  ): Promise<Availability[]> {
    return globalLock.acquire(async () => {
      // Remove existing
      this.data.availabilities = this.data.availabilities.filter((a) => a.userId !== hostId);

      const now = new Date();
      const updated: Availability[] = availabilities.map((item) => ({
        id: `avail_${hostId}_${item.dayOfWeek}_${Date.now()}`,
        userId: hostId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        timezone: item.timezone,
        createdAt: now,
        updatedAt: now,
      }));

      this.data.availabilities.push(...updated);
      this.persist();
      return updated;
    });
  }

  async updateUserTimezone(userId: string, timezone: string): Promise<User> {
    return globalLock.acquire(async () => {
      const user = this.data.users.find((u) => u.id === userId);
      if (!user) throw new Error("User not found");
      user.timezone = timezone;
      user.updatedAt = new Date();
      this.persist();
      return user;
    });
  }

  // --- Bookings & Atomic Conflict Protection ---
  async getBookingsByHostId(hostId: string): Promise<Booking[]> {
    return this.data.bookings
      .filter((b) => b.hostId === hostId)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getBookingByUid(uid: string): Promise<Booking | null> {
    const booking = this.data.bookings.find((b) => b.uid === uid);
    return booking || null;
  }

  async findBookingById(id: string): Promise<Booking | null> {
    const booking = this.data.bookings.find((b) => b.id === id);
    return booking || null;
  }

  async findEventTypeById(id: string): Promise<EventType | null> {
    const eventType = this.data.eventTypes.find((e) => e.id === id);
    return eventType || null;
  }

  async createBookingWithConflictLock(params: {
    eventTypeId: string;
    hostId: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeeNotes: string | null;
    startTime: Date;
    endTime: Date;
  }): Promise<{ success: true; booking: Booking } | { success: false; error: string }> {
    return globalLock.acquire(async () => {
      const newStartMs = params.startTime.getTime();
      const newEndMs = params.endTime.getTime();

      if (newEndMs <= newStartMs) {
        return { success: false, error: "Invalid booking duration: end time must be after start time." };
      }

      if (newStartMs < Date.now()) {
        return { success: false, error: "Cannot book a time slot in the past." };
      }

      // Authoritative conflict check against all existing confirmed bookings for this host
      // Overlap condition: (existingStart < newEnd) && (existingEnd > newStart)
      const conflictingBooking = this.data.bookings.find(
        (b) =>
          b.hostId === params.hostId &&
          b.status !== "CANCELLED" &&
          b.startTime.getTime() < newEndMs &&
          b.endTime.getTime() > newStartMs
      );

      if (conflictingBooking) {
        return {
          success: false,
          error: "BOOKING_CONFLICT: The selected time slot has already been reserved. Please select another time.",
        };
      }

      const now = new Date();
      const booking: Booking = {
        id: `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        uid: `mhaf-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        eventTypeId: params.eventTypeId,
        hostId: params.hostId,
        attendeeName: params.attendeeName,
        attendeeEmail: params.attendeeEmail,
        attendeeNotes: params.attendeeNotes,
        startTime: params.startTime,
        endTime: params.endTime,
        status: "CONFIRMED",
        createdAt: now,
        updatedAt: now,
      };

      this.data.bookings.push(booking);
      this.persist();

      return { success: true, booking };
    });
  }

  async cancelBooking(bookingId: string, hostId: string): Promise<Booking> {
    return globalLock.acquire(async () => {
      const booking = this.data.bookings.find((b) => b.id === bookingId && b.hostId === hostId);
      if (!booking) {
        throw new Error("Booking not found or you are not authorized to cancel it.");
      }
      booking.status = "CANCELLED";
      booking.updatedAt = new Date();
      this.persist();
      return booking;
    });
  }

  async createInstantRoom(params: {
    hostId: string;
    roomName?: string;
    attendeeName?: string;
    uid?: string;
  }): Promise<Booking> {
    return globalLock.acquire(async () => {
      const now = new Date();
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const booking: Booking = {
        id: `bkg_instant_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        uid: params.uid || `instant-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        eventTypeId: "evt_instant",
        hostId: params.hostId,
        attendeeName: params.attendeeName || "Guest",
        attendeeEmail: "instant@mhaf.live",
        attendeeNotes: `[instant] ${params.roomName || "Instant Meeting"}`,
        startTime: now,
        endTime,
        status: "CONFIRMED",
        createdAt: now,
        updatedAt: now,
      };

      this.data.bookings.push(booking);
      this.persist();
      return booking;
    });
  }
}

// Global singleton instance
export const db = new DatabaseStore();
