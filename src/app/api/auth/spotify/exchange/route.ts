import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    // Debug: Log environment variables
    console.log("🧪 Spotify auth - Environment check:", {
      client_id_present: !!process.env.SPOTIFY_CLIENT_ID,
      client_secret_present: !!process.env.SPOTIFY_CLIENT_SECRET,
      redirect_uri_set: !!process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI,
      client_id_partial: process.env.SPOTIFY_CLIENT_ID?.substring(0, 4) + "*...*",
      client_secret_partial: process.env.SPOTIFY_CLIENT_SECRET?.substring(0, 4) + "*...*",
      redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI,
    });

    // Exchange code for tokens with Spotify
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID || ""}:${process.env.SPOTIFY_CLIENT_SECRET || ""}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri:
          process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ||
          "http://localhost:3002/auth/success?provider=spotify",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Spotify token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        sentData: {
          code: code ? code.substring(0, 20) + "..." : "MISSING",
          redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI,
          grant_type: "authorization_code",
        },
      });
      // Try to parse JSON, but handle non-JSON responses
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch (parseError) {
        errorDetails = { raw_error: errorText };
      }

      return NextResponse.json(
        {
          error: "Failed to exchange code for tokens",
          details: errorDetails,
          sent: {
            code: code ? "PRESENT" : "MISSING",
            redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI,
            client_id: process.env.SPOTIFY_CLIENT_ID?.substring(0, 10) + "...",
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const tokenData = await tokenResponse.json();

    // Set httpOnly cookies for secure token storage
    const cookieStore = await cookies();
    const expiresIn = tokenData.expires_in; // seconds
    const expirationTime = Date.now() + expiresIn * 1000;

    cookieStore.set("sp_access", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: expiresIn,
      path: "/",
      sameSite: "lax",
    });

    cookieStore.set("sp_refresh", tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax",
    });

    cookieStore.set("sp_exp", expirationTime.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    });
  } catch (error) {
    console.error("Spotify auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
