import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

export function getE2EAuthHarnessSecret(): string | null {
  const configuredPath = process.env.MHAF_E2E_AUTH_HARNESS_SECRET_FILE?.trim();
  const secretPath = configuredPath || path.join(tmpdir(), "mhaf-live-playwright-e2e-secret");
  try {
    const secret = fs.readFileSync(secretPath, "utf8").trim();
    return secret || null;
  } catch {
    return process.env.MHAF_E2E_AUTH_HARNESS_SECRET?.trim() || null;
  }
}
