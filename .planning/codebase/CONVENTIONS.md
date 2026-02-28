# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `SummaryCard.tsx`, `RecordClient.tsx`, `BackButton.tsx`)
- Utility/hook files: camelCase (e.g., `useChunkRecorder.ts`, `keepAlive.ts`, `duration.ts`)
- API routes: route.ts and lowercase directory names (e.g., `/api/final-summary/route.ts`, `/api/admin/metrics/route.ts`)
- Type/utility modules: camelCase (e.g., `logging.ts`, `openai.ts`, `credit.ts`)

**Functions:**
- camelCase throughout (e.g., `chatCompletion()`, `upsertRecordingSession()`, `getRecordingChunk()`, `formatSeconds()`)
- Helper functions: camelCase with descriptive purpose (e.g., `buildFinalSummaryPrompt()`, `extractMessageContent()`, `mapSupabaseError()`)
- Predicates start with `is` or `get`: `isMediaRecorderSupported()`, `isPromptProfile()`, `getApiKey()`

**Variables:**
- camelCase for all variables and constants (e.g., `recordingName`, `sessionId`, `finalSummary`, `promptProfile`)
- Constants in UPPER_SNAKE_CASE (e.g., `DEFAULT_FALLBACK_SECONDS`, `CHUNK_CONTEXT_TOTAL`, `DEFAULT_SUMMARY_MODEL`, `ENABLE_ROLLING_SUMMARIES`)
- Type variables: PascalCase (e.g., `PromptProfile`, `StructuredNotes`, `RecorderSnapshot`)

**Types:**
- Type names: PascalCase (e.g., `RecordingSessionRow`, `RecordingChunkRow`, `RecordingMessageRole`)
- Type files: Exported as named types or interfaces
- Row types follow pattern: `[Entity]Row` (e.g., `RecordingSessionRow`, `RecordingChunkRow`, `RecordingMessageRow`)

## Code Style

**Formatting:**
- No detected linter config (.eslintrc, .prettierrc, biome.json not present)
- Implicit formatting standards observed: 2-space indentation, semicolons required
- TypeScript strict mode disabled (`strict: false` in tsconfig.json), allowing flexible typing

**Linting:**
- No formal linting configuration detected
- Code follows implicit standards around error handling and null coalescing

## Import Organization

**Order:**
1. External dependencies (React, Next.js, third-party libraries)
2. Relative imports from parent directories (`../../lib/`)
3. Relative imports from sibling or child directories (`./hooks`, `./components`)
4. Type imports grouped at end of import section

**Path Aliases:**
- Base alias: `@/*` maps to root directory (e.g., `@/lib/supabase/service`)
- Used primarily in API routes and shared utilities
- Relative imports preferred within feature modules

**Examples from codebase:**
```typescript
// Pattern from app/record/RecordClient.tsx
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useChunkRecorder } from './useChunkRecorder';
import { CopyLink } from '../components/CopyLink';
import { SummaryCard } from '../components/SummaryCard';
import { BackButton } from '../components/BackButton';
import { useAuth } from '../components/AuthProvider';
import { normaliseNotes, type StructuredNotes } from '../../lib/pipeline/notes';
import { DEFAULT_PROMPT_PROFILE, type PromptProfile } from '../../lib/pipeline/promptProfile';

// Pattern from app/api/final-summary/route.ts
import { NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '../../../lib/supabase/service';
import { DEFAULT_PROMPT_PROFILE, isPromptProfile } from '../../../lib/pipeline/prompts';
import type { StructuredNotes } from '../../../lib/pipeline/notes';
import type { PromptProfile } from '../../../lib/pipeline/prompts';
```

## Error Handling

**Patterns:**
- Errors thrown as `Error` instances with descriptive messages: `throw new Error(`Failed to upsert recording session: ${error.message}`)`
- API responses use status codes: 400 for bad requests, 404 for not found, 500 for server errors
- Graceful fallback on missing resources: `(data as RecordingChunkRow) ?? null`
- Error context logging with structured objects: `console.error(message, { sessionId, error: message })`
- Supabase error codes checked explicitly: `if (error && error.code !== 'PGRST116')`
- Database operations wrapped with error mapping: `mapSupabaseError(prefix, error)`

**Error Response Example from `lib/openai.ts`:**
```typescript
function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for chat completions.');
  }
  return apiKey;
}
```

