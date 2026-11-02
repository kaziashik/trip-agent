import { describe, expect, it, vi } from "vitest";
import { MockApiClient } from "../src/client";

describe("seed pinning", () => {
  it("puts seed in the chat JSON body (not only the query)", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).not.toContain("seed=");
      const body = JSON.parse(String(init?.body ?? "{}"));
      expect(body.seed).toBe("pub1");
      return new Response(
        JSON.stringify({
          id: "1",
          message: { role: "assistant", content: "ok", tool_calls: null },
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { status: 200, headers: { "x-request-id": "r1" } },
      );
    });

    const client = new MockApiClient({
      baseUrl: "https://example.test",
      apiKey: "tk_test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.chat([{ role: "user", content: "hi" }], { seed: "pub1" });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("puts seed as ?seed= on every tool endpoint", async () => {
    const seen: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
      seen.push(String(url));
      return new Response(JSON.stringify({ results: [], bookings: [] }), {
        status: 200,
        headers: { "x-request-id": "r2" },
      });
    });

    const client = new MockApiClient({
      baseUrl: "https://example.test",
      apiKey: "tk_test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.searchFlights(
      { origin: "A", dest: "B", date: "2026-11-03" },
      { seed: "s1" },
    );
    await client.getWeather({ city: "Oslo", date: "2026-11-03" }, { seed: "s1" });
    await client.bookFlight(
      { flight_id: "FL1", passenger: "Ada", idempotency_key: "k1" },
      { seed: "s1" },
    );
    await client.listBookings({ seed: "s1" });

    expect(seen).toHaveLength(4);
    for (const url of seen) {
      expect(url).toContain("seed=s1");
    }
  });
});
