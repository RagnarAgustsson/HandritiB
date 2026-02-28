# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Debug logging left enabled in production code:**
- Issue: Multiple files have `DEBUG` flag hardcoded to `true` or forced on
- Files:
  - `app/api/upload-audio-chunk/route.ts` (line 373): `const DEBUG = process.env.UPLOAD_CHUNK_DEBUG === '1' || true;` - **Temporarily forced to true**
  - `app/api/large-audio-upload/route.ts` (line 418): Uses development defaults
  - `app/record/useChunkRecorder.ts` (line 128): DEBUG enabled in recorder
- Impact: Excessive logging in production increases memory usage and potentially exposes sensitive transcription data in logs
- Fix approach: Remove hardcoded `true` defaults, respect environment variables only

**Commented-out debug console.log statements throughout codebase:**
- Issue: Hundreds of commented debug logs (326+ occurrences) clutter code
- Files: `AuthButtons.tsx`, `AuthProvider.tsx`, `HandritiApp.tsx`, `transcription.ts`, and many others
- Impact: Code readability reduced, harder to distinguish actual comments from disabled logs
- Fix approach: Remove all commented console.log statements; use environment-gated logger calls for legitimate debugging

**Untyped 'as any' and ': any' type assertions:**
- Issue: 94 instances of unsafe type assertions in TypeScript code
- Files: Scattered across `app/` and `lib/` directories
- Impact: Loss of type safety, harder to refactor, potential runtime errors
- Fix approach: Replace with proper TypeScript types or use Partial<T>, unknown, or proper generics

**Empty or overly permissive catch blocks:**
- Issue: 62 instances of empty catch blocks (`catch {}`) that silently swallow errors
- Files: Throughout audio upload handlers, duration probing, and file operations
- Impact: Critical failures (e.g., ffmpeg not found) go unlogged, making debugging production issues extremely difficult
- Fix approach: Log all caught errors at minimum warn level

**Disabled WebM header processing feature flag:**
- Issue: `DISABLE_WEBM_PROCESSING` environment variable in `app/api/upload-audio-chunk/route.ts` (line 490)
- Files: `app/api/upload-audio-chunk/route.ts`
- Impact: Code path exists to disable essential audio format fixes but lacks documentation
- Fix approach: Document when/why this should be disabled or remove if no longer needed

## Known Bugs

**Credit consumption race condition:**
- Symptoms: User can consume credit before WebM processing completes, leading to unexpected charges
- Files: `app/api/upload-audio-chunk/route.ts` (lines 602-630)
- Trigger: Rapid sequential uploads with header processing enabled
- Details: `consumeSeconds()` called before WebM header validation; if header processing later fails and retries with fallback, user charged twice for same content
- Workaround: Disable `DUMP_UPLOADED_SEGMENTS` to reduce I/O and side effects

**Degenerate transcript detection heuristic too broad:**
- Symptoms: Valid transcripts in languages with high word repetition (Icelandic compounds) flagged as degenerate
- Files: `app/api/large-audio-upload/route.ts` (lines 312-334)
- Details: `isDegenerateTranscript()` checks for uniqueness < 15% and n-gram repetition >= 8; legitimate Icelandic text can trigger this
- Impact: Legitimate audio incorrectly triggers WAV re-encoding, increasing latency and processing overhead

**FFmpeg path resolution race condition:**
- Symptoms: `findFfmpegPath()` can return cached path that was deleted between routes
- Files: `app/api/large-audio-upload/route.ts` (lines 51-86)
- Trigger: Multiple concurrent uploads on system where ffmpeg is installed to a mutable location
- Workaround: Set explicit `FFMPEG_PATH` environment variable

**Session state synchronization issue in HandritiApp:**
- Symptoms: Credit display shows zero even when user has remaining seconds
- Files: `app/upload/HandritiApp.tsx` (lines 123-152)
- Details: Complex state reconciliation between hydrated credit, auth profile, and API responses can result in displayingzero when actual value is positive
- Cause: Multiple sources of truth for remaining seconds without clear precedence
- Workaround: Hard refresh page to resync state

## Security Considerations

**API keys exposed in error responses:**
- Risk: OpenAI API errors may contain request details in error logs
- Files: `app/api/large-audio-upload/route.ts` (line 407): `const txt = await res.text().catch(()=> '')`
- Current mitigation: Error text is sliced to 300 chars, but could still leak key patterns
- Recommendations:
  - Never expose OpenAI response bodies in client responses
  - Log errors server-side only with sanitization
  - Use error codes instead of full messages for client responses

**Supabase RPC calls lack explicit permission checks:**
- Risk: `consume_seconds()` and `refund_seconds()` RPCs called without verifying user owns the queried session
- Files: `lib/usage.ts` (lines 10-30, 36-48)
- Current mitigation: Supabase RLS policies should enforce this, but unclear from code
- Recommendations:
  - Add explicit comments verifying RLS policy enforces user isolation
  - Consider audit logging for all credit transactions

