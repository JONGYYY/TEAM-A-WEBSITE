"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { QuizGate } from "@/components/QuizGate";
import { RefreshButton } from "@/components/RefreshButton";
import {
  useQuizData,
  getQuizzesByOwner,
  getGroupsByOwner,
  getStudents,
  getAssignmentsByOwner,
  createAssignment,
  deleteAssignment,
  saveGroup,
  deleteGroup,
  getSubmissionsForAssignment,
  displayName,
  uid,
  type RosterUser,
} from "@/lib/quizzes";
import type { Group, Quiz, Assignment } from "@/lib/types";
import s from "../quizzes.module.css";

type AssignmentsData = {
  quizzes: Quiz[];
  groups: Group[];
  students: RosterUser[];
  assignments: Assignment[];
  doneCounts: Record<string, number>;
};

export default function AssignmentsPage() {
  return (
    <QuizGate requireRole="counselor">
      <Assignments />
    </QuizGate>
  );
}

function Assignments() {
  const { user } = useAuth();
  const email = user!.email;

  const { data } = useQuizData<AssignmentsData>(
    async () => {
      const [quizzes, groups, students, assignments] = await Promise.all([
        getQuizzesByOwner(email),
        getGroupsByOwner(email),
        getStudents(),
        getAssignmentsByOwner(email),
      ]);
      const doneCounts: Record<string, number> = {};
      await Promise.all(
        assignments.map(async (a) => {
          const subs = await getSubmissionsForAssignment(a.id);
          doneCounts[a.id] = subs.filter((x) => x.status !== "in_progress").length;
        })
      );
      return { quizzes, groups, students, assignments, doneCounts };
    },
    { quizzes: [], groups: [], students: [], assignments: [], doneCounts: {} },
    [email]
  );
  const { quizzes, groups, students, assignments, doneCounts } = data;

  const [quizId, setQuizId] = useState<string>("");
  const [selStudents, setSelStudents] = useState<Set<string>>(new Set());
  const [selGroups, setSelGroups] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // preselect quiz from ?quiz= or first quiz
  useEffect(() => {
    const fromUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("quiz") : null;
    setQuizId((cur) => cur || fromUrl || quizzes[0]?.id || "");
  }, [quizzes]);

  const quizAssignments = assignments.filter((a) => a.quizId === quizId);

  function toggle(set: Set<string>, key: string): Set<string> {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  }

  function resolveEmails(): string[] {
    const emails = new Set<string>(selStudents);
    selGroups.forEach((gid) => {
      const g = groups.find((x) => x.id === gid);
      g?.studentEmails.forEach((e) => emails.add(e));
    });
    return [...emails];
  }

  async function assign() {
    setErr(null); setMsg(null);
    if (!quizId) { setErr("Pick a quiz to assign."); return; }
    const emails = resolveEmails();
    if (emails.length === 0) { setErr("Select at least one student or group."); return; }
    const onlyGroup = selStudents.size === 0 && selGroups.size === 1 ? [...selGroups][0] : undefined;
    await createAssignment({ quizId, assignedBy: email, studentEmails: emails, groupId: onlyGroup });
    setSelStudents(new Set());
    setSelGroups(new Set());
    setMsg(`Assigned to ${emails.length} student${emails.length === 1 ? "" : "s"}.`);
  }

  if (quizzes.length === 0) {
    return (
      <div className="container">
        <PageHeader eyebrow="Counselor" title="Assignments" lead="Assign quizzes to students and manage groups." />
        <div className={s.empty}>
          <span className={s.emptyIcon}><Icon name="spark" size={24} /></span>
          <h3>Create a quiz first</h3>
          <p className="muted">You need at least one quiz before you can assign it.</p>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/quizzes/build" className="btn btn-primary">Build a quiz <Icon name="arrow" size={16} /></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader eyebrow="Counselor" title="Assignments" lead="Pick a quiz, then assign it to individual students or a whole group." />

      <div className={s.toolbar}>
        <label style={{ flex: 1, minWidth: 240 }}>
          <span className="field-label">Quiz</span>
          <select className="select" value={quizId} onChange={(e) => { setQuizId(e.target.value); setMsg(null); setErr(null); }}>
            {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
        </label>
        {quizId && (
          <div style={{ display: "flex", gap: "0.5rem", alignSelf: "flex-end" }}>
            <Link href={`/quizzes/build?id=${quizId}`} className="btn btn-ghost"><Icon name="book" size={15} /> Edit</Link>
            <Link href={`/quizzes/preview/${quizId}`} className="btn btn-ghost"><Icon name="user" size={15} /> Preview</Link>
          </div>
        )}
      </div>

      <div className={s.cols}>
        {/* Assign panel */}
        <section className={`${s.panel} surface`}>
          <div className={s.panelHead}>
            <span className={s.panelTitle}>Assign to</span>
            <span className={s.grow} />
            <RefreshButton label="Refresh students" />
          </div>

          {students.length === 0 ? (
            <div className={s.empty}>
              <span className={s.emptyIcon}><Icon name="user" size={22} /></span>
              <h3>No student accounts yet</h3>
              <p className="muted">
                Students who sign up with the <em>Student</em> role — on any device — will show up here automatically.
                Share the site link and ask them to create a student account.
              </p>
            </div>
          ) : (
            <>
              {groups.length > 0 && (
                <>
                  <span className="field-label">Groups</span>
                  <div className={s.tagRow}>
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={s.groupChip}
                        data-on={selGroups.has(g.id)}
                        onClick={() => setSelGroups((set) => toggle(set, g.id))}
                      >
                        <Icon name="layers" size={13} /> {g.name} <span className="muted">({g.studentEmails.length})</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className={s.listHeadRow}>
                <span className="field-label" style={{ margin: 0 }}>Students</span>
                <div className={s.selectAllRow}>
                  <button
                    type="button"
                    className={s.miniLink}
                    onClick={() => setSelStudents(new Set(students.map((st) => st.email)))}
                  >
                    Select all
                  </button>
                  <span className={s.miniSep}>·</span>
                  <button
                    type="button"
                    className={s.miniLink}
                    onClick={() => setSelStudents(new Set())}
                    disabled={selStudents.size === 0}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div>
                {students.map((st) => (
                  <label key={st.email} className={s.checkRow}>
                    <input type="checkbox" checked={selStudents.has(st.email)} onChange={() => setSelStudents((set) => toggle(set, st.email))} />
                    <span className={s.checkName}>{st.name}</span>
                    <span className={s.grow} />
                    <span className={s.checkEmail}>{st.email}</span>
                  </label>
                ))}
              </div>

              {err && <div className={s.formError}><Icon name="warning" size={14} /> {err}</div>}
              {msg && <div className={s.savedNote} style={{ marginTop: "0.9rem" }}><Icon name="check" size={14} /> {msg}</div>}

              <div style={{ marginTop: "1rem" }}>
                <button className="btn btn-primary" onClick={assign}>Assign quiz <Icon name="arrow" size={16} /></button>
              </div>
            </>
          )}

          {quizAssignments.length > 0 && (
            <div style={{ marginTop: "1.6rem" }}>
              <span className="field-label">Assigned so far</span>
              {quizAssignments.map((a) => {
                const done = doneCounts[a.id] ?? 0;
                const allDone = done >= a.studentEmails.length && a.studentEmails.length > 0;
                return (
                  <div key={a.id} className={s.checkRow}>
                    <div className={s.subItemMain}>
                      <div className={s.checkName}>{a.studentEmails.length} student{a.studentEmails.length === 1 ? "" : "s"}{a.groupId ? " (group)" : ""}</div>
                      <div className={s.checkEmail}>{new Date(a.assignedAt).toLocaleDateString()}</div>
                    </div>
                    <span className={s.statusPill} data-status={allDone ? "graded" : done > 0 ? "submitted" : "todo"}>
                      {done}/{a.studentEmails.length} done
                    </span>
                    <button className={s.iconBtnInline} onClick={() => deleteAssignment(a.id)} aria-label="Delete assignment"><Icon name="x" size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Groups panel */}
        <GroupManager email={email} groups={groups} students={students} />
      </div>
    </div>
  );
}

function GroupManager({ email, groups, students }: { email: string; groups: Group[]; students: RosterUser[] }) {
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Set<string>>(new Set());

  async function create() {
    if (!name.trim() || members.size === 0) return;
    const g: Group = { id: uid("grp"), ownerEmail: email, name: name.trim(), studentEmails: [...members] };
    await saveGroup(g);
    setName("");
    setMembers(new Set());
  }

  return (
    <section className={`${s.panel} surface`}>
      <div className={s.panelHead}><span className={s.panelTitle}>Groups</span></div>

      {students.length === 0 ? (
        <p className="muted">Add student accounts to create groups.</p>
      ) : (
        <>
          <label>
            <span className="field-label">New group name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class of 2027" />
          </label>
          <span className="field-label" style={{ marginTop: "0.7rem", display: "block" }}>Members</span>
          <div>
            {students.map((st) => (
              <label key={st.email} className={s.checkRow}>
                <input
                  type="checkbox"
                  checked={members.has(st.email)}
                  onChange={() => setMembers((set) => { const n = new Set(set); if (n.has(st.email)) n.delete(st.email); else n.add(st.email); return n; })}
                />
                <span className={s.checkName}>{st.name}</span>
              </label>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: "0.8rem" }} disabled={!name.trim() || members.size === 0} onClick={create}>
            <Icon name="layers" size={15} /> Create group
          </button>
        </>
      )}

      {groups.length > 0 && (
        <div style={{ marginTop: "1.4rem" }}>
          <span className="field-label">Existing groups</span>
          {groups.map((g) => (
            <div key={g.id} className={s.checkRow}>
              <div className={s.subItemMain}>
                <div className={s.checkName}>{g.name}</div>
                <div className={s.checkEmail}>{g.studentEmails.map(displayName).join(", ")}</div>
              </div>
              <button className={s.iconBtnInline} onClick={() => deleteGroup(g.id)} aria-label="Delete group"><Icon name="x" size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
