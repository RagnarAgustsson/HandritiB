# OpenRouter API — Integration Reference

*Researched: 2026-03-21*

## Core concept
OpenAI-compatible LLM gateway. One API key, 290+ models, automatic fallback.

**Base URL:** `https://openrouter.ai/api/v1`

## Drop-in SDK replacement

```python
# Python — just change base_url
from openai import OpenAI
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key="...")
```

```typescript
// TypeScript — same
import OpenAI from 'openai';
const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});
```

Also: official `@openrouter/sdk` (npm, beta).

## Model selection

Format: `provider/model-name`
- `anthropic/claude-sonnet-4` / `anthropic/claude-haiku-4-5`
- `google/gemini-2.5-flash` / `google/gemini-2.5-pro`
- `openai/gpt-4o` / `openai/gpt-5.4`

Suffixes: `:nitro` (throughput), `:floor` (cheapest), `:free` (free variant)

**List models:** `GET /api/v1/models` — returns pricing, context length, supported params.

## Streaming
SSE format identical to OpenAI. `stream: true` in request body.
Keepalive comments: `: OPENROUTER PROCESSING` (ignored by SSE parsers).
Mid-stream errors arrive as SSE events with `finish_reason: "error"`.

## Fallback routing

**Model-level:**
```json
{ "models": ["anthropic/claude-sonnet-4", "openai/gpt-4o", "google/gemini-2.5-pro"] }
```
Triggers on: context length errors, moderation, rate limiting, downtime.

**Provider-level (`provider` object):**
- `order`: Try providers in sequence
- `sort`: `"price"` | `"throughput"` | `"latency"`
- `allow_fallbacks`: boolean
- `zdr`: boolean (zero data retention only)
- `max_price`: price ceiling
- `data_collection`: `"allow"` | `"deny"`

## Tool use / Function calling
Fully supported. Same format as OpenAI (`tools` array, `tool_choice`, `parallel_tool_calls`).
Works in streaming mode. Filter models: `openrouter.ai/models?supported_parameters=tools`.

## Prompt caching (Anthropic via OpenRouter)
- Automatic: `"cache_control": { "type": "ephemeral" }` on request
- Explicit: `cache_control` on individual content blocks (max 4 breakpoints)
- TTL: 5 min (ephemeral) or 1 hr
- Pricing: writes 1.25-2x input, reads 0.1x input
- Sticky routing: OpenRouter auto-routes to same provider to maximize cache hits

## Authentication
- `Authorization: Bearer <key>`
- Optional: `HTTP-Referer`, `X-OpenRouter-Title` for attribution
- Provider-specific beta headers pass through (e.g., `x-anthropic-beta`)

## Rate limits
- Global per account (not per key)
- Free models have per-minute and per-day caps
- Credit system: negative balance blocks all requests

## Curated model list for Handriti

| Model | Input/Output $/M | Use case |
|-------|------------------|----------|
| Claude Sonnet 4 | $3/$15 | Pro tier: formal meetings, board minutes |
| Claude Haiku 4.5 | $0.80/$4 | Daily meetings (fast, cheap) |
| Gemini 2.5 Flash | $0.30/$2.50 | Starter tier: good Icelandic, very cheap |
| Qwen 3.5 Flash | $0.065/$0.26 | Free/budget tier |
| Claude Opus 4.6 | $5/$25 | Complex analysis (rare) |

**LLM cost per 1hr meeting (~15K input + 5K output tokens):**
- Claude Sonnet: ~$0.12
- Gemini 2.5 Flash: ~$0.02
- Qwen 3.5 Flash: ~$0.002
