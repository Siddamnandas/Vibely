import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    // Redirect to app with error
    return NextResponse.redirect(
      new URL(`/auth/error?provider=apple-music&error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/error?provider=apple-music&error=no_code', request.url)
    );
  }

  // Redirect to app with code - the client-side hook will handle the token exchange
  return NextResponse.redirect(
    new URL(`/auth/success?provider=apple-music&code=${encodeURIComponent(code)}`, request.url)
  );
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Exchange code for tokens with Apple Music
    const tokenResponse = await fetch('https://api.music.apple.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.APPLE_MUSIC_DEVELOPER_TOKEN}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.APPLE_MUSIC_CLIENT_ID || '',
        client_secret: process.env.APPLE_MUSIC_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/apple-music/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Apple Music token exchange failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to exchange code for tokens' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    });

  } catch (error) {
    console.error('Apple Music auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}