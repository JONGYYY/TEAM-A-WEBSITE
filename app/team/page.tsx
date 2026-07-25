"use client";

import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { staggerParent, riseItem } from "@/lib/motion";
import s from "./team.module.css";

interface Member {
  name: string;
  role: string;
  meta?: string; // school, grade, etc.
  bio?: string;
  photo?: string; // path under /public
}

interface TeamGroup {
  title: string;
  blurb?: string;
  members: Member[];
}

const TEAM: TeamGroup[] = [
  {
    title: "Event Leads",
    blurb: "Bringing our programs to life — planning, creativity, and on-the-ground energy.",
    members: [
      {
        name: "Samia Guled",
        role: "Event Lead",
        meta: "9th Grade · Magruder High School",
        photo: "/team/samia-guled.png",
        bio: "Samia Guled is a ninth-grade student at Magruder High School. She enjoys meeting new people, making friends, and helping others. Samia loves drawing, creating art, and making DIY projects. In her free time, she enjoys listening to music, playing games with family and friends, and watching web series. She is excited to bring her creativity, positive energy, and collaborative spirit to the team.",
      },
      {
        name: "Savannah Charles",
        role: "Event Lead",
        meta: "9th Grade · Walter Johnson High School",
        photo: "/team/savannah-charles.png",
        bio: "Savannah Charles is a ninth-grade student at Walter Johnson High School. She is passionate about learning, staying active, and encouraging others to reach their full potential. Outside of school, she enjoys playing tennis and volleyball. Savannah has held several leadership roles and takes pride in approaching each responsibility with care and dedication. She looks forward to continuing to grow as a leader and making a positive impact in her community.",
      },
    ],
  },
  {
    title: "Officers",
    blurb: "The core team steering DreamCollege day to day.",
    members: [
      { name: "Jonathan", role: "Officer" },
      { name: "Sara", role: "Officer" },
      { name: "Daveon", role: "Officer" },
    ],
  },
  {
    title: "Youth Ambassador",
    blurb: "Student voices spreading the word and representing DreamCollege in their communities.",
    members: [
      {
        name: "Nadia Guled",
        role: "Outreach & Youth Ambassador",
        meta: "6th Grade · Shady Grove Middle School",
        photo: "/team/nadia-guled.png",
        bio: "Nadia Guled is a sixth-grade student at Shady Grove Middle School. She enjoys helping others and creating art independently, with friends, and with her siblings. Nadia is excited to collaborate with the team, use her creativity to support the community, and make a positive difference. She looks forward to learning, growing, and contributing as an Outreach & Youth Ambassador.",
      },
    ],
  },
];

/** Deterministic warm gradient for initials avatars. */
function avatarGradient(name: string): string {
  const palettes = [
    ["#6d5ef0", "#a78bfa"],
    ["#0e7c66", "#34d399"],
    ["#b45309", "#f59e0b"],
    ["#be4a33", "#f97316"],
    ["#1d4ed8", "#60a5fa"],
    ["#9d174d", "#f472b6"],
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const [a, b] = palettes[h % palettes.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Team() {
  return (
    <div className="container">
      <PageHeader
        eyebrow="About · Our Team"
        title="Meet the DreamCollege Team"
        lead="The students and leaders building DreamCollege — organized by the roles they play."
      />

      {TEAM.map((group) => (
        <section key={group.title} className={s.group}>
          <div className={s.groupHead}>
            <h2 className={s.groupTitle}>{group.title}</h2>
            <span className={s.groupCount}>
              {group.members.length} {group.members.length === 1 ? "member" : "members"}
            </span>
          </div>
          {group.blurb && <p className={s.groupBlurb}>{group.blurb}</p>}

          {group.members.length === 0 ? (
            <div className={s.emptyNote}>Ambassadors coming soon — this is where we&apos;ll showcase them.</div>
          ) : (
            <motion.div variants={staggerParent} initial="hidden" animate="show" className={s.grid}>
              {group.members.map((m) => (
                <motion.article key={`${group.title}-${m.name}`} variants={riseItem} className={s.card}>
                  <div className={s.cardTop}>
                    {m.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photo} alt={m.name} className={s.photo} />
                    ) : (
                      <span className={s.avatar} style={{ background: avatarGradient(m.name) }} aria-hidden="true">
                        {initials(m.name)}
                      </span>
                    )}
                    <div>
                      <h3 className={s.name}>{m.name}</h3>
                      <span className={s.role}>{m.role}</span>
                      {m.meta && <span className={s.meta}>{m.meta}</span>}
                    </div>
                  </div>
                  {m.bio ? (
                    <p className={s.bio}>{m.bio}</p>
                  ) : (
                    <p className={s.bioPending}>Bio coming soon.</p>
                  )}
                </motion.article>
              ))}
            </motion.div>
          )}
        </section>
      ))}
    </div>
  );
}
