import { NextRequest, NextResponse } from "next/server";
import { loadDefaultWorld, loadWorld } from "@/lib/world/loadWorld";
import { getOrCreateSession, getSession } from "@/lib/storage/store";
import { runTurn } from "@/lib/engine/runTurn";
import type { ProviderKey } from "@/lib/llm/catalog";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message, llmConfig, language, worldId, playerName } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const world = worldId ? loadWorld(worldId) : loadDefaultWorld();
    const existingSession = typeof sessionId === "string" ? getSession(sessionId) : null;
    const session = existingSession?.worldId === world.id
      ? existingSession
      : getOrCreateSession(world.id);

    // Providers that strictly require a key: anthropic (native), openrouter (hosted).
    // OpenAI-compatible keyless providers (ollama, local servers) work without a key.
    const providerKey = (llmConfig?.providerType as ProviderKey) || "openai";
    if ((providerKey === "anthropic" || providerKey === "openrouter") && !llmConfig?.apiKey?.trim()) {
      return NextResponse.json(
        { error: `API key is required for ${providerKey}` },
        { status: 400 }
      );
    }

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
