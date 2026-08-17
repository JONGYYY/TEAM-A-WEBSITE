import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy for college / university name search (avoids browser CORS).
 * Backed by the free, no-key Hipolabs universities directory.
 * GET /api/colleges?q=stanford
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ colleges: [] });

  const upstream = new URL("https://universities.hipolabs.com/search");
  upstream.searchParams.set("name", q);

  try {
    const res = await fetch(upstream.toString(), {
      headers: { accept: "application/json" },
      next: { revalidate: 86400 }, // cache identical queries for a day
    });
    if (!res.ok) return NextResponse.json({ colleges: [] });
    const data = (await res.json()) as { name?: string; country?: string; "state-province"?: string | null }[];
    // US schools first, then a stable de-duped list.
    const seen = new Set<string>();
    const colleges = (Array.isArray(data) ? data : [])
      .map((u) => ({ name: u.name ?? "", country: u.country ?? "", region: u["state-province"] ?? "" }))
      .filter((u) => u.name && !seen.has(u.name.toLowerCase()) && seen.add(u.name.toLowerCase()))
      .sort((a, b) => Number(b.country === "United States") - Number(a.country === "United States"))
      .slice(0, 12);
    return NextResponse.json({ colleges });
  } catch {
    return NextResponse.json({ colleges: [] });
  }
}
