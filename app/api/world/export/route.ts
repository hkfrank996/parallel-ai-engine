import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { assertSafeWorldId } from "@/lib/world/loadWorld";
import { findSessionByWorldId, getSessionDataForExport } from "@/lib/storage/store";

const WORLDS_DIR = path.join(process.cwd(), "data", "worlds");

export async function GET(req: NextRequest) {
  try {
    const worldId = req.nextUrl.searchParams.get("worldId");
    if (!worldId) {
      return NextResponse.json({ error: "worldId required" }, { status: 400 });
    }

    const safeWorldId = assertSafeWorldId(worldId);

    const yamlPath = path.join(WORLDS_DIR, `${safeWorldId}.yaml`);
    if (!fs.existsSync(yamlPath)) {
      return NextResponse.json({ error: "World not found" }, { status: 404 });
    }

    const worldYaml = fs.readFileSync(yamlPath, "utf-8");

    let sessionData = {};
    const session = findSessionByWorldId(safeWorldId);
    if (session) {
      sessionData = getSessionDataForExport(session.id);
    }

    return NextResponse.json({
      worldId: safeWorldId,
      yaml: worldYaml,
      sessionData,
      exportedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("World export error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
