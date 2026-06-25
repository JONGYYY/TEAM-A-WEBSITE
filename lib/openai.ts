/** Thin OpenAI Chat Completions helper (JSON mode). Server-only. */

export const EVAL_MODEL = process.env.OPENAI_EVAL_MODEL || "gpt-4o";
export const EXTRACT_MODEL = process.env.OPENAI_EXTRACT_MODEL || "gpt-4o-mini";

export function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Calls OpenAI with JSON response format and returns the parsed object.
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return JSON.parse(text) as T;
}
