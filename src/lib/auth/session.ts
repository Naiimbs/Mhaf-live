import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { User } from "@/lib/db/types";

const COOKIE_NAME = "mhaf_session";
const configuredJwtSecret = process.env.NEXTAUTH_SECRET?.trim();

if (process.env.NODE_ENV === "production" && (!configuredJwtSecret || configuredJwtSecret.length < 32)) {
  throw new Error("NEXTAUTH_SECRET must be configured with at least 32 characters in production.");
}

const JWT_SECRET = new TextEncoder().encode(
  configuredJwtSecret || "mhaf-live-dev-secret-key-minimum-32-chars-long"
);
const SESSION_DURATION_SEC = 7 * 24 * 60 * 60; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: User): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SEC}s`)
    .sign(JWT_SECRET);

  return token;
}

export async function verifySessionToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub || !payload.email) return null;
    return { userId: payload.sub as string, email: payload.email as string };
  } catch (err) {
    return null;
  }
}

export async function getCurrentHost(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const sessionData = await verifySessionToken(token);
    if (!sessionData) return null;

    // Verify session still exists in db
    const activeSession = await db.findSessionByToken(token);
    if (!activeSession) return null;

    return activeSession.user;
  } catch (err) {
    return null;
  }
}

export async function requireHostAuth(): Promise<User> {
  const host = await getCurrentHost();
  if (!host) {
    redirect("/login");
  }
  return host;
}

export async function createHostSession(user: User): Promise<void> {
  const token = await createSessionToken(user);
  const expires = new Date(Date.now() + SESSION_DURATION_SEC * 1000);
  await db.createSession(user.id, token, expires);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function loginHost(email: string, password: string): Promise<{ success: true; user: User } | { success: false; error: string }> {
  const user = await db.findUserByEmail(email);
  if (!user || !user.passwordHash) {
    return { success: false, error: "Invalid email or password." };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid email or password." };
  }

  await createHostSession(user);
  return { success: true, user };
}

export async function registerHost(
  name: string,
  email: string,
  password: string,
  timezone: string = "UTC"
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  try {
    const existing = await db.findUserByEmail(email);
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    const passwordHash = await hashPassword(password);
    const user = await db.createUser({
      name,
      email,
      emailVerified: new Date(),
      passwordHash,
      role: "HOST",
      timezone: timezone || "UTC",
    });

    await createHostSession(user);
    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err.message || "Registration failed." };
  }
}

export async function logoutHost(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      await db.deleteSession(token);
      cookieStore.delete(COOKIE_NAME);
    }
  } catch (err) {
    console.error("Error logging out:", err);
  }
}
