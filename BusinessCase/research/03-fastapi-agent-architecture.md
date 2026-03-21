# FastAPI WebSocket Agent — Architecture Reference

*Researched: 2026-03-21*

## Core pattern: Dual-task per connection

```
WebSocket connects
  → Consumer task: reads transcript chunks from WebSocket, puts in asyncio.Queue
  → Processor task: reads from queue, calls LLM, updates state, pushes results back
```

Use `asyncio.TaskGroup` (Python 3.11+) for structured concurrency:
```python
async with asyncio.TaskGroup() as tg:
    tg.create_task(consume_chunks(websocket, queue))
    tg.create_task(process_and_respond(websocket, queue, state))
```

Do NOT use FastAPI's `BackgroundTasks` — those are fire-and-forget HTTP tasks.

## Long-running sessions (2+ hours)

- Uvicorn's built-in WebSocket ping/pong (every 20s) keeps connections alive through proxies
- Config: `--ws-ping-interval 20 --ws-ping-timeout 30`
- Also implement application-level heartbeats (client sends `{"type": "heartbeat"}` periodically)
- No timeout on WebSocket duration in Uvicorn

## State management

**Recommended: In-memory dict + periodic DB snapshots**

```python
sessions: dict[str, MeetingState] = {}
```

`MeetingState` contains: agenda items + check status, running summary, speaker stats, recent context window, action items, health metrics.

- Hot state in memory for speed
- Snapshot to Neon DB every N chunks or every M seconds
- On reconnection, reload from last snapshot

**Concurrency:** Single async worker = no locks needed within one handler. If multiple `create_task` coroutines modify same state, use `asyncio.Lock()` per session.

## Reconnection handling

**Client side:**
- Assign `session_id` (UUID) at meeting start
- On disconnect: exponential backoff (1s, 2s, 4s... cap 30s)
- Send `session_id` on reconnect + `last_received_sequence_number`

**Server side:**
- New WebSocket with existing `session_id` → associate with existing state
- Send state sync message (current agenda, summary, etc.)
- 5-minute grace period before cleanup on disconnect
- Replace old WebSocket reference with new one

## Concurrency across meetings

- Each WebSocket = one asyncio Task
- Hundreds of concurrent connections per worker
- `asyncio.Semaphore` to cap concurrent LLM calls (avoid hammering OpenRouter)
- `httpx.AsyncClient` for non-blocking OpenRouter calls with per-request timeouts

## Graceful shutdown

**Per-meeting (normal end):**
1. Client sends `{"type": "end_meeting"}`
2. Persist final state, trigger final summary generation
3. Send summary back, close WebSocket
4. Remove session from active dict

**Server shutdown (lifespan):**
```python
@asynccontextmanager
async def lifespan(app):
    yield  # startup
    # shutdown: save all active session states
```

Use `asyncio.shield()` to protect critical save operations from CancelledError.

## Error handling

```python
try:
    # main handler loop
except WebSocketDisconnect:
    # save state, start grace period
except asyncio.CancelledError:
    # server shutting down, save everything
    raise  # must re-raise
except Exception:
    # log, save state, try to notify client
finally:
    # cleanup
```

LLM call failures: retry with backoff, after N failures send error to client, queue chunks for later batch processing. Meeting continues regardless.

## Key libraries
- `fastapi` + `uvicorn[standard]` (websockets protocol)
- `httpx` (async HTTP for OpenRouter)
- `fastapi-clerk-auth` (Clerk JWT verification)
- `asyncpg` or `sqlalchemy[asyncio]` (Neon DB)
