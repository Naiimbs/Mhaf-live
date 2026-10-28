import { test, expect } from "@playwright/test";
import { jwtVerify } from "jose";

test.describe("LiveKit rooms and meeting lifecycle", () => {
  let activeInstantUid: string;
  let bookingUid: string;
  let futureMeetingUid: string;
  let testHostId: string;
  let testHostEmail: string;
  const testHostPassword = process.env.E2E_NEW_HOST_PASSWORD || "Password123!";
  let hostCookie = "";

  test.beforeAll(async ({ request }) => {
    const hostEmail = `doctor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@test.live`;
    const register = await request.post("/api/auth/register", {
      data: { name: "Dr. Jordan Hayes", email: hostEmail, password: testHostPassword, timezone: "UTC" },
    });
    expect(register.status()).toBe(201);
    const registerData = await register.json();
    testHostId = registerData.user.id;
    testHostEmail = hostEmail;

    const login = await request.post("/api/auth/login", { data: { email: testHostEmail, password: testHostPassword } });
    expect(login.status()).toBe(200);
    hostCookie = login.headers()["set-cookie"] || "";
    expect(hostCookie).toContain("mhaf_session=");

    let openSlot: { startTimeUtc: string; endTimeUtc: string; eventTypeId: string } | null = null;
    const baseDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    for (let index = 0; index < 45 && !openSlot; index++) {
      const candidate = new Date(baseDate);
      candidate.setUTCDate(candidate.getUTCDate() + index);
      const weekday = candidate.getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
      const date = candidate.toISOString().slice(0, 10);
      const slotsResponse = await request.get(`/api/schedule/slots?hostId=${testHostId}&eventSlug=30min&date=${date}&timezone=UTC`);
      if (slotsResponse.ok()) {
        const slotsBody = await slotsResponse.json();
        const available = slotsBody.slots?.find((slot: { available: boolean }) => slot.available);
        if (available) openSlot = { ...available, eventTypeId: slotsBody.eventType.id };
      }
    }
    expect(openSlot).not.toBeNull();

    const bookingResponse = await request.post("/api/schedule/book", {
      data: {
        hostId: testHostId,
        eventTypeId: openSlot!.eventTypeId,
        attendeeName: "Dr. Eleanor Vance",
        attendeeEmail: "eleanor.vance@hillhouse.org",
        attendeeNotes: "Room flow verification.",
        startTimeUtc: openSlot!.startTimeUtc,
        endTimeUtc: openSlot!.endTimeUtc,
      },
    });
    expect(bookingResponse.status()).toBe(201);
    bookingUid = (await bookingResponse.json()).booking.uid;

    const now = new Date();
    const futureStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const futureMeeting = await request.post("/api/meetings", {
      headers: { Cookie: hostCookie },
      data: {
        title: "Future room access test",
        date: futureStart.toISOString().slice(0, 10),
        time: "12:00",
        durationMinutes: 30,
        attendeeName: "Future Attendee",
        attendeeEmail: "future@mhaf.live",
      },
    });
    expect(futureMeeting.status()).toBe(201);
    futureMeetingUid = (await futureMeeting.json()).meeting.uid;

    const instantResponse = await request.post("/api/rooms/instant", {
      headers: { Cookie: hostCookie },
      data: { title: "LiveKit test room" },
    });
    expect(instantResponse.status()).toBe(201);
    activeInstantUid = (await instantResponse.json()).meeting.uid;
  });

  test("rejects a token request without room identifier", async ({ request }) => {
    const response = await request.get("/api/connection-details");
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toMatch(/Room UID is required/i);
  });

  test("rejects an unknown room without creating one implicitly", async ({ request }) => {
    const response = await request.get("/api/connection-details?room=mhaf-unknown-room");
    expect(response.status()).toBe(404);
    expect((await response.json()).error).toMatch(/not found/i);
  });

  test("scheduled meeting access cannot be opened early by client parameters", async ({ request }) => {
    const response = await request.get(`/api/connection-details?room=${futureMeetingUid}&enforceTime=false`);
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/not open yet/i);
    expect(body.joinableAt).toBeTruthy();

    const postResponse = await request.post("/api/connection-details", {
      data: { room: futureMeetingUid, enforceTime: false },
    });
    expect(postResponse.status()).toBe(403);
    expect((await postResponse.json()).error).toMatch(/not open yet/i);
  });

  test("mints a guest token for a saved instant room without returning server credentials", async ({ request }) => {
    const response = await request.get(`/api/connection-details?room=${activeInstantUid}&name=Eleanor%20Vance`, { headers: { Cookie: "" } });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.serverUrl).toBeTruthy();
    expect(data.participantToken).toBeTruthy();
    expect(data.roomName).toBe(activeInstantUid);
    expect(data.isHost).toBe(false);
    expect(data.participantName).toBe("Eleanor Vance");
    expect(data.participantIdentity).toMatch(/^attendee_/);
    expect(data).not.toHaveProperty("apiSecret");

    const secretKey = new TextEncoder().encode(process.env.LIVEKIT_API_SECRET || "secret");
    const { payload } = await jwtVerify(data.participantToken, secretKey);
    expect(payload.sub).toBe(data.participantIdentity);
    const grant = (payload as { video?: Record<string, unknown> }).video;
    expect(grant?.room).toBe(activeInstantUid);
    expect(grant?.roomJoin).toBe(true);
    expect(grant?.roomAdmin).toBe(false);
  });

  test("grants host privileges only to the authenticated owner", async ({ request }) => {
    const response = await request.get(`/api/connection-details?room=${activeInstantUid}`, { headers: { Cookie: hostCookie } });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.isHost).toBe(true);
    expect(data.participantIdentity).toBe(`host_${testHostId}`);

    const secretKey = new TextEncoder().encode(process.env.LIVEKIT_API_SECRET || "secret");
    const { payload } = await jwtVerify(data.participantToken, secretKey);
    expect((payload as { video?: Record<string, unknown> }).video?.roomAdmin).toBe(true);
  });

  test("renders invalid room without creating an implicit booking", async ({ page }) => {
    await page.goto("/rooms/mhaf-invalid-slug-999");
    await expect(page.locator("h1")).toContainText("Room Not Found");
    await expect(page.getByText(/No scheduled meeting exists/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Homepage" })).toBeVisible();
  });

  test("booking confirmation links to its associated meeting room", async ({ page }) => {
    await page.goto(`/book/confirmation/${bookingUid}`);
    await expect(page.locator("h1")).toContainText("You're Scheduled!");
    const enterButton = page.locator("#enter-room-btn");
    await expect(enterButton).toBeVisible();
    await expect(enterButton).toContainText("Enter PreJoin Room");
    await enterButton.click();
    await expect(page).toHaveURL(new RegExp(`/rooms/${bookingUid}`));
  });

  test("room UI reports its actual LiveKit connection state", async ({ page }) => {
    await page.goto(`/rooms/${activeInstantUid}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(activeInstantUid)).toBeVisible();
    await expect(page.locator("#prejoin-mic-toggle")).toBeVisible();
    await expect(page.locator("#prejoin-cam-toggle")).toBeVisible();
    await expect(page.locator("#prejoin-display-name")).toBeVisible();

    await page.locator("#prejoin-mic-toggle").click();
    await page.locator("#prejoin-cam-toggle").click();
    await page.locator("#prejoin-join-button").click();

    await expect(page.getByText("MHAF LIVE ROOM")).toBeVisible();
    await expect(page.getByText(/SESSION LIVE|CONNECTION FAILED/)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#room-mic-btn")).toBeVisible();
    await expect(page.locator("#room-cam-btn")).toBeVisible();
    await expect(page.locator("#room-leave-btn")).toBeVisible();
    await page.locator("#room-leave-btn").click();
    await expect(page.getByText("You Have Left the Meeting")).toBeVisible();
  });
});
