import { chatStream, hasOpenAI, ESSAY_MODEL, type ChatMessage } from "@/lib/openai";
import type { EssayPromptSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatBody {
  prompt?: Partial<EssayPromptSnapshot>;
  essayText?: string;
  selection?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  message: string;
}

const SYSTEM = `You are an encouraging, sharp college-essay coach inside DreamCollege.ai.
Your job is to help a high-school student write a stronger, MORE AUTHENTIC essay — not to write it for them.
Principles:
- Guide with specific, actionable advice. Ask a pointed question when it helps them find their own material.
- Preserve the student's voice; never replace their story with a generic one.
- When asked to improve a sentence or section, offer 1–2 concrete revision options and briefly say why they're better.
- Be concrete about structure, clarity, specificity, and emotional honesty. Discourage clichés and vague generalities.
- Keep replies tight and skimmable. Use short paragraphs or a few bullets. No preamble like "Great question!".`;

function buildContext(body: ChatBody): string {
  const p = body.prompt || {};
  const lines: string[] = [];
  if (p.college) lines.push(`College: ${p.college}${p.major ? ` · Major: ${p.major}` : ""}`);
  if (p.promptText) lines.push(`Prompt: ${p.promptText}`);
  if (p.wordLimit) lines.push(`Word limit: ${p.wordLimit}`);
  const essay = (body.essayText || "").trim();
  lines.push(essay ? `\nCurrent draft:\n"""\n${essay.slice(0, 6000)}\n"""` : "\nThe draft is currently empty.");
  if (body.selection?.trim()) lines.push(`\nThe student has highlighted this passage and is asking about it specifically:\n"""\n${body.selection.trim().slice(0, 2000)}\n"""`);
  return lines.join("\n");
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;
  if (!body?.message?.trim()) {
    return new Response("Please enter a message.", { status: 400 });
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Here is the context for this essay.\n${buildContext(body)}` },
    ...(body.history || []).slice(-12).map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
    { role: "user", content: body.message.trim() },
  ];

  if (hasOpenAI()) {
    try {
      const stream = await chatStream({ model: ESSAY_MODEL, messages, maxTokens: 1400, temperature: 0.7 });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    } catch {
      /* fall through to a graceful, non-streamed reply */
    }
  }

  const fallback =
    "I can't reach the AI service right now, but here's how I'd approach it: focus on one specific moment, show it with concrete sensory detail, then reflect on what it changed in you. Tell me which part of your draft you'd like to work on and I'll give targeted feedback.";
  return new Response(fallback, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
