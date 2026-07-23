/** Server-only résumé/file text extraction (PDF, DOCX, plain text). */

export async function extractPdf(buf: Buffer): Promise<string> {
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

export async function extractDocx(buf: Buffer): Promise<string> {
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

/** Extract readable text from an uploaded File by sniffing its name/type. */
export async function fileToText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (name.endsWith(".pdf") || type === "application/pdf") {
    return extractPdf(buf);
  }
  if (
    name.endsWith(".docx") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(buf);
  }
  // .doc (legacy binary) is not reliably parseable as text; return empty so the
  // caller doesn't dump binary garbage into fields.
  if (name.endsWith(".doc") || type === "application/msword") {
    return "";
  }
  // .txt / .md / plain text
  return buf.toString("utf8");
}

/** Heuristic: does this text look like readable prose vs. binary/zip junk? */
export function looksLikeText(text: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, 2000);
  // Binary/zip signatures & control chars indicate we failed to parse.
  if (/PK\u0003\u0004|\[Content_Types\]\.xml|xmlns=/.test(sample)) return false;
  const printable = sample.replace(/[^\x20-\x7E\s]/g, "");
  return printable.length / sample.length > 0.85;
}
