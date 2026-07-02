import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, EVAL_MODEL } from "@/lib/openai";
import { QUIZ_GRADE_SYSTEM, buildQuizGradeUser, type GradeItem } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface GradeResult {
  questionId: string;
  awarded: number;
  feedback: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { items?: GradeItem[] };
    const items = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
    if (!items.length) return NextResponse.json({ grades: [], source: "empty" });

    if (hasOpenAI()) {
      try {
        const raw = await chatJSON<{ grades?: unknown[] }>({
          model: EVAL_MODEL,
          system: QUIZ_GRADE_SYSTEM,
          user: buildQuizGradeUser(items),
          temperature: 0.2,
          maxTokens: 2048,
        });
        return NextResponse.json({ grades: sanitize(raw.grades, items), source: "openai" });
      } catch {
        /* fall through */
      }
    }

    // No key / error: neutral placeholder grades for the counselor to fill in.
    const grades: GradeResult[] = items.map((it) => ({
      questionId: it.questionId,
      awarded: 0,
      feedback: "AI grading unavailable — please review and grade manually.",
    }));
    return NextResponse.json({ grades, source: "unavailable" });
  } catch {
    return NextResponse.json({ grades: [], source: "error" }, { status: 200 });
  }
}

function sanitize(input: unknown, items: GradeItem[]): GradeResult[] {
  const maxByQ = new Map(items.map((i) => [i.questionId, i.max]));
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((g) => {
      const o = g as Record<string, unknown>;
      const questionId = String(o.questionId || "");
      const max = maxByQ.get(questionId);
      if (max == null) return null;
      const awarded = Math.max(0, Math.min(max, Math.round(Number(o.awarded) || 0)));
      return { questionId, awarded, feedback: String(o.feedback || "").slice(0, 600) };
    })
    .filter((g): g is GradeResult => !!g);
}
