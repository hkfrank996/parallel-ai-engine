import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { v4 as uuid } from "uuid";
import { worldSchema } from "@/lib/world/types";
import { assertSafeWorldId } from "@/lib/world/loadWorld";
import { importSessionData, findSessionByWorldId } from "@/lib/storage/store";

const WORLDS_DIR = path.join(process.cwd(), "data", "worlds");
const MAX_YAML_SIZE = 500_000; // 500KB

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { yaml: yamlContent, sessionData } = body;

    if (!yamlContent || typeof yamlContent !== "string") {
      return NextResponse.json({ error: "yaml content must be a string" }, { status: 400 });
    }

    if (yamlContent.length > MAX_YAML_SIZE) {
      return NextResponse.json({ error: "YAML content too large (max 500KB)" }, { status: 400 });
    }

    const parsed = yaml.load(yamlContent, { schema: yaml.CORE_SCHEMA });
    const world = worldSchema.parse(parsed);
    world.id = assertSafeWorldId(world.id);

    // Validate sessionData BEFORE writing YAML — prevent dirty files on failure
    let validatedSessionData: typeof sessionData | undefined;
    if (sessionData && typeof sessionData === "object" && Object.keys(sessionData).length > 0) {
      const arrayFields = ["messages", "events", "worldFacts", "characterMemories", "relationships", "worldEvents", "relationshipHistory", "clues"] as const;
      for (const field of arrayFields) {
        const val = (sessionData as Record<string, unknown>)[field];
        if (val !== undefined && !Array.isArray(val)) {
          return NextResponse.json({ error: `sessionData.${field} must be an array` }, { status: 400 });
        }
      }

      const totalEntries = arrayFields.reduce((sum, field) => {
        const arr = (sessionData as Record<string, unknown[]>)[field];
        return sum + (Array.isArray(arr) ? arr.length : 0);
      }, 0);
      if (totalEntries > 10000) {
        return NextResponse.json({ error: "sessionData too large (max 10000 total entries)" }, { status: 400 });
      }
      validatedSessionData = sessionData;
    }

    // All validation passed — safe to write
    if (!fs.existsSync(WORLDS_DIR)) fs.mkdirSync(WORLDS_DIR, { recursive: true });
    fs.writeFileSync(path.join(WORLDS_DIR, `${world.id}.yaml`), yaml.dump(world, { lineWidth: -1, noRefs: true }), "utf-8");

    if (validatedSessionData) {
      const existing = findSessionByWorldId(world.id);
      const sessionId = existing ? existing.id : `session-${uuid()}`;

      importSessionData(sessionId, world.id, {
        messages: validatedSessionData.messages || [],
        events: validatedSessionData.events || [],
        worldFacts: validatedSessionData.worldFacts || [],
        characterMemories: validatedSessionData.characterMemories || [],
        worldTime: validatedSessionData.worldTime || undefined,
        relationships: validatedSessionData.relationships || [],
        worldEvents: validatedSessionData.worldEvents || [],
        relationshipHistory: validatedSessionData.relationshipHistory || [],
        clues: validatedSessionData.clues || [],
      });
    }

    return NextResponse.json({ success: true, worldId: world.id });
  } catch (e) {
    console.error("World import error:", e);
    return NextResponse.json({ error: "Import failed" }, { status: 400 });
  }
}
