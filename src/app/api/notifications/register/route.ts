import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Get the user ID from authentication
    // 2. Store the token in your database associated with the user
    // 3. Optionally, remove old tokens for the same user/device
    
    // For now, we'll just log it
    console.log('FCM Token registered:', token);
    
    // Here you would typically store in database:
    // await db.collection('fcm_tokens').add({
    //   token,
    //   userId: user.id,
    //   createdAt: new Date(),
    //   lastUsed: new Date()
    // });

    return NextResponse.json({
      success: true,
      message: 'Token registered successfully'
    });

  } catch (error) {
    console.error('Error registering FCM token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}"