/* Domain content for Career + College planning (mock catalog, profile-aware derivations). */

export interface QuizQuestion {
  id: string;
  pillar: "investigate" | "create" | "lead" | "serve";
  text: string;
}

export const QUIZ: QuizQuestion[] = [
  { id: "q1", pillar: "investigate", text: "I enjoy breaking a hard problem into pieces until it makes sense." },
  { id: "q2", pillar: "create", text: "I'd rather make something new than follow a set procedure." },
  { id: "q3", pillar: "lead", text: "I naturally end up organizing the people around me." },
  { id: "q4", pillar: "serve", text: "Helping someone directly is more rewarding than winning." },
  { id: "q5", pillar: "investigate", text: "I like data, patterns, and figuring out why things work." },
  { id: "q6", pillar: "create", text: "Design, writing, or building things energizes me." },
  { id: "q7", pillar: "lead", text: "I'm comfortable making the final call and owning the outcome." },
  { id: "q8", pillar: "serve", text: "I want my work to visibly improve my community." },
  { id: "q9", pillar: "investigate", text: "I'd take a research project over a sales pitch any day." },
  { id: "q10", pillar: "create", text: "I notice when something is poorly designed and want to fix it." },
  { id: "q11", pillar: "lead", text: "Starting a club, team, or venture sounds exciting, not scary." },
  { id: "q12", pillar: "serve", text: "Teaching or mentoring others comes naturally to me." },
];

export interface CareerTrack {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  pillars: Record<string, number>;
  interests: string[];
  majors: string[];
  sampleRoles: string[];
  courses: string[];
}

export const TRACKS: CareerTrack[] = [
  { id: "eng", name: "Engineering & Build", tagline: "Design and build systems that work.", icon: "cog",
    pillars: { investigate: 3, create: 3, lead: 1, serve: 1 }, interests: ["Engineering", "Computer Technologies", "Math and Statistics", "Science"],
    majors: ["Mechanical Engineering", "Computer Science", "Electrical Engineering"], sampleRoles: ["Software Engineer", "Robotics Engineer", "Product Engineer"], courses: ["AP Calculus BC", "AP Physics C", "AP Computer Science A"] },
  { id: "research", name: "Science & Research", tagline: "Discover how the world works.", icon: "spark",
    pillars: { investigate: 4, create: 1, lead: 1, serve: 1 }, interests: ["Science", "Environmental Science", "Math and Statistics", "Health and Medicine"],
    majors: ["Biology", "Chemistry", "Neuroscience", "Statistics"], sampleRoles: ["Research Scientist", "Data Analyst", "Lab Director"], courses: ["AP Biology", "AP Chemistry", "AP Statistics"] },
  { id: "health", name: "Health & Medicine", tagline: "Care for people and advance medicine.", icon: "heart",
    pillars: { investigate: 3, create: 1, lead: 1, serve: 4 }, interests: ["Health and Medicine", "Science", "Psychology", "Public and Social Services"],
    majors: ["Pre-Med / Biology", "Nursing", "Public Health"], sampleRoles: ["Physician", "Nurse", "Public Health Specialist"], courses: ["AP Biology", "AP Chemistry", "AP Psychology"] },
  { id: "business", name: "Business & Entrepreneurship", tagline: "Build ventures and lead organizations.", icon: "rocket",
    pillars: { investigate: 2, create: 3, lead: 4, serve: 1 }, interests: ["Business", "Economics", "Accounting", "Communications"],
    majors: ["Business Administration", "Economics", "Finance"], sampleRoles: ["Founder", "Product Manager", "Consultant"], courses: ["AP Microeconomics", "AP Macroeconomics", "AP Statistics"] },
  { id: "arts", name: "Arts, Media & Design", tagline: "Tell stories and shape how things look and feel.", icon: "palette",
    pillars: { investigate: 1, create: 4, lead: 2, serve: 1 }, interests: ["Arts", "Communications", "English", "Humanities"],
    majors: ["Graphic Design", "Film", "Architecture", "Communications"], sampleRoles: ["Designer", "Creative Director", "Architect"], courses: ["AP Studio Art", "AP English Language", "AP Art History"] },
  { id: "social", name: "Public Service & Society", tagline: "Shape policy, justice, and community.", icon: "scale",
    pillars: { investigate: 2, create: 1, lead: 3, serve: 4 }, interests: ["Political Science", "Public and Social Services", "History", "Psychology", "Education"],
    majors: ["Political Science", "Public Policy", "Sociology", "Education"], sampleRoles: ["Policy Analyst", "Attorney", "Educator", "Nonprofit Leader"], courses: ["AP US Government", "AP US History", "AP Psychology"] },
];

