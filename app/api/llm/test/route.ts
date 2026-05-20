import { NextRequest, NextResponse } from "next/server";
import { getProvider, type LLMConfig } from "@/lib/llm/provider";
import type { ProviderKey } from "@/lib/llm/catalog";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = body?.llmConfig as LLMConfig | undefined;
    const providerKey = (config?.providerType as ProviderKey) || "openai";

    // Providers that strictly require a key: anthropic (native), openrouter (hosted).
    // OpenAI-compatible keyless providers (ollama, local servers) work without a key.
    if ((providerKey === "anthropic" || providerKey === "openrouter") && !config?.apiKey?.trim()) {
      return NextResponse.json(
        { ok: false, error: `API key is required for ${providerKey}` },
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
