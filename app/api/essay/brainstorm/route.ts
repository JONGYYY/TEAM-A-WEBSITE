import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, ESSAY_MODEL, EXTRACT_MODEL } from "@/lib/openai";
import type { EssayPromptSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  prompt?: Partial<EssayPromptSnapshot>;
  profileSummary?: string;
  resumeText?: string;
  notes?: string;
}

const SYSTEM = `You are a college-essay brainstorming partner. Using the student's real background, propose distinct, AUTHENTIC essay angles for the given prompt.
Rules: draw ONLY from the details provided; never fabricate achievements. Favor specific, personal moments over generic themes. Each idea should be genuinely different from the others.
Return STRICT JSON: {"ideas":[{"title":string,"angle":string,"why":string,"opening":string}]}.
- title: 3-6 word handle for the idea.
- angle: 1-2 sentences describing the story/topic and what it reveals.
- why: one sentence on why it fits THIS prompt and student.
- opening: one vivid example first sentence they could start from.
Return 4 ideas.`;

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const p = body.prompt || {};

  if (!hasOpenAI()) {
    return NextResponse.json({ ideas: [], error: "Brainstorming is unavailable right now." });
  }

  const user = `PROMPT: ${p.promptText || "(none)"}\n${p.college ? `COLLEGE: ${p.college}${p.major ? ` · MAJOR: ${p.major}` : ""}\n` : ""}
STUDENT PROFILE:
${body.profileSummary?.trim() || "(no profile provided)"}
${body.resumeText?.trim() ? `\nRÉSUMÉ EXCERPT:\n${body.resumeText.trim().slice(0, 4000)}` : ""}
${body.notes?.trim() ? `\nSTUDENT NOTES / WISHES:\n${body.notes.trim().slice(0, 1000)}` : ""}`;

  for (const model of [ESSAY_MODEL, EXTRACT_MODEL]) {
    try {
      const raw = await chatJSON<{ ideas?: { title?: string; angle?: string; why?: string; opening?: string }[] }>({ model, system: SYSTEM, user, maxTokens: 1400, temperature: 0.8 });
      const ideas = (raw.ideas ?? [])
        .filter((i) => i.title && i.angle)
        .slice(0, 5)
        .map((i) => ({ title: i.title!, angle: i.angle!, why: i.why || "", opening: i.opening || "" }));
      return NextResponse.json({ ideas });
    } catch {
      /* try next model */
    }
  }
  return NextResponse.json({ ideas: [], error: "Couldn't brainstorm just now. Please try again." });
}