**WebM header cache uses sessionId as key without validation:**
- Risk: If sessionIds are predictable or reused, one user's audio could be injected into another's
- Files: `app/api/upload-audio-chunk/route.ts` (lines 55-68)
- Current mitigation: SessionIds generated client-side with UUID, but no server validation
- Recommendations:
  - Validate sessionId matches authenticated user before using cached header
  - Consider moving cache to user-scoped storage instead of global

**Form data parsing doesn't validate expected types:**
- Risk: Client can send malformed or oversized promptProfile, leading to unexpected behavior
- Files: `app/api/upload-audio-chunk/route.ts` (lines 375-378), `app/api/large-audio-upload/route.ts` (lines 446-448)
- Current mitigation: `isPromptProfile()` check exists
- Recommendations: Validate all form fields with explicit schemas (use Zod or similar)

## Performance Bottlenecks

**Large file WebM segmentation performance:**
- Problem: Adaptive split tries multiple segment durations sequentially before finding viable size
- Files: `app/api/large-audio-upload/route.ts` (lines 225-306)
- Cause: No caching of previous successful segment durations; each large file re-attempts all candidates
- Impact: 600MB files can spend 5+ minutes trying segment sizes
- Improvement path:
  - Cache successful segment durations per user/mime-type
  - Use previous session's duration as starting hint
  - Implement parallel probing of multiple candidates (CPU-bound, safe to parallelize on multi-core systems)

**FFmpeg process spawning without resource limits:**
- Problem: No memory limits, timeout, or process limits on ffmpeg child processes
- Files: `app/api/large-audio-upload/route.ts` (lines 115-124, 187-221, 271-289)
- Impact: Single malformed file can consume unlimited memory, crash server
- Improvement path:
  - Spawn with explicit memory limits via `RLIMIT_AS`
  - Add 30s timeout to all ffmpeg operations
  - Implement process pooling to limit concurrent transcodes

**Synchronous file I/O during request handling:**
- Problem: `fs.writeFileSync()`, `fs.readFileSync()`, `fs.mkdirSync()` called in async request handlers
- Files:
  - `app/api/upload-audio-chunk/route.ts` (lines 426, 557, 562)
  - `app/api/large-audio-upload/route.ts` (lines 461, 545)
- Impact: Blocks entire request when filesystem is slow (NFS, poor SSD performance)
- Improvement path: Replace with async fs operations (`fs.promises.writeFile()` etc.)

**Chunk duration probing sequential bottleneck:**
- Problem: `probeSegmentDuration()` called sequentially for all segments
- Files: `app/api/large-audio-upload/route.ts` (lines 525-539)
- Impact: 120-segment file requires 120 sequential ffmpeg spawns (2-3 minutes)
- Improvement path: Parallelize up to 4 concurrent probes, with fallback to sequential on errors

**Memory accumulation in webmHeaderCache:**
- Problem: Global cache unbounded before cleanup logic runs
- Files: `app/api/upload-audio-chunk/route.ts` (lines 24, 55-68)
- Impact: Long-running server with many concurrent sessions could accumulate GB of cached headers
- Improvement path:
  - Implement TTL-based expiration (5 minute idle)
  - Use WeakMap if possible to allow GC
  - Monitor cache size and emit warnings

## Fragile Areas

**WebM header manipulation:**
- Files: `app/api/upload-audio-chunk/route.ts` (lines 43-359)
- Why fragile: Complex binary format parsing with manual EBML VINT decoding; easy to introduce off-by-one errors or miss edge cases
- Safe modification:
  - Add comprehensive unit tests for all VINT encoding/decoding functions
  - Test with real MediaRecorder output from multiple browsers
  - Add fuzzing with malformed headers
- Test coverage: Minimal - no test files found for binary manipulation logic

**Transcript degeneration detection heuristic:**
- Files: `app/api/large-audio-upload/route.ts` (lines 312-334)
- Why fragile: Language-specific heuristics (word repetition ratio) not validated against actual degenerate transcripts
- Safe modification:
  - Validate against corpus of confirmed degenerate transcripts
  - Add machine learning model instead of hardcoded thresholds
  - Allow configuration of thresholds per language
- Test coverage: No tests for `isDegenerateTranscript()`

**Credit system state machine:**
- Files:
  - `lib/usage.ts` - credit consumption
  - `app/upload/HandritiApp.tsx` - state display
  - `app/api/upload-audio-chunk/route.ts` - refunds on failure
- Why fragile: Multiple code paths can update credit (consume, refund, API response, auth context); no single source of truth
- Safe modification:
  - Implement event-sourced credit ledger
  - Add audit logging for all credit changes
  - Write comprehensive integration tests for common failure scenarios
- Test coverage: No visible tests for credit lifecycle

**Pipeline job queue ordering:**
- Files: `lib/pipeline/jobQueue.ts`
- Why fragile: Tasks execute in-memory with no persistence; server restart loses all enqueued work
- Safe modification:
  - Persist pending tasks to database before dequeueing
  - Implement idempotent task handler (handle duplicate execution)
  - Add monitoring to detect stalled tasks
- Test coverage: No visible tests

