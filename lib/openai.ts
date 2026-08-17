/** Thin OpenAI Chat Completions helper (JSON + streaming). Server-only. */

export const EVAL_MODEL = process.env.OPENAI_EVAL_MODEL || "gpt-4o";
export const EXTRACT_MODEL = process.env.OPENAI_EXTRACT_MODEL || "gpt-4o-mini";
/** Model powering the essay tool (brainstorm / chat / feedback). */
export const ESSAY_MODEL = process.env.OPENAI_ESSAY_MODEL || "gpt-5";

export function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Reasoning-family models (gpt-5*, o1/o3/o4*) use `max_completion_tokens` and
 * only accept the default temperature, unlike the gpt-4o family.
 */
function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o\d)/i.test(model);
}

/** Builds the token-limit + temperature fields correctly for the given model. */
function tuning(model: string, maxTokens: number, temperature: number): Record<string, unknown> {
  if (isReasoningModel(model)) return { max_completion_tokens: maxTokens };
  return { max_tokens: maxTokens, temperature };
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
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...tuning(model, maxTokens, temperature),
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

/** Non-streaming plain-text completion. Throws on failure. */
export async function chatText({
  model,
  messages,
  maxTokens = 1500,
  temperature = 0.7,
}: {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, ...tuning(model, maxTokens, temperature) }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "") as string;
}

/**
 * Streams a chat completion as plain-text chunks (a ReadableStream of UTF-8
 * bytes), suitable to return directly as a Response body. Translates OpenAI's
 * SSE frames into raw token text. Throws before the first byte on failure.
 */
export async function chatStream({
  model,
  messages,
  maxTokens = 1400,
  temperature = 0.7,
}: {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: true, messages, ...tuning(model, maxTokens, temperature) }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`);
  }

  const upstream = res.body;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const delta: string | undefined = json?.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* ignore keep-alives / partial frames */
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
