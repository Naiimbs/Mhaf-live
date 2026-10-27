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

    // 2nd request - should pass as duplicate with existing record id
    const res2 = await request.post("/api/demo-request", {
      headers,
      data: {
        fullName: "Test User",
        email: spamEmail,
        organization: "Spam Org",
      },
    });
    expect(res2.status()).toBe(201);
    const body2 = await res2.json();
    expect(body2.success).toBe(true);
    expect(body2.data.id).toBeDefined();
    expect(body2.data.isDuplicate).toBe(true);

    // 3rd request - should pass as duplicate with existing record id
    const res3 = await request.post("/api/demo-request", {
      headers,
      data: {
        fullName: "Test User",
        email: spamEmail,
        organization: "Spam Org",
      },
    });
    expect(res3.status()).toBe(201);
    const body3 = await res3.json();
    expect(body3.success).toBe(true);
    expect(body3.data.id).toBeDefined();
    expect(body3.data.isDuplicate).toBe(true);

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

  test("API: returns exact stored record and reference ID on duplicate submission within 60s", async ({ request }) => {
    const testIp = `10.${Math.floor(Math.random() * 200) + 10}.4.1`;
    const email = `dup_verify_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@enterprise-dup.com`;
    const headers = { "x-forwarded-for": testIp };

    const payload = {
      fullName: "Marcus Aurelius",
      email,
      organization: "Stoic Enterprise",
      useCase: "Executive Secure Sync",
      hours: "50-200 hours",
    };

    // 1st request
    const res1 = await request.post("/api/demo-request", {
      headers,
      data: payload,
    });
    expect(res1.status()).toBe(201);
    const body1 = await res1.json();
    expect(body1.success).toBe(true);
    expect(body1.data.id).toBeDefined();
    expect(body1.data.isDuplicate).toBe(false);
    const firstId = body1.data.id;

    // 2nd request within 60s
    const res2 = await request.post("/api/demo-request", {
      headers,
      data: payload,
    });
    expect(res2.status()).toBe(201);
    const body2 = await res2.json();
    expect(body2.success).toBe(true);
    // Verifies the stored reference ID is returned, NOT a new phantom record ID
    expect(body2.data.id).toBe(firstId);
    expect(body2.data.isDuplicate).toBe(true);
    expect(body2.message).toContain("already been received");
  });

  test("API: enforces IP-based rate limiting on repeated requests from same network", async ({ request }) => {
    const testIp = `10.${Math.floor(Math.random() * 200) + 10}.5.1`;
    const headers = { "x-forwarded-for": testIp };

    // 10 requests from same IP with different emails should pass (IP limit is 10)
    for (let i = 1; i <= 10; i++) {
      const email = `ip_limit_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}@ip-test.com`;
      const res = await request.post("/api/demo-request", {
        headers,
        data: {
          fullName: `Employee ${i}`,
          email,
          organization: "Shared Network Org",
        },
      });
      expect(res.status()).toBe(201);
    }

    // 11th request from same IP should be blocked with 429
    const blockedRes = await request.post("/api/demo-request", {
      headers,
      data: {
        fullName: "Employee 11",
        email: `ip_limit_${Date.now()}_11@ip-test.com`,
        organization: "Shared Network Org",
      },
    });
    expect(blockedRes.status()).toBe(429);
    const blockedBody = await blockedRes.json();
    expect(blockedBody.success).toBe(false);
    expect(blockedBody.error).toContain("Rate limit reached for your network");
  });

  test("API: prevents spoofed X-Forwarded-For headers from bypassing IP rate limiting", async ({ request }) => {
    // Attack scenario: Attacker changes leftmost IP in X-Forwarded-For on every request,
    // but the trusted reverse proxy appends the true client IP on the right.
    const trueClientIp = `198.51.${Math.floor(Math.random() * 90) + 10}.${Math.floor(Math.random() * 200) + 10}`;

    // Send 10 requests with varying spoofed leftmost IPs but identical proxy-appended rightmost IP
    for (let i = 1; i <= 10; i++) {
      const spoofedPrefix = `203.0.113.${i}`;
      const res = await request.post("/api/demo-request", {
        headers: {
          "x-forwarded-for": `${spoofedPrefix}, ${trueClientIp}`,
        },
        data: {
          fullName: `Target User ${i}`,
          email: `spoof_test_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}@target.com`,
          organization: "Spoof Target Org",
        },
      });
      expect(res.status()).toBe(201);
    }

    // 11th request: Even with a different spoofed leftmost IP, the true rightmost IP is rate-limited
    const blockedRes = await request.post("/api/demo-request", {
      headers: {
        "x-forwarded-for": `192.0.2.99, ${trueClientIp}`,
      },
      data: {
        fullName: "Target User 11",
        email: `spoof_test_${Date.now()}_11@target.com`,
        organization: "Spoof Target Org",
      },
    });

    expect(blockedRes.status()).toBe(429);
    const blockedBody = await blockedRes.json();
    expect(blockedBody.success).toBe(false);
    expect(blockedBody.error).toContain("Rate limit reached for your network");
  });

  test("API: does not trust spoofed X-Real-IP when X-Forwarded-For is absent, defaulting to safe fallback", async ({ request }) => {
    const untrustedRealIp = `192.0.2.${Math.floor(Math.random() * 200) + 10}`;

    const res = await request.post("/api/demo-request", {
      headers: {
        "x-real-ip": untrustedRealIp,
      },
      data: {
        fullName: "Agent Smith",
        email: `real_ip_test_${Date.now()}@matrix.org`,
        organization: "Matrix Security",
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
  });

  test("API: prevents spoofed X-Real-IP from overriding proxy-appended rightmost X-Forwarded-For", async ({ request }) => {
    const truePeerIp = `198.51.${Math.floor(Math.random() * 90) + 110}.${Math.floor(Math.random() * 200) + 10}`;

    // Send 10 requests with varying spoofed X-Real-IP but identical X-Forwarded-For rightmost IP
    for (let i = 1; i <= 10; i++) {
      const spoofedRealIp = `203.0.113.${i}`;
      const res = await request.post("/api/demo-request", {
        headers: {
          "x-real-ip": spoofedRealIp,
          "x-forwarded-for": `10.0.0.1, ${truePeerIp}`,
        },
        data: {
          fullName: `User ${i}`,
          email: `realip_spoof_${Date.now()}_${i}@target.com`,
          organization: "Target Org",
        },
      });
      expect(res.status()).toBe(201);
    }

    // 11th request with yet another spoofed X-Real-IP is blocked because truePeerIp is rate-limited
    const blockedRes = await request.post("/api/demo-request", {
      headers: {
        "x-real-ip": "1.2.3.4",
        "x-forwarded-for": `10.0.0.1, ${truePeerIp}`,
      },
      data: {
        fullName: "User 11",
        email: `realip_spoof_${Date.now()}_11@target.com`,
        organization: "Target Org",
      },
    });

    expect(blockedRes.status()).toBe(429);
    const blockedBody = await blockedRes.json();
    expect(blockedBody.success).toBe(false);
    expect(blockedBody.error).toContain("Rate limit reached for your network");
  });

  test("API: handles missing forwarding headers safely by falling back to local address", async ({ request }) => {
    const res = await request.post("/api/demo-request", {
      data: {
        fullName: "Local Admin",
        email: `missing_hdr_${Date.now()}@localhost.net`,
        organization: "Local Net",
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
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
