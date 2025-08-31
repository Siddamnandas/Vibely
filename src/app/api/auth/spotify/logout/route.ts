import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Clear httpOnly cookies
    const cookieStore = await cookies();

    cookieStore.delete("sp_access");
    cookieStore.delete("sp_refresh");
    cookieStore.delete("sp_exp");

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Spotify logout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