export function scoreTracks(interests: string[], pillarScores?: Record<string, number>): { track: CareerTrack; fit: number }[] {
  const pillarTotal = pillarScores ? Object.values(pillarScores).reduce((a, b) => a + b, 0) || 1 : 0;
  return TRACKS.map((track) => {
    const interestOverlap = track.interests.filter((i) => interests.includes(i)).length;
    let fit = 40 + interestOverlap * 14;
    if (pillarScores && pillarTotal) {
      const tp = track.pillars;
      const tpTotal = Object.values(tp).reduce((a, b) => a + b, 0);
      let align = 0;
      for (const k of Object.keys(tp)) {
        align += Math.min((pillarScores[k] ?? 0) / pillarTotal, tp[k] / tpTotal);
      }
      fit += Math.round(align * 45);
    }
    return { track, fit: Math.min(98, Math.max(35, fit)) };
  }).sort((a, b) => b.fit - a.fit);
}

export interface Major { name: string; interests: string[]; blurb: string; careers: string[] }
export const MAJORS: Major[] = [
  { name: "Computer Science", interests: ["Computer Technologies", "Math and Statistics", "Engineering"], blurb: "Algorithms, software, and systems.", careers: ["Software Engineer", "ML Engineer"] },
  { name: "Mechanical Engineering", interests: ["Engineering", "Science", "Math and Statistics"], blurb: "Design machines and physical systems.", careers: ["Mechanical Engineer", "Robotics"] },
  { name: "Biology", interests: ["Science", "Health and Medicine", "Environmental Science"], blurb: "Living systems from cells to ecosystems.", careers: ["Physician", "Researcher"] },
  { name: "Economics", interests: ["Economics", "Business", "Math and Statistics"], blurb: "How people and markets make decisions.", careers: ["Analyst", "Economist"] },
  { name: "Business Administration", interests: ["Business", "Accounting", "Communications"], blurb: "Manage and grow organizations.", careers: ["Manager", "Founder"] },
  { name: "Political Science", interests: ["Political Science", "History", "Public and Social Services"], blurb: "Power, policy, and institutions.", careers: ["Policy Analyst", "Attorney"] },
  { name: "Psychology", interests: ["Psychology", "Health and Medicine", "Science"], blurb: "The science of mind and behavior.", careers: ["Therapist", "UX Researcher"] },
  { name: "English & Writing", interests: ["English", "Humanities", "Communications"], blurb: "Language, literature, and rhetoric.", careers: ["Writer", "Editor"] },
  { name: "Public Health", interests: ["Health and Medicine", "Public and Social Services", "Science"], blurb: "Health at the population scale.", careers: ["Epidemiologist", "Health Policy"] },
  { name: "Environmental Science", interests: ["Environmental Science", "Science", "Public and Social Services"], blurb: "Climate, ecology, and sustainability.", careers: ["Env. Scientist", "Conservationist"] },
  { name: "Communications & Media", interests: ["Communications", "Arts", "English"], blurb: "Media, messaging, and storytelling.", careers: ["PR Lead", "Producer"] },
  { name: "Fine Arts & Design", interests: ["Arts", "Communications", "Humanities"], blurb: "Visual art, design, and craft.", careers: ["Designer", "Art Director"] },
];

export function rankMajors(interests: string[]): { major: Major; fit: number }[] {
  return MAJORS.map((major) => {
    const overlap = major.interests.filter((i) => interests.includes(i)).length;
    const fit = Math.min(98, 52 + overlap * 15 + (major.interests[0] && interests[0] === major.interests[0] ? 6 : 0));
    return { major, fit };
  }).sort((a, b) => b.fit - a.fit);
}

