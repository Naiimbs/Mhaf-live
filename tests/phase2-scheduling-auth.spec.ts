import { test, expect } from "@playwright/test";
import { getE2EAuthHarnessSecret } from "@/lib/e2e-auth";

function e2eClientIp() {
  return `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
}

test.describe("Phase 2 — Host Authentication, Scheduling & Concurrency Tests", () => {
  const seedEmail = process.env.E2E_SEED_EMAIL || "host@mhaf.live";
  const seedHostId = "host_default_01";
  const eventSlug = "30min";

  test("1. Unauthorized access to /dashboard is blocked and redirects to /login", async ({ page }) => {
    // Navigate directly without session
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("h1")).toContainText("Sign in to mhaf meet");
  });

  test("2. Protected API routes return 401 Unauthorized when unauthenticated", async ({ request }) => {
    const availRes = await request.get("/api/schedule/availability");
    expect(availRes.status()).toBe(401);

    const bookingsRes = await request.get("/api/schedule/bookings");
    expect(bookingsRes.status()).toBe(401);
  });

  test("3. Login uses email-only magic-link requests and does not expose password sign-in", async ({ page, request }) => {
    await page.goto("/login");

    await expect(page.locator("h1")).toContainText("Sign in to mhaf meet");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toHaveCount(0);

    // Unknown addresses are directed to registration; existing accounts receive a magic link.
    const clientIp = e2eClientIp();
    const response = await request.post("/api/auth/magic-link", {
      data: { email: "unknown-account@e2e.test" },
      headers: { "x-forwarded-for": clientIp },
    });
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("ACCOUNT_NOT_FOUND");
    expect(body.error).toContain("Create an account");

    const existingResponse = await request.post("/api/auth/magic-link", {
      data: { email: seedEmail },
      headers: { "x-forwarded-for": clientIp },
    });
    expect(existingResponse.status()).toBe(200);
    const existingBody = await existingResponse.json();
    expect(existingBody.success).toBe(true);
    expect(existingBody.message).toContain("If this address can receive a sign-in link");
  });

  test("4. Host Registration creates an unverified host account and verifies it through a one-time magic link", async ({ page, request }) => {
    const uniqueEmail = `host_${Date.now()}@test.live`;
    const uniqueName = "Playwright Test Host";

    const clientIp = e2eClientIp();
    await page.route("**/api/auth/magic-link", (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": clientIp } }));
    await page.goto("/register");
    await page.fill("#register-name", uniqueName);
    await page.fill("#register-email", uniqueEmail);
    await page.selectOption("#register-timezone", "America/New_York");
    await page.click("#submit-register-button");

    // Registration must not create an authenticated session before email verification.
    await expect(page).toHaveURL(/register$/);
    await expect(page.getByRole("status")).toContainText("Check your inbox");
    await expect(page.getByRole("status")).toContainText(uniqueEmail);
    await expect(page.locator("#register-password")).toHaveCount(0);

    // A new host must not reach the protected workspace before email verification.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);

    // The development-only E2E mail harness captures the actual one-time link without SMTP.
    const capturedLinkResponse = await request.get(
      `/api/e2e/magic-link?email=${encodeURIComponent(uniqueEmail)}`,
      { headers: { "x-mhaf-e2e-secret": getE2EAuthHarnessSecret()! } }
    );
    expect(capturedLinkResponse.status()).toBe(200);
    const { url } = await capturedLinkResponse.json();
    expect(url).toContain("/auth/verify?token=");

    // Keep the verification flow on the local Playwright server even when
    // NEXT_PUBLIC_APP_URL is configured with the production hostname.
    const verificationUrl = new URL(url);
    const token = verificationUrl.searchParams.get("token");
    expect(token).toBeTruthy();
    await page.goto(`${verificationUrl.pathname}${verificationUrl.search}`);
    await expect(page.getByRole("button", { name: "Confirm and continue" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm and continue" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(uniqueEmail)).toBeVisible();

    // The same token must be rejected after its first successful use.
    const replayResponse = await request.post("/api/auth/magic-link/verify", {
      data: { token },
    });
    expect(replayResponse.status()).toBe(400);

    // A newly registered host receives the default availability schedule in their timezone.
    await page.goto("/dashboard/availability");
    await expect(page.locator("h1")).toContainText("Weekly Availability Schedule");
    await expect(page.locator("#end-time-1")).toHaveValue("17:00");
  });

  test("5. Legacy password login API is disabled", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: seedEmail, password: "not-used-in-magic-link-auth" },
    });

    expect(response.status()).toBe(410);
    const body = await response.json();
    expect(body.error).toContain("Password sign-in is disabled");
  });

  test("6. Slot generation calculates timezone-aware slots and excludes past/unavailable times", async ({ request }) => {
    // Generate date 3 days in future (avoid weekend collision)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    // If weekend, advance to Monday
    if (targetDate.getUTCDay() === 0) targetDate.setDate(targetDate.getDate() + 1);
    if (targetDate.getUTCDay() === 6) targetDate.setDate(targetDate.getDate() + 2);

    const dateStr = targetDate.toISOString().split("T")[0];

    const res = await request.get(`/api/schedule/slots?hostId=${seedHostId}&eventSlug=${eventSlug}&date=${dateStr}&timezone=UTC`);
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.host.id).toBe(seedHostId);
    expect(data.eventType.slug).toBe(eventSlug);
    expect(Array.isArray(data.slots)).toBe(true);
    expect(data.slots.length).toBeGreaterThan(0);

    // Check slot properties
    const slot = data.slots[0];
    expect(slot).toHaveProperty("startTimeUtc");
    expect(slot).toHaveProperty("endTimeUtc");
    expect(slot).toHaveProperty("displayTime");
    expect(slot.available).toBe(true);
  });

  test("7. Server-side validation rejects invalid booking intervals and past dates", async ({ request }) => {
    // Use a dedicated client bucket so this validation test is independent of other flows.
    const clientIp = e2eClientIp();
    // Test past date
    const pastRes = await request.post("/api/schedule/book", {
      headers: { "x-forwarded-for": clientIp },
      data: {
        eventTypeId: "evt_30min_01",
        hostId: seedHostId,
        startTimeUtc: "2020-01-01T10:00:00.000Z",
        endTimeUtc: "2020-01-01T10:30:00.000Z",
        attendeeName: "Time Traveler",
        attendeeEmail: "past@test.com",
      },
    });
    expect(pastRes.status()).toBe(400);
    const pastData = await pastRes.json();
    expect(pastData.error).toContain("past");

    // Test end time before start time
    const invalidOrderRes = await request.post("/api/schedule/book", {
      headers: { "x-forwarded-for": clientIp },
      data: {
        eventTypeId: "evt_30min_01",
        hostId: seedHostId,
        startTimeUtc: "2027-01-01T12:00:00.000Z",
        endTimeUtc: "2027-01-01T11:00:00.000Z",
        attendeeName: "Inverted Time",
        attendeeEmail: "inverted@test.com",
      },
    });
    expect(invalidOrderRes.status()).toBe(400);
  });

  test("8. Atomic Booking Concurrency Protection: Parallel identical requests yield exactly 1 success (201) and 1 conflict (409)", async ({ request }) => {
    // Dynamically locate a verified open slot to guarantee true unreserved state across repeated test runs
    let slotToBook: { startTimeUtc: string; endTimeUtc: string } | null = null;
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 15 + Math.floor(Math.random() * 30));

    for (let i = 0; i < 40; i++) {
      const candidate = new Date(baseDate);
      candidate.setDate(candidate.getDate() + i);
      const day = candidate.getUTCDay();
      if (day === 0 || day === 6) continue;

      const candidateStr = candidate.toISOString().split("T")[0];
      const slotsRes = await request.get(
        `/api/schedule/slots?hostId=${seedHostId}&eventSlug=${eventSlug}&date=${candidateStr}&timezone=UTC`
      );
      if (slotsRes.status() === 200) {
        const body = await slotsRes.json();
        const availableSlot = body.slots?.find((s: any) => s.available);
        if (availableSlot) {
          slotToBook = {
            startTimeUtc: availableSlot.startTimeUtc,
            endTimeUtc: availableSlot.endTimeUtc,
          };
          break;
        }
      }
    }

    expect(slotToBook).not.toBeNull();

    const bookingPayloadA = {
      eventTypeId: "evt_30min_01",
      hostId: seedHostId,
      startTimeUtc: slotToBook!.startTimeUtc,
      endTimeUtc: slotToBook!.endTimeUtc,
      attendeeName: "Concurrent Attendee A",
      attendeeEmail: `attendee_a_${Date.now()}@test.com`,
    };

    const bookingPayloadB = {
      eventTypeId: "evt_30min_01",
      hostId: seedHostId,
      startTimeUtc: slotToBook!.startTimeUtc,
      endTimeUtc: slotToBook!.endTimeUtc,
      attendeeName: "Concurrent Attendee B",
      attendeeEmail: `attendee_b_${Date.now()}@test.com`,
    };

    // Fire both requests simultaneously from one dedicated IP bucket.
    const clientIp = e2eClientIp();
    const [resA, resB] = await Promise.all([
      request.post("/api/schedule/book", { data: bookingPayloadA, headers: { "x-forwarded-for": clientIp } }),
      request.post("/api/schedule/book", { data: bookingPayloadB, headers: { "x-forwarded-for": clientIp } }),
    ]);

    const statuses = [resA.status(), resB.status()].sort();
    // Exactly one must be 201 (Created) and the other must be 409 (Conflict)
    expect(statuses).toEqual([201, 409]);

    const conflictBody = resA.status() === 409 ? await resA.json() : await resB.json();
    expect(conflictBody.error).toMatch(/BOOKING_CONFLICT|TIME_NOT_AVAILABLE/);
  });

  test("9. Public Booking Portal End-to-End: Attendee can view slots and complete booking to confirmation", async ({ page, request }) => {
    const clientIp = e2eClientIp();
    await page.route("**/api/schedule/book", (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": clientIp } }));
    await page.goto(`/book/${seedHostId}/${eventSlug}`);

    // Wait for event title to load
    await expect(page.locator("h1")).toContainText("30 Min Architecture Sync");

    // Dynamically locate a future business date with verified open slot capacity
    let dateStr = "";
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 10 + Math.floor(Math.random() * 20));

    for (let i = 0; i < 30; i++) {
      const candidate = new Date(baseDate);
      candidate.setDate(candidate.getDate() + i);
      const day = candidate.getUTCDay();
      if (day === 0 || day === 6) continue;

      const candidateStr = candidate.toISOString().split("T")[0];
      const res = await request.get(
        `/api/schedule/slots?hostId=${seedHostId}&eventSlug=${eventSlug}&date=${candidateStr}&timezone=UTC`
      );
      if (res.status() === 200) {
        const body = await res.json();
        if (Array.isArray(body.slots) && body.slots.some((s: any) => s.available)) {
          dateStr = candidateStr;
          break;
        }
      }
    }

    expect(dateStr).not.toBe("");

    await page.fill("#booking-date-picker", dateStr);

    // Wait for slot buttons to render
    const firstSlot = page.locator("button[id^='slot-btn-']:not([disabled])").first();
    await firstSlot.waitFor({ state: "visible" });
    await firstSlot.click();

    // Fill attendee details
    await page.fill("#attendee-name-input", "Playwright E2E Tester");
    await page.fill("#attendee-email-input", "e2e@test.live");
    await page.fill("#attendee-notes-input", "Automated booking integration verification.");
    const bookingResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/schedule/book") && response.request().method() === "POST"
    );
    await page.click("#confirm-booking-btn");
    const bookingResponse = await bookingResponsePromise;
    const bookingBody = await bookingResponse.json();
    expect(bookingResponse.status(), JSON.stringify(bookingBody)).toBe(201);

    // Should land on confirmation page
    await expect(page).toHaveURL(/\/book\/confirmation\/mhaf-/);
    await expect(page.locator("h1")).toContainText("You're Scheduled!");
    await expect(page.getByText("Playwright E2E Tester")).toBeVisible();
    await expect(page.getByText("CONFIRMED", { exact: true })).toBeVisible();
  });
});
