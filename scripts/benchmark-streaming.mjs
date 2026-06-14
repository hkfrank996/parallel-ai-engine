#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Provider streaming benchmark for /api/chat.
 *
 * Usage:
 *   node scripts/benchmark-streaming.mjs \
 *     --base http://localhost:3000 \
 *     --provider anthropic \
 *     --apiKey "$ANTHROPIC_API_KEY" \
 *     --apiUrl https://api.minimax.io/anthropic \
 *     --model "MiniMax-M2.7-highspeed/MiniMax-M2.7" \
 *     --turns 5 \
 *     --worldId neon-harbor \
 *     --out /tmp/bench.json
 *
 * Measures per-turn:
 *   - firstEventMs:    time to first SSE line (any event)
 *   - firstTextMs:     time to first content/narration_done (visible to user)
 *   - firstDeltaMs:    time to first character_delta (only if streaming tokens)
 *   - totalMs:         time to done event
 *   - deltaCount:      number of content character_delta events
 *   - charCount:       total characters yielded across all character_delta events
 *   - charCountDirect: characters in final done.data.characterMessages
 *   - error:           "ok" | "<message>"
 *
 * NEVER logs apiKey, Authorization, or full user content.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { tmpdir } from "node:os";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      out[a.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const BASE = args.base || "http://localhost:3000";
const PROVIDER = args.provider || "anthropic";
const API_KEY = args.apiKey || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || "";
const API_URL = args.apiUrl || process.env.ANTHROPIC_BASE_URL || process.env.OPENAI_BASE_URL || "";
const MODEL = args.model || process.env.ANTHROPIC_MODEL || process.env.OPENAI_MODEL || "";
const TURNS = Number(args.turns || 5);
const WORLD_ID = args.worldId || "neon-harbor";
const OUT = args.out || `${tmpdir()}/bench-streaming.json`;
const SESSION_ID = args.sessionId || `bench-${Date.now()}`;

// Sanitized redactor — strip API key from any string that might contain it
function redact(s) {
  if (!s || typeof s !== "string") return s;
  if (!API_KEY) return s;
  return s.split(API_KEY).join("[REDACTED]");
}

const PROMPTS = [
  "I look around the rain market carefully, searching for any sign of the missing courier",
  "Ren, what do you know about the courier? Tell me what you've heard.",
  "June, are you okay? You look frightened. Who was the courier working for?",
  "[Look Around] I examine the broken neon sign more closely for clues",
  "Mira, I know about the data chip. Tell me the truth now.",
];

async function runOne(sessionId, prompt, turnIndex) {
  const t0 = Date.now();
  let firstEventMs = null;
  let firstTextMs = null;
  let firstDeltaMs = null;
  let totalMs = null;
  let deltaCount = 0;
  let charCount = 0;
  let charCountDirect = 0;
  let error = "ok";
  let aborted = false;
  const events = [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const body = {
      sessionId,
      message: prompt,
      language: "en",
      stream: true,
      llmConfig: {
        providerType: PROVIDER,
        apiUrl: API_URL,
        apiKey: API_KEY,
        model: MODEL,
      },
    };
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      error = `HTTP ${res.status}`;
      return { error, firstEventMs, firstTextMs, firstDeltaMs, totalMs: Date.now() - t0, deltaCount, charCount, charCountDirect, events };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let evt;
        try {
          evt = JSON.parse(trimmed);
        } catch {
          continue;
        }
        const now = Date.now() - t0;
        if (firstEventMs === null) firstEventMs = now;
        events.push({ type: evt.type, t: now });
        if (evt.type === "content") {
          const d = evt.data;
          if (d.kind === "narration_done" && firstTextMs === null) {
            firstTextMs = now;
          } else if (d.kind === "character_delta") {
            deltaCount += 1;
            charCount += (d.text || "").length;
            if (firstDeltaMs === null) firstDeltaMs = now;
          }
        } else if (evt.type === "done") {
          totalMs = now;
          const msgs = (evt.data && evt.data.characterMessages) || [];
          charCountDirect = msgs.reduce((acc, m) => acc + ((m.content || "").length), 0);
        } else if (evt.type === "error") {
          error = redact((evt.data && evt.data.message) || "unknown error");
        }
      }
    }
    if (totalMs === null) totalMs = Date.now() - t0;
  } catch (e) {
    error = redact(e && e.message ? e.message : String(e));
    if (e && e.name === "AbortError") aborted = true;
  } finally {
    clearTimeout(timeoutId);
  }

  return { error, firstEventMs, firstTextMs, firstDeltaMs, totalMs, deltaCount, charCount, charCountDirect, aborted, eventCount: events.length };
}

