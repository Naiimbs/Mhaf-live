import assert from "node:assert/strict";
import test from "node:test";
import { resolveLiveKitSettings } from "../../src/lib/livekit/config.ts";

const validProductionEnv = {
  NODE_ENV: "production",
  LIVEKIT_URL: "wss://project.livekit.cloud",
  LIVEKIT_API_KEY: "key-from-secret-store",
  LIVEKIT_API_SECRET: "secret-from-secret-store",
};

test("rejects production configuration when LiveKit URL and credentials are missing", () => {
  const result = resolveLiveKitSettings({ NODE_ENV: "production" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /LIVEKIT_URL/);
    assert.match(result.error, /LIVEKIT_API_KEY/);
    assert.match(result.error, /LIVEKIT_API_SECRET/);
  }
});

test("accepts a production wss endpoint with configured credentials", () => {
  const result = resolveLiveKitSettings(validProductionEnv);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.settings.url, validProductionEnv.LIVEKIT_URL);
    assert.equal(result.settings.apiKey, validProductionEnv.LIVEKIT_API_KEY);
    assert.equal(result.settings.apiSecret, validProductionEnv.LIVEKIT_API_SECRET);
  }
});

test("rejects insecure, loopback, and placeholder production configuration", () => {
  for (const env of [
    { ...validProductionEnv, LIVEKIT_URL: "ws://project.livekit.cloud" },
    { ...validProductionEnv, LIVEKIT_URL: "wss://localhost:7880" },
    { ...validProductionEnv, LIVEKIT_API_KEY: "devkey" },
    { ...validProductionEnv, LIVEKIT_API_SECRET: "replace_with_secret" },
  ]) {
    const result = resolveLiveKitSettings(env);
    assert.equal(result.ok, false);
  }
});

test("retains local development defaults outside production", () => {
  const result = resolveLiveKitSettings({ NODE_ENV: "development" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.settings.url, "ws://127.0.0.1:7880");
    assert.equal(result.settings.apiKey, "devkey");
    assert.equal(result.settings.apiSecret, "secret");
  }
});
