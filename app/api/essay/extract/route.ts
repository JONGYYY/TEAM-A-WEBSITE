import { NextResponse } from "next/server";
import { fileToText } from "@/lib/serverExtract";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Turn an uploaded essay file (PDF/DOCX/txt) or pasted text into plain text
 *  the Essay Review pipeline can load into the editor and grade. */
export async function POST(req: Request) {
  try {
    const ctype = req.headers.get("content-type") || "";
    let text = "";

    if (ctype.includes("application/json")) {
      const body = (await req.json()) as { text?: string };
      text = body.text || "";
    } else {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (file) text = await fileToText(file);
      else text = (form.get("text") as string) || "";
    }

    text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

    return NextResponse.json({ text, wordCount });
  } catch {
    return NextResponse.json({ text: "", wordCount: 0, error: "Could not read that file." }, { status: 200 });
  }
}
