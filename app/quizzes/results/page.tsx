"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { QuizGate } from "@/components/QuizGate";
import { DonutChart } from "@/components/DonutChart";
import { SurveyResultView } from "@/components/SurveyResultView";
import { staggerParent, riseItem } from "@/lib/motion";
import {
  useQuizData,
  useRoster,
  getSurveysByOwner,
  getGroupsByOwner,
  getAssignedStudentsForQuiz,
  getSubmissionsForQuiz,
  getQuiz,
  aggregateSurvey,
  displayName,
} from "@/lib/quizzes";
import type { Quiz, Group, Submission } from "@/lib/types";
import s from "../quizzes.module.css";

export default function ResultsPage() {
  return (
    <QuizGate requireRole="counselor">
      <Results />
    </QuizGate>
  );
}

function Results() {
  const { user } = useAuth();
  const email = user!.email;
  useRoster(); // populate the name cache so displayName() works in render

  const { data: base } = useQuizData(
    async () => {
      const [surveys, groups] = await Promise.all([getSurveysByOwner(email), getGroupsByOwner(email)]);
      return { surveys, groups };
    },
    { surveys: [] as Quiz[], groups: [] as Group[] },
    [email]
  );
  const { surveys, groups } = base;

  const [surveyId, setSurveyId] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [selStudent, setSelStudent] = useState<string | null>(null);

  useEffect(() => {
    setSurveyId((cur) => (surveys.some((q) => q.id === cur) ? cur : surveys[0]?.id || ""));
  }, [surveys]);

  const { data: detail } = useQuizData(
    async () => {
      if (!surveyId) return { quiz: undefined as Quiz | undefined, baseRoster: [] as string[], submissions: [] as Submission[] };
      const [quiz, baseRoster, submissions] = await Promise.all([
        getQuiz(surveyId),
        getAssignedStudentsForQuiz(surveyId, email),
        getSubmissionsForQuiz(surveyId),
      ]);
      return { quiz, baseRoster, submissions };
    },
    { quiz: undefined as Quiz | undefined, baseRoster: [] as string[], submissions: [] as Submission[] },
    [surveyId, email]
  );
  const { quiz, baseRoster, submissions } = detail;

  const roster = useMemo(() => {
    const group = groups.find((g) => g.id === groupFilter);
    return group ? baseRoster.filter((e) => group.studentEmails.includes(e)) : baseRoster;
  }, [baseRoster, groupFilter, groups]);

  const subByStudent = useMemo(() => {
    const map = new Map<string, (typeof submissions)[number]>();
    submissions
      .filter((sub) => sub.status !== "in_progress" && sub.result)
      .forEach((sub) => map.set(sub.studentEmail, sub));
    return map;
  }, [submissions]);

  const agg = useMemo(
    () => (quiz ? aggregateSurvey(quiz, roster, submissions) : null),
    [quiz, roster, submissions]
  );

  // keep selected student valid for current roster
  useEffect(() => {
    setSelStudent((cur) => (cur && roster.includes(cur) && subByStudent.has(cur) ? cur : null));
  }, [roster, subByStudent]);

  const selectedSub = selStudent ? subByStudent.get(selStudent) : undefined;

  if (surveys.length === 0) {
    return (
      <div className="container">
        <PageHeader eyebrow="Counselor" title="Results" lead="Track survey completion and see where your cohort lands." />
        <div className={s.empty}>
          <span className={s.emptyIcon}><Icon name="pie" size={24} /></span>
          <h3>No surveys yet</h3>
          <p className="muted">Build a survey (a category-scored questionnaire), assign it, and results will show up here.</p>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/quizzes/build" className="btn btn-primary">Build a survey <Icon name="arrow" size={16} /></Link>
          </div>
        </div>
      </div>
    );
  }

  const groupLeanMax = Math.max(1, ...(agg?.groupLean.map((g) => g.count) || [1]));

  return (
    <div className="container">
      <PageHeader eyebrow="Counselor" title="Results" lead="See who's finished, how each student leans, and where the whole group lands." />

      <div className={s.toolbar}>
        <label style={{ flex: 1, minWidth: 220 }}>
          <span className="field-label">Survey</span>
          <select className="select" value={surveyId} onChange={(e) => { setSurveyId(e.target.value); setSelStudent(null); }}>
            {surveys.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
        </label>
        {groups.length > 0 && (
          <label>
            <span className="field-label">Group</span>
            <select className="select" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
              <option value="all">All assigned</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
        )}
        {quiz && (
          <Link href={`/quizzes/preview/${quiz.id}`} className="btn btn-ghost" style={{ alignSelf: "flex-end" }}>
            <Icon name="user" size={15} /> Preview
          </Link>
        )}
      </div>

      {roster.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}><Icon name="users" size={22} /></span>
          <h3>Not assigned to anyone yet</h3>
          <p className="muted">Assign this survey to students or a group, then come back to track results.</p>
          <div style={{ marginTop: "1rem" }}>
            <Link href={`/quizzes/assignments?quiz=${surveyId}`} className="btn btn-primary">Assign this survey <Icon name="arrow" size={16} /></Link>
          </div>
        </div>
      ) : (
        <>
          {/* group aggregate */}
          <section className={`${s.panel} surface`} style={{ marginBottom: "1.4rem" }}>
            <div className={s.panelHead}>
              <span className={s.panelTitle}>Where the group lands</span>
              <span className={s.statusPill} data-status={agg && agg.completed > 0 ? "graded" : "todo"}>
                {agg?.completed || 0}/{agg?.total || 0} completed
              </span>
            </div>

            {agg && agg.completed > 0 ? (
              <div className={s.aggGrid}>
                <DonutChart data={agg.outcomeDistribution} completed={agg.completed} total={agg.total} />
                <div>
                  <span className="field-label">Overall lean (all answers)</span>
                  <div className={s.tallyList}>
                    {agg.groupLean.map((g) => (
                      <div key={g.outcomeId} className={s.tallyRow} data-win={g.count === groupLeanMax && g.count > 0}>
                        <span className={s.tallyLabel}>{g.label}</span>
                        <span className={s.tallyTrack}><span className={s.tallyFill} style={{ width: `${(g.count / groupLeanMax) * 100}%` }} /></span>
                        <span className={s.tallyCount}>{g.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">No responses yet. The distribution appears as soon as the first student finishes.</p>
            )}
          </section>

          {/* cohort + individual detail */}
          <div className={s.subGrid}>
            <section>
              <div className={s.panelHead}>
                <span className={s.panelTitle}>Cohort</span>
                <span className="muted" style={{ fontSize: "0.82rem" }}>{agg?.completed || 0} of {agg?.total || 0} finished</span>
              </div>
              <motion.div variants={staggerParent} initial="hidden" animate="show" className={s.cohortGrid}>
                {roster.map((st) => {
                  const sub = subByStudent.get(st);
                  const done = !!sub;
                  return (
                    <motion.button
                      key={st}
                      variants={riseItem}
                      type="button"
                      className={s.studentChip}
                      data-done={done || undefined}
                      data-active={selStudent === st || undefined}
                      disabled={!done}
                      onClick={() => done && setSelStudent(st)}
                    >
                      <span className={s.chipDot}>{done ? <Icon name="check" size={12} /> : null}</span>
                      <span className={s.chipMain}>
                        <span className={s.chipName}>{displayName(st)}</span>
                        <span className={s.chipStatus}>{done ? sub!.result?.label || "Completed" : "Pending"}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </section>

            {selectedSub && quiz ? (
              <div className={`${s.review} surface`}>
                <div className={s.panelHead}>
                  <span className={s.panelTitle}>{displayName(selectedSub.studentEmail)}</span>
                  <button className={s.iconBtnInline} onClick={() => setSelStudent(null)} aria-label="Close detail"><Icon name="x" size={15} /></button>
                </div>
                <SurveyResultView quiz={quiz} submission={selectedSub} />
              </div>
            ) : (
              <div className={`${s.panel} surface`}>
                <div className={s.emptyDetail}>
                  <span className={s.emptyIcon}><Icon name="user" size={20} /></span>
                  <p className="muted" style={{ marginTop: "0.6rem" }}>Select a completed student to see how they lean, question by question.</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
