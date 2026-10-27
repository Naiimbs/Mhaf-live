import { test, expect } from "@playwright/test";

test.describe("MHAF Live Landing Page & Verification Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads landing page with correct metadata and no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await expect(page).toHaveTitle(/MHAF Live/);
    await expect(page.locator("h1")).toContainText("Video meetings built for");

    expect(errors).toEqual([]);
  });

  test("toggles theme between light and dark mode", async ({ page }) => {
    const html = page.locator("html");
    const themeBtn = page.locator("button[aria-label='Toggle dark mode']:visible");

    await expect(themeBtn).toBeVisible();

    // Check initial state
    const initialClass = (await html.getAttribute("class")) || "";
    await themeBtn.click();

    // Verify class toggle
    const toggledClass = (await html.getAttribute("class")) || "";
    expect(toggledClass).not.toEqual(initialClass);
  });

  test("interactive prototype switches between scheduling and PreJoin staging", async ({ page }) => {
    // Scroll to interactive preview section
    const previewSection = page.locator("#preview");
    await expect(previewSection).toBeVisible();

    // Default tab should be scheduling
    await expect(page.getByText("Executive Consultation & Review")).toBeVisible();
    await expect(page.getByText("Available Time Windows")).toBeVisible();

    // Select slot '14:00' and confirm
    await page.getByRole("button", { name: "14:00" }).click();
    await page.getByRole("button", { name: "Confirm & Generate Instant Room Link" }).click();
    await expect(page.getByText("Time Slot Reserved Atomically")).toBeVisible();

    // Switch to PreJoin staging tab
    await page.getByRole("tab", { name: "2. PreJoin Room Staging" }).click();
    await expect(page.getByText("Hardware Staging & Device Check")).toBeVisible();
    await expect(page.getByText("Microphone Audio Level")).toBeVisible();

    // Toggle audio input test
    const audioTestBtn = page.getByRole("button", { name: "Test Audio Input" });
    await audioTestBtn.click();
    await expect(page.getByRole("button", { name: "Stop Mic Test" })).toBeVisible();
  });

  test("validates and submits the Request Demo form honestly", async ({ page }) => {
    // Isolate UI test from production loopback IP rate limit bucket
    await page.route("**/api/demo-request", async (route) => {
      const uniqueIp = `10.151.${Math.floor(Math.random() * 200) + 1}.1`;
      const headers = { ...route.request().headers(), "x-forwarded-for": uniqueIp };
      await route.continue({ headers });
    });

    // Open demo modal via Hero button
    const openBtn = page.getByRole("button", { name: "Request Enterprise Demo" }).first();
    await openBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Request Enterprise Demo")).toBeVisible();

    // Attempt submit with empty fields to trigger validation
    const submitBtn = dialog.getByRole("button", { name: "Submit Demo Request" });
    await submitBtn.click();

    // Verify field validation errors appear
    await expect(dialog.getByText("Full name is required.")).toBeVisible();
    await expect(dialog.getByText("Work email is required.")).toBeVisible();
    await expect(dialog.getByText("Organization or company name is required.")).toBeVisible();

    // Fill valid data
    const testEmail = `avance_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@healthcorp.org`;
    await dialog.locator("#demo-fullname").fill("Dr. Alexander Vance");
    await dialog.locator("#demo-email").fill(testEmail);
    await dialog.locator("#demo-org").fill("HealthCorp Innovations");

    // Submit form
    await submitBtn.click();

    // Verify honest confirmation message appears
    await expect(dialog.getByText("Demo Request Received")).toBeVisible();
    await expect(dialog.getByText(/In this development preview, your inquiry for HealthCorp Innovations is staged locally/)).toBeVisible();

    // Close modal
    await dialog.getByRole("button", { name: "Close & Return to Page" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("ensures no horizontal overflow on page viewport", async ({ page }) => {
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
