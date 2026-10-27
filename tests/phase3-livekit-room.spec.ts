import { test, expect } from "@playwright/test";
import { jwtVerify } from "jose";

test.describe("Phase 3 — LiveKit Video Rooms, PreJoin & Token Minting", () => {
  let activeBookingUid: string;
  let testHostId: string;
  let testHostEmail: string;
  let testHostPassword = "StrongPassword123!";

  test.beforeAll(async ({ request }) => {
    // 1. Create a dedicated test host to ensure absolute test isolation across parallel test workers
    const hostEmail = `doctor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@test.live`;
    const regRes = await request.post("/api/auth/register", {
      data: {
        name: "Dr. Jordan Hayes",
        email: hostEmail,
        password: testHostPassword,
        timezone: "UTC",
      },
    });
    expect(regRes.status()).toBe(201);
    const regData = await regRes.json();
    testHostId = regData.user.id;
    testHostEmail = hostEmail;

    // 2. Fetch the default 30min event type created for this host
    const slotsRes = await request.get(
      `/api/schedule/slots?hostId=${testHostId}&eventSlug=30min&date=2026-10-30&timezone=UTC`
    );
    const slotsData = await slotsRes.json();
    const eventTypeId = slotsData.eventType?.id || "evt_30min_01";

    // 3. Create confirmed booking scheduled 5 min from now (within 15-min early join window)
    const now = new Date();
    const startTime = new Date(now.getTime() + 5 * 60 * 1000);
    const endTime = new Date(now.getTime() + 35 * 60 * 1000);

    const bookRes = await request.post("/api/schedule/book", {
      data: {
        hostId: testHostId,
        eventTypeId,
        attendeeName: "Dr. Eleanor Vance",
        attendeeEmail: "eleanor.vance@hillhouse.org",
        attendeeNotes: "Phase 3 WebRTC PreJoin verification call.",
        startTimeUtc: startTime.toISOString(),
        endTimeUtc: endTime.toISOString(),
      },
    });

    expect(bookRes.status()).toBe(201);
    const bookData = await bookRes.json();
    activeBookingUid = bookData.booking.uid;
    expect(activeBookingUid).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // Server-side Token Minting Boundary (/api/connection-details)
  // --------------------------------------------------------------------------
  test("1. Rejects missing room identifier with 400 Bad Request", async ({ request }) => {
    const res = await request.get("/api/connection-details");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Room UID is required/i);
  });

  test("2. Rejects invalid or nonexistent booking UID with 404 Not Found", async ({ request }) => {
    const res = await request.get("/api/connection-details?room=mhaf-nonexistent-999");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  test("3. Blocks rooms scheduled too far in advance with 403 and joinableAt metadata", async ({
    request,
  }) => {
    // Create a booking 3 days in the future
    const futureStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 30 * 60 * 1000);

    const bookRes = await request.post("/api/schedule/book", {
      data: {
        hostId: testHostId,
        eventTypeId: "evt_30min_01",
        attendeeName: "Future Attendee",
        attendeeEmail: "future@mhaf.live",
        startTimeUtc: futureStart.toISOString(),
        endTimeUtc: futureEnd.toISOString(),
      },
    });

    expect(bookRes.status()).toBe(201);
    const futureBooking = await bookRes.json();

    const tokenRes = await request.get(
      `/api/connection-details?room=${futureBooking.booking.uid}`
    );
    expect(tokenRes.status()).toBe(403);
    const tokenBody = await tokenRes.json();
    expect(tokenBody.error).toMatch(/not open yet/i);
    expect(tokenBody.joinableAt).toBeTruthy();
  });

  test("4. Mints valid LiveKit token for attendee without exposing API secret", async ({
    request,
  }) => {
    const res = await request.get(
      `/api/connection-details?room=${activeBookingUid}&name=Eleanor%20Vance`
    );
    expect(res.status()).toBe(200);
    const data = await res.json();

    expect(data.serverUrl).toBeTruthy();
    expect(data.participantToken).toBeTruthy();
    expect(data.roomName).toBe(activeBookingUid);
    expect(data.isHost).toBe(false);
    expect(data.participantName).toBe("Eleanor Vance");
    expect(data.participantIdentity).toMatch(/^attendee_/);

    // Cryptographic token verification
    // LiveKit tokens are signed with LIVEKIT_API_SECRET
    const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
    const secretKey = new TextEncoder().encode(apiSecret);
    const { payload } = await jwtVerify(data.participantToken, secretKey);

    expect(payload.sub).toBe(data.participantIdentity);
    expect(payload.name).toBe("Eleanor Vance");
    const videoGrant = (payload as any).video;
    expect(videoGrant).toBeTruthy();
    expect(videoGrant.room).toBe(activeBookingUid);
    expect(videoGrant.roomJoin).toBe(true);
    expect(videoGrant.roomAdmin).toBe(false); // Attendee is not host
  });

  test("5. Authenticated host receives host token with roomAdmin grant", async ({
    request,
  }) => {
    // Log in as host to obtain session cookie
    const loginRes = await request.post("/api/auth/login", {
      data: {
        email: testHostEmail,
        password: testHostPassword,
      },
    });
    expect(loginRes.status()).toBe(200);

    // Request token with host session cookie forwarded
    const cookieHeader = loginRes.headers()["set-cookie"];
    const tokenRes = await request.get(
      `/api/connection-details?room=${activeBookingUid}`,
      {
        headers: {
          Cookie: cookieHeader,
        },
      }
    );

    expect(tokenRes.status()).toBe(200);
    const data = await tokenRes.json();
    expect(data.isHost).toBe(true);
    expect(data.participantIdentity).toBe(`host_${testHostId}`);

    // Verify roomAdmin grant in JWT
    const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
    const secretKey = new TextEncoder().encode(apiSecret);
    const { payload } = await jwtVerify(data.participantToken, secretKey);
    const videoGrant = (payload as any).video;
    expect(videoGrant.roomAdmin).toBe(true);
  });

  // --------------------------------------------------------------------------
  // PreJoin Screen & Room Navigation UI Tests
  // --------------------------------------------------------------------------
  test("6. Accessing invalid room UID renders 404 Room Not Found error view", async ({
    page,
  }) => {
    await page.goto("/rooms/mhaf-invalid-slug-999");
    await expect(page.locator("h1")).toContainText("Room Not Found");
    await expect(page.getByText(/No active video conferencing room exists/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Homepage" })).toBeVisible();
  });

  test("7. Booking confirmation page provides direct CTA into PreJoin room", async ({
    page,
  }) => {
    await page.goto(`/book/confirmation/${activeBookingUid}`);
    await expect(page.locator("h1")).toContainText("You're Scheduled!");

    const enterBtn = page.locator("#enter-room-btn");
    await expect(enterBtn).toBeVisible();
    await expect(enterBtn).toContainText("Enter PreJoin Room");

    await enterBtn.click();
    await expect(page).toHaveURL(new RegExp(`/rooms/${activeBookingUid}`));
  });

  test("8. PreJoin screen renders device controls, camera preview box, and joins room", async ({
    page,
  }) => {
    await page.goto(`/rooms/${activeBookingUid}`);

    // Verify session metadata is loaded
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(activeBookingUid)).toBeVisible();

    // Verify PreJoin controls
    const micToggle = page.locator("#prejoin-mic-toggle");
    const camToggle = page.locator("#prejoin-cam-toggle");
    const nameInput = page.locator("#prejoin-display-name");
    const joinBtn = page.locator("#prejoin-join-button");

    await expect(micToggle).toBeVisible();
    await expect(camToggle).toBeVisible();
    await expect(nameInput).toBeVisible();
    await expect(joinBtn).toBeVisible();

    // Test mute toggles on PreJoin
    await micToggle.click();
    await camToggle.click();

    // Join room
    await joinBtn.click();

    // Verify transition into active room stage
    await expect(page.getByText("MHAF LIVE ROOM")).toBeVisible();
    await expect(page.getByText("SESSION LIVE")).toBeVisible();
    await expect(page.locator("#room-mic-btn")).toBeVisible();
    await expect(page.locator("#room-cam-btn")).toBeVisible();
    await expect(page.locator("#room-leave-btn")).toBeVisible();

    // Leave call cleanly
    await page.locator("#room-leave-btn").click();
    await expect(page.getByText("You Have Left the Meeting")).toBeVisible();
    await expect(page.getByText("Re-enter PreJoin Staging")).toBeVisible();
  });
});
