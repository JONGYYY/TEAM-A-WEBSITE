# DreamCollege.ai — Team A PRD & Build Prompt
### Student Dashboard · Career Planning · College Planning (with AI Profile Assessment)

> **How to use this document:** This is a self-contained Product Requirements Document **and** a build prompt. Paste it back to the agent and say *"Build this."* It contains the art direction, motion system, information architecture, screen-by-screen specs, data schemas, and acceptance criteria. Everything outside the three scoped surfaces (Dashboard, Career Planning, College Planning) is explicitly out of scope.

---

## 0. The One-Paragraph Brief

We are building a student-facing web product for **DreamCollege.ai** that turns "another form that asks for data" into a guided journey that *feels worth it in the first 60 seconds*. A student lands on a **Dashboard**, answers a few warm get-to-know-you questions, and is nudged toward **Building Their College Profile** (this *is* the onboarding — a 7-step adaptive flow). Completing it unlocks an **LLM-powered Admissions Evaluation** (a simulated admissions-committee review with scores, strengths, red flags, and action items). The product also covers **Career Planning** (discovery quiz → fit map → top-3 tracks → 4-year plan) and **College Planning** (majors → calibrated college list → scholarships → shortlist). The aesthetic must be **clean, professional, educational, and trustworthy** — and must **not** look AI-generated. We deliberately reject the existing site's purple-on-white look.

---

## 1. Goals, Non-Goals & Scope

### 1.1 In Scope (build all three)
1. **Student Dashboard** — the home base. First-run get-to-know-you micro-quiz + a clear, single next step.
2. **Career Planning** — Career Discovery quiz, Career Fit Map, Top-3 Career Tracks, Explore Careers (14 clusters), 4-Year High School Planner.
3. **College Planning** — College Profile builder (the 7-step onboarding), Majors, Colleges (Likely/Target/Reach), Scholarships, Shortlist, and the **AI Admissions Evaluation** as the capstone.

### 1.2 Explicitly Out of Scope
- The gamified XP/levels tracking system (that is **Team B**).
- College Application surface (essays, rec letters, interview coach — Grade 12 module).
- Counselor admin tooling, billing, auth backends. (Stub auth with a mock session is fine.)

### 1.3 Product Goals (tied to the research success metrics)
| Goal | Why | Measurable target |
|---|---|---|
| Make the first run feel *worth it* | Research: students want a "clear, immediate next step" and "visible progress," not another form | Time-to-first-recommendation < 90s; onboarding completion ≥ 70% |
| Kill manual-entry friction | Research pain point #1 | Resume upload + autofill; auto-expanding rows; AI shortening of long text |
| Earn trust on sensitive data | Research: income/residency feel invasive, no privacy cues | Inline privacy microcopy; optional fields clearly marked; opt-in ≥ baseline |
| Adapt to grade | Research: underclassmen burn out on repetitive academic forms | Grade-branching question logic (9–10 = explore; 11–12 = full profile) |
| Reliable, fast, no "vibe-coded" feel | Research: laggy, unresponsive buttons, broken EA/ED, broken dark mode | No double-click bugs; working dark mode; instant transitions |

### 1.4 Non-Goals
- No real PII storage. Use `sessionStorage`/`localStorage` + JSON. JSON-first: **generate once, store, render.**
- Do not copy, port, or take inspiration from the provided legacy HTML's visual design. Use it **only** to understand data fields and question logic.

---

## 2. Personas (from the Week 1 research)

- **James, Grade 11** — *"I want a platform that analyzes my profile and helps me maximize my chances at my dream college."* Needs: confidence he has a real shot; clarity on what to do next. → **Primary user of the Admissions Evaluation.**
- **Leila, Grade 10** — *"It's hard to find scholarships that match my profile."* Needs: matched scholarships, low-pressure exploration. → **Underclassman exploration path + Scholarships.**
- **Alexa, Grade 12** — *"I need a college list with schools that match my interests and where I have a strong chance."* Needs: a personalized, calibrated college list. → **College Planning / Likely-Target-Reach.**

**Real needs across all three:** confidence, reassurance their profile is competitive, and a clear next step. **Design everything to answer "what do I do next?" at every screen.**

