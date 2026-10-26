import { NextResponse } from "next/server";
import { loginHost } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const result = await loginHost(email, password);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        timezone: result.user.timezone,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Login failed." },
      { status: 500 }
    );
  }
}
