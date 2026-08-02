/** Thin Anthropic Messages API helper (JSON mode via forced tool use). Server-only. */

export const EVAL_MODEL = process.env.ANTHROPIC_EVAL_MODEL || "claude-sonnet-5";

export function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Calls Claude and returns a parsed JSON object. Uses a single forced tool
 * call ("emit_json") so the model is constrained to valid JSON matching the
 * caller's expectations, mirroring the old OpenAI json_object mode.
 * Throws on any failure so callers can fall back gracefully.
 */
export async function chatJSON<T = unknown>({
  model,
  system,
  user,
  maxTokens = 4096,
  temperature = 0.4,
}: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: "user", content: user }],
      tools: [
        {
          name: "emit_json",
          description: "Return the final result as a single JSON object matching the requested schema.",
          input_schema: { type: "object" },
        },
      ],
      tool_choice: { type: "tool", name: "emit_json" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const toolUse = (data?.content ?? []).find((b) => b.type === "tool_use");
  if (!toolUse) throw new Error("Anthropic response contained no tool_use block");
  return toolUse.input;
}
