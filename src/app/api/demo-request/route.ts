import { NextRequest, NextResponse } from "next/server";
import {
  DemoRequestInputSchema,
  checkRateLimit,
  createDemoRequest,
} from "@/lib/db/demo-requests";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON format. Please send a valid JSON request body.",
        },
        { status: 400 }
      );
    }

    // Extract client IP and user agent
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    // Rate limiting by IP (allow up to 10 requests per 15 min for corporate/shared networks)
    const ipLimit = checkRateLimit(`ip:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit reached for your network. Please wait ${ipLimit.resetSeconds} seconds before submitting another request.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": ipLimit.resetSeconds.toString(),
          },
        }
      );
    }

    // Server-side validation
    const parsed = DemoRequestInputSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]?.toString() || "form";
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: "Validation error. Please verify the submitted information.",
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    // Rate limiting by Email (max 3 requests per 15 min for same email address)
    const emailLimit = checkRateLimit(
      `email:${parsed.data.email.toLowerCase()}`,
      3,
      15 * 60 * 1000
    );
    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Multiple demo requests for this email address detected. Please wait ${emailLimit.resetSeconds} seconds before submitting again.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": emailLimit.resetSeconds.toString(),
          },
        }
      );
    }

    // Persist demo request
    const record = await createDemoRequest(parsed.data, {
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your demo inquiry has been securely recorded.",
        data: {
          id: record.id,
          fullName: record.fullName,
          email: record.email,
          organization: record.organization,
          useCase: record.useCase,
          hours: record.hours,
          createdAt: record.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/demo-request] Unhandled error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while processing your request. Please try again later.",
      },
      { status: 500 }
    );
  }
}
