import { test, expect, request as playwrightRequest } from "@playwright/test";
import { jwtVerify } from "jose";
import { registerAndVerifyHost } from "./helpers/auth";

test.describe("LiveKit rooms and meeting lifecycle", () => {
  let activeInstantUid: string;
  let bookingUid: string;
  let futureMeetingUid: string;
  let testHostId: string;
  let hostCookie = "";

  test.beforeAll(async ({ browser }) => {
    const authContext = await browser.newContext({ baseURL: "http://localhost:3000" });
    const authPage = await authContext.newPage();
    const api = await playwrightRequest.newContext({ baseURL: "http://localhost:3000" });
    try {
      const host = await registerAndVerifyHost(authPage, api, "Dr. Jordan Hayes");
      testHostId = host.userId;
      hostCookie = host.cookie;

      let openSlot: { startTimeUtc: string; endTimeUtc: string; eventTypeId: string } | null = null;
      const baseDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      for (let index = 0; index < 45 && !openSlot; index++) {
        const candidate = new Date(baseDate);
        candidate.setUTCDate(candidate.getUTCDate() + index);
        const weekday = candidate.getUTCDay();
        if (weekday === 0 || weekday === 6) continue;
        const date = candidate.toISOString().slice(0, 10);
        const slotsResponse = await api.get(`/api/schedule/slots?hostId=${testHostId}&eventSlug=30min&date=${date}&timezone=UTC`);
        if (slotsResponse.ok()) {
          const slotsBody = await slotsResponse.json();
          const available = slotsBody.slots?.find((slot: { available: boolean }) => slot.available);
          if (available) openSlot = { ...available, eventTypeId: slotsBody.eventType.id };
        }
      }
      expect(openSlot).not.toBeNull();

      const bookingResponse = await api.post("/api/schedule/book", {
        headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 254) + 1}` },
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

      const futureStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const futureMeeting = await api.post("/api/meetings", {
        headers: { Cookie: hostCookie, "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 254) + 1}` },
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

      const instantResponse = await api.post("/api/rooms/instant", {
        headers: { Cookie: hostCookie, "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 254) + 1}` },
        data: { title: "LiveKit test room" },
      });
      expect(instantResponse.status()).toBe(201);
      activeInstantUid = (await instantResponse.json()).meeting.uid;
    } finally {
      await authContext.close();
      await api.dispose();
    }
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

  test("gives guests joining the same link the same room and unique identities", async ({ request }) => {
    const [firstResponse, secondResponse] = await Promise.all([
      request.get(`/api/connection-details?room=${activeInstantUid}&name=Guest%20One`, { headers: { Cookie: "" } }),
      request.get(`/api/connection-details?room=${activeInstantUid}&name=Guest%20Two`, { headers: { Cookie: "" } }),
    ]);
    expect(firstResponse.status()).toBe(200);
    expect(secondResponse.status()).toBe(200);
    const first = await firstResponse.json();
    const second = await secondResponse.json();
    expect(first.roomName).toBe(activeInstantUid);
    expect(second.roomName).toBe(activeInstantUid);
    expect(first.participantIdentity).not.toBe(second.participantIdentity);
    expect(first.serverUrl).toBe(second.serverUrl);
  });

  test("grants host privileges only to the authenticated owner", async ({ request }) => {
    const [response, secondResponse] = await Promise.all([
      request.get(`/api/connection-details?room=${activeInstantUid}`, { headers: { Cookie: hostCookie } }),
      request.get(`/api/connection-details?room=${activeInstantUid}`, { headers: { Cookie: hostCookie } }),
    ]);
    expect(response.status()).toBe(200);
    expect(secondResponse.status()).toBe(200);
    const data = await response.json();
    const second = await secondResponse.json();
    expect(data.isHost).toBe(true);
    expect(data.participantIdentity.startsWith(`host_${testHostId}_`)).toBe(true);
    expect(second.participantIdentity).not.toBe(data.participantIdentity);
    expect(second.isHost).toBe(true);

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

    await expect(page.getByRole("button", { name: "Copy meeting invite link" })).toBeVisible();
    await expect(page.getByText(/SESSION LIVE|CONNECTION FAILED/)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#room-mic-btn")).toBeVisible();
    await expect(page.locator("#room-cam-btn")).toBeVisible();
    await expect(page.locator("#room-leave-btn")).toBeVisible();
    await page.locator("#room-leave-btn").click();
    await expect(page.getByText("You Have Left the Meeting")).toBeVisible();
  });
});
