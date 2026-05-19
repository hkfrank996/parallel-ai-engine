import { NextRequest, NextResponse } from "next/server";
import { getProvider, type LLMConfig } from "@/lib/llm/provider";
import type { ProviderKey } from "@/lib/llm/catalog";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = body?.llmConfig as LLMConfig | undefined;
    const providerKey = (config?.providerType as ProviderKey) || "openai";

    // Only Anthropic native API strictly requires a key.
    // OpenAI-compatible providers may work without a key (local servers, Ollama).
    if (providerKey === "anthropic" && !config?.apiKey?.trim()) {
      return NextResponse.json(
        { ok: false, error: "API key is required for Anthropic" },
        { status: 400 }
      );
    }

    const { provider, isMock, providerType, model } = getProvider(config);
    if (isMock) {
      return NextResponse.json({ ok: false, error: "No real provider configured" }, { status: 400 });
    }

    const text = await provider.generate(
      "You are a connection test. Reply with one short sentence.",
      "Say: Parallel API settings are connected."
    );

    return NextResponse.json({
      ok: true,
      providerType,
      model,
      preview: text.slice(0, 160),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
