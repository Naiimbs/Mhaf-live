import { test, expect } from "@playwright/test";

test.describe("Demo Request Workflow & API", () => {
  test("API: rejects invalid payload with 400 and structured details", async ({ request }) => {
    const testIp = `10.${Math.floor(Math.random() * 200) + 10}.1.1`;
    const res = await request.post("/api/demo-request", {
      headers: { "x-forwarded-for": testIp },
      data: {
        fullName: "",
        email: "not-an-email",
        organization: "",
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.details).toBeDefined();
    expect(body.details.fullName).toBeDefined();
    expect(body.details.email).toBeDefined();
    expect(body.details.organization).toBeDefined();
  });

  test("API: accepts valid demo request and returns 201 with generated reference ID", async ({ request }) => {
    const testIp = `10.${Math.floor(Math.random() * 200) + 10}.2.1`;
    const testEmail = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@enterprise-test.com`;
    const res = await request.post("/api/demo-request", {
      headers: { "x-forwarded-for": testIp },
      data: {
        fullName: "Dr. Marcus Vance",
        email: testEmail,
        organization: "Vance Health System",
        useCase: "Confidential Telehealth / Medical",
        hours: "200-1,000 hours",
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.email).toBe(testEmail.toLowerCase());
    expect(body.data.organization).toBe("Vance Health System");
  });

  test("API: enforces rate limiting on repeated requests from same email", async ({ request }) => {
    const testIp = `10.${Math.floor(Math.random() * 200) + 10}.3.1`;
    const spamEmail = `rate_limit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@test-org.com`;
    const headers = { "x-forwarded-for": testIp };

    // 1st request - should pass
    const res1 = await request.post("/api/demo-request", {
      headers,
      data: {
        fullName: "Test User",
        email: spamEmail,
        organization: "Spam Org",
      },
    });
    expect(res1.status()).toBe(201);

    // 2nd request - should pass
    const res2 = await request.post("/api/demo-request", {
      headers,
      data: {
        fullName: "Test User",
        email: spamEmail,
        organization: "Spam Org",
      },
    });
    expect(res2.status()).toBe(201);

    // 3rd request - should pass
    const res3 = await request.post("/api/demo-request", {
      headers,
      data: {
        fullName: "Test User",
        email: spamEmail,
        organization: "Spam Org",
      },
    });
    expect(res3.status()).toBe(201);

    // 4th request - should be blocked by rate limiter (429)
    const res4 = await request.post("/api/demo-request", {
      headers,
      data: {
        fullName: "Test User",
        email: spamEmail,
        organization: "Spam Org",
      },
    });
    expect(res4.status()).toBe(429);
    const body4 = await res4.json();
    expect(body4.success).toBe(false);
    expect(body4.error).toContain("Multiple demo requests for this email");
  });

  test("UI: modal opens, submits valid form, and shows persistent confirmation", async ({ page }) => {
    await page.goto("/");

    // Open Demo Modal via landing hero button (always visible across desktop, tablet, and mobile)
    const requestDemoBtn = page.getByRole("button", { name: "Request Enterprise Demo" }).first();
    await requestDemoBtn.scrollIntoViewIfNeeded();
    await requestDemoBtn.click();

    // Verify modal visible
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Request Enterprise Demo" })).toBeVisible();

    // Fill form
    const uiEmail = `ui_demo_${Date.now()}_${Math.random().toString(36).substring(2, 5)}@medtech.com`;
    await page.fill("#demo-fullname", "Elena Rostova");
    await page.fill("#demo-email", uiEmail);
    await page.fill("#demo-org", "Rostova Security Labs");

    // Submit
    const submitBtn = page.getByRole("button", { name: /Submit Demo Request/i });
    await submitBtn.click();

    // Verify confirmation
    await expect(page.getByRole("heading", { name: "Demo Request Received" })).toBeVisible();
    await expect(page.getByText("Elena Rostova")).toBeVisible();
    await expect(page.getByText("Rostova Security Labs")).toBeVisible();
    await expect(page.getByText(/Ref:/i)).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: /Close & Return to Page/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
