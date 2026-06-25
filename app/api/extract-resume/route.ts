import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, EXTRACT_MODEL } from "@/lib/openai";
import { RESUME_EXTRACT_SYSTEM, buildResumeExtractUser } from "@/lib/prompts";
import { parseResume } from "@/lib/autofill";
import { emptyProfile, ACTIVITY_TYPES, RECOGNITION_LEVELS } from "@/lib/taxonomy";
import type { Award, Activity } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Target = "awards" | "activities" | "all";

export async function POST(req: Request) {
  try {
    const { text, target } = await readInput(req);
    if (!text || text.trim().length < 10) {
      return NextResponse.json({ awards: [], activities: [], source: "empty" });
    }

    if (hasOpenAI()) {
      try {
        const raw = await chatJSON<{ awards?: unknown[]; activities?: unknown[] }>({
          model: EXTRACT_MODEL,
          system: RESUME_EXTRACT_SYSTEM,
          user: buildResumeExtractUser(text, target),
          temperature: 0.2,
          maxTokens: 2048,
        });
        return NextResponse.json({
          awards: target === "activities" ? [] : sanitizeAwards(raw.awards),
          activities: target === "awards" ? [] : sanitizeActivities(raw.activities),
          source: "openai",
        });
      } catch {
        /* fall through to heuristic */
      }
    }

    // Heuristic fallback (no key / API error): activities only.
    const { profile } = parseResume(text, emptyProfile());
    const activities = profile.activities.filter((a) => a.description);
    return NextResponse.json({
      awards: [],
      activities: target === "awards" ? [] : activities,
      source: "heuristic",
    });
  } catch {
    return NextResponse.json({ awards: [], activities: [], source: "error" }, { status: 200 });
  }
}

async function readInput(req: Request): Promise<{ text: string; target: Target }> {
  const ctype = req.headers.get("content-type") || "";
  if (ctype.includes("application/json")) {
    const body = (await req.json()) as { text?: string; target?: Target };
    return { text: body.text || "", target: normalizeTarget(body.target) };
  }
  // multipart/form-data with an uploaded file
  const form = await req.formData();
  const target = normalizeTarget(form.get("target") as string | null);
  const file = form.get("file") as File | null;
  if (!file) return { text: (form.get("text") as string) || "", target };
  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (name.endsWith(".pdf") || type === "application/pdf") {
    return { text: await extractPdf(buf), target };
  }
  if (
    name.endsWith(".docx") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return { text: await extractDocx(buf), target };
  }
  // .txt / .md / plain text
  return { text: buf.toString("utf8"), target };
}

async function extractPdf(buf: Buffer): Promise<string> {
  try {
    // Import the lib entry directly to avoid pdf-parse's debug self-test.
    // @ts-expect-error - no bundled types
    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = mod.default || mod;
    const data = await pdfParse(buf);
    return data.text || "";
  } catch {
    return "";
  }
}

async function extractDocx(buf: Buffer): Promise<string> {
  try {
    // mammoth is CJS; handle both default and namespace interop shapes.
    const mod = (await import("mammoth")) as unknown as {
      default?: { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> };
      extractRawText?: (o: { buffer: Buffer }) => Promise<{ value: string }>;
    };
    const extractRawText = mod.default?.extractRawText ?? mod.extractRawText;
    if (!extractRawText) return "";
    const { value } = await extractRawText({ buffer: buf });
    return value || "";
  } catch {
    return "";
  }
}

function normalizeTarget(t: string | null | undefined): Target {
  return t === "awards" || t === "activities" ? t : "all";
}

function snap(value: string, options: string[]): string {
  if (!value) return "";
  const v = value.trim().toLowerCase();
  const exact = options.find((o) => o.toLowerCase() === v);
  if (exact) return exact;
  const partial = options.find((o) => o.toLowerCase().includes(v) || v.includes(o.toLowerCase()));
  return partial || "";
}

function sanitizeAwards(input: unknown): Award[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((a) => {
      const o = a as Record<string, unknown>;
      return {
        title: String(o.title || "").slice(0, 120),
        gradeLevel: snap(String(o.gradeLevel || ""), ["9th", "10th", "11th", "12th"]),
        recognition: snap(String(o.recognition || ""), RECOGNITION_LEVELS),
      };
    })
    .filter((a) => a.title)
    .slice(0, 15);
}

function sanitizeActivities(input: unknown): Activity[] {
  if (!Array.isArray(input)) return [];
  const clampNum = (n: unknown, max: number): number | null => {
    const x = Number(n);
    return Number.isFinite(x) && x > 0 ? Math.min(Math.round(x), max) : null;
  };
  return input
    .map((a) => {
      const o = a as Record<string, unknown>;
      const grades = Array.isArray(o.grades)
        ? (o.grades as unknown[]).map(String).filter((g) => ["9th", "10th", "11th", "12th"].includes(g))
        : [];
      return {
        type: snap(String(o.type || ""), ACTIVITY_TYPES),
        position: String(o.position || "").slice(0, 80),
        organization: String(o.organization || "").slice(0, 100),
        grades,
        weeksPerYear: clampNum(o.weeksPerYear, 52),
        hoursPerWeek: clampNum(o.hoursPerWeek, 168),
        description: String(o.description || "").replace(/\s+/g, " ").trim().slice(0, 150),
      };
    })
    .filter((a) => a.type || a.organization || a.description)
    .slice(0, 15);
}
