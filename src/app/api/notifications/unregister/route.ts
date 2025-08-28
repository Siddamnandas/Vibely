import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // In a real implementation, you would:
    // 1. Get the user ID from authentication
    // 2. Remove the token from your database

    console.log("FCM Token unregistered:", token);

    // Here you would typically remove from database:
    // await db.collection('fcm_tokens')
    //   .where('token', '==', token)
    //   .get()
    //   .then(snapshot => {
    //     snapshot.forEach(doc => doc.ref.delete());
    //   });

    return NextResponse.json({
      success: true,
      message: "Token unregistered successfully",
    });
  } catch (error) {
    console.error("Error unregistering FCM token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
