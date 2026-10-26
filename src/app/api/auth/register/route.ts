import { NextResponse } from "next/server";
import { registerHost } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { name, email, password, timezone } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const result = await registerHost(name, email, password, timezone || "UTC");
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          timezone: result.user.timezone,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Registration failed." },
      { status: 500 }
    );
  }
}
