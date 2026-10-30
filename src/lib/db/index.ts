import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import {
  User,
  Session,
  MagicLinkToken,
  EventType,
  Availability,
  Booking,
  Meeting,
  MeetingSource,
  AuditLog,
  BookingChangeRequest,
} from "./types";
import { getBookingConflictRange, hasScheduledMeetingConflict } from "../scheduling/conflicts";
import { getDueBookingReminderOffsets } from "../scheduling/reminders";

interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  magicLinkTokens: MagicLinkToken[];
  eventTypes: EventType[];
  availabilities: Availability[];
  bookings: Booking[];
  bookingChangeRequests: BookingChangeRequest[];
  meetings: Meeting[];
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
          magicLinkTokens: (parsed.magicLinkTokens || []).map((t: any) => ({
            ...t,
            expires: new Date(t.expires),
            consumedAt: t.consumedAt ? new Date(t.consumedAt) : null,
            createdAt: new Date(t.createdAt),
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
            lastLeftAt: b.lastLeftAt ? new Date(b.lastLeftAt) : null,
            completedAt: b.completedAt ? new Date(b.completedAt) : null,
            managementTokenExpiresAt: b.managementTokenExpiresAt ? new Date(b.managementTokenExpiresAt) : null,
            confirmationEmailSentAt: b.confirmationEmailSentAt ? new Date(b.confirmationEmailSentAt) : null,
            reminder15SentAt: b.reminder15SentAt ? new Date(b.reminder15SentAt) : null,
            reminder5SentAt: b.reminder5SentAt ? new Date(b.reminder5SentAt) : null,
            createdAt: new Date(b.createdAt),
            updatedAt: new Date(b.updatedAt),
          })),
          bookingChangeRequests: (parsed.bookingChangeRequests || []).map((r: any) => ({
            ...r,
            requestedStartTime: r.requestedStartTime ? new Date(r.requestedStartTime) : null,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : null,
          })),
          meetings: (parsed.meetings || []).map((m: any) => ({
            ...m,
            startTime: new Date(m.startTime),
            endTime: new Date(m.endTime),
            lastLeftAt: m.lastLeftAt ? new Date(m.lastLeftAt) : null,
            completedAt: m.completedAt ? new Date(m.completedAt) : null,
            createdAt: new Date(m.createdAt),
            updatedAt: new Date(m.updatedAt),
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
      magicLinkTokens: [],
      eventTypes: [],
      availabilities: [],
      bookings: [],
      bookingChangeRequests: [],
      meetings: [],
      auditLogs: [],
    };
  }

  private persist() {
    let tempFile: string | null = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      tempFile = `${DB_FILE}.${process.pid}.${randomUUID()}.tmp`;
      const fd = fs.openSync(tempFile, "w", 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify(this.data, null, 2), "utf-8");
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      if (tempFile) {
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // The temporary file may not have been created or may already be renamed.
        }
      }
      console.error("[DatabaseStore] Error persisting database file:", err);
      throw new Error("The application data could not be saved. Please retry.");
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

  // --- One-time email authentication tokens ---
  async createMagicLinkToken(userId: string, tokenHash: string, expires: Date): Promise<MagicLinkToken | null> {
    return globalLock.acquire(async () => {
      const now = new Date();
      this.data.magicLinkTokens = this.data.magicLinkTokens.filter(
        (token) => token.expires.getTime() > now.getTime() - 24 * 60 * 60 * 1000
      );
      const recentRequests = this.data.magicLinkTokens.filter(
        (token) => token.userId === userId && token.createdAt.getTime() > now.getTime() - 15 * 60 * 1000
      );
      if (recentRequests.length >= 3) return null;
      const token: MagicLinkToken = {
        id: `mlt_${randomUUID()}`,
        tokenHash,
        userId,
        expires,
        consumedAt: null,
        createdAt: now,
      };
      this.data.magicLinkTokens.push(token);
      this.persist();
      return token;
    });
  }

  async hasRecentMagicLinkToken(userId: string, since: Date): Promise<boolean> {
    return this.data.magicLinkTokens.some(
      (token) => token.userId === userId && token.createdAt.getTime() >= since.getTime()
    );
  }

  async consumeMagicLinkToken(tokenHash: string): Promise<User | null> {
    return globalLock.acquire(async () => {
      const now = new Date();
      const token = this.data.magicLinkTokens.find(
        (item) => item.tokenHash === tokenHash && !item.consumedAt && item.expires.getTime() > now.getTime()
      );
      if (!token) return null;
      const user = this.data.users.find((item) => item.id === token.userId);
      if (!user) return null;
      token.consumedAt = now;
      user.emailVerified = user.emailVerified || now;
      user.updatedAt = now;
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

  async createEventType(params: {
    hostId: string;
    title: string;
    slug?: string;
    description?: string | null;
    durationMinutes: number;
    bufferBeforeMin?: number;
    bufferAfterMin?: number;
  }): Promise<EventType> {
    return globalLock.acquire(async () => {
      const now = new Date();
      let slug = (params.slug || params.title)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!slug) slug = `${params.durationMinutes}min`;

      let uniqueSlug = slug;
      let counter = 1;
      while (
        this.data.eventTypes.some(
          (e) => e.hostId === params.hostId && e.slug.toLowerCase() === uniqueSlug.toLowerCase() && e.isActive
        )
      ) {
        uniqueSlug = `${slug}-${counter++}`;
      }

      const eventType: EventType = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        slug: uniqueSlug,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        durationMinutes: params.durationMinutes,
        bufferBeforeMin: params.bufferBeforeMin || 0,
        bufferAfterMin: params.bufferAfterMin ?? 10,
        isActive: true,
        hostId: params.hostId,
        createdAt: now,
        updatedAt: now,
      };
      this.data.eventTypes.push(eventType);
      this.persist();
      return eventType;
    });
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

  async getBookingByManagementTokenHash(tokenHash: string): Promise<Booking | null> {
    const now = Date.now();
    const booking = this.data.bookings.find((item) =>
      item.managementTokenHash === tokenHash &&
      item.managementTokenExpiresAt &&
      item.managementTokenExpiresAt.getTime() > now
    );
    return booking || null;
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

  async getMeetingsByHostId(hostId: string): Promise<Meeting[]> {
    return this.data.meetings
      .filter((meeting) => meeting.hostId === hostId)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getMeetingByUid(uid: string): Promise<Meeting | null> {
    return this.data.meetings.find((meeting) => meeting.uid === uid) || null;
  }

  async findMeetingById(id: string): Promise<Meeting | null> {
    return this.data.meetings.find((meeting) => meeting.id === id) || null;
  }

  async createBookingWithConflictLock(params: {
    eventTypeId: string;
    hostId: string;
    meetingTitle?: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeeNotes: string | null;
    startTime: Date;
    endTime: Date;
    bufferBeforeMin?: number;
    bufferAfterMin?: number;
    managementTokenHash?: string;
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

      const requestedStartMs = newStartMs - Math.max(0, params.bufferBeforeMin || 0) * 60_000;
      const requestedEndMs = newEndMs + Math.max(0, params.bufferAfterMin || 0) * 60_000;
      const eventTypesById = new Map(this.data.eventTypes.map((eventType) => [eventType.id, eventType]));
      const conflictingBooking = this.data.bookings.some((booking) => {
        if (booking.hostId !== params.hostId) return false;
        const range = getBookingConflictRange(booking, eventTypesById);
        return range !== null && range.startMs < requestedEndMs && range.endMs > requestedStartMs;
      });
      const conflictingMeeting = this.data.meetings.find(
        (meeting) =>
          meeting.hostId === params.hostId &&
          meeting.source === "MANUAL" &&
          meeting.status !== "CANCELLED" &&
          meeting.status !== "COMPLETED" &&
          meeting.startTime.getTime() < requestedEndMs &&
          meeting.endTime.getTime() > requestedStartMs
      );

      if (conflictingBooking || conflictingMeeting) {
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
        managementTokenHash: params.managementTokenHash || null,
        managementTokenExpiresAt: params.managementTokenHash ? new Date(now.getTime() + 180 * 24 * 60 * 60_000) : null,
        confirmationEmailSentAt: null,
        confirmationEmailError: null,
        reminder15SentAt: null,
        reminder5SentAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const linkedMeeting: Meeting = {
        id: `meet_${randomUUID()}`,
        uid: booking.uid,
        hostId: params.hostId,
        title: params.meetingTitle || "Booked meeting",
        source: "BOOKING",
        bookingId: booking.id,
        attendeeName: booking.attendeeName,
        attendeeEmail: booking.attendeeEmail,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: "SCHEDULED",
        createdAt: now,
        updatedAt: now,
      };
      this.data.bookings.push(booking);
      this.data.meetings.push(linkedMeeting);
      try {
        this.persist();
      } catch (error) {
        this.data.bookings = this.data.bookings.filter((item) => item.id !== booking.id);
        this.data.meetings = this.data.meetings.filter((item) => item.id !== linkedMeeting.id);
        throw error;
      }

      return { success: true, booking };
    });
  }

  async createBookingChangeRequest(params: {
    tokenHash: string;
    type: "CANCEL" | "RESCHEDULE";
    reason: string;
    requestedStartTime?: Date | null;
  }): Promise<BookingChangeRequest> {
    return globalLock.acquire(async () => {
      const now = new Date();
      const booking = this.data.bookings.find((item) =>
        item.managementTokenHash === params.tokenHash &&
        item.managementTokenExpiresAt &&
        item.managementTokenExpiresAt.getTime() > now.getTime()
      );
      if (!booking || booking.status !== "CONFIRMED" || booking.startTime.getTime() <= now.getTime()) {
        throw new Error("This booking management link is invalid, expired, or no longer active.");
      }
      if (params.type === "RESCHEDULE" && (!params.requestedStartTime || params.requestedStartTime.getTime() <= now.getTime())) {
        throw new Error("Choose a future date and time for the reschedule request.");
      }
      const existing = this.data.bookingChangeRequests.find((item) =>
        item.bookingId === booking.id && item.status === "PENDING"
      );
      if (existing) throw new Error("A change request is already awaiting host approval.");
      const request: BookingChangeRequest = {
        id: `bcr_${randomUUID()}`,
        bookingId: booking.id,
        hostId: booking.hostId,
        type: params.type,
        reason: params.reason.trim(),
        requestedStartTime: params.type === "RESCHEDULE" ? params.requestedStartTime! : null,
        status: "PENDING",
        hostResponse: null,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
      };
      this.data.bookingChangeRequests.push(request);
      try { this.persist(); } catch (error) {
        this.data.bookingChangeRequests = this.data.bookingChangeRequests.filter((item) => item.id !== request.id);
        throw error;
      }
      return request;
    });
  }

  async getBookingChangeRequestById(requestId: string, hostId: string): Promise<BookingChangeRequest | null> {
    return this.data.bookingChangeRequests.find((item) => item.id === requestId && item.hostId === hostId) || null;
  }

  async getBookingChangeRequestsByHostId(hostId: string): Promise<BookingChangeRequest[]> {
    return this.data.bookingChangeRequests
      .filter((item) => item.hostId === hostId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async resolveBookingChangeRequest(params: {
    requestId: string;
    hostId: string;
    decision: "APPROVE" | "REJECT";
    hostResponse?: string;
  }): Promise<BookingChangeRequest> {
    return globalLock.acquire(async () => {
      const request = this.data.bookingChangeRequests.find((item) =>
        item.id === params.requestId && item.hostId === params.hostId
      );
      if (!request) throw new Error("Change request not found.");
      if (request.status !== "PENDING") throw new Error("This request has already been reviewed.");
      const booking = this.data.bookings.find((item) => item.id === request.bookingId && item.hostId === params.hostId);
      if (!booking || booking.status !== "CONFIRMED") throw new Error("The original booking is no longer active.");
      const now = new Date();
      const bookingSnapshot = { ...booking };
      const requestSnapshot = { ...request };
      const linkedMeeting = this.data.meetings.find((item) => item.bookingId === booking.id);
      const meetingSnapshot = linkedMeeting ? { ...linkedMeeting } : null;
      if (params.decision === "APPROVE") {
        if (request.type === "CANCEL") {
          booking.status = "CANCELLED";
          if (linkedMeeting) {
            linkedMeeting.status = "CANCELLED";
            linkedMeeting.updatedAt = now;
          }
        } else {
          const nextStart = request.requestedStartTime;
          if (!nextStart || nextStart.getTime() <= now.getTime()) throw new Error("The requested time is no longer in the future.");
          const duration = booking.endTime.getTime() - booking.startTime.getTime();
          const nextEnd = new Date(nextStart.getTime() + duration);
          const eventType = this.data.eventTypes.find((item) => item.id === booking.eventTypeId);
          const beforeMs = Math.max(0, eventType?.bufferBeforeMin || 0) * 60_000;
          const afterMs = Math.max(0, eventType?.bufferAfterMin || 0) * 60_000;
          const rangeStart = nextStart.getTime() - beforeMs;
          const rangeEnd = nextEnd.getTime() + afterMs;
          const eventTypesById = new Map(this.data.eventTypes.map((item) => [item.id, item]));
          const bookingConflict = this.data.bookings.some((item) => {
            if (item.id === booking.id || item.hostId !== booking.hostId) return false;
            const range = getBookingConflictRange(item, eventTypesById);
            return range !== null && range.startMs < rangeEnd && range.endMs > rangeStart;
          });
          const meetingConflict = this.data.meetings.some((item) =>
            item.hostId === booking.hostId && item.source === "MANUAL" &&
            item.status !== "CANCELLED" && item.status !== "COMPLETED" &&
            item.startTime.getTime() < rangeEnd && item.endTime.getTime() > rangeStart
          );
          if (bookingConflict || meetingConflict) throw new Error("That requested time conflicts with another booking or meeting.");
          booking.startTime = nextStart;
          booking.endTime = nextEnd;
          if (linkedMeeting) {
            linkedMeeting.startTime = nextStart;
            linkedMeeting.endTime = nextEnd;
            linkedMeeting.updatedAt = now;
          }
          booking.reminder15SentAt = null;
          booking.reminder5SentAt = null;
        }
        booking.updatedAt = now;
      }
      request.status = params.decision === "APPROVE" ? "APPROVED" : "REJECTED";
      request.hostResponse = params.hostResponse?.trim() || null;
      request.updatedAt = now;
      request.resolvedAt = now;
      try {
        this.persist();
      } catch (error) {
        Object.assign(booking, bookingSnapshot);
        Object.assign(request, requestSnapshot);
        if (linkedMeeting && meetingSnapshot) Object.assign(linkedMeeting, meetingSnapshot);
        throw error;
      }
      return request;
    });
  }

  async updateBookingManagementToken(bookingId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    return globalLock.acquire(async () => {
      const booking = this.data.bookings.find((item) => item.id === bookingId);
      if (!booking) throw new Error("Booking not found.");
      booking.managementTokenHash = tokenHash;
      booking.managementTokenExpiresAt = expiresAt;
      booking.updatedAt = new Date();
      this.persist();
    });
  }

  async updateBookingConfirmationEmail(bookingId: string, sent: boolean, errorMessage?: string | null): Promise<void> {
    return globalLock.acquire(async () => {
      const booking = this.data.bookings.find((item) => item.id === bookingId);
      if (!booking) return;
      booking.confirmationEmailSentAt = sent ? new Date() : null;
      booking.confirmationEmailError = sent ? null : (errorMessage || "Email delivery failed.");
      booking.updatedAt = new Date();
      this.persist();
    });
  }

  async getBookingsDueForReminders(now = new Date()): Promise<Array<{ booking: Booking; reminder: 15 | 5 }>> {
    const due: Array<{ booking: Booking; reminder: 15 | 5 }> = [];
    for (const booking of this.data.bookings) {
      if (booking.status !== "CONFIRMED") continue;
      const reminders = getDueBookingReminderOffsets(booking.startTime, now, {
        fifteenMinute: Boolean(booking.reminder15SentAt),
        fiveMinute: Boolean(booking.reminder5SentAt),
      });
      for (const reminder of reminders) due.push({ booking, reminder });
    }
    return due;
  }

  async markBookingReminderSent(bookingId: string, reminder: 15 | 5): Promise<void> {
    return globalLock.acquire(async () => {
      const booking = this.data.bookings.find((item) => item.id === bookingId);
      if (!booking) return;
      if (reminder === 15) booking.reminder15SentAt = new Date();
      else booking.reminder5SentAt = new Date();
      booking.updatedAt = new Date();
      this.persist();
    });
  }

  async cancelBooking(bookingId: string, hostId: string): Promise<Booking> {
    return globalLock.acquire(async () => {
      const booking = this.data.bookings.find((b) => b.id === bookingId && b.hostId === hostId);
      if (!booking) {
        throw new Error("Booking not found or you are not authorized to cancel it.");
      }
      const oldStatus = booking.status;
      const oldUpdatedAt = booking.updatedAt;
      const linkedMeeting = this.data.meetings.find((meeting) => meeting.bookingId === booking.id);
      const oldMeetingStatus = linkedMeeting?.status;
      const oldMeetingUpdatedAt = linkedMeeting?.updatedAt;
      booking.status = "CANCELLED";
      booking.updatedAt = new Date();
      if (linkedMeeting) {
        linkedMeeting.status = "CANCELLED";
        linkedMeeting.updatedAt = booking.updatedAt;
      }
      try {
        this.persist();
      } catch (error) {
        booking.status = oldStatus;
        booking.updatedAt = oldUpdatedAt;
        if (linkedMeeting && oldMeetingStatus && oldMeetingUpdatedAt) {
          linkedMeeting.status = oldMeetingStatus;
          linkedMeeting.updatedAt = oldMeetingUpdatedAt;
        }
        throw error;
      }
      return booking;
    });
  }

  async createMeetingWithConflictLock(params: {
    hostId: string;
    title: string;
    source: Exclude<MeetingSource, "BOOKING">;
    startTime: Date;
    endTime: Date;
    attendeeName?: string | null;
    attendeeEmail?: string | null;
  }): Promise<{ success: true; meeting: Meeting } | { success: false; error: string }> {
    return globalLock.acquire(async () => {
      const now = new Date();
      const startMs = params.startTime.getTime();
      const endMs = params.endTime.getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return { success: false, error: "The meeting time range is invalid." };
      }
      if (params.source === "MANUAL" && startMs <= now.getTime()) {
        return { success: false, error: "A scheduled meeting must start in the future." };
      }

      if (params.source === "INSTANT") {
        for (const meeting of this.data.meetings) {
          if (
            meeting.hostId === params.hostId &&
            meeting.source === "INSTANT" &&
            meeting.status === "SCHEDULED"
          ) {
            meeting.status = "COMPLETED";
            meeting.updatedAt = now;
          }
        }
      } else {
        const eventTypesById = new Map(this.data.eventTypes.map((eventType) => [eventType.id, eventType]));
        const bookingConflict = this.data.bookings.some((booking) => {
          if (booking.hostId !== params.hostId) return false;
          const range = getBookingConflictRange(booking, eventTypesById);
          return range !== null && range.startMs < endMs && range.endMs > startMs;
        });
        const meetingConflict = hasScheduledMeetingConflict(
          this.data.meetings,
          params.hostId,
          startMs,
          endMs
        );
        if (bookingConflict || meetingConflict) {
          return { success: false, error: "MEETING_CONFLICT: This time overlaps another booking or meeting." };
        }
      }

      const meeting: Meeting = {
        id: `meet_${randomUUID()}`,
        uid: `meet-${randomUUID()}`,
        hostId: params.hostId,
        title: params.title.trim(),
        source: params.source,
        bookingId: null,
        attendeeName: params.attendeeName?.trim() || null,
        attendeeEmail: params.attendeeEmail?.trim().toLowerCase() || null,
        startTime: params.startTime,
        endTime: params.endTime,
        status: "SCHEDULED",
        createdAt: now,
        updatedAt: now,
      };
      this.data.meetings.push(meeting);
      try {
        this.persist();
      } catch (error) {
        this.data.meetings = this.data.meetings.filter((item) => item.id !== meeting.id);
        throw error;
      }
      return { success: true, meeting };
    });
  }

  async cancelMeeting(meetingId: string, hostId: string): Promise<Meeting> {
    return globalLock.acquire(async () => {
      const meeting = this.data.meetings.find(
        (item) => item.id === meetingId && item.hostId === hostId && item.source !== "BOOKING"
      );
      if (!meeting) throw new Error("Meeting not found or you are not authorized to cancel it.");
      const oldStatus = meeting.status;
      const oldUpdatedAt = meeting.updatedAt;
      meeting.status = "CANCELLED";
      meeting.updatedAt = new Date();
      try {
        this.persist();
      } catch (error) {
        meeting.status = oldStatus;
        meeting.updatedAt = oldUpdatedAt;
        throw error;
      }
      return meeting;
    });
  }

  // --- Room Expiration & Lifecycle (15-minute leave expiry) ---
  async recordRoomParticipantLeave(roomUid: string): Promise<boolean> {
    return globalLock.acquire(async () => {
      let modified = false;
      const now = new Date();

      const booking = this.data.bookings.find((b) => b.uid === roomUid);
      if (booking && booking.status !== "CANCELLED" && booking.status !== "COMPLETED") {
        booking.lastLeftAt = now;
        booking.updatedAt = now;
        modified = true;
      }

      const meeting = this.data.meetings.find((m) => m.uid === roomUid);
      if (meeting && meeting.status !== "CANCELLED" && meeting.status !== "COMPLETED") {
        meeting.lastLeftAt = now;
        meeting.updatedAt = now;
        modified = true;
      }

      if (modified) {
        this.persist();
      }
      return modified;
    });
  }

  async recordRoomParticipantJoin(roomUid: string): Promise<boolean> {
    return globalLock.acquire(async () => {
      let modified = false;
      const now = new Date();

      const booking = this.data.bookings.find((b) => b.uid === roomUid);
      if (booking && booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && booking.lastLeftAt) {
        booking.lastLeftAt = null;
        booking.updatedAt = now;
        modified = true;
      }

      const meeting = this.data.meetings.find((m) => m.uid === roomUid);
      if (meeting && meeting.status !== "CANCELLED" && meeting.status !== "COMPLETED" && meeting.lastLeftAt) {
        meeting.lastLeftAt = null;
        meeting.updatedAt = now;
        modified = true;
      }

      if (modified) {
        this.persist();
      }
      return modified;
    });
  }

  async isRoomExpired(roomUid: string): Promise<{ expired: boolean; reason?: string }> {
    const booking = this.data.bookings.find((b) => b.uid === roomUid);
    const meeting = this.data.meetings.find((m) => m.uid === roomUid);

    if (!booking && !meeting) {
      return { expired: true, reason: "Room not found." };
    }

    if (booking?.status === "CANCELLED" || meeting?.status === "CANCELLED") {
      return { expired: true, reason: "This meeting has been cancelled." };
    }

    if (booking?.status === "COMPLETED" || meeting?.status === "COMPLETED") {
      return { expired: true, reason: "Cette réunion est terminée et le lien d'accès a expiré." };
    }

    const lastLeft = meeting?.lastLeftAt || booking?.lastLeftAt;
    if (lastLeft) {
      const elapsedMs = Date.now() - new Date(lastLeft).getTime();
      const expirationThresholdMs = 15 * 60 * 1000; // 15 minutes
      if (elapsedMs > expirationThresholdMs) {
        return globalLock.acquire(async () => {
          const now = new Date();
          if (booking && booking.status !== "COMPLETED") {
            booking.status = "COMPLETED";
            booking.completedAt = now;
            booking.updatedAt = now;
          }
          if (meeting && meeting.status !== "COMPLETED") {
            meeting.status = "COMPLETED";
            meeting.completedAt = now;
            meeting.updatedAt = now;
          }
          this.persist();
          return {
            expired: true,
            reason: "Ce lien de réunion a expiré car aucun participant n'est revenu dans les 15 minutes suivant la sortie.",
          };
        });
      }
    }

    return { expired: false };
  }
}

// Global singleton instance
export const db = new DatabaseStore();
