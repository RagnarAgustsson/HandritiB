# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
.
├── app/                    # Next.js App Router - pages and API routes
│   ├── (admin)/            # Admin dashboard routes (protected)
│   ├── api/                # API route handlers (organizing by feature)
│   ├── auth/               # Authentication callback pages
│   ├── capture/            # Large file upload page
│   ├── components/         # Shared React components
│   ├── record/             # Real-time recording page
│   ├── results/            # Session results display page
│   ├── checkout/           # Payment flow pages
│   ├── heim/               # Home page
│   ├── leidbeiningar/      # Help/guidelines page
│   ├── personuvernd/       # Privacy policy
│   ├── skilmalar/          # Terms of service
│   ├── um-okkur/           # About page
│   ├── layout.tsx          # Root layout (auth + session setup)
│   ├── error.tsx           # Global error boundary
│   └── globals.css         # Global styles
├── lib/                    # Shared server/client utilities
│   ├── admin/              # Admin authorization and receipts
│   ├── api/                # API response types and helpers
│   ├── audio/              # Audio processing (duration, metadata)
│   ├── client/             # Client-side chunking strategies
│   ├── pipeline/           # Core transcription/summarization pipeline
│   ├── supabase/           # Database and auth client setup
│   ├── utils/              # General utilities (retry, logging, snapshots)
│   ├── company.ts          # Company metadata
│   ├── logging.ts          # Structured logging
│   ├── openai.ts           # OpenAI API clients (chat, transcription)
│   ├── transcription.ts    # Icelandic speech-to-text with context
│   ├── usage.ts            # Credit consumption tracking
│   ├── push.ts             # Web push notification setup
│   └── valitor.ts          # Icelandic payment provider integration
├── prompts/                # LLM prompt templates
│   └── final-summary/      # Final summary prompt files
├── supabase/               # Supabase migrations and functions
├── public/                 # Static assets
├── docs/                   # Documentation files
├── tests/                  # Test files (Vitest)
├── scripts/                # Utility scripts (sync, kill servers)
├── local-debug/            # Debug snapshots for development
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── next.config.js          # Next.js config
└── vitest.config.ts        # Test runner config
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router - all user-facing pages and API endpoints
- Contains: `.tsx` page files, `.ts` API route handlers, shared components
- Key files: `layout.tsx` (root), `page.tsx` (route files), `route.ts` (API)

**`app/api/`:**
- Purpose: REST API endpoints organized by feature/domain
- Contains: Route handlers for audio upload, transcription, summaries, payments
- Subfolders: `admin/` (admin endpoints), `auth/` (auth callbacks), `email/` (notifications)

**`app/components/`:**
- Purpose: Reusable React components used across pages
- Contains: Header, Footer, Auth buttons, Recording UI, Cards (Summary, Notes), etc.
- Pattern: One component per `.tsx` file, exported as default or named export

**`lib/pipeline/`:**
- Purpose: Core business logic for transcription and summarization
- Contains:
  - `db.ts`: Supabase CRUD operations for sessions, chunks, messages
  - `processChunk.ts`: Chunk processing orchestration
  - `prompts.ts`: Prompt builders for different contexts
  - `finalSummaryPrompt.ts`: Final composite summary prompt
  - `notes.ts`: Structure normalization for extracted notes
  - `jobQueue.ts`: Serial task queue for async processing
  - `config.ts`: Environment configuration (model names, timeouts)
  - `credit.ts`: Credit consumption calculation
  - `uploader.ts`: Chunked file upload management

**`lib/supabase/`:**
- Purpose: Supabase client initialization and profile management
- Contains:
  - `server.ts`: Server-side client (with cookies)
  - `client.ts`: Client-side client (for browser)
  - `service.ts`: Service role client (for server-only operations)
  - `profile.ts`: User profile fetching and initialization

**`lib/api/`:**
- Purpose: Shared API types and response helpers
- Contains:
  - `types.ts`: `ApiSuccess<T>`, `ApiError`, response types for major endpoints
  - `responses.ts`: `jsonOk()`, `jsonError()` response builders
  - `fetch.ts`: JSON response parsing helper

**`lib/audio/`:**
- Purpose: Audio file processing utilities
- Contains:
  - `duration.ts`: Extract duration from audio buffers via FFmpeg
  - `metadata.ts`: Parse audio metadata

**`lib/client/`:**
- Purpose: Client-side file/audio chunking strategies
- Contains:
  - `fileChunker.ts`: Generic file splitting (base implementation)
  - `audioTimeChunker.ts`: Time-based audio splitting
  - `bestPracticeChunker.ts`: Optimized chunking combining strategies
  - `robustFileChunker.ts`: Network-resilient chunking with retry
  - `simpleFileChunker.ts`: Minimal implementation for testing

**`lib/utils/`:**
- Purpose: General-purpose utility functions
- Contains:
  - `retry.ts`: Exponential backoff retry logic
  - `logging.ts`: Structured logging (also at `lib/logging.ts`)
  - `promptSnapshot.ts`: Debug snapshots of prompts sent to LLM
  - `responseSnapshot.ts`: Debug snapshots of LLM responses
  - `saveBlob.ts`: Browser blob download helper
  - `collapseRepeats.ts`: Transcript cleaning

**`lib/admin/`:**
- Purpose: Admin-specific utilities
- Contains:
  - `auth.ts`: `hasAdminAccess()` role checking
  - `receipts.ts`: Payment receipt generation

**`supabase/`:**
- Purpose: Supabase migrations and edge functions
- Contains: `.sql` migration files and TypeScript edge function implementations