---

## 3. Art Direction — "The Almanac" (anti-AI-slop)

> **Design thesis:** A modern *college almanac / study journal*. Editorial, warm, and credentialed — like a beautifully typeset field guide to your future, not a SaaS dashboard. Confident dominant color (deep ivy green) on warm paper, with one sharp accent (marigold). This reads as **collegiate + trustworthy + human**, and is the deliberate opposite of the cliché purple-gradient-on-white AI look.

### 3.1 What we are NOT doing (hard bans)
- ❌ No purple gradients on white (this is the legacy look — avoid entirely).
- ❌ No Inter, Roboto, Arial, system-ui, **or Space Grotesk** for display. No generic geometric-sans-only palette.
- ❌ No glassmorphism-everywhere, no neon-on-black "dashboard" tropes, no random emoji as icons in production UI.
- ❌ No evenly-distributed timid pastel palettes. Commit to a dominant color.
- ❌ No center-everything, three-equal-cards, hero-with-blob layouts.

### 3.2 Typography (distinctive, open-source, easy to load)
Use a three-voice type system. All are free (Google Fonts / open licenses).

| Role | Typeface | Why it's right (and not slop) |
|---|---|---|
| **Display / headlines / big numbers** | **Fraunces** (variable; use optical-size + soft/wght axes) | Warm, intelligent, editorial serif with character. Signals education + gravitas. Not Playfair-overused. |
| **UI / body / forms** | **Hanken Grotesk** | Humanist grotesque — friendly and *highly* legible for teens, professional without being corporate. Clearly not Inter. |
| **Data / eyebrows / labels / scores / tags** | **Spline Sans Mono** | Monospace for stats, score chips, section numbers ("Section 01"), and metadata. Gives an evidence-based, "measured" trust signal. |

**Type rules**
- Display uses tight tracking and optical sizing; headlines may set in **Fraunces 9pt→144pt optical** range. Allow one tasteful italic for emphasis (Fraunces italic is gorgeous).
- Body line-height 1.5–1.6; max measure ~68ch.
- Eyebrows/labels: Spline Sans Mono, uppercase, `letter-spacing: 0.12em`, small.
- Numbers in stats/scores: Fraunces for the big figure, Spline Sans Mono for the unit/label beneath.

```css
/* load */
/* Fraunces (display, variable), Hanken Grotesk (UI), Spline Sans Mono (data) */
--font-display: "Fraunces", Georgia, serif;
--font-ui: "Hanken Grotesk", system-ui, sans-serif;
--font-mono: "Spline Sans Mono", ui-monospace, monospace;
```

### 3.3 Color & Theme (CSS variables; ship light + working dark)

**Light — "Parchment"** (default)
```css
:root {
  --paper:        #F4EEE1;  /* warm ivory base */
  --paper-raised: #FBF7EE;  /* cards */
  --paper-sunk:   #ECE3D1;  /* wells, inputs */
  --ink:          #18241E;  /* primary text, near-black forest */
  --ink-soft:     #46544C;  /* secondary text */
  --ivy:          #15402E;  /* dominant brand color */
  --ivy-bright:   #2E7D5B;  /* interactive ivy, success/"Likely" */
  --marigold:     #DA8A2C;  /* THE accent: CTAs, focus, highlights */
  --clay:         #B24A2E;  /* "Reach", warnings, red flags */
  --amber:        #C2882B;  /* "Target" */
  --hairline:     #D8CCB4;  /* 1px rules & borders */
  --shadow:       18 36 28; /* rgb for soft ink shadows */
}
```

**Dark — "Nightfall Library"** (must actually work; fix the legacy contrast bug)
```css
[data-theme="dark"] {
  --paper:        #0F1713;  /* deep forest-ink */
  --paper-raised: #16211B;
  --paper-sunk:   #0B110E;
  --ink:          #EFE7D5;  /* warm cream text */
  --ink-soft:     #A9B3AB;
  --ivy:          #5FB98C;  /* brand lightens for contrast */
  --ivy-bright:   #74D4A2;
  --marigold:     #E7A24A;
  --clay:         #E0775A;
  --amber:        #E0B057;
  --hairline:     #2A382F;
}
```
All text must meet **WCAG AA (4.5:1)** on its background in both themes — verify, do not eyeball.

