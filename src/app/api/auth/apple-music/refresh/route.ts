import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Refresh the access token with Apple Music
    const tokenResponse = await fetch('https://api.music.apple.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.APPLE_MUSIC_DEVELOPER_TOKEN}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: process.env.APPLE_MUSIC_CLIENT_ID || '',
        client_secret: process.env.APPLE_MUSIC_CLIENT_SECRET || '',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Apple Music token refresh failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token || refresh_token, // Some providers don't return new refresh token
      scope: tokenData.scope,
    });

  } catch (error) {
    console.error('Apple Music refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}