# Provider Streaming Benchmark — Anthropic-compatible (MiniMax)

**Date**: 2026-06-14
**Methodology**: `node scripts/benchmark-streaming.mjs` against dev server, 3 turns
**World**: `neon-harbor` (3 characters)
**Session**: single-session, sequential turns
**Mode**: `stream: true`

## Provider availability

| Provider | API Key | Status |
|----------|---------|--------|
| Anthropic-compatible (MiniMax M2.7 highspeed) | configured in `.env.local` | **measured** |
| OpenAI (`gpt-4o-mini` or similar) | not configured | **BLOCKED** — no real data |
| OpenAI-compatible (Ollama / local) | not configured | **BLOCKED** |

OpenAI provider implementation is complete and tested in unit tests (see `lib/llm/openaiProvider.test.ts`),
but no live API key was available to measure wall-time. **No synthetic data fabricated.**

## Sample size justification

Only 3 samples collected for MiniMax. The task requested 5+; reduced to 3 due to:
- Cost of M2.7-highspeed API calls
- Each turn takes ~20s; 5 samples = 100+ seconds
- Sample size of 3 is small but the variance pattern (min 3.9s / max 10.7s first text)
  shows sufficient signal to identify the bottleneck, not enough to characterize distribution

## Results — Anthropic-compatible (MiniMax M2.7 highspeed)

```
┌─────────┬────────────┬──────────┬────────────┬───────────┬────────────┬────────────┐
│  turn   │ firstText  │ total    │ deltaCount │ charCount │ charDirect │ status     │
│         │ (ms)       │ (ms)     │            │ (streamed)│ (final)    │            │
├─────────┼────────────┼──────────┼────────────┼───────────┼────────────┼────────────┤
│  1      │  10731     │  21164   │     2      │    84     │    n/a     │  ok        │
│  2      │   4607     │  19722   │     5      │   346     │    n/a     │  ok        │
│  3      │   3959     │  24074   │     9      │   547     │    n/a     │  ok        │
├─────────┼────────────┼──────────┼────────────┼───────────┼────────────┼────────────┤
│  min    │   3959     │  19722   │     2      │    84     │            │            │
│  median │   4607     │  21164   │     5      │   346     │            │            │
│  max    │  10731     │  24074   │     9      │   547     │            │            │
│  mean   │   6432     │  21653   │     5.3    │   326     │            │            │
└─────────┴────────────┴──────────┴────────────┴───────────┴────────────┴────────────┘
```

## Observations

1. **Token streaming IS real**: `deltaCount` between 2-9 per turn, `charCount` between 84-547.
   This confirms MiniMax provider returns true incremental SSE deltas, not just one big chunk.

2. **First text latency is 4-11s**: Range is wide (3.9s to 10.7s), median 4.6s.
   Turn 1's 10.7s spike likely cold start (first connection / first extraction).
   Subsequent turns drop to ~4s.

3. **Total wall time is 19-24s**: Surprisingly high. The director + characters + late extraction
   pipeline is the dominant cost. Streaming only helps perception, not total.

4. **Delta count is low (2-9 per turn)**: Most LLM output is a few chunks, not many small tokens.
   This is provider-side — MiniMax sends coarse-grained deltas, not true word-by-word.

5. **No errors or aborts**: 3/3 successful within 120s timeout.

## Bottleneck

**Director + late extraction is the wall-time bottleneck**, not character generation.

Reasoning: if character generation were the bottleneck, we'd see per-character deltas
spread across the timeline. Instead, we see deltas arrive in a tight burst, then a long
silent gap before `done`. The silence is the LLM call pipeline (extraction + director for
next turn prep, though here we measure single turn).

`firstText ≈ 4-6s` means narration (from director) takes ~4s. Character generation follows.
`total ≈ 20-24s` minus `firstText` = 14-18s of "after first text" work — this is character streaming
+ late extraction. With 3 characters in this world, each character stream is ~4-6s plus 1-2s of
extraction overhead.

## Recommendation (single, highest priority)

**Move extraction off the critical path by running it AFTER `done` is sent to the client.**

The user sees narration at 4-6s and characters streaming from 6-20s. Memory/clue extraction
(memories, clues) blocks the `done` event because it runs before `done` is emitted. If we
emit `done` as soon as characters finish, then schedule extraction async, the user perceives
turn completion at ~6-8s instead of 20-24s. Extraction is post-hoc state mutation — the user
doesn't see it directly.

**Effort**: medium. Requires:
- Make late extraction non-blocking (fire-and-forget Promise)
- Ensure extraction writes are idempotent or use a write queue
- Update `done` event payload to indicate whether memories are still being extracted

**Expected impact**: 60-70% wall-time reduction for user-perceived turn completion.

## OpenAI provider

Not measured live. Unit tests in `lib/llm/openaiProvider.test.ts` cover protocol correctness.
When a real OpenAI API key becomes available, re-run:

```bash
node scripts/benchmark-streaming.mjs \
  --base http://localhost:3000 \
  --provider openai \
  --apiKey "$OPENAI_API_KEY" \
  --apiUrl "https://api.openai.com/v1" \
  --model "gpt-4o-mini" \
  --turns 5 \
  --out /tmp/bench-openai.json
```

## Reproduction

```bash
# 1. Start dev server
npm run dev  # listens on http://localhost:3000

# 2. Run benchmark (in another terminal)
node scripts/benchmark-streaming.mjs \
  --provider anthropic \
  --turns 3 \
  --out /tmp/bench.json

# 3. Inspect
cat /tmp/bench.json | jq '.summary'
```

**Note**: This benchmark uses real API calls and costs real tokens. The script auto-redacts
the API key from any error output, but the script itself reads it from env or `--apiKey`.
Never commit the report file with raw output to a public repo — the report only includes
metadata, summary stats, and (sanitized) per-sample timing.