### 3.4 Backgrounds, depth & texture (atmosphere, not flat fills)
- Base: warm paper with a **very subtle paper grain** (SVG `feTurbulence` noise at ~3–5% opacity) — reads as tactile, not flat.
- **Hairline grid / ledger lines:** faint horizontal rules behind hero/section headers, like a ledger or planner page. 1px `--hairline` at low opacity.
- **Topographic / contour line motif** (thin ivy lines) used sparingly behind the dashboard hero and the assessment cover — evokes "mapping your path."
- Cards: `--paper-raised` with a 1px `--hairline` border and a **soft, low, warm shadow** (`0 2px 0 rgba(...)` hairline + `0 18px 40px -24px rgba(shadow)`). No heavy drop shadows.
- Accent usage budget: marigold appears on **one primary action per view** + focus rings + small highlights. Never large marigold fills.

### 3.5 Components & layout language
- **Asymmetric editorial grid** (12-col), generous left margin for section numbers/eyebrows like a printed syllabus. Avoid dead-center hero.
- **Corner radii:** small/architectural — `--r-sm: 6px`, `--r-md: 10px`, `--r-lg: 16px`. No fully-rounded pill everything; pills reserved for tags/filters.
- **Borders over shadows** for structure; shadows only for elevation on hover/active.
- **Iconography:** a single consistent line-icon set (e.g., **Phosphor** or **Lucide**), 1.5px stroke, ink color. No emoji in production chrome (emoji ok only inside user content).
- **Data viz:** the radar/skill chart and fit bars use ivy + marigold + semantic colors; lines are crisp, labels in mono.
- **Progress:** a thin **ledger progress bar** (top of profile builder) + step dots. Always show "Step X of 7" and % complete.

---

## 4. Motion System — "Considered, not scattered"

> Principle: **one well-orchestrated page-load per screen beats ten random micro-interactions.** Motion communicates hierarchy and progress; it never blocks input.

### 4.1 Tech
- **React build → use the `motion` library (Motion / Framer Motion).** Springs for interactive elements, `staggerChildren` for reveals, `layout` for list reorders, `AnimatePresence` for step transitions.
- **Static HTML build → CSS `@keyframes` + `IntersectionObserver`** for on-scroll reveals; `prefers-reduced-motion` fully honored (reduce to opacity-only or none).

