"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { Combobox, type ComboOption } from "@/components/Combobox";
import { createEssay, getPrompts, insertPrompts, contributePrompt, verifyPrompt } from "@/lib/essays";
import {
  COMMON_APP_PROMPTS,
  COMMON_APP_WORD_LIMIT,
  COMMON_COLLEGES,
  currentCycle,
  recentCycles,
  defaultParts,
  hasExtracurriculars,
} from "@/lib/essayContent";
import type { EssayPrompt, EssayPromptSnapshot } from "@/lib/types";
import s from "../essays.module.css";

type Tab = "common" | "college" | "custom";

/** Typeahead source: curated colleges first, then the live directory API. */
async function searchColleges(query: string): Promise<ComboOption[]> {
  const q = query.trim().toLowerCase();
  const curated: ComboOption[] = COMMON_COLLEGES.filter((name) => name.toLowerCase().includes(q))
    .slice(0, 8)
    .map((name) => ({ value: name, label: name }));

  let api: ComboOption[] = [];
  try {
    const res = await fetch(`/api/colleges?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      api = (data.colleges ?? []).map((c: { name: string; country: string; region: string }) => ({
        value: c.name,
        label: c.name,
        hint: [c.region, c.country].filter(Boolean).join(", "),
      }));
    }
  } catch {
    /* ignore — curated results still show */
  }

  const seen = new Set(curated.map((c) => c.value.toLowerCase()));
  return [...curated, ...api.filter((a) => !seen.has(a.value.toLowerCase()))];
}

interface Choice {
  promptId?: string;
  college: string;
  major: string | null;
  promptText: string;
  wordLimit: number | null;
  source: EssayPromptSnapshot["source"];
}

export default function NewEssay() {
  const router = useRouter();
  const { user, email, hydrated } = useAuth();
  const { profile, setProfile, hydrated: storeHydrated } = useStore();

  const [tab, setTab] = useState<Tab>("common");
  const [choice, setChoice] = useState<Choice | null>(null);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  // College + major sourcing
  const cycles = recentCycles(4);
  const [year, setYear] = useState(currentCycle());
  const [college, setCollege] = useState("");
  const [major, setMajor] = useState("");
  const [sourcing, setSourcing] = useState(false);
  const [sourced, setSourced] = useState<EssayPrompt[] | null>(null);
  const [sourceErr, setSourceErr] = useState("");

  // Contribution
  const [contribOpen, setContribOpen] = useState(false);
  const [cText, setCText] = useState("");
  const [cLimit, setCLimit] = useState("");
  const [contribBusy, setContribBusy] = useState(false);

  // Prompt feedback (thumbs up/down + correction)
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [correctFor, setCorrectFor] = useState<string | null>(null);
  const [correctText, setCorrectText] = useState("");
  const [correctLimit, setCorrectLimit] = useState("");
  const [correctBusy, setCorrectBusy] = useState(false);

  // Custom
  const [customText, setCustomText] = useState("");
  const [customCollege, setCustomCollege] = useState("");
  const [customLimit, setCustomLimit] = useState("");

  if (!hydrated || !storeHydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  if (!user) {
    return (
      <div className="container">
        <PageHeader eyebrow="Essays · New" title="Start an essay" />
        <div className={s.empty}>
          <span className={s.emptyIcon}><Icon name="lock" size={24} /></span>
          <h3>Sign in to start writing</h3>
          <p>Essays save to your account so your drafts, comments, and AI chats are never lost.</p>
          <Link href="/dashboard?auth=login" className="btn btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  // Extracurriculars are required before any essay can be started.
  function goToProfile(step: number) {
    setProfile((p) => ({ ...p, meta: { ...p.meta, lastStep: step } }));
    router.push("/college/profile");
  }

  if (!hasExtracurriculars(profile)) {
    return (
      <div className="container">
        <PageHeader eyebrow="Essays · New" title="One quick step first" />
        <div className={s.gateCard}>
          <span className={s.gateIcon}><Icon name="award" size={28} /></span>
          <h2>Add your extracurriculars first</h2>
          <p>
            Your best essays come from your real experiences. Before you start writing, add your activities so your
            AI coach can brainstorm authentic topics and give feedback grounded in what you&apos;ve actually done.
          </p>
          <div className={s.gateSteps}>
            <div className={s.gateStep}><Icon name="upload" size={16} /> Upload your résumé once — we auto-fill your activities and awards.</div>
            <div className={s.gateStep}><Icon name="user" size={16} /> Or add a few activities by hand in your College Profile.</div>
            <div className={s.gateStep}><Icon name="spark" size={16} /> Then come back and your coach can brainstorm from your profile.</div>
          </div>
          <div className={s.gateActions}>
            <button className="btn btn-primary" onClick={() => goToProfile(6)}><Icon name="award" size={16} /> Add extracurriculars</button>
            <button className="btn btn-ghost" onClick={() => goToProfile(1)}><Icon name="upload" size={16} /> Upload a résumé</button>
          </div>
        </div>
      </div>
    );
  }

  async function findPrompts() {
    const c = college.trim();
    if (!c) return;
    setSourcing(true);
    setSourceErr("");
    setSourced(null);
    setChoice(null);
    try {
      const cached = await getPrompts(c, year);
      const wanted = major.trim().toLowerCase();
      const relevant = wanted ? cached.filter((p) => p.major === null || p.major.toLowerCase().includes(wanted)) : cached;
      if (relevant.length) {
        setSourced(relevant);
        setSourcing(false);
        return;
      }
      const res = await fetch("/api/essay/prompts/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ college: c, major: major.trim() || null, year }),
      });
      const data = (await res.json()) as { prompts?: EssayPrompt[]; error?: string };
      const prompts = data.prompts ?? [];
      if (prompts.length) {
        insertPrompts(prompts).catch(() => {});
        setSourced(prompts);
      } else {
        setSourced([]);
        setSourceErr(data.error || "No prompts found. Add it manually below to save it for everyone.");
        setContribOpen(true);
      }
    } catch {
      setSourced([]);
      setSourceErr("Something went wrong searching for prompts. Add it manually below or use the Custom tab.");
    } finally {
      setSourcing(false);
    }
  }

  function selectPrompt(p: EssayPrompt) {
    setChoice({ promptId: p.id, college: p.college || college.trim(), major: p.major, promptText: p.promptText, wordLimit: p.wordLimit, source: p.source });
  }

  function thumbUp(p: EssayPrompt) {
    selectPrompt(p);
    setConfirmed((s) => new Set(s).add(p.id));
    setFlagged((s) => { const n = new Set(s); n.delete(p.id); return n; });
    if (correctFor === p.id) setCorrectFor(null);
    verifyPrompt(p.id).catch(() => {}); // best-effort (only affects prompts you created)
  }

  function thumbDown(p: EssayPrompt) {
    setFlagged((s) => new Set(s).add(p.id));
    setConfirmed((s) => { const n = new Set(s); n.delete(p.id); return n; });
    setCorrectFor(p.id);
    setCorrectText(p.promptText);
    setCorrectLimit(p.wordLimit ? String(p.wordLimit) : "");
    setChoice((c) => (c?.promptId === p.id ? null : c));
  }

  async function submitCorrection(orig: EssayPrompt) {
    const text = correctText.trim();
    if (text.length < 8) return;
    setCorrectBusy(true);
    try {
      const p = await contributePrompt({
        college: orig.college || college.trim(),
        major: orig.major,
        year,
        promptText: text,
        wordLimit: correctLimit ? Number(correctLimit) || null : null,
        createdBy: email,
      });
      if (p) {
        setSourced((prev) => [p, ...(prev ?? [])]);
        selectPrompt(p);
        setCorrectFor(null);
        setCorrectText("");
        setCorrectLimit("");
      }
    } finally {
      setCorrectBusy(false);
    }
  }

  async function submitContribution() {
    const c = college.trim();
    const text = cText.trim();
    if (!c || text.length < 8) return;
    setContribBusy(true);
    try {
      const p = await contributePrompt({
        college: c,
        major: major.trim() || null,
        year,
        promptText: text,
        wordLimit: cLimit ? Number(cLimit) || null : null,
        createdBy: email,
      });
      if (p) {
        setSourced((prev) => [p, ...(prev ?? [])]);
        setChoice({ promptId: p.id, college: p.college, major: p.major, promptText: p.promptText, wordLimit: p.wordLimit, source: p.source });
        setCText("");
        setCLimit("");
        setContribOpen(false);
      }
    } finally {
      setContribBusy(false);
    }
  }

  async function start() {
    let c: Choice | null = choice;
    if (tab === "custom") {
      const text = customText.trim();
      if (text.length < 8) return;
      c = {
        college: customCollege.trim(),
        major: null,
        promptText: text,
        wordLimit: customLimit ? Number(customLimit) || null : null,
        source: "user",
      };
    }
    if (!c) return;
    setCreating(true);
    setCreateErr("");
    const snapshot: EssayPromptSnapshot = {
      promptId: c.promptId,
      college: c.college,
      major: c.major,
      year: tab === "common" ? currentCycle() : year,
      promptText: c.promptText,
      wordLimit: c.wordLimit,
      source: c.source,
    };
    const title = c.college ? `${c.college} essay` : "Personal statement";
    const { essay, error } = await createEssay({ ownerEmail: email, title, promptSnapshot: snapshot, promptId: c.promptId, parts: defaultParts() });
    if (essay) {
      router.push(`/essays/${essay.id}`);
      return;
    }
    setCreating(false);
    setCreateErr(
      /relation .* does not exist|schema cache|could not find the table/i.test(error || "")
        ? "The essay tables aren't set up in Supabase yet. Run supabase/schema.sql in your project, then try again."
        : error || "Could not create the essay. Please try again."
    );
  }

  const canStart = tab === "custom" ? customText.trim().length >= 8 : !!choice;

  return (
    <div className="container">
      <PageHeader
        eyebrow="Essays · New"
        title="Choose a prompt"
        lead="Pick a Common App prompt, pull this year's prompts for a college + major, or paste any prompt you need to answer."
      />

      <div className={s.aiNote} role="note">
        <Icon name="info" size={16} />
        <span>Heads up: the AI coach won&apos;t write a single word of your essay. It only helps you brainstorm topics, structure your ideas, and pressure-test your draft — the writing stays 100% yours.</span>
      </div>

      <div className={s.segmented} role="tablist" aria-label="Prompt type">
        {([["common", "Common App"], ["college", "College + Major"], ["custom", "Custom prompt"]] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={s.segBtn} data-active={tab === id} onClick={() => { setTab(id); setChoice(null); }}>
            {label}
          </button>
        ))}
      </div>

      <div className={s.panel}>
        {tab === "common" && (
          <>
            <span className="eyebrow">Common App · {currentCycle()} · 650 words</span>
            <div className={s.promptList}>
              {COMMON_APP_PROMPTS.map((p) => {
                const selected = choice?.promptText === p.text;
                return (
                  <button key={p.id} type="button" className={s.promptOption} data-selected={selected}
                    onClick={() => setChoice({ college: "", major: null, promptText: p.text, wordLimit: COMMON_APP_WORD_LIMIT, source: "common_app" })}>
                    <span className={s.promptRadio} aria-hidden />
                    <span className={s.promptBody}><span className={s.promptText}>{p.text}</span></span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === "college" && (
          <>
            <div className={s.yearRow}>
              <label htmlFor="cycle">Application cycle</label>
              <select id="cycle" className={s.yearSel} value={year} onChange={(e) => setYear(e.target.value)}>
                {cycles.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={s.row2}>
              <div>
                <label className="field-label">College / University</label>
                <Combobox
                  value={college}
                  onChange={setCollege}
                  placeholder="e.g. Stanford University"
                  debounceMs={220}
                  minChars={2}
                  emptyHint="No matches — keep typing or use your own"
                  getOptions={searchColleges}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="major">Major / program <span className="muted">(optional)</span></label>
                <input id="major" className="input" placeholder="e.g. Computer Science" value={major} onChange={(e) => setMajor(e.target.value)} />
              </div>
            </div>
            <div className={s.footerBar} style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
              <button className="btn btn-ivy" onClick={findPrompts} disabled={!college.trim() || sourcing}>
                {sourcing ? <><span className={s.spinner} /> Searching…</> : <><Icon name="search" size={16} /> Find prompts</>}
              </button>
              <span className="field-hint" style={{ margin: 0, alignSelf: "center" }}>We check the shared library first, then search the web for {year}.</span>
            </div>

            {sourced && sourced.length > 0 && (
              <div className={s.promptList} style={{ marginTop: "1.2rem" }}>
                {sourced.map((p) => {
                  const selected = choice?.promptId === p.id || choice?.promptText === p.promptText;
                  const isConfirmed = confirmed.has(p.id);
                  const isFlagged = flagged.has(p.id);
                  return (
                    <div key={p.id} className={s.promptCard} data-selected={selected} data-flagged={isFlagged}>
                      <button type="button" className={s.promptSelect} onClick={() => selectPrompt(p)} aria-pressed={selected}>
                        <span className={s.promptRadio} aria-hidden />
                        <span className={s.promptBody}>
                          <span className={s.promptText}>{p.promptText}</span>
                          <span className={s.promptTags}>
                            <span className={s.sourceTag} data-verified={p.status === "verified"}>
                              <Icon name={p.source === "user" ? "users" : p.status === "verified" ? "check" : "warning"} size={11} />
                              {p.source === "user" ? "Community" : p.status === "verified" ? "Verified" : "Needs review"}
                            </span>
                            <span className={s.sourceTag}>{p.year}</span>
                            {p.wordLimit && <span className={s.sourceTag}>{p.wordLimit} words</span>}
                            {p.major && <span className={s.sourceTag}>{p.major}</span>}
                            {p.sourceUrl && <span className={s.sourceTag}><a href={p.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Source</a></span>}
                          </span>
                        </span>
                      </button>
                      <div className={s.promptVote} role="group" aria-label="Is this prompt correct?">
                        <button
                          type="button"
                          className={s.voteBtn}
                          data-active={isConfirmed}
                          onClick={() => thumbUp(p)}
                          aria-label="This prompt looks correct"
                          title="Looks correct"
                        >
                          <Icon name="thumbUp" size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${s.voteBtn} ${s.voteDown}`}
                          data-active={isFlagged}
                          onClick={() => thumbDown(p)}
                          aria-label="This prompt is wrong — suggest the correct one"
                          title="Not correct"
                        >
                          <Icon name="thumbDown" size={15} />
                        </button>
                      </div>

                      {correctFor === p.id && (
                        <div className={s.correctBox}>
                          <div className={s.correctHead}><Icon name="pencil" size={14} /> What&apos;s the correct prompt for {p.college || college.trim()}?</div>
                          <textarea
                            className="input"
                            style={{ minHeight: 80 }}
                            value={correctText}
                            onChange={(e) => setCorrectText(e.target.value)}
                            placeholder="Paste the exact, correct prompt text…"
                            aria-label="Correct prompt text"
                          />
                          <div className={s.correctRow}>
                            <input
                              className="input"
                              style={{ maxWidth: 130 }}
                              inputMode="numeric"
                              placeholder="Word limit"
                              value={correctLimit}
                              onChange={(e) => setCorrectLimit(e.target.value.replace(/[^0-9]/g, ""))}
                              aria-label="Word limit"
                            />
                            <span className={s.correctSpacer} />
                            <button className="btn btn-ghost" onClick={() => setCorrectFor(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => submitCorrection(p)} disabled={correctText.trim().length < 8 || correctBusy}>
                              {correctBusy ? <><span className={s.spinner} /> Saving…</> : <>Save correct prompt</>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className="field-hint">Use <Icon name="thumbUp" size={11} /> / <Icon name="thumbDown" size={11} /> to tell us if a prompt is right. Prompts marked “Needs review” were auto-extracted — double-check against the college&apos;s site.</p>
              </div>
            )}
            {sourced && sourced.length === 0 && sourceErr && (
              <div className={`${s.notice} ${s.noticeErr}`} style={{ marginTop: "1rem" }}><Icon name="warning" size={16} /><span>{sourceErr}</span></div>
            )}

            {college.trim() && (
              <>
                <div className={s.divider}>or add one to the library</div>
                {!contribOpen ? (
                  <button className="btn btn-ghost" onClick={() => setContribOpen(true)}><Icon name="upload" size={16} /> Add a prompt for {college.trim()}</button>
                ) : (
                  <div className={s.contribBox}>
                    <h4>Contribute a prompt</h4>
                    <p className="sub">Saved to the shared {year} library for {college.trim()} so other students find it too.</p>
                    <label className="field-label" htmlFor="cText">Prompt text</label>
                    <textarea id="cText" className="input" style={{ minHeight: 90 }} placeholder="Paste the exact prompt…" value={cText} onChange={(e) => setCText(e.target.value)} />
                    <div className={s.row2} style={{ marginTop: "0.8rem" }}>
                      <div>
                        <label className="field-label" htmlFor="cLimit">Word limit <span className="muted">(optional)</span></label>
                        <input id="cLimit" className="input" inputMode="numeric" placeholder="e.g. 250" value={cLimit} onChange={(e) => setCLimit(e.target.value.replace(/[^0-9]/g, ""))} />
                      </div>
                    </div>
                    <div className={s.footerBar} style={{ marginTop: "1rem" }}>
                      <button className="btn btn-ghost" onClick={() => setContribOpen(false)}>Cancel</button>
                      <button className="btn btn-primary" onClick={submitContribution} disabled={cText.trim().length < 8 || contribBusy}>
                        {contribBusy ? <><span className={s.spinner} /> Saving…</> : <>Save &amp; select</>}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "custom" && (
          <>
            <label className="field-label" htmlFor="customText">Essay prompt</label>
            <textarea id="customText" className="input" style={{ minHeight: 110 }} placeholder="Paste or type the exact prompt you need to answer…" value={customText} onChange={(e) => setCustomText(e.target.value)} />
            <div className={s.row2} style={{ marginTop: "1rem" }}>
              <div>
                <label className="field-label" htmlFor="customCollege">College <span className="muted">(optional)</span></label>
                <input id="customCollege" className="input" placeholder="e.g. NYU" value={customCollege} onChange={(e) => setCustomCollege(e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="customLimit">Word limit <span className="muted">(optional)</span></label>
                <input id="customLimit" className="input" inputMode="numeric" placeholder="e.g. 400" value={customLimit} onChange={(e) => setCustomLimit(e.target.value.replace(/[^0-9]/g, ""))} />
              </div>
            </div>
          </>
        )}
      </div>

      {createErr && (
        <div className={`${s.notice} ${s.noticeErr}`} style={{ marginTop: "1rem" }}><Icon name="warning" size={16} /><span>{createErr}</span></div>
      )}

      <div className={s.footerBar}>
        <Link href="/essays" className="btn btn-ghost">Cancel</Link>
        <button className="btn btn-primary" onClick={start} disabled={!canStart || creating}>
          {creating ? <><span className={s.spinner} /> Creating…</> : <>Start writing <Icon name="arrow" size={16} /></>}
        </button>
      </div>
    </div>
  );
}
