import { NextRequest, NextResponse } from "next/server";
import { loadDefaultWorld, loadWorld } from "@/lib/world/loadWorld";
import { getOrCreateSession, getSession } from "@/lib/storage/store";
import { runTurn } from "@/lib/engine/runTurn";
import type { ProviderKey } from "@/lib/llm/catalog";
import { assertSafeApiUrl, sanitizeError } from "@/lib/llm/validateUrl";

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

    // SSRF protection — validate apiUrl before passing to provider
    if (llmConfig?.apiUrl) {
      assertSafeApiUrl(llmConfig.apiUrl, providerKey === "ollama");
    }

    const config = llmConfig?.providerType ? {
      providerType: llmConfig.providerType,
      apiUrl: llmConfig.apiUrl,
      apiKey: llmConfig.apiKey || "",
      model: llmConfig.model,
    } : undefined;

    const lang: "zh" | "en" = language === "zh" ? "zh" : "en";

    // --- Streaming path ---
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let closed = false;
          const send = (event: object) => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
            } catch {
              // Stream already closed (client disconnected)
            }
          };
          try {
            const _apiStart = Date.now();
            const result = await runTurn(
              session.id, world, message.trim(), config, lang, playerName || undefined,
              send
            );
            if (process.env.LLM_DEBUG === "1") console.log(`[PERF:api] /api/chat stream total: ${Date.now() - _apiStart}ms`);
            send({ type: "done", data: result });
          } catch (e) {
            console.error("Chat API stream error:", e);
            send({ type: "error", data: { message: sanitizeError(e) } });
          } finally {
            closed = true;
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    // --- Non-streaming path (existing) ---
    const _apiStart = Date.now();
    const result = await runTurn(session.id, world, message.trim(), config, lang, playerName || undefined);
    if (process.env.LLM_DEBUG === "1") console.log(`[PERF:api] /api/chat total: ${Date.now() - _apiStart}ms`);

    return NextResponse.json(result);
  } catch (e) {
    console.error("Chat API error:", e);
    return NextResponse.json(
      { error: sanitizeError(e) },
      { status: 500 }
    );
  }
}
