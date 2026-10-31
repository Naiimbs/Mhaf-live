import { test, expect } from "@playwright/test";
import { registerAndVerifyHost } from "./helpers/auth";

test("host calendar workspace keeps booking and meeting actions inside the dashboard", async ({ page, request }) => {
  await registerAndVerifyHost(page, request);

  await expect(page.getByRole("img", { name: "meet" })).toBeVisible();
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

test("scheduled meetings succeed when free and reject a genuine overlapping duplicate", async ({ page, request }) => {
  await registerAndVerifyHost(page, request);

  const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const payload = {
    title: "Conflict regression test",
    date: start.toISOString().slice(0, 10),
    time: start.toISOString().slice(11, 16),
    durationMinutes: 30,
  };
  const first = await page.request.post("/api/meetings", { data: payload });
  expect(first.status()).toBe(201);

  const overlapping = await page.request.post("/api/meetings", { data: payload });
  expect(overlapping.status()).toBe(409);
  expect((await overlapping.json()).error).toContain("MEETING_CONFLICT");
});
