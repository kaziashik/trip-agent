import { describe, expect, it, vi } from "vitest";
import { bookingKey, bookWithReconcile } from "../src/agent";
import type { MockApiClient } from "../src/client";

function okHeaders(extra: Record<string, string> = {}): Headers {
  return new Headers({ "x-request-id": "req-test", ...extra });
}

describe("book_flight idempotency_key", () => {
  it("is deterministic from goal + flight_id + passenger", () => {
    const a = bookingKey("Book LIS→TYO", "FL-1", "Ada");
    const b = bookingKey("Book LIS→TYO", "FL-1", "Ada");
    const c = bookingKey("Book LIS→TYO", "FL-1", "Bob");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith("bk_")).toBe(true);
    expect(a.length).toBeLessThanOrEqual(128);
  });

  it("reuses the same key on retry after a timeout-then-success", async () => {
    const expectedKey = bookingKey("goal", "FL-1", "Ada");
    const keys: string[] = [];
    let calls = 0;

    const client = {
      bookFlight: vi.fn(async (args: { idempotency_key: string }) => {
        keys.push(args.idempotency_key);
        calls += 1;
        if (calls === 1) {
          const err = new Error("aborted");
          err.name = "TimeoutError";
          throw err;
        }
        return {
          status: 200,
          body: { idempotent_replay: true },
          headers: okHeaders(),
        };
      }),
      listBookings: vi.fn(),
    } as unknown as MockApiClient;

    const outcome = await bookWithReconcile(
      client,
      async () => {},
      () => Date.now(),
      () => {},
      1,
      { goal: "goal", seed: "7" },
      { flight_id: "FL-1", passenger: "Ada" },
    );

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.key).toBe(expectedKey);
      expect(outcome.attempts).toBe(2);
      expect(outcome.replayed).toBe(true);
    }
    expect(keys).toEqual([expectedKey, expectedKey]);
    expect(client.listBookings).not.toHaveBeenCalled();
  });

  it("reuses the same key on retry after HTTP 503 then success", async () => {
    const expectedKey = bookingKey("goal", "FL-2", "Ada");
    const keys: string[] = [];
    let calls = 0;

    const client = {
      bookFlight: vi.fn(async (args: { idempotency_key: string }) => {
        keys.push(args.idempotency_key);
        calls += 1;
        if (calls === 1) {
          return {
            status: 503,
            body: { error: "busy" },
            headers: okHeaders(),
          };
        }
        return {
          status: 200,
          body: {},
          headers: okHeaders(),
        };
      }),
      listBookings: vi.fn(),
    } as unknown as MockApiClient;

    const outcome = await bookWithReconcile(
      client,
      async () => {},
      () => Date.now(),
      () => {},
      1,
      { goal: "goal", seed: "7" },
      { flight_id: "FL-2", passenger: "Ada" },
    );

    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.key).toBe(expectedKey);
    expect(keys).toEqual([expectedKey, expectedKey]);
  });

  it("returns the same key when reconciled via GET /bookings", async () => {
    const expectedKey = bookingKey("goal", "FL-3", "Ada");

    const client = {
      bookFlight: vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "TimeoutError";
        throw err;
      }),
      listBookings: vi.fn(async () => ({
        status: 200,
        body: { bookings: [{ flight_id: "FL-3", passenger: "Ada" }] },
        headers: okHeaders(),
      })),
    } as unknown as MockApiClient;

    const outcome = await bookWithReconcile(
      client,
      async () => {},
      () => Date.now(),
      () => {},
      1,
      { goal: "goal", seed: "7" },
      { flight_id: "FL-3", passenger: "Ada" },
    );

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.key).toBe(expectedKey);
      expect(outcome.key).not.toBe("reconciled");
      expect(outcome.replayed).toBe(true);
    }
    expect(client.bookFlight).toHaveBeenCalledTimes(2);
    const firstKey = (client.bookFlight as ReturnType<typeof vi.fn>).mock
      .calls[0][0].idempotency_key;
    const secondKey = (client.bookFlight as ReturnType<typeof vi.fn>).mock
      .calls[1][0].idempotency_key;
    expect(firstKey).toBe(expectedKey);
    expect(secondKey).toBe(expectedKey);
  });
});
