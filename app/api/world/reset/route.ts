import { NextRequest, NextResponse } from "next/server";
import { assertSafeWorldId } from "@/lib/world/loadWorld";
import { findSessionByWorldId, clearSessionData } from "@/lib/storage/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { worldId } = body;

    if (!worldId || typeof worldId !== "string") {
      return NextResponse.json({ error: "worldId required" }, { status: 400 });
    }

    const safeWorldId = assertSafeWorldId(worldId);

    const session = findSessionByWorldId(safeWorldId);
    if (!session) {
      return NextResponse.json({ error: "No session found for this world" }, { status: 404 });
    }

    clearSessionData(session.id);

    return NextResponse.json({ success: true, worldId: safeWorldId });
  } catch (e) {
    console.error("World reset error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