export interface College { name: string; loc: string; selectivity: number; avgSat: number; setting: string; strongIn: string[]; url: string }
export const COLLEGES: College[] = [
  { name: "Stanford University", loc: "California", selectivity: 99, avgSat: 1540, setting: "Suburban", strongIn: ["Computer Technologies", "Engineering", "Business"], url: "https://www.stanford.edu" },
  { name: "MIT", loc: "Massachusetts", selectivity: 99, avgSat: 1555, setting: "Urban", strongIn: ["Engineering", "Math and Statistics", "Computer Technologies"], url: "https://www.mit.edu" },
  { name: "Harvard University", loc: "Massachusetts", selectivity: 99, avgSat: 1540, setting: "Urban", strongIn: ["Political Science", "Economics", "Health and Medicine"], url: "https://www.harvard.edu" },
  { name: "UC Berkeley", loc: "California", selectivity: 92, avgSat: 1430, setting: "Urban", strongIn: ["Engineering", "Computer Technologies", "Environmental Science"], url: "https://www.berkeley.edu" },
  { name: "University of Michigan", loc: "Michigan", selectivity: 84, avgSat: 1420, setting: "College Town", strongIn: ["Business", "Engineering", "Psychology"], url: "https://umich.edu" },
  { name: "Georgia Tech", loc: "Georgia", selectivity: 82, avgSat: 1430, setting: "Urban", strongIn: ["Engineering", "Computer Technologies", "Science"], url: "https://www.gatech.edu" },
  { name: "UT Austin", loc: "Texas", selectivity: 78, avgSat: 1370, setting: "Urban", strongIn: ["Business", "Engineering", "Communications"], url: "https://www.utexas.edu" },
  { name: "Boston University", loc: "Massachusetts", selectivity: 70, avgSat: 1380, setting: "Urban", strongIn: ["Communications", "Health and Medicine", "Business"], url: "https://www.bu.edu" },
  { name: "Penn State", loc: "Pennsylvania", selectivity: 60, avgSat: 1280, setting: "College Town", strongIn: ["Engineering", "Business", "Science"], url: "https://www.psu.edu" },
  { name: "Arizona State University", loc: "Arizona", selectivity: 45, avgSat: 1230, setting: "Urban", strongIn: ["Business", "Communications", "Engineering"], url: "https://www.asu.edu" },
  { name: "University of Iowa", loc: "Iowa", selectivity: 40, avgSat: 1230, setting: "College Town", strongIn: ["English", "Health and Medicine", "Education"], url: "https://uiowa.edu" },
  { name: "San Diego State", loc: "California", selectivity: 38, avgSat: 1200, setting: "Urban", strongIn: ["Communications", "Psychology", "Business"], url: "https://www.sdsu.edu" },
];

export type Band = "Reach" | "Target" | "Likely";
export function calibrateColleges(studentSat: number, interests: string[]): { college: College; band: Band; fit: number }[] {
  const sat = studentSat || 1200;
  return COLLEGES.map((college) => {
    const gap = college.avgSat - sat;
    const band: Band = gap > 90 ? "Reach" : gap > -60 ? "Target" : "Likely";
    const interestFit = college.strongIn.filter((i) => interests.includes(i)).length;
    const fit = Math.min(98, 55 + interestFit * 12 - Math.max(0, gap) / 12);
    return { college, band, fit: Math.max(30, Math.round(fit)) };
  }).sort((a, b) => b.fit - a.fit);
}

