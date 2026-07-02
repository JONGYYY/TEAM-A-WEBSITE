/**
 * Whole-profile backup/restore. The PRD flags that browser storage can be
 * cleared (Open Question §10) — this lets a student export every `dc.*` key as
 * a single file and re-import it on any device, the documented fallback.
 */

const PREFIX = "dc.";
const FORMAT = "dreamcollege.backup.v1";

export function exportBackup(): string {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    try {
      data[key] = JSON.parse(localStorage.getItem(key) as string);
    } catch {
      data[key] = localStorage.getItem(key);
    }
  }
  return JSON.stringify({ format: FORMAT, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function downloadBackup(filename = "dreamcollege-backup.json") {
  const blob = new Blob([exportBackup()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Returns the number of keys restored, or throws if the file is not a backup. */
export function importBackup(text: string): number {
  const parsed = JSON.parse(text);
  if (parsed?.format !== FORMAT || typeof parsed.data !== "object") {
    throw new Error("Not a DreamCollege backup file.");
  }
  let count = 0;
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!key.startsWith(PREFIX)) continue;
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    count++;
  }
  return count;
}
