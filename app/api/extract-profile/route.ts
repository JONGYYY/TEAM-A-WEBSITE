import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, EXTRACT_MODEL } from "@/lib/openai";
import { PROFILE_EXTRACT_SYSTEM, buildProfileExtractUser } from "@/lib/prompts";
import { parseResume } from "@/lib/autofill";
import { fileToText, looksLikeText } from "@/lib/serverExtract";
import { matchAP } from "@/lib/apMatch";
import {
  emptyProfile,
  ACTIVITY_TYPES,
  RECOGNITION_LEVELS,
  GENDERS,
  SCHOOL_YEARS,
  GPA_SCALES,
  IB_SUBJECTS,
  IB_LEVELS,
  IB_STATUSES,
  IB_CORE_GRADES,
  IB_CAS_STATUSES,
  A_LEVEL_CATEGORIES,
  A_LEVEL_SUBJECTS,
  A_LEVEL_LEVELS,
  A_LEVEL_GRADES,
  A_LEVEL_STATUSES,
  EXAM_BOARDS,
} from "@/lib/taxonomy";
import type { Award, Activity, ExamType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const GRADE_LEVELS = ["9th", "10th", "11th", "12th"];

export async function POST(req: Request) {
  try {
    const text = await readText(req);
    if (!looksLikeText(text) || text.trim().length < 10) {
      return NextResponse.json({ partial: null, found: [], source: "empty" });
    }

    if (hasOpenAI()) {
      try {
        const raw = await chatJSON<Record<string, unknown>>({
          model: EXTRACT_MODEL,
          system: PROFILE_EXTRACT_SYSTEM,
          user: buildProfileExtractUser(text),
          temperature: 0.2,
          maxTokens: 3000,
        });
        const { partial, found } = sanitizeProfile(raw);
        return NextResponse.json({ partial, found, source: "openai" });
      } catch {
        /* fall through to heuristic */
      }
    }

    // Heuristic fallback (no key / API error).
    const { profile, found } = parseResume(text, emptyProfile());
    const partial = {
      testing: {
        sat: profile.testing.sat,
        act: profile.testing.act,
        ap: profile.testing.ap.filter((a) => a.subject),
      },
      education: { gpaUnweighted: profile.education.gpaUnweighted },
      activities: profile.activities.filter((a) => a.description),
    };
    return NextResponse.json({ partial, found, source: "heuristic" });
  } catch {
    return NextResponse.json({ partial: null, found: [], source: "error" }, { status: 200 });
  }
}

async function readText(req: Request): Promise<string> {
  const ctype = req.headers.get("content-type") || "";
  if (ctype.includes("application/json")) {
    const body = (await req.json()) as { text?: string };
    return body.text || "";
  }
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (file) return fileToText(file);
  return (form.get("text") as string) || "";
}

/* ---------------------------- sanitization ---------------------------- */

function snap(value: unknown, options: string[]): string {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return "";
  const exact = options.find((o) => o.toLowerCase() === v);
  if (exact) return exact;
  const partial = options.find((o) => o.toLowerCase().includes(v) || v.includes(o.toLowerCase()));
  return partial || "";
}

function str(v: unknown, max = 120): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function num(v: unknown, min: number, max: number): number | null {
  const x = Number(v);
  if (!Number.isFinite(x)) return null;
  if (x < min || x > max) return null;
  return x;
}

function sanitizeProfile(raw: Record<string, unknown>): { partial: Record<string, unknown>; found: string[] } {
  const found: string[] = [];
  const b = (raw.basic as Record<string, unknown>) || {};
  const e = (raw.education as Record<string, unknown>) || {};
  const t = (raw.testing as Record<string, unknown>) || {};

  const basic = {
    firstName: str(b.firstName, 60),
    middleName: str(b.middleName, 60),
    lastName: str(b.lastName, 60),
    gender: snap(b.gender, GENDERS),
    schoolYear: snap(b.schoolYear, SCHOOL_YEARS),
    gradYear: num(b.gradYear, 1990, 2100),
  };
  if (basic.firstName || basic.lastName) found.push("name");

  const education = {
    school: str(e.school, 120),
    country: str(e.country, 80),
    state: str(e.state, 80),
    city: str(e.city, 80),
    classSize: num(e.classSize, 1, 100000),
    classRank: num(e.classRank, 1, 100000),
    gpaScale: snap(e.gpaScale, GPA_SCALES),
    gpaUnweighted: num(e.gpaUnweighted, 0, 100),
    gpaWeighted: num(e.gpaWeighted, 0, 100),
  };
  if (education.school) found.push("school");
  if (education.gpaUnweighted != null) found.push(`GPA ${education.gpaUnweighted}`);

  const examTypeRaw = String(t.examType || "AP");
  const examType: ExamType = examTypeRaw === "IB" || examTypeRaw === "A-Level" ? (examTypeRaw as ExamType) : "AP";

  const sat = num(t.sat, 400, 1600);
  const act = num(t.act, 1, 36);
  if (sat != null) found.push(`SAT ${sat}`);
  if (act != null) found.push(`ACT ${act}`);

  // AP — snap each subject to the official catalog; drop junk.
  const apIn = Array.isArray(t.ap) ? (t.ap as Record<string, unknown>[]) : [];
  const ap = apIn
    .map((a) => {
      const matches = matchAP(String(a.subject || ""));
      const subject = String(a.subject || "").trim() && matches.length ? matches[0] : "";
      return { subject, score: num(a.score, 1, 5) };
    })
    .filter((a) => a.subject);
  const apUnique = dedupeBy(ap, (a) => a.subject).slice(0, 12);
  if (examType === "AP" && apUnique.length) found.push(`${apUnique.length} AP subject${apUnique.length > 1 ? "s" : ""}`);

  // IB
  const ibIn = Array.isArray(t.ib) ? (t.ib as Record<string, unknown>[]) : [];
  const ib = ibIn
    .map((a) => ({
      subject: snap(a.subject, IB_SUBJECTS) || str(a.subject, 80),
      level: (snap(a.level, IB_LEVELS) as "HL" | "SL" | ""),
      score: num(a.score, 1, 7),
      status: snap(a.status, IB_STATUSES),
    }))
    .filter((a) => a.subject)
    .slice(0, 8);
  if (examType === "IB" && ib.length) found.push(`${ib.length} IB subject${ib.length > 1 ? "s" : ""}`);

  const core = (t.ibCore as Record<string, unknown>) || {};
  const coreTok = (core.tok as Record<string, unknown>) || {};
  const coreEe = (core.ee as Record<string, unknown>) || {};
  const coreCas = (core.cas as Record<string, unknown>) || {};
  const ibCore = {
    tok: { status: snap(coreTok.status, IB_STATUSES), grade: snap(coreTok.grade, IB_CORE_GRADES) },
    ee: { status: snap(coreEe.status, IB_STATUSES), grade: snap(coreEe.grade, IB_CORE_GRADES) },
    cas: { status: snap(coreCas.status, IB_CAS_STATUSES) },
  };

  // A-Level
  const alIn = Array.isArray(t.aLevel) ? (t.aLevel as Record<string, unknown>[]) : [];
  const aLevel = alIn
    .map((a) => ({
      category: snap(a.category, A_LEVEL_CATEGORIES),
      subject: snap(a.subject, A_LEVEL_SUBJECTS) || str(a.subject, 80),
      level: (snap(a.level, A_LEVEL_LEVELS) as "A-Level" | "AS-Level" | ""),
      grade: snap(a.grade, A_LEVEL_GRADES),
      status: snap(a.status, A_LEVEL_STATUSES),
      board: snap(a.board, EXAM_BOARDS),
    }))
    .filter((a) => a.subject)
    .slice(0, 8);
  if (examType === "A-Level" && aLevel.length) found.push(`${aLevel.length} A-Level subject${aLevel.length > 1 ? "s" : ""}`);

  const testing: Record<string, unknown> = { examType, sat, act };
  if (apUnique.length) testing.ap = apUnique;
  if (ib.length) testing.ib = ib;
  if (ibCore.tok.status || ibCore.ee.status || ibCore.cas.status || ibCore.tok.grade || ibCore.ee.grade) testing.ibCore = ibCore;
  if (aLevel.length) testing.aLevel = aLevel;

  const awards = sanitizeAwards(raw.awards);
  if (awards.length) found.push(`${awards.length} award${awards.length > 1 ? "s" : ""}`);
  const activities = sanitizeActivities(raw.activities);
  if (activities.length) found.push(`${activities.length} activit${activities.length > 1 ? "ies" : "y"}`);

  return {
    partial: { basic, education, testing, awards, activities },
    found,
  };
}

function dedupeBy<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function sanitizeAwards(input: unknown): Award[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((a) => {
      const o = a as Record<string, unknown>;
      return {
        title: str(o.title, 120),
        gradeLevel: snap(o.gradeLevel, GRADE_LEVELS),
        recognition: snap(o.recognition, RECOGNITION_LEVELS),
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
        ? (o.grades as unknown[]).map(String).filter((g) => GRADE_LEVELS.includes(g))
        : [];
      return {
        type: snap(o.type, ACTIVITY_TYPES),
        position: str(o.position, 80),
        organization: str(o.organization, 100),
        grades,
        weeksPerYear: clampNum(o.weeksPerYear, 52),
        hoursPerWeek: clampNum(o.hoursPerWeek, 168),
        description: str(o.description, 150),
      };
    })
    .filter((a) => a.type || a.organization || a.description)
    .slice(0, 15);
}
