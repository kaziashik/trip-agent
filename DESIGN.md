# DESIGN.md — trip-agent

Fill this in as you go. It is read before the debrief.

## How I spent my time

- (approximate, honest)

## Design decisions

- **Keep the starter loop; harden it (no rewrite from scratch)** → The assessment scores judgment on failure paths and a live walkthrough of the shipped code. Rewriting would burn the 2–3h budget and make the contractor code harder to defend line-by-line. → Gave up a “clean architecture” rewrite / new framework; instead patched retries, auth, seed pinning, tool-result shape, arg validation, and always-write outputs on top of `src/agent.ts` + thin `src/client.ts`.
- **Tight safety caps (see below)** → Starter used ~400 steps / 4e6 tokens — too loose to ever trip. Chose values that still clear public evals but stop loops as `partial`. → Gave up “infinite runway” for long multi-city fantasies.
- (more decisions as you go → why → what you gave up)

## Caps (steps, wall time, tokens)

Defined in `CONFIG` (`src/agent.ts`). Hitting any cap stops as **`partial`** (clean stop), not a hang.

| Cap | Value | Why |
|-----|-------|-----|
| **Steps** (`maxSteps`) | **40** | Enough for search → weather → book + a few re-asks/retries; far below the starter’s 400. Loop detection also stops sooner on identical reads. |
| **Wall time** (`maxWallMs`) | **90_000 ms (90s)** | Docs: full run well under **2 minutes**. 90s leaves headroom for 503/429 backoff and one ~10s hang/timeout without approaching the 120s eval harness timeout. |
| **Tokens** (`maxTokens`) | **100_000** | Docs: roughly **10⁴–10⁵**. Cost = sum of `/llm/chat` `usage.prompt_tokens + usage.completion_tokens` only (tools have no usage). Top of the suggested band so a noisy re-ask burst still finishes; still ~40× tighter than the starter’s 4e6. |

Related (not “caps” but bounded): `callTimeoutMs=10_000`, `malformedReaskLimit=3`, `duplicateReadLimit=8`, chat/read retries with backoff.

## Failure taxonomy

How I classify errors and what the agent does for each class:
(e.g. retryable transport / fatal client error / malformed model output / untrusted content / budget exhaustion)

## AI tools I used, and how

- (disclose honestly; include ONE suggestion you rejected and why)

## Bug diary (required — at least 3 entries)

For each bug you found and fixed: failure observed → root cause → the fix →
where the regression test lives. Example row:

- `book_flight retried with a fresh key` → timeout-after-commit turned the retry into a second booking → derive one stable key before the loop and retry with it → `tests/booking_idempotency.test.ts`

- (entry 2)

- (entry 3)

## What I'd do with +2 more hours

- (ranked, with reasons)

- (ranked, with reasons)
