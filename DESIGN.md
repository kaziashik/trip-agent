# DESIGN.md — trip-agent

Fill this in as you go. It is read before the debrief.

## How I spent my time

- (approximate, honest)

## Design decisions

- **Keep the starter loop; harden it (no rewrite from scratch)** → The assessment scores judgment on failure paths and a live walkthrough of the shipped code. Rewriting would burn the 2–3h budget and make the contractor code harder to defend line-by-line. → Gave up a “clean architecture” rewrite / new framework; instead patched retries, auth, seed pinning, tool-result shape, arg validation, and always-write outputs on top of `src/agent.ts` + thin `src/client.ts`.
- (more decisions as you go → why → what you gave up)

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
