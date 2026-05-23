import { NextRequest, NextResponse } from "next/server";
import { worldSchema } from "@/lib/world/types";
import { normalizeWorldId, saveWorld } from "@/lib/world/loadWorld";
import { sanitizeError } from "@/lib/llm/validateUrl";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const world = worldSchema.parse(body);
    const invalidCharacter = world.characters.find((character) => !character.name.trim() || !character.role.trim());
    if (invalidCharacter) {
      return NextResponse.json({ error: "Each character must have both a name and a role." }, { status: 400 });
    }

    const safeId = normalizeWorldId(world.id);
    if (!safeId) {
      return NextResponse.json({ error: "World id must contain at least one letter or number." }, { status: 400 });
    }
    world.id = safeId;

    saveWorld(world);

    return NextResponse.json({ success: true, worldId: world.id });
  } catch (e) {
    console.error("World create error:", e);
    return NextResponse.json({ error: sanitizeError(e) }, { status: 400 });
  }
}
