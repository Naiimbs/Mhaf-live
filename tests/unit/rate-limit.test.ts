import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit } from "../../src/lib/rate-limit.ts";

test("allows requests up to the configured limit and then blocks", () => {
  const key = `booking-test-${Math.random()}`;
  assert.equal(checkRateLimit(key, 2, 1000, 10_000).allowed, true);
  assert.equal(checkRateLimit(key, 2, 1000, 10_100).allowed, true);
  const blocked = checkRateLimit(key, 2, 1000, 10_200);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 1);
});

test("resets a bucket after its window expires", () => {
  const key = `booking-reset-${Math.random()}`;
  assert.equal(checkRateLimit(key, 1, 500, 20_000).allowed, true);
  assert.equal(checkRateLimit(key, 1, 500, 20_499).allowed, false);
  assert.equal(checkRateLimit(key, 1, 500, 20_500).allowed, true);
});
