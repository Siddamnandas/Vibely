import { NextRequest, NextResponse } from "next/server";
import { generateAlbumCover } from "@/ai/flows/generate-album-cover";

export async function POST(request: NextRequest) {
  try {
    const { photoDataUri, songTitle, artistName, originalCoverDataUri } = await request.json();

    if (!photoDataUri || !songTitle || !artistName || !originalCoverDataUri) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Call the AI generation flow
    const result = await generateAlbumCover({
      photoDataUri,
      songTitle,
      artistName,
      originalCoverDataUri,
    });

    return NextResponse.json({
      success: true,
      generatedCoverUris: result.generatedCoverUris,
    });
  } catch (error) {
    console.error("AI cover generation error:", error);
    return NextResponse.json({ error: "Failed to generate cover" }, { status: 500 });
  }
}
