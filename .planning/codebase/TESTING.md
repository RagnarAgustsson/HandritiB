# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- Vitest 2.1.1
- Config: `vitest.config.ts`
- Environment: Node.js (not browser)

**Assertion Library:**
- Vitest built-in expect API

**Run Commands:**
```bash
npm run test                # Run all tests (vitest --run)
npm run test:watch         # Watch mode (vitest)
```

**Configuration from `vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true  // Global test functions (describe, it, expect)
  }
});
```

## Test File Organization

**Location:**
- Tests co-located in `/tests/` directory (separate from source code)
- Organized by feature/module: `tests/pipeline/`, `tests/api/`, `tests/` root

**Naming:**
- Pattern: `[feature].test.ts`
- Examples: `db.test.ts`, `credit.test.ts`, `final-summary.test.ts`, `prompts.test.ts`

**Structure:**
```
tests/
├── api/
│   └── final-summary.test.ts
├── pipeline/
│   ├── db.test.ts
│   └── prompts.test.ts
└── credit.test.ts
```

## Test Structure

**Suite Organization:**

From `tests/pipeline/db.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('pipeline db helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('upserts recording session including optional recording name', async () => {
    // Test implementation
  });

  it('updates rolling summary and propagates errors', async () => {
    // Test implementation
  });
});
```

**Patterns:**
- Setup: `beforeEach()` for test isolation and mock restoration
- Teardown: `vi.restoreAllMocks()` between tests
- Assertion: Direct `expect()` calls with specific value checks

**Suite Nesting:**
- Single level of nesting: top-level `describe()` per module, multiple `it()` blocks

## Mocking

**Framework:** Vitest `vi` mock API

**Patterns:**

From `tests/pipeline/db.test.ts`:
```typescript
// Mock chaining pattern
const single = vi.fn().mockResolvedValue({ data: { session_id: 's1', rolling_summary: null, recording_name: 'Meeting', prompt_profile: 'meeting' }, error: null });
const select = vi.fn().mockReturnValue({ single });
const upsert = vi.fn().mockReturnValue({ select });
const client = {
  from: vi.fn().mockImplementation((table: string) => {
    expect(table).toBe('recording_sessions');
    return { upsert };
  })
} as any;

// Test execution
const result = await upsertRecordingSession(client, 's1', 'Meeting');
expect(result.recording_name).toBe('Meeting');
expect(upsert).toHaveBeenCalled();
```

**Fluent Mock Building:**
- Mocks built in reverse order matching Supabase client chain
- Each level returns object with next level's mock
- `vi.fn().mockResolvedValue()` for async operations
- `vi.fn().mockReturnValue()` for synchronous returns
- `vi.fn().mockImplementation()` for custom logic

**What to Mock:**
- Database clients (Supabase): Entire chain mocked with sequential returns
- API calls to external services
- Environment-dependent functions

**What NOT to Mock:**
- Pure utility functions: `chunkChargeSeconds()`, `paddedHoldSeconds()` tested with real implementations
- Simple value transformations: Direct assertions on return values

## Fixtures and Factories

**Test Data:**
```typescript
// From tests/credit.test.ts - Simple inline test data
it('prefers declared duration when available', () => {
  expect(estimateTotalSeconds({
    declaredDurationMs: 90500,
    totalChunks: 3,
    averageChunkSeconds: 45
  })).toBe(91);
});

// From tests/pipeline/db.test.ts - Mock response data
const data = [
  { seq: 2, transcript_text: 'b' },
  { seq: 1, transcript_text: 'a' }
];
```

**Location:**
- Inline in test files (no separate fixture directory)
- Mock Supabase responses created as test data

## Coverage

**Requirements:** No coverage enforcement configured

**View Coverage:**
- Not configured in vitest.config.ts
- Coverage reporting can be added with `vitest run --coverage` if needed

## Test Types

