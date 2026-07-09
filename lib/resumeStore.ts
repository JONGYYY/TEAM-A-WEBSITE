"use client";

/* =========================================================================
   Local résumé cache. Uploaded résumé files are stored in IndexedDB (per user)
   so students can re-import a file they've used before with one click, instead
   of picking it from disk again. Binary-friendly + far larger quota than
   localStorage.
   ========================================================================= */

const DB_NAME = "dc-resumes";
const STORE = "files";
const VERSION = 1;

export interface ResumeMeta {
  id: string;
  owner: string;
  name: string;
  type: string;
  size: number;
  addedAt: number;
}

interface ResumeRecord extends ResumeMeta {
  blob: Blob;
}

function hasIDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("owner", "owner", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function strip(r: ResumeRecord): ResumeMeta {
  const { id, owner, name, type, size, addedAt } = r;
  return { id, owner, name, type, size, addedAt };
}

const uid = () =>
  `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** Newest-first list of a user's saved résumés (metadata only). */
export async function listResumes(owner: string): Promise<ResumeMeta[]> {
  if (!hasIDB()) return [];
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const all = (await reqToPromise(tx.objectStore(STORE).getAll())) as ResumeRecord[];
    db.close();
    return all
      .filter((r) => r.owner === owner)
      .sort((a, b) => b.addedAt - a.addedAt)
      .map(strip);
  } catch {
    return [];
  }
}

/** Reconstructs a real File from a stored résumé so it can be re-sent to the API. */
export async function getResumeFile(id: string): Promise<File | null> {
  if (!hasIDB()) return null;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const rec = (await reqToPromise(tx.objectStore(STORE).get(id))) as ResumeRecord | undefined;
    db.close();
    if (!rec) return null;
    return new File([rec.blob], rec.name, { type: rec.type });
  } catch {
    return null;
  }
}

/**
 * Saves a résumé for a user. If an identical file (same name + size) already
 * exists it just moves it to the front (refreshes addedAt) rather than
 * duplicating. Returns the saved metadata (or null if storage is unavailable).
 */
export async function saveResume(owner: string, file: File): Promise<ResumeMeta | null> {
  if (!hasIDB()) return null;
  try {
    const db = await openDB();
    const readTx = db.transaction(STORE, "readonly");
    const all = (await reqToPromise(readTx.objectStore(STORE).getAll())) as ResumeRecord[];
    const existing = all.find((r) => r.owner === owner && r.name === file.name && r.size === file.size);

    const record: ResumeRecord = existing
      ? { ...existing, addedAt: Date.now() }
      : { id: uid(), owner, name: file.name, type: file.type, size: file.size, addedAt: Date.now(), blob: file };

    const writeTx = db.transaction(STORE, "readwrite");
    await reqToPromise(writeTx.objectStore(STORE).put(record));
    db.close();
    return strip(record);
  } catch {
    return null;
  }
}

export async function deleteResume(id: string): Promise<void> {
  if (!hasIDB()) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    await reqToPromise(tx.objectStore(STORE).delete(id));
    db.close();
  } catch {
    /* ignore */
  }
}
