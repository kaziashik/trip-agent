import { describe, expect, it } from "vitest";
import {
  bookingKey,
  findBookingOnServer,
  mergeRunBookingsFromServer,
} from "../src/agent";

describe("GET /bookings as source of truth", () => {
  it("prefers idempotency_key when matching server rows", () => {
    const key = bookingKey("g", "FL-1", "Ada");
    const server = [
      { flight_id: "FL-OTHER", passenger: "Ada", idempotency_key: key },
      { flight_id: "FL-1", passenger: "Ada", idempotency_key: "other" },
    ];
    const hit = findBookingOnServer(server, {
      flight_id: "FL-1",
      passenger: "Ada",
      idempotency_key: key,
    });
    expect(hit?.flight_id).toBe("FL-OTHER");
  });

  it("falls back to flight_id + passenger", () => {
    const hit = findBookingOnServer(
      [{ flight_id: "FL-1", passenger: "Ada", idempotency_key: "x" }],
      { flight_id: "FL-1", passenger: "Ada", idempotency_key: "missing" },
    );
    expect(hit?.idempotency_key).toBe("x");
  });

  it("end-of-run merge recovers attempted bookings missing from local claims", () => {
    const key = bookingKey("goal", "FL-1", "Ada");
    const merged = mergeRunBookingsFromServer(
      [],
      [{ flight_id: "FL-1", passenger: "Ada", idempotency_key: key }],
      [
        {
          flight_id: "FL-1",
          passenger: "Ada",
          idempotency_key: key,
        },
        // Unrelated historical booking must NOT be imported.
        {
          flight_id: "FL-OLD",
          passenger: "Other",
          idempotency_key: "old-key",
        },
      ],
    );
    expect(merged.recovered).toBe(1);
    expect(merged.bookings).toEqual([
      { flight_id: "FL-1", passenger: "Ada", idempotency_key: key },
    ]);
  });

  it("end-of-run merge syncs local claims to server fields", () => {
    const key = bookingKey("goal", "FL-2", "Ada");
    const merged = mergeRunBookingsFromServer(
      [{ flight_id: "FL-2", passenger: "Ada", idempotency_key: key }],
      [{ flight_id: "FL-2", passenger: "Ada", idempotency_key: key }],
      [
        {
          flight_id: "FL-2",
          passenger: "Ada",
          idempotency_key: key,
        },
      ],
    );
    expect(merged.recovered).toBe(0);
    expect(merged.bookings).toHaveLength(1);
    expect(merged.bookings[0].idempotency_key).toBe(key);
  });
});
