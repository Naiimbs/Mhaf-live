import type { APIRequestContext, Page } from "@playwright/test";
import { getE2EAuthHarnessSecret } from "@/lib/e2e-auth";

type VerifiedHost = { email: string; userId: string; cookie: string };

/** Register and verify a fresh host using the real passwordless flow. */
export async function registerAndVerifyHost(page: Page, request: APIRequestContext, name = "Playwright E2E Host"): Promise<VerifiedHost> {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const email = `e2e_${suffix}@test.live`;
  const secret = getE2EAuthHarnessSecret();
  if (!secret) throw new Error("MHAF_E2E_AUTH_HARNESS_SECRET is missing from the Playwright process.");

  const clientIp = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
  const registration = await request.post("/api/auth/magic-link", { data: { name, email, timezone: "UTC" }, headers: { "x-forwarded-for": clientIp } });
  if (!registration.ok()) throw new Error(`E2E host registration failed (${registration.status()}): ${await registration.text()}`);

  const captured = await request.get(`/api/e2e/magic-link?email=${encodeURIComponent(email)}`, { headers: { "x-mhaf-e2e-secret": secret } });
  if (!captured.ok()) throw new Error(`Could not retrieve E2E magic link (${captured.status()}): ${await captured.text()}`);

  const { url } = await captured.json() as { url: string };
  const verificationUrl = new URL(url);
  await page.goto(`${verificationUrl.pathname}${verificationUrl.search}`);
  await page.getByRole("button", { name: /confirm and continue/i }).click();
  await page.waitForURL(/\/dashboard(?:\/|$)/);

  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name === "mhaf_session");
  if (!sessionCookie) throw new Error("Magic-link verification did not create the mhaf_session cookie.");
  const payloadPart = sessionCookie.value.split(".")[1];
  if (!payloadPart) throw new Error("The E2E session cookie is not a valid JWT.");
  const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as { sub?: string };
  if (!payload.sub) throw new Error("The E2E session JWT does not contain a user subject.");

  return { email, userId: payload.sub, cookie: `mhaf_session=${sessionCookie.value}` };
}
