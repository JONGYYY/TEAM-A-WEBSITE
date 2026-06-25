import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy for school name search (avoids browser CORS and lets us shape the
 * response). Backed by the free, no-key SchoolVerify directory.
 * GET /api/schools?q=lincoln&state=CA
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const state = (searchParams.get("state") || "").trim();
  if (q.length < 2) return NextResponse.json({ schools: [] });

  const upstream = new URL("https://schoolverify.com/api/schools");
  upstream.searchParams.set("name", q);
  if (state) upstream.searchParams.set("state", state);

  try {
    const res = await fetch(upstream.toString(), {
      headers: { accept: "application/json" },
      // Cache identical queries briefly to be a good API citizen.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ schools: [] });
    const data = await res.json();
    const schools = (data?.schools ?? [])
      .slice(0, 12)
      .map((s: { school_name?: string; city?: string; state?: string }) => ({
        name: s.school_name ?? "",
        city: s.city ?? "",
        state: s.state ?? "",
      }))
      .filter((s: { name: string }) => s.name);
    return NextResponse.json({ schools });
  } catch {
    return NextResponse.json({ schools: [] });
  }
}