async function main() {
  if (!API_KEY) {
    console.error("ERROR: no apiKey provided (use --apiKey or env)");
    process.exit(2);
  }
  // Honor Ctrl+C / kill — exit immediately rather than waiting for 120s timeout
  const onSignal = () => {
    console.error("\nInterrupted, exiting");
    process.exit(130);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  console.log(`Benchmark starting: provider=${PROVIDER} model=${MODEL} world=${WORLD_ID} turns=${TURNS} session=${SESSION_ID}`);

  const samples = [];
  for (let i = 0; i < TURNS; i++) {
    const prompt = PROMPTS[i % PROMPTS.length];
    process.stdout.write(`turn ${i + 1}/${TURNS} ... `);
    const t0 = Date.now();
    const result = await runOne(SESSION_ID, prompt, i);
    const wall = Date.now() - t0;
    samples.push({ turn: i + 1, prompt: prompt.slice(0, 30) + "...", ...result, wallMs: wall });
    process.stdout.write(`ok=${result.error === "ok"} firstText=${result.firstTextMs ?? "-"}ms total=${result.totalMs ?? "-"}ms deltas=${result.deltaCount} chars=${result.charCount}\n`);
    // Small gap between turns to avoid hammering the API
    await new Promise((r) => setTimeout(r, 500));
  }

  const summary = summarize(samples);
  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      provider: PROVIDER,
      model: MODEL,
      apiUrl: API_URL
        .replace(/\/\/[^@/]+@/, "//[REDACTED]@")
        .replace(/([?&])(?:key|token|api[_-]?key)=([^&]+)/gi, "$1[REDACTED]"),
      world: WORLD_ID,
      session: SESSION_ID,
      turns: TURNS,
    },
    samples,
    summary,
  };
  try {
    mkdirSync(dirname(OUT), { recursive: true });
  } catch (e) {
    console.error("mkdir failed:", e.message);
  }
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${OUT}`);
  console.log(`\n=== Summary ===`);
  console.log(`successful turns: ${summary.successCount}/${TURNS}`);
  console.log(`firstTextMs: min=${summary.firstText.min} median=${summary.firstText.median} max=${summary.firstText.max} mean=${summary.firstText.mean.toFixed(0)}ms`);
  console.log(`totalMs:      min=${summary.total.min} median=${summary.total.median} max=${summary.total.max} mean=${summary.total.mean.toFixed(0)}ms`);
  console.log(`deltaCount:   min=${summary.deltaCount.min} median=${summary.deltaCount.median} max=${summary.deltaCount.max} mean=${summary.deltaCount.mean.toFixed(1)}`);
  console.log(`charCount:    min=${summary.charCount.min} median=${summary.charCount.median} max=${summary.charCount.max} mean=${summary.charCount.mean.toFixed(0)}`);
}

function stats(arr) {
  if (arr.length === 0) return { min: null, median: null, max: null, mean: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return { min, median, max, mean };
}

function summarize(samples) {
  const okSamples = samples.filter((s) => s.error === "ok");
  const firstTexts = okSamples.map((s) => s.firstTextMs).filter((v) => v != null);
  const totals = okSamples.map((s) => s.totalMs).filter((v) => v != null);
  const deltaCounts = okSamples.map((s) => s.deltaCount);
  const charCounts = okSamples.map((s) => s.charCount);
  return {
    successCount: okSamples.length,
    errorCount: samples.length - okSamples.length,
    errors: samples.filter((s) => s.error !== "ok").map((s) => s.error),
    firstText: stats(firstTexts),
    total: stats(totals),
    deltaCount: stats(deltaCounts),
    charCount: stats(charCounts),
  };
}

main().catch((e) => {
  console.error("FATAL:", redact(e && e.stack ? e.stack : String(e)));
  process.exit(1);
});