**`prompts/`:**
- Purpose: Organized prompt templates for LLM calls
- Location: `prompts/final-summary/` contains specialized prompts
- Pattern: Can be inline (in `prompts.ts`) or file-based depending on size

**`tests/`:**
- Purpose: Vitest unit and integration tests
- Contains:
  - `api/`: API route tests
  - `pipeline/`: Pipeline logic tests
- Pattern: `*.test.ts` co-located with code being tested

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout - authenticates user, wraps app with AuthProvider
- `app/heim/page.tsx`: Home/index page
- `app/record/page.tsx`: Real-time recording interface
- `app/capture/page.tsx`: Large file upload interface
- `app/results/[sessionId]/page.tsx`: Results display page

**Configuration:**
- `tsconfig.json`: TypeScript compiler options, path aliases (`@/*`)
- `next.config.js`: Next.js build configuration (PWA setup)
- `vitest.config.ts`: Test runner configuration
- `.env` (not committed): API keys, database URL, etc.
- `lib/pipeline/config.ts`: Model names, timeouts, feature flags

**Core Logic:**
- `lib/pipeline/processChunk.ts`: Chunk→Summary→Notes pipeline
- `lib/transcription.ts`: Audio→Text with Icelandic context
- `lib/openai.ts`: OpenAI API client wrapper
- `lib/pipeline/db.ts`: All database operations
- `app/api/large-audio-upload/route.ts`: Multi-segment upload handler

**Testing:**
- `tests/pipeline/`: Pipeline tests
- `tests/api/`: API route tests
- `vitest.config.ts`: Test configuration

## Naming Conventions

**Files:**
- Server components: `PageName.tsx` (e.g., `RecordClient.tsx` - client-side component)
- API routes: `route.ts` (required by Next.js)
- Utilities: `camelCase.ts` (e.g., `fileChunker.ts`, `retry.ts`)
- Types only: `types.ts` (e.g., `lib/api/types.ts`)
- Tests: `*.test.ts` (e.g., `processChunk.test.ts`)
- Database: `db.ts` when it's the main data access layer

**Directories:**
- Kebab-case for routes: `app/large-audio-upload/`, `app/checkout/`
- Kebab-case for feature subdirs: `app/api/admin/credits/adjust/`
- Camel-case for utility folders: `lib/utils/`, `lib/client/`
- Singular nouns for domains: `lib/admin/`, `lib/audio/`, `lib/supabase/`

**Functions:**
- Async operations: start with verb (e.g., `fetchProfile()`, `processChunk()`)
- Builders/factories: `build*` prefix (e.g., `buildLiveSummaryPrompt()`)
- Type guards: `is*` prefix (e.g., `isPromptProfile()`)
- Getters: `get*` prefix (e.g., `getServiceClient()`)

**Variables:**
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_COMBINED_MODEL`, `MAX_TOTAL_BYTES`)
- Regular vars/params: `camelCase` (e.g., `sessionId`, `promptProfile`)

**Types:**
- Interfaces: `PascalCase` (e.g., `Profile`, `PromptProfile`)
- Type aliases: `PascalCase` (e.g., `ApiSuccess<T>`, `ProcessChunkInput`)
- Discriminated unions end with name suffix (e.g., `ApiSuccess`, `ApiError`)

## Where to Add New Code

**New Feature (e.g., new audio format support):**
- Primary code: `lib/audio/newFormat.ts` (utility) or `app/api/new-endpoint/route.ts` (endpoint)
- Tests: `tests/audio/newFormat.test.ts` or `tests/api/new-endpoint.test.ts`
- Types: Add to `lib/api/types.ts` if response type, else co-locate in feature file
- Prompts: If new prompt template, add to `lib/pipeline/prompts.ts` or `prompts/` directory

**New Component/Module:**
- UI Component: `app/components/FeatureName.tsx`
- Server-side utility: `lib/feature/operation.ts`
- Test: `tests/feature/operation.test.ts`
- Export from barrel if needed: Create `lib/feature/index.ts` exporting public API

**New API Endpoint:**
- Route handler: `app/api/feature-name/route.ts`
- Shared types: `lib/api/types.ts` (append new response type)
- Logic: `lib/pipeline/` or `lib/feature/` depending on scope
- Test: `tests/api/feature-name.test.ts`

**Utilities/Helpers:**
- General utilities: `lib/utils/helperName.ts`
- Domain-specific: `lib/domain/helperName.ts` (e.g., `lib/audio/`, `lib/client/`)
- Export from domain index if creating barrel

**Adding Database Tables:**
- Migration: Create new `.sql` file in `supabase/migrations/`
- CRUD operations: Add to `lib/pipeline/db.ts` or `lib/supabase/` as appropriate
- Type definition: Co-locate with CRUD functions in db.ts

## Special Directories

**`app/(admin)/`:**
- Purpose: Admin dashboard routes protected by role
- Generated: No (committed)
- Committed: Yes
- Access: Routes only accessible to users with `hasAdminAccess() === true`

**`local-debug/`:**
- Purpose: Store snapshots of prompts and responses for debugging
- Generated: Yes (created by `savePromptSnapshot()` and `responseSnapshot()` utilities)
- Committed: No (in `.gitignore`)
- Use: Inspect what prompts/responses were sent during development

**`prompts/`:**
- Purpose: Prompt template organization
- Generated: No
- Committed: Yes
- Structure: Can be `.ts` files exporting template strings or `.txt`/`.md` files

**`supabase/`:**
- Purpose: Database schema and edge functions
- Generated: Partially (via `supabase migrate`)
- Committed: Yes (migrations)
- Contains: `.sql` migration files for schema creation/updates

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by `npm run build`)
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-02-28*
