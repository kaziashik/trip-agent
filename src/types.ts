/** Structured result contract (§ result.json) — validate before you write it. */
export type AgentResult = {
  status: "success" | "partial" | "failed";
  answer: string;
  bookings: Array<{ flight_id: string; passenger: string; idempotency_key?: string }>;
  steps: number;
  cost: number; // total tokens from the mock usage field
  errors: Array<{ code: string; message: string; step?: number }>;
};

/**
 * Grader status meanings:
 * - success — goal met
 * - partial — clean stop (caps / loop / declined confirm) without hard failure
 * - failed — impossible goal or fatal error
 */
export const AGENT_STATUS_MEANINGS = {
  success: "Goal met (search done; booking completed if the goal required one)",
  partial:
    "Clean stop: step/wall/token cap, loop detected, or operator declined confirm",
  failed:
    "Impossible goal or fatal error (auth/validation, malformed burst, LLM down)",
} as const;

/** Map goal progress + StopEarly into the contract status. */
export function resolveAgentStatus(opts: {
  goalMet: boolean;
  stopStatus: "partial" | "failed" | null;
}): AgentResult["status"] {
  if (opts.goalMet) return "success";
  return opts.stopStatus ?? "failed";
}

/** Exact top-level fields graders expect in result.json (order for docs/tests). */
export const RESULT_JSON_KEYS = [
  "status",
  "answer",
  "bookings",
  "steps",
  "cost",
  "errors",
] as const;

/** One JSONL line of the trace. */
export type TraceLine = {
  run_id: string;
  step: number;
  action: string;
  args?: unknown;
  /** Plan says "latency"; contract field name is latency_ms (ms). */
  latency_ms?: number;
  tokens?: number;
  retry_count?: number;
  outcome?: string;
};

/** Core fields graders expect on each trace.jsonl line (plus optional args). */
export const TRACE_LINE_KEYS = [
  "run_id",
  "step",
  "action",
  "latency_ms",
  "tokens",
  "retry_count",
  "outcome",
] as const;

/** Validate one parsed JSONL object from trace.jsonl. */
export function validateTraceLine(line: unknown): string[] {
  const errors: string[] = [];
  const o = line as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return ["trace line is not an object"];
  if (typeof o.run_id !== "string") errors.push("run_id must be a string");
  if (typeof o.step !== "number") errors.push("step must be a number");
  if (typeof o.action !== "string") errors.push("action must be a string");
  if (o.latency_ms !== undefined && typeof o.latency_ms !== "number")
    errors.push("latency_ms must be a number");
  if (o.tokens !== undefined && typeof o.tokens !== "number")
    errors.push("tokens must be a number");
  if (o.retry_count !== undefined && typeof o.retry_count !== "number")
    errors.push("retry_count must be a number");
  if (o.outcome !== undefined && typeof o.outcome !== "string")
    errors.push("outcome must be a string");
  return errors;
}

/** Minimal validation — enough to catch a malformed result before submission. */
export function validateResult(r: unknown): string[] {
  const errors: string[] = [];
  const o = r as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return ["result is not an object"];
  for (const key of RESULT_JSON_KEYS) {
    if (!(key in o)) errors.push(`missing field: ${key}`);
  }
  if (!["success", "partial", "failed"].includes(o.status as string))
    errors.push("status must be success|partial|failed");
  if (typeof o.answer !== "string") errors.push("answer must be a string");
  if (!Array.isArray(o.bookings)) errors.push("bookings must be an array");
  if (typeof o.steps !== "number") errors.push("steps must be a number");
  if (typeof o.cost !== "number") errors.push("cost must be a number");
  if (!Array.isArray(o.errors)) errors.push("errors must be an array");
  return errors;
}
