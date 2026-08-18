"use client";

import { supabase } from "./supabase";
import { uid } from "./quizzes";
import type {
  Essay,
  EssayComment,
  EssayChat,
  EssayMessage,
  EssayPrompt,
  EssayPart,
  EssayScore,
  EssayStatus,
  EssayPromptSnapshot,
} from "./types";

/* =========================================================================
   Supabase-backed data layer for the AI Essay Tool. Essays, comments, chats
   and messages are private to the owner; essay_prompts is a shared dataset.
   ========================================================================= */

const CHANGE_EVENT = "dc:essaychange";

export function notifyEssayChange() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function onEssayChange(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}

/* ------------------------------- row mappers ------------------------------ */
/* eslint-disable @typescript-eslint/no-explicit-any */
function toEssay(r: any): Essay {
  return {
    id: r.id,
    ownerEmail: r.owner_email,
    promptId: r.prompt_id ?? undefined,
    promptSnapshot: (r.prompt_snapshot ?? {}) as EssayPromptSnapshot,
    title: r.title ?? "",
    content: r.content ?? {},
    parts: (r.parts ?? []) as EssayPart[],
    wordCount: r.word_count ?? 0,
    score: (r.score ?? null) as EssayScore | null,
    status: r.status ?? "draft",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function fromEssay(e: Essay) {
  return {
    id: e.id,
    owner_email: e.ownerEmail,
    prompt_id: e.promptId ?? null,
    prompt_snapshot: e.promptSnapshot,
    title: e.title,
    content: e.content ?? {},
    parts: e.parts,
    word_count: e.wordCount,
    score: e.score ?? null,
    status: e.status,
    updated_at: new Date().toISOString(),
  };
}
function toPrompt(r: any): EssayPrompt {
  return {
    id: r.id,
    college: r.college ?? "",
    major: r.major ?? null,
    year: r.year,
    promptText: r.prompt_text ?? "",
    wordLimit: r.word_limit ?? null,
    source: r.source ?? "search",
    sourceUrl: r.source_url ?? undefined,
    status: r.status ?? "unverified",
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at,
  };
}
function toComment(r: any): EssayComment {
  return {
    id: r.id,
    essayId: r.essay_id,
    author: r.author,
    kind: r.kind ?? "comment",
    quotedText: r.quoted_text ?? "",
    rangeFrom: r.range_from ?? null,
    rangeTo: r.range_to ?? null,
    body: r.body ?? "",
    resolved: !!r.resolved,
    createdAt: r.created_at,
  };
}
function toChat(r: any): EssayChat {
  return { id: r.id, essayId: r.essay_id, ownerEmail: r.owner_email, title: r.title ?? "New chat", createdAt: r.created_at };
}
function toMessage(r: any): EssayMessage {
  return { id: r.id, chatId: r.chat_id, role: r.role, content: r.content ?? "", createdAt: r.created_at };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ---------------------------------- essays --------------------------------- */

export async function getEssaysByOwner(email: string): Promise<Essay[]> {
  const { data, error } = await supabase
    .from("essays")
    .select("*")
    .eq("owner_email", email)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map(toEssay);
}

export async function getEssay(id: string): Promise<Essay | undefined> {
  const { data, error } = await supabase.from("essays").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return toEssay(data);
}

export async function createEssay(input: {
  ownerEmail: string;
  title: string;
  promptSnapshot: EssayPromptSnapshot;
  promptId?: string;
  parts: EssayPart[];
  status?: EssayStatus;
  content?: unknown;
  wordCount?: number;
}): Promise<{ essay?: Essay; error?: string }> {
  const now = new Date().toISOString();
  const row = {
    id: uid("essay"),
    owner_email: input.ownerEmail,
    prompt_id: input.promptId ?? null,
    prompt_snapshot: input.promptSnapshot,
    title: input.title,
    content: input.content ?? {},
    parts: input.parts,
    word_count: input.wordCount ?? 0,
    score: null,
    status: input.status ?? "draft",
    created_at: now,
    updated_at: now,
  };

  let { data, error } = await supabase.from("essays").insert(row).select("*").maybeSingle();

  // If the prompt_id foreign key isn't satisfied (the sourced prompt wasn't
  // cached yet), the snapshot already holds everything — retry without it.
  if (error && (error.code === "23503" || /foreign key/i.test(error.message))) {
    ({ data, error } = await supabase.from("essays").insert({ ...row, prompt_id: null }).select("*").maybeSingle());
  }

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.error("createEssay failed:", error);
    return { error: error?.message || "Could not create the essay." };
  }
  notifyEssayChange();
  return { essay: toEssay(data) };
}

export async function saveEssay(e: Essay): Promise<void> {
  await supabase.from("essays").update(fromEssay(e)).eq("id", e.id);
  notifyEssayChange();
}

export async function deleteEssay(id: string): Promise<void> {
  await supabase.from("essays").delete().eq("id", id);
  notifyEssayChange();
}

/** Move an essay to a new stage in the draft -> review workflow. */
export async function setEssayStatus(id: string, status: EssayStatus): Promise<void> {
  await supabase.from("essays").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  notifyEssayChange();
}

export const submitForReview = (id: string) => setEssayStatus(id, "in_review");
export const markReviewed = (id: string) => setEssayStatus(id, "reviewed");
export const archiveEssay = (id: string) => setEssayStatus(id, "archived");

/* --------------------------------- prompts --------------------------------- */

/** Cached prompts for a college in a given cycle (dataset read).
 *  College match is case-insensitive so "stanford university" still hits. */
export async function getPrompts(college: string, year: string): Promise<EssayPrompt[]> {
  const key = college.trim().replace(/[%_]/g, "");
  const { data, error } = await supabase
    .from("essay_prompts")
    .select("*")
    .ilike("college", key)
    .eq("year", year);
  if (error || !data) return [];
  return data.map(toPrompt);
}

export async function insertPrompts(prompts: EssayPrompt[]): Promise<void> {
  if (!prompts.length) return;
  const rows = prompts.map((p) => ({
    id: p.id,
    college: p.college,
    major: p.major,
    year: p.year,
    prompt_text: p.promptText,
    word_limit: p.wordLimit,
    source: p.source,
    source_url: p.sourceUrl ?? null,
    status: p.status,
    created_by: p.createdBy ?? null,
  }));
  const { error } = await supabase.from("essay_prompts").insert(rows);
  if (error) console.warn("[essays] prompt cache write failed:", error.message);
}

export async function verifyPrompt(id: string): Promise<void> {
  await supabase.from("essay_prompts").update({ status: "verified" }).eq("id", id);
}

/** Contribute a prompt to the shared dataset (manual add). Returns the row. */
export async function contributePrompt(input: {
  college: string;
  major: string | null;
  year: string;
  promptText: string;
  wordLimit: number | null;
  createdBy: string;
}): Promise<EssayPrompt | undefined> {
  const p: EssayPrompt = {
    id: uid("ep"),
    college: input.college,
    major: input.major,
    year: input.year,
    promptText: input.promptText,
    wordLimit: input.wordLimit,
    source: "user",
    status: "verified",
    createdBy: input.createdBy,
  };
  const { error } = await supabase.from("essay_prompts").insert({
    id: p.id,
    college: p.college,
    major: p.major,
    year: p.year,
    prompt_text: p.promptText,
    word_limit: p.wordLimit,
    source: p.source,
    source_url: null,
    status: p.status,
    created_by: p.createdBy,
  });
  return error ? undefined : p;
}

/* -------------------------------- comments --------------------------------- */

export async function getComments(essayId: string): Promise<EssayComment[]> {
  const { data, error } = await supabase
    .from("essay_comments")
    .select("*")
    .eq("essay_id", essayId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(toComment);
}

export async function addComment(input: Omit<EssayComment, "id" | "createdAt" | "resolved"> & { resolved?: boolean }): Promise<EssayComment | undefined> {
  const row = {
    id: uid("cmt"),
    essay_id: input.essayId,
    author: input.author,
    kind: input.kind,
    quoted_text: input.quotedText,
    range_from: input.rangeFrom,
    range_to: input.rangeTo,
    body: input.body,
    resolved: input.resolved ?? false,
  };
  const { data, error } = await supabase.from("essay_comments").insert(row).select("*").maybeSingle();
  if (error || !data) return undefined;
  notifyEssayChange();
  return toComment(data);
}

export async function setCommentResolved(id: string, resolved: boolean): Promise<void> {
  await supabase.from("essay_comments").update({ resolved }).eq("id", id);
  notifyEssayChange();
}

/* ---------------------------------- chats ---------------------------------- */

export async function getChats(essayId: string): Promise<EssayChat[]> {
  const { data, error } = await supabase
    .from("essay_chats")
    .select("*")
    .eq("essay_id", essayId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(toChat);
}

export async function createChat(essayId: string, ownerEmail: string, title = "New chat"): Promise<EssayChat | undefined> {
  const row = { id: uid("chat"), essay_id: essayId, owner_email: ownerEmail, title };
  const { data, error } = await supabase.from("essay_chats").insert(row).select("*").maybeSingle();
  if (error || !data) return undefined;
  return toChat(data);
}

export async function renameChat(id: string, title: string): Promise<void> {
  await supabase.from("essay_chats").update({ title }).eq("id", id);
}

export async function deleteChat(id: string): Promise<void> {
  await supabase.from("essay_chats").delete().eq("id", id);
}

export async function getMessages(chatId: string): Promise<EssayMessage[]> {
  const { data, error } = await supabase
    .from("essay_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(toMessage);
}

export async function addMessage(chatId: string, role: "user" | "assistant", content: string): Promise<EssayMessage | undefined> {
  const row = { id: uid("msg"), chat_id: chatId, role, content };
  const { data, error } = await supabase.from("essay_messages").insert(row).select("*").maybeSingle();
  if (error || !data) return undefined;
  return toMessage(data);
}
