import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // Test cookie handling
    const cookieStore = await cookies();

    // Set a test cookie
    cookieStore.set("test_cookie", "test_value", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60,
      path: "/",
      sameSite: "lax",
    });

    // Get the test cookie
    const testCookie = cookieStore.get("test_cookie")?.value;

    return NextResponse.json({
      success: true,
      testCookie,
      message: "Cookie handling works correctly",
    });
  } catch (error) {
    console.error("Cookie test error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
