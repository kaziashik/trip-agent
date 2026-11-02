import { describe, expect, it } from "vitest";
import {
  parseArgs,
  writeJson,
  TraceWriter,
  isRetryableStatus,
  retryWaitMs,
} from "../src/agent";
import { validateResult } from "../src/types";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

describe("starter plumbing (replace/augment with your own failure-path tests)", () => {
  it("parses the eval contract arguments", () => {
    const args = parseArgs([
      "--goal",
      "Find a flight",
      "--seed",
      "7",
      "--auto-confirm",
      "--output",
      "r.json",
      "--trace",
      "t.jsonl",
    ]);
    expect(args).toMatchObject({ goal: "Find a flight", seed: "7", autoConfirm: true });
  });

  it("does not retry auth/validation errors (401/403/400/422)", () => {
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(403)).toBe(false);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(422)).toBe(false);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
  });

  it("waits exactly Retry-After seconds on 429", () => {
    const headers = new Headers({ "retry-after": "3" });
    expect(retryWaitMs(429, headers, 0)).toBe(3000);
    expect(retryWaitMs(429, new Headers({ "retry-after": "0" }), 2)).toBe(0);
    // 503 without Retry-After uses backoff, not a fixed 429 rule
    expect(retryWaitMs(503, new Headers(), 0)).toBeGreaterThan(0);
  });

  it("rejects a structurally invalid result", () => {
    expect(validateResult({ status: "nope" }).length).toBeGreaterThan(0);
    expect(
      validateResult({ status: "success", answer: "x", bookings: [], steps: 1, cost: 2, errors: [] }),
    ).toEqual([]);
  });

  it("writes files", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "trip-"));
    await writeJson(path.join(dir, "r.json"), { ok: true });
    const t = new TraceWriter(path.join(dir, "t.jsonl"), "run-1");
    t.write({ step: 1, action: "search_flights" });
    await t.close();
    expect(JSON.parse(await fs.readFile(path.join(dir, "r.json"), "utf8"))).toEqual({ ok: true });
    expect(await fs.readFile(path.join(dir, "t.jsonl"), "utf8")).toContain("search_flights");
  });
});