**FFmpeg argument injection:**
- Files: `app/api/large-audio-upload/route.ts` (lines 107-124, 154-185, 256-269)
- Why fragile: User-controlled filenames passed to ffmpeg command line
- Safe modification:
  - Never include user data in shell commands; always use array form of spawn
  - Validate and sanitize filenames (alphanumeric + underscore only)
  - Use absolute paths, never relative paths with user input
- Current status: Currently safe (using spawn array form), but risky pattern if changed

## Scaling Limits

**In-memory session state:**
- Current capacity: ~128 WebM header cache entries = ~10-20MB on busy server
- Limit: 1000+ concurrent uploads would exceed 100MB cache overhead
- Scaling path:
  - Move cache to Redis
  - Implement per-user quotas
  - Cleanup abandoned sessions after 5 minutes idle

**FFmpeg process limits:**
- Current capacity: Unlimited concurrent processes
- Limit: System runs out of file descriptors or memory around 50+ parallel transcodes
- Scaling path:
  - Implement process pool with queue (max 4-8 concurrent)
  - Add backpressure mechanism to reject new uploads when queue full
  - Monitor process count and alert at 80%

**Database connection pool:**
- Current capacity: Supabase default connection limit
- Limit: Each request consumes a connection for duration of large-upload processing
- Scaling path:
  - Use connection pooling (pgBouncer)
  - Minimize duration of held connections
  - Add explicit connection timeout handling

## Dependencies at Risk

**ffmpeg-static dependency (v5.2.0):**
- Risk: Large binary bundled with code; outdated ffmpeg version may have security/compatibility issues
- Impact: If ffmpeg has encoding bugs, transcodes fail silently
- Migration plan:
  - Switch to system-installed ffmpeg (via FFMPEG_PATH env var)
  - If bundling required, implement CI check for known CVEs
  - Consider ffmpeg.wasm for client-side processing (eliminates server dependency)

**@supabase/supabase-js (v2.57.4):**
- Risk: Major version behind latest; potential missing security patches
- Impact: Auth session handling or RLS policies could have vulnerabilities
- Migration plan:
  - Review CHANGELOG for breaking changes
  - Test upgrade to v3.x in staging
  - Update incrementally with regression testing

**music-metadata (v11.9.0):**
- Risk: Used for audio duration detection but not validated against all formats
- Impact: Invalid duration returned for some audio files, leading to incorrect credit charges
- Migration plan:
  - Fallback to ffprobe for unrecognized formats
  - Add validation that returned duration matches actual file duration
  - Consider using ffmpeg's built-in duration parsing instead

## Missing Critical Features

**No audit logging for critical operations:**
- Problem: Credit consumption, session creation, and transcription are not logged to an audit table
- Blocks: Unable to investigate user complaints about unexpected charges
- Recommendation: Implement audit log table with user_id, operation, amount, timestamp, ip_address

**No rate limiting:**
- Problem: Users can spam uploads or credit-checking requests
- Blocks: DDoS protection, fair resource allocation
- Recommendation: Add rate limiting middleware per user_id and IP address

**No idempotency in upload handlers:**
- Problem: Network retry could double-process and double-charge user
- Blocks: Reliable retry mechanism for clients
- Recommendation: Implement idempotency key validation in upload handlers

**No monitoring/alerting for failed transcriptions:**
- Problem: Silent failures in degenerate detection or WAV retries
- Blocks: Early detection of audio format compatibility issues
- Recommendation: Add metrics for retry rates by audio codec/container type

## Test Coverage Gaps

**WebM binary format handling:**
- What's not tested: VINT encoding/decoding, header extraction, cluster timecode normalization
- Files: `app/api/upload-audio-chunk/route.ts` (lines 43-359)
- Risk: Off-by-one errors or edge cases in binary parsing could corrupt audio in production
- Priority: HIGH

**Transcript degeneration detection:**
- What's not tested: Actual degenerate vs. legitimate transcripts in multiple languages
- Files: `app/api/large-audio-upload/route.ts` (lines 312-334)
- Risk: False positives trigger expensive WAV re-encoding; false negatives pass corrupted transcripts
- Priority: HIGH

**Credit consumption flow:**
- What's not tested: Consume → fail → refund sequence; race conditions between concurrent uploads
- Files: `lib/usage.ts`, `app/api/upload-audio-chunk/route.ts`
- Risk: Credit inconsistencies, double-charging, or phantom refunds
- Priority: HIGH

**FFmpeg process failure handling:**
- What's not tested: ffmpeg timeout, out of memory, permission denied scenarios
- Files: `app/api/large-audio-upload/route.ts`
- Risk: Unhandled errors crash handler or leave orphan processes
- Priority: MEDIUM

**Concurrent session handling:**
- What's not tested: Multiple uploads from same user, session ID collisions, header cache conflicts
- Files: `app/api/upload-audio-chunk/route.ts`, `lib/pipeline/jobQueue.ts`
- Risk: Audio from different sessions could be mixed
- Priority: MEDIUM

---

*Concerns audit: 2026-02-28*