**Unit Tests:**
- **Scope:** Individual functions and pure logic
- **Approach:** Mocked dependencies, direct assertion on return values
- **Examples:** `credit.test.ts` tests `chunkChargeSeconds()`, `estimateTotalSeconds()`, `paddedHoldSeconds()` with various input combinations
- **Location:** `tests/pipeline/db.test.ts`, `tests/credit.test.ts`

**Integration Tests:**
- **Scope:** Database operations with Supabase client chains
- **Approach:** Full mock of client API with chained method stubs
- **Examples:** `tests/pipeline/db.test.ts` tests database CRUD operations: upsert, read, update
- **Location:** `tests/pipeline/` (database tests)

**E2E Tests:**
- **Status:** Not implemented
- **Framework:** None detected

## Common Patterns

**Async Testing:**
```typescript
// From tests/pipeline/db.test.ts
it('upserts recording session including optional recording name', async () => {
  const single = vi.fn().mockResolvedValue({
    data: { session_id: 's1', rolling_summary: null, recording_name: 'Meeting', prompt_profile: 'meeting' },
    error: null
  });
  const select = vi.fn().mockReturnValue({ single });
  const upsert = vi.fn().mockReturnValue({ select });
  const client = { from: vi.fn().mockReturnValue({ upsert }) } as any;

  const result = await upsertRecordingSession(client, 's1', 'Meeting');
  expect(result.recording_name).toBe('Meeting');
});
```

**Error Testing:**
```typescript
// From tests/pipeline/db.test.ts
it('updates rolling summary and propagates errors', async () => {
  const eq = vi.fn().mockReturnValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq });
  const client = { from: vi.fn().mockReturnValue({ update }) } as any;

  await expect(updateRecordingSummary(client, 's1', 'Summary'))
    .resolves.toBeUndefined();
  expect(update).toHaveBeenCalledWith({ rolling_summary: 'Summary' });
});
```

**API Route Testing:**
```typescript
// From tests/api/final-summary.test.ts
import { GET } from '../../app/api/final-summary/route';
import { NextRequest } from 'next/server';

describe('GET /api/final-summary', () => {
  it('returns 400 when sessionId is missing', async () => {
    const req = new NextRequest('http://localhost/api/final-summary');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
```

**Prompt Template Testing:**
```typescript
// From tests/pipeline/prompts.test.ts
process.env.PROMPT_SNAPSHOT_DISABLED = '1';

const { buildFinalSummaryPrompt } = await import('../../lib/pipeline/finalSummaryPrompt');

it('loads meeting system instructions from markdown template', () => {
  const prompt = buildFinalSummaryPrompt({ transcript: 'Halló', promptProfile: 'meeting' });

  expect(prompt[0]).toEqual(expect.objectContaining({ role: 'system' }));
  expect(prompt[0].content).toContain('Þú ert íslenskur faglegur fundaritari');
  expect(prompt[0].content).not.toContain('${ICELANDIC_LANGUAGE_RULES}');
});
```

## Testing Best Practices Observed

**Mock Isolation:**
- `beforeEach(() => { vi.restoreAllMocks(); })` ensures test independence
- Fresh mocks for each test prevent state leakage

**Assertion Specificity:**
- Tests assert on exact values: `expect(result.recording_name).toBe('Meeting')`
- Behavioral assertions: `expect(upsert).toHaveBeenCalled()` verifies correct methods called
- Structural assertions: `expect(prompt[0]).toEqual(expect.objectContaining({ role: 'system' }))` matches subset

**Input Coverage:**
- Edge cases tested: `expect(chunkChargeSeconds(-5)).toBe(60)` (negative input)
- Missing data handled: `expect(chunkChargeSeconds(undefined, 30)).toBe(30)` (fallback)
- Invalid inputs guarded: `expect(paddedHoldSeconds(Number.NaN)).toBe(1)` (non-finite)

**Error Scenarios:**
- Promise rejection patterns: `.resolves.toBeUndefined()` for successful async operations
- Specific error code checking: Tests for Supabase PGRST116 "no rows" error
- Null coalescing: Tests verify `null` returns for missing data

---

*Testing analysis: 2026-02-28*
