import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/server/push-notifications";

export async function POST(request: NextRequest) {
  try {
    const { token, title, body, imageUrl, data } = await request.json();

    if (!token || !title || !body) {
      return NextResponse.json({ error: "Token, title, and body are required" }, { status: 400 });
    }

    const success = await sendPushNotification(token, {
      title,
      body,
      imageUrl,
      data,
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Notification sent successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send notification",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
