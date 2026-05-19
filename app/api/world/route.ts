import { NextRequest, NextResponse } from "next/server";
import { loadDefaultWorld, loadWorld, listWorlds } from "@/lib/world/loadWorld";
import { getOrCreateSession, getMessages, getEvents, getWorldFacts, getCharacterMemories, getWorldTime, getRelationships, getWorldEvents, getRelationshipHistory, getClues } from "@/lib/storage/store";
import { getProvider } from "@/lib/llm/provider";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "list") {
      const worlds = listWorlds();
      return NextResponse.json({ worlds });
    }

    const worldId = url.searchParams.get("worldId");
    const world = worldId ? loadWorld(worldId) : loadDefaultWorld();
    const session = getOrCreateSession(world.id);
    const messages = getMessages(session.id);
    const events = getEvents(session.id);
    const worldFacts = getWorldFacts(session.id);
    const characterMemories = getCharacterMemories(session.id);
    const worldTime = getWorldTime(session.id);
    const relationships = getRelationships(session.id);
    const worldEvents = getWorldEvents(session.id);
    const relationshipHistory = getRelationshipHistory(session.id);
    const clues = getClues(session.id);
    const { isMock, providerType } = getProvider();

    return NextResponse.json({
      world, session, messages, events, worldFacts, characterMemories,
      worldTime, relationships, worldEvents, relationshipHistory, clues, isMock, providerType,
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
