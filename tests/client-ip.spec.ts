import { test, expect } from "@playwright/test";
import { isValidIp, extractClientIp, getClientIp } from "../src/lib/client-ip";
import { NextRequest } from "next/server";

test.describe("Client IP Extraction & Validation Unit Tests", () => {
  test("isValidIp: accurately identifies valid IPv4 and IPv6 addresses", () => {
    // Valid IPv4
    expect(isValidIp("127.0.0.1")).toBe(true);
    expect(isValidIp("192.168.1.1")).toBe(true);
    expect(isValidIp("10.0.0.1")).toBe(true);
    expect(isValidIp("172.16.0.1")).toBe(true);
    expect(isValidIp("198.51.100.25")).toBe(true);

    // Valid IPv6
    expect(isValidIp("::1")).toBe(true);
    expect(isValidIp("2001:db8::1")).toBe(true);
    expect(isValidIp("fe80::1ff:fe23:4567:890a")).toBe(true);
    expect(isValidIp("::ffff:192.0.2.1")).toBe(true);

    // Invalid formats
    expect(isValidIp("")).toBe(false);
    expect(isValidIp("not-an-ip")).toBe(false);
    expect(isValidIp("999.999.999.999")).toBe(false);
    expect(isValidIp("192.168.1")).toBe(false);
    expect(isValidIp("192.168.1.1.1")).toBe(false);
    expect(isValidIp("192.168.1.256")).toBe(false);
    expect(isValidIp("localhost")).toBe(false);
  });

  test("extractClientIp: prioritizes rightmost X-Forwarded-For over untrusted X-Real-IP", () => {
    // Untrusted client sends spoofed X-Real-IP "1.2.3.4", Caddy appends true remote IP to X-Forwarded-For
    const req = new NextRequest("http://localhost:3000/api/demo-request", {
      headers: {
        "x-real-ip": "1.2.3.4",
        "x-forwarded-for": "10.1.1.1, 198.51.100.77",
      },
    });

    const ip = extractClientIp(req);
    expect(ip).toBe("198.51.100.77");
  });

  test("extractClientIp: does NOT trust X-Real-IP by default when X-Forwarded-For is absent", () => {
    // Untrusted client tries to forge IP via X-Real-IP without X-Forwarded-For
    const req = new NextRequest("http://localhost:3000/api/demo-request", {
      headers: {
        "x-real-ip": "203.0.113.195",
      },
    });

    const ip = extractClientIp(req);
    // Must not silently trust X-Real-IP; falls back to deterministic safe fallback
    expect(ip).toBe("127.0.0.1");
  });

  test("extractClientIp: accepts X-Real-IP when trustRealIp is explicitly enabled", () => {
    const req = new NextRequest("http://localhost:3000/api/demo-request", {
      headers: {
        "x-real-ip": "203.0.113.195",
      },
    });

    // Enabled via options
    expect(extractClientIp(req, { trustRealIp: true })).toBe("203.0.113.195");

    // Enabled via environment variable
    process.env.TRUST_X_REAL_IP = "true";
    expect(extractClientIp(req)).toBe("203.0.113.195");
    delete process.env.TRUST_X_REAL_IP;
  });

  test("extractClientIp: ignores invalid trailing values and takes rightmost valid IP", () => {
    const req = new NextRequest("http://localhost:3000/api/demo-request", {
      headers: {
        "x-forwarded-for": "198.51.100.88, unknown, malformed",
      },
    });

    const ip = extractClientIp(req);
    expect(ip).toBe("198.51.100.88");
  });

  test("extractClientIp: safely cleans ports and brackets from IP representations", () => {
    const reqIpv4Port = new NextRequest("http://localhost:3000/api/demo-request", {
      headers: {
        "x-forwarded-for": "198.51.100.99:54321",
      },
    });
    expect(extractClientIp(reqIpv4Port)).toBe("198.51.100.99");

    const reqIpv6Bracket = new NextRequest("http://localhost:3000/api/demo-request", {
      headers: {
        "x-forwarded-for": "[2001:db8::55]:443",
      },
    });
    expect(extractClientIp(reqIpv6Bracket)).toBe("2001:db8::55");
  });

  test("extractClientIp: falls back to 127.0.0.1 when all forwarding headers are missing or invalid", () => {
    const reqEmpty = new NextRequest("http://localhost:3000/api/demo-request");
    expect(extractClientIp(reqEmpty)).toBe("127.0.0.1");

    const reqInvalid = new NextRequest("http://localhost:3000/api/demo-request", {
      headers: {
        "x-forwarded-for": "invalid, bad_ip, 999.999.999.999",
        "x-real-ip": "spoofed-non-ip",
      },
    });
    expect(extractClientIp(reqInvalid)).toBe("127.0.0.1");
  });

  test("getClientIp: acts as an alias to extractClientIp with identical behavior", () => {
    const req = new NextRequest("http://localhost:3000/api/demo-request", {
      headers: {
        "x-forwarded-for": "10.0.0.1, 198.51.100.123",
      },
    });
    expect(getClientIp(req)).toBe(extractClientIp(req));
    expect(getClientIp(req)).toBe("198.51.100.123");
  });
});
