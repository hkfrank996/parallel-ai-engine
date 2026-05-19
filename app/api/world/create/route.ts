import { NextRequest, NextResponse } from "next/server";
import { worldSchema, World } from "@/lib/world/types";
import { saveWorld, loadWorld } from "@/lib/world/loadWorld";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const world = worldSchema.parse(body);
    const invalidCharacter = world.characters.find((character) => !character.name.trim() || !character.role.trim());
    if (invalidCharacter) {
      return NextResponse.json({ error: "Each character must have both a name and a role." }, { status: 400 });
    }

    const safeId = world.id.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    world.id = safeId;

    saveWorld(world);

    return NextResponse.json({ success: true, worldId: world.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