### 4.2 Tokens
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);   /* signature ease */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--dur-fast: 120ms; --dur-base: 220ms; --dur-slow: 420ms; --dur-page: 720ms;
/* spring (motion): stiffness 220, damping 26, mass 1 */
```

### 4.3 Section-by-section animation spec
| Surface / moment | Animation | Notes |
|---|---|---|
| **Dashboard page-load** | Staggered reveal: eyebrow → headline (Fraunces) word-by-word mask-up → greeting → "next step" card lifts last with a subtle scale 0.98→1. `animation-delay` ladder (0/80/160/240ms). | The hero is the delight moment. Contour lines fade in behind. |
| **Get-to-know-you micro-quiz** | Each question card slide+fade in from +12px; selecting an option triggers a quick spring "press" + checkmark draw (SVG path length). Auto-advance with a 250ms cross-dissolve. | Feels like Duolingo's friendly cadence (research benchmark). |
| **Profile builder step change** | Horizontal step transition: outgoing −24px/fade, incoming +24px/fade; ledger progress bar **animates fill width** with `--ease-out`; step dot pulses once. | `AnimatePresence` mode="popLayout". Never lose scroll position jarringly. |
| **Auto-adding activity/award rows** | New empty row expands height 0→auto with fade; appears the moment the previous is touched. | Solves research "keep clicking Add" pain. |
| **AI shortening (>150 chars)** | "Tidy with AI" button → shimmer sweep over the textarea, text count-down animates to ≤150. | |
| **Number/score reveals (stats, GPA, scores)** | Count-up from 0 → value over 600ms `--ease-out`; radar chart draws each axis sequentially (stroke-dashoffset). | Used on Dashboard stats + Assessment scores. |
| **Career Fit Map result** | Top-3 tracks deal in like cards (stagger 90ms), each with a confidence bar that fills. A subtle "reveal" curtain wipe before results. | The quiz→result is a payoff moment; make it feel earned. |
| **College list (Likely/Target/Reach)** | Cards reorder with `layout` animation when filters change; chips recolor with crossfade. | |
| **Admissions Evaluation cover → report** | Cover card with overall score does a slow count-up + radar draw; on scroll, each of the 7 sections reveals with a left-margin section number sliding in (mono). | This is the capstone — it should feel cinematic but fast (<1s to first paint). |
| **Hover/press micro-interactions** | Buttons: 1px lift + marigold underline grow; cards: hairline border brightens + shadow deepens. ~120–160ms. | Subtle, consistent, everywhere. |
| **Reduced motion** | All transforms → opacity fades ≤120ms; count-ups show final value instantly; no parallax. | Mandatory. |

---

## 5. Information Architecture

```
App
├─ /dashboard                      ← home base (first-run get-to-know-you here)
│   └─ NextStep card → routes to profile builder / next gated action
├─ /career
│   ├─ /career/discovery           ← quiz (pillars → Career Fit Map)
│   ├─ /career/fit-report          ← Career Fit Map + top-3 tracks
│   ├─ /career/tracks              ← My Career Tracks (track switcher, sections)
│   ├─ /career/explore             ← Explore All Careers (14 clusters)
│   └─ /career/planner             ← My 4-Year High School Planner
├─ /college
│   ├─ /college/profile            ← THE 7-step College Profile builder (onboarding)
│   ├─ /college/majors             ← best-fit majors
│   ├─ /college/colleges           ← calibrated list: Likely / Target / Reach
│   ├─ /college/scholarships       ← matched scholarships
│   ├─ /college/shortlist          ← saved colleges
│   └─ /college/assessment         ← AI Admissions Evaluation (capstone, gated)
└─ (shared) left sidebar nav, theme toggle, profile/progress chip
```

**Left sidebar** mirrors the legacy menu *content* (College Profile, Positioning Statement, Majors, Colleges, Activities, Scholarships, Shortlist + Career section) but with the new Almanac styling. Active item: ivy text + marigold left-tick. Collapsible.

---

## 6. Screen Specs

### 6.1 Dashboard (`/dashboard`)
**Purpose:** orient, warm up, and point to exactly one next step.

**First run (no profile yet):**
1. **Hero:** eyebrow (mono) `WELCOME TO DREAMCOLLEGE` → Fraunces headline *"Let's map your path, {firstName}."* → one-line subhead.
2. **Get-to-know-you micro-quiz (3–5 Q, ≤45s):**
   - Q1 **Grade** (9/10/11/12) → *drives all downstream branching*.
   - Q2 **Interests** (multi-select chips from the 18 interest taxonomy in §8.3).
   - Q3 **Primary goal** (e.g., "Find best-fit colleges" / "Explore careers" / "Find scholarships" / "Know my chances") → personalizes the next-step CTA.
   - Q4 (10–12 only) **Dream school or target selectivity** (optional).
   - Q5 **How are you feeling about applications?** (mood chips: Excited / Curious / Overwhelmed / Behind) → tunes tone of microcopy.
   - One question per screen, friendly, auto-advancing, skippable. Stored to `profile.intake`.
3. **The Next-Step card (the hook):** large, marigold primary CTA. Copy adapts to grade + goal:
   - 9–10: *"Start with Career Discovery →"* (exploration-first; academic entry optional).
   - 11–12: *"Build your College Profile →"* (leads into the 7-step builder).
   - Always shows *why*: "Takes ~6 min · unlocks your Admissions Evaluation."

**Return visits:**
- **Progress ring** of profile completion (% to 100%) + the 8-step drop-off-aware checklist.
- **"Next best action"** card (single, prominent).
- **Snapshot stats** (mono labels, Fraunces numbers): profile %, GPA (if entered), # activities, # saved colleges. Count-up on load.
- **Recent recommendations** (majors/careers/colleges) as compact cards.
- Gated tiles for **Admissions Evaluation** and **Major Rec** show a lock + "Complete profile to unlock."

### 6.2 College Profile Builder = Onboarding (`/college/profile`)
**This is the onboarding.** 7 steps, adaptive by grade, JSON-first, autosave each step, resumable. Ledger progress bar + "Step X of 7."

> **Friction-killers (directly from research):** resume upload + AI autofill; auto-expanding rows (no repeated "Add"); AI text-shortening for long entries; inline privacy notes on sensitive fields; adaptive questions (hide/skip what doesn't apply, e.g., Class Rank "Unknown"); no double-click bugs; everything saves.

**Step 0 (pre-step): Resume Autofill (optional, prominent)**
- "Have a resume? Drop it here and we'll fill what we can." Upload PDF/DOCX → parse → pre-populate Activities, Awards, Testing, Education. Student reviews/edits. This addresses the #1 onboarding pain point.

**Step 1 — Basic Information**
Fields: First / Middle / Last name · Gender (Male / Female / Non-binary / Prefer not to say / Self-describe) · Current School Year (9th/10th/11th/12th/Graduate) · Graduation Year (2026–2030) · First-generation college student? (Yes / No / Prefer not to identify) · **Family Income** (bands: <$10k … $200k+ / Unknown).
- 🔒 **Privacy microcopy** under income + first-gen: *"Used only to match financial aid & scholarships. Stored on your device. Optional."* Field is clearly **optional**.

**Step 2 — Education**
School Name · Country · State/Province · City · Graduating class size (number, **min 0**, no negatives) · Class Ranking (number, **min 0**, with **"Unknown / not ranked" toggle** that hides the field — adaptive) · GPA Scale · Unweighted GPA · Weighted GPA · optional note.
- For grades 9–10: this whole step is **optional / collapsible** ("Add later").

**Step 3 — Testing**
Exam-type chooser (SAT / ACT / AP / IB / none-yet). 
- **AP:** searchable subject picker that **disables already-selected subjects** (research bug) + score; auto-add empty row pattern.
- "I haven't taken tests yet" path for underclassmen → skip cleanly.

**Step 4 — Preference** (college fit signals)
Country · State/Province (multi) · Region (NE/SE/Midwest/etc.) · **Academic Interests** (the 18-item taxonomy, §8.3) · Academic program strength · Type of institution · Special designation (e.g., HBCU, Women's, Religious) · Campus culture · Financial-aid importance · Geography/setting (Urban/Suburban/Rural).
- All multi-select chip grids with clear selected states.

**Step 5 — Awards**
Repeatable rows: Title · Grade Level · Level of Recognition (School/Regional/State/National/International). **Auto-add empty row** below the last; unfilled rows ignored on save.

**Step 6 — Activities**
Repeatable rows: Activity Type · Position/Leadership · Organization · Grade(s) (9–12/PG multi-check) · Weeks/Year (**min 0**) · Hours/Week (**min 0**) · Description.
- **Description fix:** allow long paste; **"Tidy with AI"** condenses to ≤150 chars while preserving meaning, with live count. Auto-add empty row.

**Step 7 — Review & Generate**
- Clean summary of everything, edit-in-place.
- **Privacy & consent panel** (what's stored, where, how it's used; toggle to include income in aid matching).
- Primary CTA: **"Generate my Admissions Evaluation →"** → calls the LLM, stores JSON, routes to `/college/assessment`.
- This is the **time-to-first-recommendation** payoff. Show a tasteful "reading your profile…" loading state (contour-line draw + step ticks), not a raw spinner.

**Adaptive grade logic (summary)**
- **9th–10th:** Steps 2/3 optional; emphasize Interests/Preference + Career Discovery; fewer academic asks (prevent burnout). Different, more exploratory questions.
- **11th:** full profile encouraged; nudge toward Evaluation + college list.
- **12th:** full profile + application-readiness framing.

### 6.3 Career Planning

**`/career/discovery` — Career Discovery Quiz**
- Pillar/RIASEC-style quiz (legacy uses 4 "pillars"). One question per screen, progress dots, friendly tone, instant feedback. "Start Quiz →" entry. Stores answers → computes **Career Fit Map**.

**`/career/fit-report` — Career Fit Map + Top-3 Tracks**
- Result reveal (see §4.3): a **fit map** (could be a labeled scatter/cluster or radar) + **top-3 best-fit career tracks** with confidence bars and a one-line "why this fits you." CTA into Tracks and into the 4-Year Planner.

**`/career/tracks` — My Career Tracks**
- **Track switcher** (pill bar) to flip between the 3 tracks. Each track: overview, recommended courses, activities, milestones, and links to majors/colleges that feed it. Progress per track.

**`/career/explore` — Explore All Careers**
- Grid of **14 career clusters** (from legacy): Digital Technology · Advanced Manufacturing · Arts, Entertainment & Design · Healthcare & Human Services · Education · Public Service & Safety · Marketing & Sales · Management & Entrepreneurship · Financial Services · Construction · Supply Chain & Transportation · Hospitality, Events & Tourism · (+2 more, e.g., Agriculture & Natural Resources, Law & Government). Filter All / Saved. Click → cluster detail with careers, outlook, typical majors, and a "Save to profile" star.

**`/career/planner` — My 4-Year High School Planner**
- "My plans" list + a detailed **Your Plan** view by grade/semester: courses, activities, summer programs, testing timeline.
- Actions: **Run my recalibration** (AI re-plan), **Send for counselor review**, **Book an appointment**, **Export PDF**, **Download JSON**, Save as draft / Make active. Plan status badge (Draft/Active/In review).
- Auto-recalibrating: when profile changes, prompt to re-run the plan.

### 6.4 College Planning

**`/college/majors`** — Best-fit majors ranked from interests + career tracks; each with fit %, related careers, and "colleges strong in this major."

**`/college/colleges`** — The calibrated list, grouped **Likely / Target / Reach** with semantic colors (green/amber/clay). Each college card: fit breakdown (Academic / Career / Culture fit), admit-chance band, net-price estimate, and Save. Filters reorder with `layout` animation. **Fix the legacy EA/ED feature:** the EA/ED/RD strategy recommender must return a *rendered* recommendation (e.g., "ED to X maximizes your odds because…"), never raw backend text.

**`/college/scholarships`** — Scholarships matched to profile (esp. for Leila): match %, amount, deadline, eligibility, effort level. Sort by deadline/amount/fit. Privacy-aware (uses income only if opted in).

**`/college/shortlist`** — Saved colleges + scholarships in one place, export.

### 6.5 AI Admissions Evaluation (`/college/assessment`) — Capstone
Port and re-skin the existing tool (github.com/JONGYYY/Admissions-evaluation / admissions-evaluationn.vercel.app) into the Almanac design system. It is **gated** behind a sufficiently complete profile.

**Structure (match the existing report):**
- **Cover:** student name, class year, school, GPA/SAT/rank line, **overall score (e.g., 4.5/5)**, verdict label ("Exceptional Profile"), and a **7-axis Skill Radar**: Academic · Extracurricular · Career · Awards · Narrative · Strengths · Red Flags. Count-up + radar draw on load.
- **Section 1 — Academic Evaluation:** GPA/rank/SAT stat cards with verdicts; **comparison vs school averages** (bar pairs: student vs school avg, labeled "Significantly Above/At/Below").
- **Section 2 — Extracurricular Evaluation:** activities classified by **Tier 1–4** with rationale; overall assessment bullets.
- **Section 3 — Career Readiness:** "doing well / differentiated / trajectory" columns.
- **Section 4 — Awards & Recognition:** grouped National / State / Regional / Local with counts.
- **Section 5 — Narrative & Fit:** identified **"spike,"** committee description, and **Fit Metrics** (Academic/Curiosity/Community/Leadership/Values/Diversity %) with click-to-expand bars vs avg applicant.
- **Section 6 — Top Strengths:** numbered 01–05 with evidence bullets.
- **Section 7 — Red Flags:** severity-tagged (minor/moderate) with concrete fixes.
- **Footer:** Overall Assessment + **Action Items** (the "what to do next" the research demands).

**AI integration:** Anthropic Claude. **JSON-first**: send structured profile → receive a single validated JSON object (schema in §8.4) → store → render. Generate once; re-render from stored JSON. Show explanations everywhere (research: recommendations must explain *why* to be trusted). Counselor-reviewable output.

---

## 7. Trust, Performance & Reliability (research-driven, non-negotiable)
- **Privacy cues:** inline microcopy on every sensitive field; a one-screen "How we use your data" before generation; all data client-side for this build.
- **Performance:** lazy-load routes; defer the radar/chart lib; no layout thrash; target Lighthouse ≥ 90 perf. Pages must not feel laggy during form entry (legacy complaint).
- **Reliability:** no "needs a second click" bugs — single source of truth, disabled→loading→done button states; optimistic UI with rollback.
- **Working dark mode:** verified AA contrast in both themes (legacy dark mode was broken).
- **No negatives:** numeric inputs (class rank, class size, weeks, hours) clamp to ≥ 0.
- **Adaptive questions:** never show irrelevant fields (e.g., Class Rank when "not ranked").

---

## 8. Data Model (JSON-first, `sessionStorage`/`localStorage` handoff)

### 8.1 Storage keys
`dc.profile` · `dc.career` · `dc.plan` · `dc.collegeList` · `dc.assessment` · `dc.ui` (theme, etc.). Cross-page handoff via these keys (matches program's `sessionStorage` requirement).

### 8.2 `studentProfile`
```json
{
  "intake": { "grade": 11, "interests": ["Engineering","Math and Statistics"],
              "primaryGoal": "know_my_chances", "mood": "curious", "targetSelectivity": "highly_selective" },
  "basic": { "firstName": "", "middleName": "", "lastName": "", "gender": "",
             "schoolYear": "11th Grade", "gradYear": 2027,
             "firstGen": "no", "familyIncomeBand": "Unknown", "incomeOptIn": false },
  "education": { "school": "", "country": "", "state": "", "city": "",
                 "classSize": 0, "classRank": null, "rankUnknown": false,
                 "gpaScale": "4.0", "gpaUnweighted": null, "gpaWeighted": null },
  "testing": { "sat": null, "act": null, "ap": [ { "subject": "", "score": null } ], "ib": [] },
  "preference": { "countries": [], "states": [], "regions": [], "interests": [],
                  "programStrength": [], "institutionType": [], "specialDesignation": [],
                  "campusCulture": [], "financialAidImportance": "", "setting": [] },
  "awards": [ { "title": "", "gradeLevel": "", "recognition": "" } ],
  "activities": [ { "type": "", "position": "", "organization": "", "grades": [],
                    "weeksPerYear": 0, "hoursPerWeek": 0, "description": "" } ],
  "meta": { "completionPct": 0, "lastStep": 1, "updatedAt": "" }
}
```

### 8.3 Interest taxonomy (18, from legacy Preference step)
Arts · Humanities · Political Science · Business · Economics · Accounting · Communications · Health and Medicine · Public and Social Services · Math and Statistics · Environmental Science · Computer Technologies · Science · Education · Engineering · English · History · Psychology.

### 8.4 `assessment` (LLM output contract)
```json
{
  "overallScore": 4.5,
  "verdict": "Exceptional Profile",
  "radar": { "academic":4.8,"extracurricular":5.0,"career":4.5,"awards":4.7,
             "narrative":4.6,"strengths":4.9,"redFlags":3.4 },
  "academic": { "rating":"Highly Competitive",
                "stats":[{"label":"Unweighted GPA","value":"3.95","note":""}],
                "comparison":[{"metric":"SAT","student":"1590","schoolAvg":"1240","delta":"Significantly Above"}] },
  "extracurricular": { "rating":"Exceptional",
                       "items":[{"tier":1,"category":"","title":"","rationale":""}],
                       "overall":["..."] },
  "career": { "rating":"Well-Developed", "doingWell":["..."], "differentiated":["..."], "trajectory":["..."] },
  "awards": { "rating":"Nationally Distinguished",
              "groups":[{"level":"National","count":5,"items":["..."]}], "summary":"" },
  "narrative": { "rating":"Highly Distinctive", "spike":"",
                 "committeeDescription":["..."],
                 "fitMetrics":[{"name":"Academic","pct":98,"avg":68,"label":"Exceptional","detail":""}] },
  "strengths": [ { "n":1, "title":"", "points":["..."] } ],
  "redFlags": [ { "title":"", "severity":"moderate", "points":["..."] } ],
  "overallAssessment": ["..."],
  "actionItems": ["..."]
}
```
Validate against this schema before render; if a field is missing, degrade gracefully (hide the card, never show raw text).

---

## 9. Recommended Tech Stack
- **Framework:** **Next.js (App Router) + React + TypeScript** (matches the existing Vercel assessment app for easy port). If a pure-static deliverable is required by the program, mirror in **self-contained HTML/CSS/JS** per surface — but prefer Next.
- **Styling:** CSS variables + CSS Modules or Tailwind configured to the tokens above (no default Tailwind look — override fonts/colors/radii).
- **Motion:** `motion` (Framer Motion) for React; CSS keyframes for static.
- **Charts:** lightweight (e.g., `recharts` or hand-rolled SVG) for radar + fit bars; keep bundle small, lazy-load.
- **Fonts:** `next/font` (Fraunces, Hanken Grotesk, Spline Sans Mono), self-hosted, `display: swap`.
- **Icons:** Phosphor or Lucide, 1.5px stroke.
- **AI:** Anthropic Claude via a server action / API route; strict JSON output; schema validation (zod).
- **State/handoff:** localStorage/sessionStorage wrappers, typed; JSON-first.

---

## 10. Acceptance Criteria (definition of done)
1. **Three surfaces** (Dashboard, Career Planning, College Planning) fully navigable; nothing out-of-scope built.
2. **First-run get-to-know-you** quiz runs in <45s and produces a grade-adaptive next-step CTA.
3. **7-step profile builder** works end-to-end: resume autofill, auto-expanding rows, AI text-tidy, privacy microcopy, no-negatives, adaptive Class Rank, autosave + resume, "Step X of 7" + ledger progress.
4. **Career**: quiz → fit map → top-3 tracks → 14-cluster explorer → 4-year planner with recalibrate/review/export.
5. **College**: majors, Likely/Target/Reach list (with working, *rendered* EA/ED recommendation), scholarships, shortlist.
6. **Admissions Evaluation** renders all 7 sections + radar + action items from validated JSON; gated behind profile completion.
7. **Design**: Fraunces/Hanken/Spline type system, Parchment + working Nightfall dark theme, Almanac components, paper texture/ledger backgrounds. **Does not resemble** the legacy purple/white site or generic AI output.
8. **Motion**: one orchestrated page-load per surface + the specified section animations; full `prefers-reduced-motion` support.
9. **Quality**: AA contrast both themes; no double-click bugs; Lighthouse perf ≥ 90; no raw backend text ever surfaced.

---

## 11. Build Order (suggested)
1. Design system foundation (tokens, fonts, themes, base components, motion tokens).
2. App shell + sidebar nav + theme toggle.
3. Dashboard + get-to-know-you intake.
4. 7-step Profile Builder (the onboarding) + data layer.
5. Admissions Evaluation (port + reskin + JSON contract).
6. Career Planning (quiz → fit → tracks → explore → planner).
7. College Planning (majors → list → scholarships → shortlist).
8. Polish pass: motion orchestration, reduced-motion, dark-mode contrast audit, performance.

---

### Appendix A — Source mapping (what informed each decision)
- **Research Report Week 1:** personas, wants vs needs, onboarding pain points (manual entry, button reliability, broken EA/ED, AP re-select, 150-char limit, negatives, income privacy, broken dark mode), competitor patterns (Common App trust, Khan/Duolingo bite-size, CollegeVine personalization), proposed ideas (stronger backend, underclassmen exploration, streamlined entry/autofill/adaptive logic), success metrics.
- **Intern Program brief:** scope (onboarding = Team A; gamification = Team B, out of scope), grade-branching, LLM profile assessment, JSON-first, sessionStorage handoff, three-stage portal (Discover/Plan/Apply).
- **Legacy HTML (data only, not design):** 7-step profile fields & options, 18 interests, 14 career clusters, career quiz pillars, 4-year planner actions.
- **Admissions-evaluation app:** the exact 7-section report structure, radar, tiers, fit metrics, strengths/red-flags/action-items.
