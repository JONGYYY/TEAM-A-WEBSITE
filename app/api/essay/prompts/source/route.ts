import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, EXTRACT_MODEL } from "@/lib/openai";
import type { EssayPrompt } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SourceBody {
  college: string;
  major?: string | null;
  year: string;
}

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
}

interface ExtractedPrompt {
  promptText: string;
  wordLimit: number | null;
  sourceUrl?: string;
  wholeSchool?: boolean;
  confidence?: number; // 0-1
}

function rid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return `ep_${crypto.randomUUID()}`;
  } catch {
    /* ignore */
  }
  return `ep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Query Tavily for candidate pages carrying the college's essay prompts. */
async function tavilySearch(query: string): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      api_key: key, // supported in body too; harmless alongside the header
      query,
      search_depth: "advanced",
      max_results: 6,
      include_raw_content: true,
    }),
  });
  if (res.status === 401 || res.status === 403) throw new Error("TAVILY_AUTH");
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = await res.json();
  return (data?.results ?? []) as TavilyResult[];
}

const EXTRACT_SYSTEM = `You extract official college application essay prompts from web-search results.
Return STRICT JSON: {"prompts":[{"promptText":string,"wordLimit":number|null,"sourceUrl":string,"wholeSchool":boolean,"confidence":number}]}.
Rules:
- Only include prompts that appear to be REAL, current application/supplemental essay prompts for the requested college (and major, if given).
- promptText must be the actual question the student answers, quoted as closely as possible.
- wordLimit: the stated limit if present, else null.
- wholeSchool: true if the prompt applies to the whole college (not a specific major/program).
- confidence: 0-1, how sure you are this is a genuine current prompt.
- If nothing credible is found, return {"prompts":[]}. Never invent prompts.`;

export async function POST(req: Request) {
  const body = (await req.json()) as SourceBody;
  const college = (body.college || "").trim();
  const major = (body.major || "").trim();
  const year = (body.year || "").trim();
  if (!college || !year) return NextResponse.json({ prompts: [], error: "Missing college or year." }, { status: 400 });

  if (!process.env.TAVILY_API_KEY) {
    return NextResponse.json({ prompts: [], error: "Prompt sourcing isn't configured (no TAVILY_API_KEY)." });
  }

  const cycleLabel = year.split("-")[0];
  const query = major
    ? `${college} ${major} supplemental essay prompts ${cycleLabel} application requirements`
    : `${college} supplemental essay prompts ${cycleLabel} application requirements`;

  let results: TavilyResult[] = [];
  try {
    results = await tavilySearch(query);
  } catch (e) {
    const msg = e instanceof Error && e.message === "TAVILY_AUTH"
      ? "Prompt search key was rejected — check that TAVILY_API_KEY is a valid Tavily key (starts with “tvly-”). You can still add the prompt manually."
      : "Search is temporarily unavailable. Try again or enter the prompt manually.";
    return NextResponse.json({ prompts: [], error: msg });
  }
  if (!results.length || !hasOpenAI()) {
    return NextResponse.json({ prompts: [], error: "No prompts found online — you can paste the prompt manually." });
  }

  // Give the extractor compact, source-attributed context.
  const context = results
    .slice(0, 6)
    .map((r, i) => `[#${i + 1}] ${r.title ?? ""}\nURL: ${r.url ?? ""}\n${(r.raw_content || r.content || "").slice(0, 2500)}`)
    .join("\n\n---\n\n");

  let extracted: ExtractedPrompt[] = [];
  try {
    const out = await chatJSON<{ prompts: ExtractedPrompt[] }>({
      model: EXTRACT_MODEL,
      system: EXTRACT_SYSTEM,
      user: `College: ${college}\nMajor: ${major || "(none — whole-school prompts)"}\nCycle: ${year}\n\nSearch results:\n${context}`,
      maxTokens: 2000,
      temperature: 0.1,
    });
    extracted = Array.isArray(out?.prompts) ? out.prompts : [];
  } catch {
    return NextResponse.json({ prompts: [], error: "Couldn't parse prompts from the sources. Try again or enter it manually." });
  }

  const prompts: EssayPrompt[] = extracted
    .filter((p) => p.promptText && p.promptText.trim().length > 12)
    .slice(0, 8)
    .map((p) => ({
      id: rid(),
      college,
      major: p.wholeSchool ? null : major || null,
      year,
      promptText: p.promptText.trim(),
      wordLimit: typeof p.wordLimit === "number" ? p.wordLimit : null,
      source: "search",
      sourceUrl: p.sourceUrl,
      status: (p.confidence ?? 0) >= 0.75 ? "verified" : "unverified",
    }));

  return NextResponse.json({ prompts });
}
