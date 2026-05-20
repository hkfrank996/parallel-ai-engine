import { NextRequest, NextResponse } from "next/server";
import { loadDefaultWorld, loadWorld } from "@/lib/world/loadWorld";
import { getOrCreateSession, getSession } from "@/lib/storage/store";
import { runTurn } from "@/lib/engine/runTurn";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message, llmConfig, language, worldId, playerName } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const world = worldId ? loadWorld(worldId) : loadDefaultWorld();
    const existingSession = typeof sessionId === "string" ? getSession(sessionId) : null;
    const session = existingSession || getOrCreateSession(world.id);

    const config = llmConfig?.providerType ? {
      providerType: llmConfig.providerType,
      apiUrl: llmConfig.apiUrl,
      apiKey: llmConfig.apiKey || "",
      model: llmConfig.model,
    } : undefined;

    const lang: "zh" | "en" = language === "zh" ? "zh" : "en";

    const result = await runTurn(session.id, world, message.trim(), config, lang, playerName || undefined);

    return NextResponse.json(result);
  } catch (e) {
    console.error("Chat API error:", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
