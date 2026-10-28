import { test, expect } from "@playwright/test";

test("host calendar workspace keeps booking and meeting actions inside the dashboard", async ({ page }) => {
  const seedEmail = process.env.E2E_SEED_EMAIL || "host@mhaf.live";
  const seedPassword = process.env.E2E_SEED_PASSWORD || "Password123!";

  await page.goto("/login");
  await page.fill("#login-email", seedEmail);
  await page.fill("#login-password", seedPassword);
  await page.click("#submit-login-button");
  await expect(page).toHaveURL(/\/dashboard/);

  await expect(page.getByRole("region", { name: "Weekly calendar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your booking links" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Three ways to meet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Schedule meeting" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start instant" })).toBeVisible();

  await page.getByRole("button", { name: "Schedule meeting" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("This will not create a booking reservation.")).toBeVisible();
  await expect(dialog.getByLabel("Start time")).toBeVisible();
  await expect(dialog.locator('input[name="date"]')).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});
