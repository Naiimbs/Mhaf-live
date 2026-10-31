import { test, expect } from "@playwright/test";

test.describe("MHAF Live marketing landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads the product message and calendar illustration", async ({ page }) => {
    await expect(page).toHaveTitle(/mhaf meet/i);
    await expect(page.locator("h1")).toContainText("From booking");
    await expect(page.locator("h1")).toContainText("to conversation.");
    await expect(page.getByText("Static preview")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bookings and meetings, together." })).toBeVisible();
  });

  test("routes visitors to sign in or account creation, not meeting creation", async ({ page }) => {
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toHaveAttribute("href", "/login");
    await expect(page.locator('a[href="/register"]').first()).toHaveAttribute("href", "/register");
    await expect(page.getByRole("link", { name: /start instant meeting|create room|book a meeting/i })).toHaveCount(0);
    await expect(page.locator("input")).toHaveCount(0);
    await expect(page.locator("#room-launcher")).toHaveCount(0);
  });

  test("landing page does not send write requests or create a meeting", async ({ page }) => {
    const writeRequests: string[] = [];
    await page.goto("about:blank");
    page.on("request", (request) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
        writeRequests.push(`${request.method()} ${request.url()}`);
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(writeRequests).toEqual([]);
  });

  test("toggles theme between light and dark mode", async ({ page }) => {
    const html = page.locator("html");
    const themeBtn = page.locator("button[aria-label='Toggle dark mode']:visible");
    await expect(themeBtn).toBeVisible();
    const initialClass = (await html.getAttribute("class")) || "";
    await themeBtn.click();
    const toggledClass = (await html.getAttribute("class")) || "";
    expect(toggledClass).not.toEqual(initialClass);
  });

  test("does not overflow horizontally at the tested viewport", async ({ page }) => {
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);
  });
});
