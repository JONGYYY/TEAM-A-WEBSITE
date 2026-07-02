"use client";

import Link from "next/link";
import { useAuth, type Role } from "@/lib/auth";
import { Icon } from "./Icon";

/**
 * Gates quiz pages behind sign-in and (optionally) a specific role.
 * Renders a friendly prompt instead of the page content when blocked.
 */
export function QuizGate({ requireRole, children }: { requireRole?: Role; children: React.ReactNode }) {
  const { user, role, hydrated } = useAuth();

  if (!hydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  if (!user) {
    return (
      <div className="container">
        <div className="surface" style={gateStyle}>
          <span style={iconStyle}><Icon name="lock" size={26} /></span>
          <h1 style={{ margin: "0.2rem 0 0.4rem" }}>Sign in to use Quizzes</h1>
          <p className="muted" style={{ maxWidth: "46ch", margin: "0 auto 1.3rem" }}>
            Quizzes are tied to your account. Create a free account or log in to take or build quizzes.
          </p>
          <div style={{ display: "flex", gap: "0.7rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard?auth=signup" className="btn btn-primary">Create account <Icon name="arrow" size={16} /></Link>
            <Link href="/dashboard?auth=login" className="btn btn-ghost">Log in</Link>
          </div>
        </div>
      </div>
    );
  }

  if (requireRole && role !== requireRole) {
    const needCounselor = requireRole === "counselor";
    return (
      <div className="container">
        <div className="surface" style={gateStyle}>
          <span style={iconStyle}><Icon name={needCounselor ? "grad" : "user"} size={26} /></span>
          <h1 style={{ margin: "0.2rem 0 0.4rem" }}>
            {needCounselor ? "Counselors only" : "Students only"}
          </h1>
          <p className="muted" style={{ maxWidth: "48ch", margin: "0 auto 1.3rem" }}>
            {needCounselor
              ? "This area is for counselor accounts — building, assigning, and grading quizzes."
              : "This area is for student accounts taking assigned quizzes."}{" "}
            You&apos;re signed in as a {role}.
          </p>
          <Link href="/quizzes" className="btn btn-ghost">Back to Quizzes</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const gateStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "3rem 2rem",
  maxWidth: 620,
  margin: "2rem auto 0",
};
const iconStyle: React.CSSProperties = {
  display: "inline-grid",
  placeItems: "center",
  width: 56,
  height: 56,
  borderRadius: "50%",
  background: "color-mix(in srgb, var(--ivy-bright) 14%, transparent)",
  color: "var(--ivy-bright)",
  marginBottom: "0.6rem",
};
