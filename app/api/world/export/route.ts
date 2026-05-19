import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const WORLDS_DIR = path.join(DATA_DIR, "worlds");

export async function GET(req: NextRequest) {
  try {
    const worldId = req.nextUrl.searchParams.get("worldId");
    if (!worldId) {
      return NextResponse.json({ error: "worldId required" }, { status: 400 });
    }

    const yamlPath = path.join(WORLDS_DIR, `${worldId}.yaml`);
    if (!fs.existsSync(yamlPath)) {
      return NextResponse.json({ error: "World not found" }, { status: 404 });
    }

    const worldYaml = fs.readFileSync(yamlPath, "utf-8");

    const storePath = path.join(DATA_DIR, "store.json");
    let sessionData = {};
    if (fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
      const session = store.sessions?.find((s: { worldId: string }) => s.worldId === worldId);
      if (session) {
        const sid = session.id;
        sessionData = {
          messages: (store.messages || []).filter((m: { sessionId: string }) => m.sessionId === sid),
          worldFacts: (store.worldFacts || []).filter((f: { sessionId: string }) => f.sessionId === sid),
          characterMemories: (store.characterMemories || []).filter((m: { sessionId: string }) => m.sessionId === sid),
          worldEvents: (store.worldEvents || []).filter((e: { sessionId: string }) => e.sessionId === sid),
          worldTime: (store.worldTime || []).find((t: { sessionId: string }) => t.sessionId === sid),
          relationships: (store.relationships || []).filter((r: { sessionId: string }) => r.sessionId === sid),
          relationshipHistory: (store.relationshipHistory || []).filter((h: { sessionId: string }) => h.sessionId === sid),
        };
      }
    }

    return NextResponse.json({
      worldId,
      yaml: worldYaml,
      sessionData,
      exportedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