export interface Scholarship { name: string; amount: string; deadline: string; basis: string; effort: "Low" | "Medium" | "High"; tags: string[]; url: string }
export const SCHOLARSHIPS: Scholarship[] = [
  { name: "National Merit Scholarship", amount: "$2,500+", deadline: "Fall (PSAT-based)", basis: "Merit", effort: "Low", tags: ["academic"], url: "https://www.nationalmerit.org" },
  { name: "Coca-Cola Scholars Program", amount: "$20,000", deadline: "Oct 31", basis: "Leadership & service", effort: "High", tags: ["leadership", "service"], url: "https://www.coca-colascholarsfoundation.org" },
  { name: "Gates Scholarship", amount: "Full ride", deadline: "Sep 15", basis: "Need + merit (minority students)", effort: "High", tags: ["need", "first-gen"], url: "https://www.thegatesscholarship.org" },
  { name: "QuestBridge National College Match", amount: "Full ride", deadline: "Sep 26", basis: "High-achieving, low-income", effort: "High", tags: ["need", "first-gen"], url: "https://www.questbridge.org" },
  { name: "Ron Brown Scholar Program", amount: "$40,000", deadline: "Jan 9", basis: "Academic excellence + community service", effort: "Medium", tags: ["need", "service", "leadership"], url: "https://www.ronbrown.org/section/apply/program-description" },
  { name: "Elks Most Valuable Student", amount: "$1,000–$50,000", deadline: "Nov 15", basis: "Need, leadership, scholarship", effort: "Medium", tags: ["need", "leadership"], url: "https://www.elks.org/scholars/scholarships/mvs.cfm" },
  { name: "Society of Women Engineers", amount: "$1,000–$15,000", deadline: "Feb / May", basis: "Women in engineering/CS", effort: "Medium", tags: ["engineering", "stem"], url: "https://swe.org/scholarships/" },
  { name: "Horatio Alger Scholarship", amount: "$6,000–$25,000", deadline: "Oct 25", basis: "Adversity + need", effort: "Medium", tags: ["need"], url: "https://www.horatioalger.org/scholarships/" },
  { name: "Dell Scholars Program", amount: "$20,000+", deadline: "Dec 1", basis: "Need + determination", effort: "Medium", tags: ["need", "first-gen"], url: "https://www.dellscholars.org" },
  { name: "Jack Kent Cooke Foundation", amount: "Up to $55,000/yr", deadline: "Nov 20", basis: "High achievement + financial need", effort: "High", tags: ["need", "academic"], url: "https://www.jkcf.org/our-scholarships" },
  { name: "Davidson Fellows Scholarship", amount: "$10,000–$50,000", deadline: "Feb 13", basis: "Significant project (STEM, arts, lit)", effort: "High", tags: ["academic", "stem"], url: "https://www.davidsongifted.org/fellows-scholarship" },
  { name: "UNCF Scholarships", amount: "Varies", deadline: "Rolling", basis: "African American students, merit + need", effort: "Medium", tags: ["need", "first-gen"], url: "https://www.uncf.org/scholarships" },
  { name: "Regeneron Science Talent Search", amount: "Up to $250,000", deadline: "Nov", basis: "Original STEM research", effort: "High", tags: ["stem", "academic"], url: "https://www.societyforscience.org/regeneron-sts" },
  { name: "Thurgood Marshall College Fund", amount: "Varies", deadline: "Mar 31", basis: "HBCU students, merit + need", effort: "Medium", tags: ["need", "first-gen"], url: "https://tmcf.org/scholarships" },
  { name: "Hispanic Scholarship Fund", amount: "$500–$5,000", deadline: "Feb 15", basis: "Hispanic heritage + merit", effort: "Low", tags: ["need", "first-gen"], url: "https://www.hsf.net/scholarship" },
  { name: "Prudential Spirit of Community Award", amount: "$1,000–$5,000", deadline: "Nov 5", basis: "Volunteer service", effort: "Low", tags: ["service"], url: "https://www.prudential.com/links/about/spirit-of-community" },
  { name: "Google Generation Scholarship", amount: "$10,000", deadline: "Dec", basis: "CS students from underrepresented groups", effort: "Medium", tags: ["stem", "engineering"], url: "https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship" },
  { name: "Microsoft Scholarship Program", amount: "Varies", deadline: "Feb", basis: "CS/engineering + community involvement", effort: "Medium", tags: ["stem", "engineering"], url: "https://careers.microsoft.com/v2/global/en/usscholarship.html" },
  { name: "Foot Locker Scholar Athletes", amount: "$20,000", deadline: "Dec 15", basis: "Athletics + academics + community", effort: "Medium", tags: ["service", "leadership"], url: "https://www.footlocker.com/scholarship" },
  { name: "American Indian College Fund", amount: "Varies", deadline: "May 31", basis: "Native American heritage + need", effort: "Low", tags: ["need", "first-gen"], url: "https://collegefund.org/students/scholarships/" },
  { name: "Scholastic Art & Writing Awards", amount: "Varies", deadline: "Dec–Jan", basis: "Creative writing or visual art", effort: "Medium", tags: ["academic"], url: "https://www.artandwriting.org/awards/" },
  { name: "Jackie Robinson Foundation", amount: "Up to $30,000", deadline: "Feb 1", basis: "Minority students, leadership + need", effort: "High", tags: ["need", "leadership", "first-gen"], url: "https://www.jackierobinson.org/apply/" },
  { name: "Sallie Mae Scholarship Search", amount: "Varies", deadline: "Rolling", basis: "Open to all students", effort: "Low", tags: ["academic"], url: "https://www.salliemae.com/college-planning/scholarships/" },
  { name: "AFSA Essay Contest", amount: "$1,000–$2,500", deadline: "Feb", basis: "Essay on foreign service topics", effort: "Low", tags: ["academic", "service"], url: "https://afsa.org/essay-contest" },
  { name: "Peterson's Scholarship Search", amount: "Varies", deadline: "Rolling", basis: "Open database for all students", effort: "Low", tags: ["academic"], url: "https://www.petersons.com/scholarship-search" },
];

export interface PlanItem { label: string; type: "course" | "activity" | "test" | "summer" | "milestone" }
export const PLAN_BY_GRADE: Record<number, PlanItem[]> = {
  9: [
    { label: "Build a strong GPA foundation", type: "milestone" },
    { label: "Try 2–3 clubs to find your interests", type: "activity" },
    { label: "Honors core courses", type: "course" },
    { label: "Explore a summer enrichment program", type: "summer" },
  ],
  10: [
    { label: "Take the PSAT (practice)", type: "test" },
    { label: "Commit to 1–2 activities with depth", type: "activity" },
    { label: "First AP course", type: "course" },
    { label: "Summer: skill-building or volunteering", type: "summer" },
  ],
  11: [
    { label: "Take SAT/ACT (and retake if needed)", type: "test" },
    { label: "Step into a leadership role", type: "milestone" },
    { label: "2–3 AP courses aligned to your interests", type: "course" },
    { label: "Summer: selective program, research, or internship", type: "summer" },
    { label: "Build your college list (Likely/Target/Reach)", type: "milestone" },
  ],
  12: [
    { label: "Finalize college list & application strategy", type: "milestone" },
    { label: "Submit early applications (EA/ED)", type: "milestone" },
    { label: "Most rigorous courses your schedule allows", type: "course" },
    { label: "Pursue national-level recognition in your spike", type: "activity" },
  ],
};