**Error Handling in Database Operations from `lib/pipeline/db.ts`:**
```typescript
export async function upsertRecordingSession(...): Promise<RecordingSessionRow> {
  let { data, error } = await client.from('recording_sessions').upsert(sessionData, { onConflict: 'session_id' }).select(...).single();

  if (error && error.message.includes("'prompt_profile' column")) {
    // Fallback logic
    ({ data, error } = await client.from('recording_sessions').upsert(fallback, { onConflict: 'session_id' }).select(...).single());
    if (error) {
      throw new Error(`Failed to upsert recording session: ${error.message}`);
    }
  }

  if (error) {
    throw new Error(`Failed to upsert recording session: ${error.message}`);
  }
  return data as RecordingSessionRow;
}
```

## Logging

**Framework:** `console` methods directly (info, warn, error, debug)

**Wrapper:** Custom logger at `lib/logging.ts` provides abstraction:
```typescript
export const logger = {
  info(message: string, context?: LogContext),
  warn(message: string, context?: LogContext),
  error(message: string, context?: LogContext),
  debug(message: string, context?: LogContext)  // Only in non-production
};
```

**Patterns:**
- Structured logging with context objects: `console.info('[final-summary] session info', { sessionId, promptProfile })`
- Error context serialization: Errors converted to objects with name, message, stack, and custom properties
- Prefixed log messages for traceability: `[final-summary]`, `[RECORD DEBUG]`, `[pipeline]`
- Async operations logged at start and completion: timing tracked with `Date.now()`

**Examples from `app/api/final-summary/route.ts`:**
```typescript
console.info('[final-summary] session info', { sessionId, promptProfile: sessionPromptProfile });
console.info('[final-summary] combined response generated', { sessionId, summaryChars: finalSummary?.length || 0 });
console.warn('[final-summary] generation failed', { sessionId, error: finalSummaryError });
console.warn('[final-summary] push failed', e);
```

## Comments

**When to Comment:**
- Complex business logic requiring explanation (e.g., fallback strategies, algorithm reasoning)
- Marker comments for state updates or important side effects: `// Fire-and-forget push notification...`
- Debug comments often left inline: `// console.log('🔍 [RECORD DEBUG] RecordClient mount', {...})`
- Template variable substitution comments: `// Create empty structured notes since we're now including this info in the summary text`

**JSDoc/TSDoc:**
- Not consistently used; types inferred from code
- Type annotations preferred over comments: `export type UploadError = { message: string; chunkSeq: number | null; }`

## Function Design

**Size:** Typical function length 15-50 lines; larger functions decompose into helper functions

**Parameters:**
- Named parameters passed as objects for functions with multiple related arguments:
```typescript
export async function upsertRecordingMessage(
  client: ServiceSupabaseClient,
  params: {
    sessionId: string;
    seq: number;
    role: RecordingMessageRole;
    content: string;
  }
): Promise<void>
```

- Single client/context object passed as first parameter in database/service functions

**Return Values:**
- Promises for async operations: `Promise<RecordingSessionRow>`, `Promise<void>`
- Null for missing data: `Promise<RecordingChunkRow | null>`
- Status unions for complex state:
```typescript
export type RecorderStatus =
  | { state: 'idle'; message: string | null }
  | { state: 'recording'; message: string | null }
  | { state: 'stopping'; message: string | null }
  | { state: 'error'; message: string };
```

## Module Design

**Exports:**
- Named exports preferred over default exports
- Type exports marked with `type` keyword: `import type { PromptProfile } from './prompts'`
- Database functions exported individually rather than as namespace
- Service client types exported for use in other modules: `export type ServiceSupabaseClient = ReturnType<typeof getSupabaseServiceClient>`

**Barrel Files:**
- Not extensively used; imports mostly point to specific files
- Feature modules (`pipeline/`, `audio/`, `supabase/`) organized by responsibility

**File Patterns:**
- Server-side utilities in `lib/` directory: `lib/openai.ts`, `lib/logging.ts`, `lib/pipeline/db.ts`
- Client components use `'use client'` directive at top of file
- API routes export named functions: `export async function GET(req: NextRequest)`, `export async function POST(req: NextRequest)`
- Hooks prefixed with `use`: `useChunkRecorder.ts`, hooks exported as named functions

---

*Convention analysis: 2026-02-28*
