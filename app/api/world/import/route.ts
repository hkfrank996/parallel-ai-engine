import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { v4 as uuid } from "uuid";
import { worldSchema } from "@/lib/world/types";

const DATA_DIR = path.join(process.cwd(), "data");
const WORLDS_DIR = path.join(DATA_DIR, "worlds");
const STORE_FILE = path.join(DATA_DIR, "store.json");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { yaml: yamlContent, sessionData } = body;

    if (!yamlContent) {
      return NextResponse.json({ error: "yaml content required" }, { status: 400 });
    }

    const parsed = yaml.load(yamlContent);
    const world = worldSchema.parse(parsed);

    if (!fs.existsSync(WORLDS_DIR)) fs.mkdirSync(WORLDS_DIR, { recursive: true });
    fs.writeFileSync(path.join(WORLDS_DIR, `${world.id}.yaml`), yamlContent, "utf-8");

    if (sessionData && Object.keys(sessionData).length > 0) {
      const store = fs.existsSync(STORE_FILE)
        ? JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"))
        : { sessions: [], messages: [], events: [], worldFacts: [], characterMemories: [], worldTime: [], relationships: [], worldEvents: [], relationshipHistory: [] };

      const sessionId = `session-${Date.now()}`;
      store.sessions.push({ id: sessionId, worldId: world.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

      const remap = (arr: { sessionId: string }[]) => arr.map((item: { sessionId: string }) => ({ ...item, sessionId }));
      if (sessionData.messages) store.messages.push(...remap(sessionData.messages));
      if (sessionData.worldFacts) store.worldFacts.push(...remap(sessionData.worldFacts));
      if (sessionData.characterMemories) store.characterMemories.push(...remap(sessionData.characterMemories));
      if (sessionData.worldEvents) store.worldEvents.push(...remap(sessionData.worldEvents));
      if (sessionData.worldTime) store.worldTime.push({ ...sessionData.worldTime, sessionId });
      if (sessionData.relationships) store.relationships.push(...remap(sessionData.relationships));
      if (sessionData.relationshipHistory) store.relationshipHistory.push(...remap(sessionData.relationshipHistory));

      fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
    }

    return NextResponse.json({ success: true, worldId: world.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
