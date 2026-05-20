import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = (body.email || "")
      .trim()
      .toLowerCase();

    const password = body.password || "";

    // ENV credentials
    const adminEmail =
      process.env.ADMIN_EMAIL?.toLowerCase();

    const adminPassword =
      process.env.ADMIN_PASSWORD;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Email and password are required",
        },
        { status: 400 }
      );
    }

    // Check credentials
    if (
      email !== adminEmail ||
      password !== adminPassword
    ) {
      return NextResponse.json(
        {
          error: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Generate token
    const token = await signToken({
      email: adminEmail,
      role: "admin",
    });

    // Response
    const response = NextResponse.json({
      success: true,
      user: {
        email: adminEmail,
      },
    });

    // Cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}