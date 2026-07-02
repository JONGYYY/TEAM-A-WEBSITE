"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { QuizGate } from "@/components/QuizGate";
import { QuizRunner } from "@/components/QuizRunner";
import { useQuizData, getQuiz } from "@/lib/quizzes";
import type { Quiz } from "@/lib/types";

export default function PreviewPage({ params }: { params: { quizId: string } }) {
  return (
    <QuizGate requireRole="counselor">
      <Preview quizId={params.quizId} />
    </QuizGate>
  );
}

function Preview({ quizId }: { quizId: string }) {
  const { user } = useAuth();
  const { data: quiz, loading } = useQuizData<Quiz | undefined>(() => getQuiz(quizId), undefined, [quizId]);

  if (loading) {
    return (
      <div className="container">
        <div className="surface" style={{ textAlign: "center", padding: "3rem 2rem", maxWidth: 560, margin: "2rem auto 0" }}>
          <p className="muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (!quiz || quiz.ownerEmail !== user!.email) {
    return (
      <div className="container">
        <div className="surface" style={{ textAlign: "center", padding: "3rem 2rem", maxWidth: 560, margin: "2rem auto 0" }}>
          <h1 style={{ marginBottom: "0.4rem" }}>Quiz not found</h1>
          <p className="muted" style={{ marginBottom: "1.2rem" }}>This quiz could not be found in your library.</p>
          <Link href="/quizzes" className="btn btn-ghost">Back to Quizzes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <QuizRunner quiz={quiz} mode="preview" />
      <div style={{ maxWidth: 760, margin: "1.2rem auto 0", display: "flex", gap: "0.7rem" }}>
        <Link href={`/quizzes/build?id=${quiz.id}`} className="btn btn-ghost">Edit quiz</Link>
        <Link href={`/quizzes/assignments?quiz=${quiz.id}`} className="btn btn-primary">Assign this quiz</Link>
      </div>
    </div>
  );
}
