import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NAVY, AMBER, AMBER_L, SLATE, OFFWHT, WHITE, GREEN, INDIGO, PURPLE } from "../brand.js";
import { CompassWordmark, CompassIcon } from "../components/CompassLogo.jsx";
import { Analytics } from "../brand.js";

// ─── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "activities",
    question: "What do you naturally gravitate toward in free time?",
    subtitle: "Pick everything that resonates.",
    type: "multi",
    options: [
      { label: "Building or fixing things", icon: "🔧" },
      { label: "Reading or writing", icon: "📚" },
      { label: "Making art, music, or content", icon: "🎨" },
      { label: "Solving puzzles or math", icon: "🧩" },
      { label: "Talking with and helping people", icon: "🤝" },
      { label: "Exploring nature or the outdoors", icon: "🌿" },
      { label: "Researching and learning new topics", icon: "🔍" },
      { label: "Organizing plans and leading groups", icon: "📋" },
    ],
  },
  {
    id: "school",
    question: "Which subjects have you actually enjoyed?",
    subtitle: "Not just what you were good at — what interested you.",
    type: "multi",
    options: [
      { label: "Math", icon: "➗" },
      { label: "Science (bio, chem, physics)", icon: "🔬" },
      { label: "English / Literature", icon: "✍️" },
      { label: "History / Social Studies", icon: "🌍" },
      { label: "Computer Science / Tech", icon: "💻" },
      { label: "Art / Music / Theater", icon: "🎭" },
      { label: "Economics / Business", icon: "📈" },
      { label: "Psychology / Sociology", icon: "🧠" },
    ],
  },
  {
    id: "work_style",
    question: "How do you prefer to work?",
    subtitle: "Think about when you feel most in your element.",
    type: "single",
    options: [
      { label: "Hands-on — making, building, doing", icon: "🛠️" },
      { label: "Analytical — researching and solving", icon: "📊" },
      { label: "Creative — imagining and expressing", icon: "💡" },
      { label: "Social — collaborating and teaching", icon: "👥" },
      { label: "Strategic — planning and leading", icon: "🎯" },
    ],
  },
  {
    id: "values",
    question: "What matters most in a future career?",
    subtitle: "Pick your top priorities.",
    type: "multi",
    options: [
      { label: "High earning potential", icon: "💰" },
      { label: "Making a difference", icon: "🌱" },
      { label: "Creative freedom", icon: "🎨" },
      { label: "Job stability and security", icon: "🛡️" },
      { label: "Continuous learning", icon: "📈" },
      { label: "Work-life balance", icon: "⚖️" },
      { label: "Entrepreneurship", icon: "🚀" },
      { label: "Prestige and recognition", icon: "🏆" },
    ],
  },
  {
    id: "problem",
    question: "Which world problem would you most want to help solve?",
    subtitle: "Go with your gut.",
    type: "single",
    options: [
      { label: "Healthcare and disease", icon: "🏥" },
      { label: "Climate and the environment", icon: "🌍" },
      { label: "Poverty and inequality", icon: "🤲" },
      { label: "Technology and society", icon: "🤖" },
      { label: "Education and opportunity", icon: "🎓" },
      { label: "Justice and governance", icon: "⚖️" },
      { label: "Human creativity and culture", icon: "🎭" },
      { label: "Mental health and well-being", icon: "💙" },
    ],
  },
  {
    id: "strengths",
    question: "What do people come to you for?",
    subtitle: "What do friends or classmates say you're good at?",
    type: "multi",
    options: [
      { label: "Explaining things clearly", icon: "💬" },
      { label: "Coming up with creative ideas", icon: "✨" },
      { label: "Staying calm and problem-solving", icon: "🧘" },
      { label: "Getting things organized and done", icon: "✅" },
      { label: "Making people feel heard", icon: "❤️" },
      { label: "Technical know-how", icon: "⚙️" },
      { label: "Noticing details others miss", icon: "🔎" },
      { label: "Motivating and inspiring others", icon: "🔥" },
    ],
  },
  {
    id: "dealbreakers",
    question: "What would make a career feel completely wrong for you?",
    subtitle: "Be honest — ruling things out is just as valuable as ruling them in.",
    type: "multi",
    negative: true,
    options: [
      { label: "Sitting at a desk all day", icon: "🪑" },
      { label: "Working alone with little human contact", icon: "🔇" },
      { label: "High-pressure deadlines and stress", icon: "⏱️" },
      { label: "Physical or manual labor", icon: "🏋️" },
      { label: "Managing or supervising people", icon: "👔" },
      { label: "Repetitive, routine tasks", icon: "🔁" },
      { label: "Heavy math or numbers every day", icon: "🔢" },
      { label: "Lots of public speaking or performance", icon: "🎤" },
    ],
  },
  {
    id: "bad_environment",
    question: "Which work environment sounds like your personal nightmare?",
    subtitle: "Pick anything that genuinely puts you off.",
    type: "multi",
    negative: true,
    options: [
      { label: "Hospital or clinical setting", icon: "🏥" },
      { label: "Corporate office and cubicles", icon: "🏢" },
      { label: "Classroom or school all day", icon: "🏫" },
      { label: "Outdoors in all weather", icon: "🌧️" },
      { label: "Lab or research facility", icon: "🧪" },
      { label: "Loud creative studio or stage", icon: "🎭" },
      { label: "Construction site or warehouse", icon: "🏗️" },
      { label: "Remote work with no set schedule", icon: "🏠" },
    ],
  },
  {
    id: "state",
    question: "What state do you live in?",
    subtitle: "This helps us recommend the best in-state schools for you — which are often significantly more affordable than out-of-state options.",
    type: "state",
  },
];

// ─── Affiliate / partner config ───────────────────────────────────────────────
// Replace each `url` with your real affiliate tracking link once your program
// is approved. To remove a card, delete its object. To add one, copy the shape.
// `tag` shows a small label; set to "" to hide it.
//
// AFFILIATE PROGRAMS TO APPLY FOR:
//   Scholarships.com  — apply at scholarships.com/affiliate
//   Bold.org          — apply at bold.org/scholarships/affiliates
//   Fastweb           — apply at fastweb.com/affiliates
//   Chegg             — apply via CJ Affiliate (cj.com)
//   Coursera          — apply at coursera.org/affiliates
//   Wyzant            — apply at wyzant.com/become-an-affiliate
//   Amazon Associates — apply at affiliate-program.amazon.com

const PARTNERS = [
  {
    id: "scholarships",
    emoji: "🎓",
    title: "Find scholarships for your major",
    blurb: "Search thousands of scholarships matched to your field of study. Students pursuing specialized majors often find funding others miss.",
    cta: "Search scholarships",
    tag: "Free",
    url: "https://www.scholarships.com", // TODO: replace with your affiliate tracking link
  },
  {
    id: "bold",
    emoji: "💰",
    title: "Apply for major-specific grants",
    blurb: "Bold.org connects students with donors funding specific fields — from computer science to nursing to education. Many awards have under 50 applicants.",
    cta: "Browse awards",
    tag: "Free to apply",
    url: "https://bold.org", // TODO: replace with your affiliate tracking link
  },
  {
    id: "courses",
    emoji: "📚",
    title: "Try a course in your top major",
    blurb: "Test-drive your #1 match before you commit — Coursera offers free intro courses in most majors, taught by professors from top universities.",
    cta: "Browse free courses",
    tag: "Many free",
    url: "https://www.coursera.org", // TODO: replace with your affiliate tracking link
  },
  {
    id: "tutoring",
    emoji: "🧑‍🏫",
    title: "Get a head start with a tutor",
    blurb: "Work with a tutor in your intended major's core subject — math, science, writing — before freshman year. Students who start strong tend to stay on track.",
    cta: "Find a tutor",
    tag: "",
    url: "https://www.wyzant.com", // TODO: replace with your affiliate tracking link
  },
];

// ─── Responsive hook ──────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ─── Local scoring engine (no network needed) ─────────────────────────────────

// Each major lists the answer-option labels it associates with, plus metadata.
// `wild: true` marks specialized / less-obvious majors used as wildcard picks.
const MAJORS = [
  // ── STEM ──
  { name: "Computer Science", salaryRange: "$75k–$160k", jobOutlook: "Excellent",
    careers: ["Software Engineer","Data Scientist","ML Engineer","Product Manager"],
    tags: ["Building or fixing things","Solving puzzles or math","Researching and learning new topics","Computer Science / Tech","Math","Analytical — researching and solving","High earning potential","Continuous learning","Technology and society","Technical know-how","Noticing details others miss"] },
  { name: "Mechanical Engineering", salaryRange: "$70k–$130k", jobOutlook: "Strong",
    careers: ["Mechanical Engineer","Product Designer","Robotics Engineer","Manufacturing Lead"],
    tags: ["Building or fixing things","Solving puzzles or math","Math","Science (bio, chem, physics)","Hands-on — making, building, doing","Job stability and security","Technical know-how","Noticing details others miss","Climate and the environment"] },
  { name: "Electrical Engineering", salaryRange: "$75k–$140k", jobOutlook: "Strong",
    careers: ["Electrical Engineer","Hardware Designer","Power Systems Engineer","Embedded Developer"],
    tags: ["Building or fixing things","Solving puzzles or math","Math","Science (bio, chem, physics)","Computer Science / Tech","Hands-on — making, building, doing","Technical know-how","Noticing details others miss"] },
  { name: "Data Science", salaryRange: "$80k–$165k", jobOutlook: "Excellent",
    careers: ["Data Scientist","Analytics Engineer","Quant Analyst","BI Developer"],
    tags: ["Solving puzzles or math","Math","Computer Science / Tech","Researching and learning new topics","Analytical — researching and solving","High earning potential","Continuous learning","Noticing details others miss"] },
  { name: "Mathematics / Statistics", salaryRange: "$65k–$140k", jobOutlook: "Strong", wild: true,
    careers: ["Actuary","Statistician","Cryptographer","Quantitative Analyst"],
    tags: ["Solving puzzles or math","Math","Analytical — researching and solving","Researching and learning new topics","Continuous learning","Noticing details others miss"] },
  { name: "Physics", salaryRange: "$60k–$130k", jobOutlook: "Stable", wild: true,
    careers: ["Research Physicist","Data Scientist","Optical Engineer","Science Communicator"],
    tags: ["Solving puzzles or math","Math","Science (bio, chem, physics)","Researching and learning new topics","Analytical — researching and solving","Continuous learning"] },
  { name: "Materials Science", salaryRange: "$70k–$120k", jobOutlook: "Growing", wild: true,
    careers: ["Materials Engineer","R&D Scientist","Semiconductor Engineer","Quality Engineer"],
    tags: ["Building or fixing things","Science (bio, chem, physics)","Math","Researching and learning new topics","Hands-on — making, building, doing","Technical know-how","Climate and the environment"] },
  { name: "Civil Engineering", salaryRange: "$65k–$120k", jobOutlook: "Strong",
    careers: ["Civil Engineer","Structural Engineer","Urban Infrastructure Lead","Construction Manager"],
    tags: ["Building or fixing things","Math","Science (bio, chem, physics)","Hands-on — making, building, doing","Organizing plans and leading groups","Job stability and security","Climate and the environment"] },
  { name: "Aerospace Engineering", salaryRange: "$75k–$135k", jobOutlook: "Strong", wild: true,
    careers: ["Aerospace Engineer","Propulsion Engineer","Systems Engineer","Flight Test Engineer"],
    tags: ["Building or fixing things","Solving puzzles or math","Math","Science (bio, chem, physics)","Hands-on — making, building, doing","Technical know-how"] },
  { name: "Cybersecurity", salaryRange: "$75k–$155k", jobOutlook: "Excellent", wild: true,
    careers: ["Security Analyst","Penetration Tester","Security Engineer","Incident Responder"],
    tags: ["Solving puzzles or math","Computer Science / Tech","Technology and society","Analytical — researching and solving","Technical know-how","Noticing details others miss","Job stability and security","High earning potential"] },

  // ── HEALTH & LIFE SCIENCES ──
  { name: "Nursing", salaryRange: "$65k–$120k", jobOutlook: "Excellent",
    careers: ["Registered Nurse","Nurse Practitioner","Clinical Specialist","Healthcare Manager"],
    tags: ["Talking with and helping people","Science (bio, chem, physics)","Social — collaborating and teaching","Making a difference","Job stability and security","Healthcare and disease","Making people feel heard","Staying calm and problem-solving","Mental health and well-being"] },
  { name: "Biology / Pre-Med", salaryRange: "$60k–$200k+", jobOutlook: "Strong",
    careers: ["Physician","Research Scientist","Biotech Specialist","Public Health Official"],
    tags: ["Researching and learning new topics","Exploring nature or the outdoors","Science (bio, chem, physics)","Analytical — researching and solving","Making a difference","Continuous learning","Healthcare and disease","Mental health and well-being","Noticing details others miss"] },
  { name: "Public Health", salaryRange: "$55k–$110k", jobOutlook: "Growing", wild: true,
    careers: ["Epidemiologist","Health Policy Analyst","Program Director","Community Health Lead"],
    tags: ["Talking with and helping people","Researching and learning new topics","Science (bio, chem, physics)","Organizing plans and leading groups","Making a difference","Healthcare and disease","Poverty and inequality","Education and opportunity","Mental health and well-being"] },
  { name: "Kinesiology / Exercise Science", salaryRange: "$45k–$95k", jobOutlook: "Growing", wild: true,
    careers: ["Physical Therapist","Athletic Trainer","Sports Scientist","Rehabilitation Specialist"],
    tags: ["Talking with and helping people","Science (bio, chem, physics)","Hands-on — making, building, doing","Making a difference","Healthcare and disease","Mental health and well-being","Staying calm and problem-solving"] },
  { name: "Nutrition / Dietetics", salaryRange: "$50k–$90k", jobOutlook: "Growing", wild: true,
    careers: ["Dietitian","Nutrition Consultant","Public Health Nutritionist","Wellness Coach"],
    tags: ["Talking with and helping people","Science (bio, chem, physics)","Making a difference","Healthcare and disease","Mental health and well-being","Making people feel heard"] },
  { name: "Neuroscience", salaryRange: "$60k–$130k", jobOutlook: "Growing", wild: true,
    careers: ["Research Scientist","Neuropsychologist","Biotech R&D","Science Writer"],
    tags: ["Researching and learning new topics","Science (bio, chem, physics)","Psychology / Sociology","Analytical — researching and solving","Continuous learning","Healthcare and disease","Mental health and well-being","Noticing details others miss"] },

  // ── SOCIAL SCIENCES & HUMANITIES ──
  { name: "Psychology", salaryRange: "$50k–$110k", jobOutlook: "Strong",
    careers: ["Therapist / Counselor","HR Specialist","UX Researcher","Social Worker"],
    tags: ["Talking with and helping people","Reading or writing","Psychology / Sociology","Social — collaborating and teaching","Making a difference","Mental health and well-being","Making people feel heard","Staying calm and problem-solving"] },
  { name: "Sociology", salaryRange: "$45k–$90k", jobOutlook: "Stable", wild: true,
    careers: ["Social Researcher","Policy Analyst","Community Organizer","UX Researcher"],
    tags: ["Talking with and helping people","Reading or writing","Psychology / Sociology","History / Social Studies","Making a difference","Poverty and inequality","Justice and governance","Making people feel heard"] },
  { name: "Anthropology", salaryRange: "$45k–$90k", jobOutlook: "Stable", wild: true,
    careers: ["Cultural Researcher","UX Researcher","Museum Curator","International Development"],
    tags: ["Reading or writing","Exploring nature or the outdoors","History / Social Studies","Psychology / Sociology","Researching and learning new topics","Human creativity and culture","Making a difference"] },
  { name: "Linguistics", salaryRange: "$50k–$110k", jobOutlook: "Growing", wild: true,
    careers: ["Computational Linguist","Speech Tech Specialist","Translator","UX Writer"],
    tags: ["Reading or writing","Solving puzzles or math","English / Literature","Researching and learning new topics","Analytical — researching and solving","Human creativity and culture","Technology and society","Noticing details others miss"] },
  { name: "History", salaryRange: "$45k–$85k", jobOutlook: "Stable",
    careers: ["Historian","Archivist","Educator","Policy Researcher"],
    tags: ["Reading or writing","History / Social Studies","Researching and learning new topics","Human creativity and culture","Explaining things clearly","Education and opportunity"] },
  { name: "Philosophy", salaryRange: "$45k–$95k", jobOutlook: "Stable", wild: true,
    careers: ["Analyst","Ethicist","Lawyer","Writer"],
    tags: ["Reading or writing","Solving puzzles or math","Researching and learning new topics","Analytical — researching and solving","Justice and governance","Human creativity and culture","Explaining things clearly"] },
  { name: "English / Communications", salaryRange: "$45k–$95k", jobOutlook: "Stable",
    careers: ["Writer / Editor","Marketing Specialist","PR Manager","Journalist"],
    tags: ["Reading or writing","English / Literature","Creative — imagining and expressing","Creative freedom","Human creativity and culture","Explaining things clearly","Coming up with creative ideas","Education and opportunity"] },
  { name: "Political Science / Pre-Law", salaryRange: "$55k–$160k", jobOutlook: "Stable",
    careers: ["Lawyer","Policy Analyst","Government Affairs","Nonprofit Leader"],
    tags: ["Reading or writing","Organizing plans and leading groups","History / Social Studies","Strategic — planning and leading","Making a difference","Justice and governance","Poverty and inequality","Explaining things clearly","Prestige and recognition"] },
  { name: "International Relations", salaryRange: "$50k–$120k", jobOutlook: "Stable", wild: true,
    careers: ["Diplomat","Global Analyst","NGO Program Lead","Foreign Service Officer"],
    tags: ["Reading or writing","Organizing plans and leading groups","History / Social Studies","Strategic — planning and leading","Making a difference","Justice and governance","Poverty and inequality","Explaining things clearly"] },

  // ── BUSINESS ──
  { name: "Business Administration", salaryRange: "$55k–$140k", jobOutlook: "Strong",
    careers: ["Operations Manager","Consultant","Financial Analyst","Entrepreneur"],
    tags: ["Organizing plans and leading groups","Economics / Business","Strategic — planning and leading","High earning potential","Entrepreneurship","Prestige and recognition","Getting things organized and done","Motivating and inspiring others"] },
  { name: "Finance / Economics", salaryRange: "$70k–$180k", jobOutlook: "Strong",
    careers: ["Financial Analyst","Investment Banker","Economist","Portfolio Manager"],
    tags: ["Solving puzzles or math","Math","Economics / Business","Analytical — researching and solving","High earning potential","Prestige and recognition","Continuous learning","Noticing details others miss"] },
  { name: "Marketing", salaryRange: "$50k–$120k", jobOutlook: "Strong",
    careers: ["Brand Manager","Growth Marketer","Market Researcher","Social Media Lead"],
    tags: ["Making art, music, or content","Talking with and helping people","Economics / Business","Creative — imagining and expressing","Coming up with creative ideas","Entrepreneurship","Motivating and inspiring others","Human creativity and culture"] },
  { name: "Supply Chain Management", salaryRange: "$60k–$120k", jobOutlook: "Growing", wild: true,
    careers: ["Supply Chain Analyst","Logistics Manager","Operations Planner","Procurement Lead"],
    tags: ["Organizing plans and leading groups","Solving puzzles or math","Economics / Business","Strategic — planning and leading","Job stability and security","Getting things organized and done","Noticing details others miss"] },
  { name: "Accounting", salaryRange: "$55k–$115k", jobOutlook: "Strong",
    careers: ["CPA","Auditor","Tax Advisor","Financial Controller"],
    tags: ["Solving puzzles or math","Math","Economics / Business","Job stability and security","Getting things organized and done","Noticing details others miss","Analytical — researching and solving"] },

  // ── ARTS & DESIGN ──
  { name: "Graphic Design / Digital Media", salaryRange: "$45k–$100k", jobOutlook: "Stable",
    careers: ["UX/UI Designer","Brand Designer","Art Director","Content Creator"],
    tags: ["Making art, music, or content","Art / Music / Theater","Creative — imagining and expressing","Creative freedom","Human creativity and culture","Coming up with creative ideas","Technology and society"] },
  { name: "Game Design", salaryRange: "$55k–$120k", jobOutlook: "Growing", wild: true,
    careers: ["Game Designer","Level Designer","Narrative Designer","Technical Artist"],
    tags: ["Making art, music, or content","Solving puzzles or math","Computer Science / Tech","Art / Music / Theater","Creative — imagining and expressing","Creative freedom","Coming up with creative ideas","Technology and society","Human creativity and culture"] },
  { name: "Architecture", salaryRange: "$55k–$110k", jobOutlook: "Stable", wild: true,
    careers: ["Architect","Urban Designer","Interior Architect","Sustainability Designer"],
    tags: ["Building or fixing things","Making art, music, or content","Math","Hands-on — making, building, doing","Creative — imagining and expressing","Creative freedom","Coming up with creative ideas","Climate and the environment","Noticing details others miss"] },
  { name: "Film / Media Production", salaryRange: "$40k–$100k", jobOutlook: "Stable", wild: true,
    careers: ["Director","Video Editor","Producer","Cinematographer"],
    tags: ["Making art, music, or content","Reading or writing","Art / Music / Theater","Creative — imagining and expressing","Creative freedom","Human creativity and culture","Coming up with creative ideas","Motivating and inspiring others"] },
  { name: "Music", salaryRange: "$35k–$90k", jobOutlook: "Stable", wild: true,
    careers: ["Performer","Music Producer","Composer","Music Educator"],
    tags: ["Making art, music, or content","Art / Music / Theater","Creative — imagining and expressing","Creative freedom","Human creativity and culture","Coming up with creative ideas"] },

  // ── EDUCATION & SERVICE ──
  { name: "Education / Teaching", salaryRange: "$45k–$85k", jobOutlook: "Strong",
    careers: ["Teacher","Curriculum Designer","School Counselor","Education Policy"],
    tags: ["Talking with and helping people","Organizing plans and leading groups","English / Literature","History / Social Studies","Social — collaborating and teaching","Making a difference","Education and opportunity","Explaining things clearly","Motivating and inspiring others","Making people feel heard"] },
  { name: "Social Work", salaryRange: "$45k–$80k", jobOutlook: "Strong", wild: true,
    careers: ["Social Worker","Case Manager","Community Advocate","Family Counselor"],
    tags: ["Talking with and helping people","Psychology / Sociology","Social — collaborating and teaching","Making a difference","Poverty and inequality","Mental health and well-being","Making people feel heard","Staying calm and problem-solving"] },

  // ── ENVIRONMENT & APPLIED ──
  { name: "Environmental Science", salaryRange: "$50k–$100k", jobOutlook: "Growing",
    careers: ["Environmental Scientist","Sustainability Analyst","Conservation Specialist","Policy Advisor"],
    tags: ["Exploring nature or the outdoors","Researching and learning new topics","Science (bio, chem, physics)","Analytical — researching and solving","Making a difference","Climate and the environment","Continuous learning"] },
  { name: "Urban Planning", salaryRange: "$55k–$100k", jobOutlook: "Growing", wild: true,
    careers: ["Urban Planner","Transportation Planner","Community Developer","GIS Analyst"],
    tags: ["Organizing plans and leading groups","Exploring nature or the outdoors","History / Social Studies","Strategic — planning and leading","Making a difference","Climate and the environment","Poverty and inequality","Justice and governance"] },
  { name: "Agriculture / Food Science", salaryRange: "$45k–$95k", jobOutlook: "Stable", wild: true,
    careers: ["Food Scientist","Agronomist","Sustainability Specialist","Quality Manager"],
    tags: ["Exploring nature or the outdoors","Building or fixing things","Science (bio, chem, physics)","Hands-on — making, building, doing","Making a difference","Climate and the environment","Job stability and security"] },
];

// Dealbreaker → which major tags it penalizes
// Each entry maps an answer from the negative questions to the tags it conflicts with.
const DEALBREAKER_MAP = {
  // work dealbreakers
  "Sitting at a desk all day":           ["Analytical — researching and solving","Computer Science / Tech","Math","Economics / Business","Noticing details others miss"],
  "Working alone with little human contact": ["Talking with and helping people","Social — collaborating and teaching","Making people feel heard","Motivating and inspiring others"],
  "High-pressure deadlines and stress":  ["High earning potential","Prestige and recognition","Entrepreneurship"],
  "Physical or manual labor":            ["Hands-on — making, building, doing","Exploring nature or the outdoors"],
  "Managing or supervising people":      ["Organizing plans and leading groups","Strategic — planning and leading","Motivating and inspiring others"],
  "Repetitive, routine tasks":           ["Getting things organized and done","Job stability and security"],
  "Heavy math or numbers every day":     ["Math","Solving puzzles or math","Analytical — researching and solving"],
  "Lots of public speaking or performance": ["Explaining things clearly","Motivating and inspiring others","Making art, music, or content"],
  // environment dealbreakers
  "Hospital or clinical setting":        ["Healthcare and disease","Science (bio, chem, physics)","Mental health and well-being"],
  "Corporate office and cubicles":       ["Economics / Business","High earning potential","Prestige and recognition","Strategic — planning and leading"],
  "Classroom or school all day":         ["Education and opportunity","Explaining things clearly","Social — collaborating and teaching"],
  "Outdoors in all weather":             ["Exploring nature or the outdoors","Climate and the environment","Hands-on — making, building, doing"],
  "Lab or research facility":            ["Science (bio, chem, physics)","Researching and learning new topics","Analytical — researching and solving"],
  "Loud creative studio or stage":       ["Making art, music, or content","Art / Music / Theater","Creative — imagining and expressing","Creative freedom"],
  "Construction site or warehouse":      ["Building or fixing things","Hands-on — making, building, doing"],
  "Remote work with no set schedule":    ["Entrepreneurship","Creative freedom","Work-life balance"],
};

function scoreMajors(answers) {
  // Separate positive answers from dealbreaker answers
  const negativeIds = new Set(["dealbreakers", "bad_environment"]);
  const positiveAnswers = {};
  const dealbreakers = [];

  for (const [id, vals] of Object.entries(answers)) {
    if (negativeIds.has(id)) {
      dealbreakers.push(...(vals || []));
    } else {
      positiveAnswers[id] = vals;
    }
  }

  const picked = new Set(Object.values(positiveAnswers).flat());
  if (picked.size === 0) return [];

  // Build a set of penalized tags from dealbreakers
  const penalizedTags = new Set();
  for (const d of dealbreakers) {
    for (const tag of (DEALBREAKER_MAP[d] || [])) {
      penalizedTags.add(tag);
    }
  }

  const scored = MAJORS.map(m => {
    const hits     = m.tags.filter(t => picked.has(t)).length;
    // Each penalized tag that this major relies on costs half a point
    const penalty  = m.tags.filter(t => penalizedTags.has(t)).length * 0.5;
    const netScore = Math.max(0, hits - penalty);
    return { major: m, hits, netScore };
  }).sort((a, b) => b.netScore - a.netScore);

  const maxScore = Math.max(...scored.map(s => s.netScore), 1);

  // Take top 4 by net score (dealbreaker-adjusted)
  let chosen = scored.filter(s => s.netScore > 0).slice(0, 4);

  // Wildcard: best-matching specialized major not yet chosen
  const alreadyNames = new Set(chosen.map(s => s.major.name));
  const wildcard = scored.find(s => s.major.wild && s.netScore > 0 && !alreadyNames.has(s.major.name))
    || scored.find(s => s.major.wild && !alreadyNames.has(s.major.name));
  if (wildcard) chosen.push(wildcard);

  // Backfill to 5 if needed
  if (chosen.length < 5) {
    for (const s of scored) {
      if (chosen.length >= 5) break;
      if (!chosen.some(c => c.major.name === s.major.name)) chosen.push(s);
    }
  }

  chosen = chosen.slice(0, 5).sort((a, b) => b.netScore - a.netScore);

  return chosen.map((s, i) => {
    const m = s.major;
    const base = 70 + Math.round((s.netScore / maxScore) * 27);
    const fitScore = Math.max(62, Math.min(97, base - i * 2));
    return {
      rank: i + 1,
      name: m.name,
      fitScore,
      isWildcard: !!m.wild,
      why: buildWhy(m, picked, penalizedTags),
      salaryRange: m.salaryRange,
      jobOutlook: m.jobOutlook,
      careers: m.careers,
      videoQueries: [
        `${m.name} college major overview`,
        `what do ${m.name} majors actually do`,
        `${m.name} degree careers and salary`,
      ],
    };
  });
}

function buildWhy(m, picked, penalizedTags = new Set()) {
  const matched = m.tags.filter(t => picked.has(t) && !penalizedTags.has(t));
  if (matched.length === 0) {
    return `${m.name} is a versatile path with strong opportunities that could suit a wide range of interests.`;
  }
  const top = matched.slice(0, 3).map(t => t.toLowerCase());
  const phrase = top.length === 1 ? top[0]
    : top.slice(0, -1).join(", ") + " and " + top[top.length - 1];
  const lead = m.wild
    ? `You might not have considered ${m.name}, but your interest in ${phrase} actually fits it well.`
    : `Your interest in ${phrase} lines up well with ${m.name}.`;
  return `${lead} It rewards the strengths you selected and opens doors to roles like ${m.careers[0]} and ${m.careers[1]}.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ytUrl(q) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

function shareText(results, sessionId) {
  const top3 = results.slice(0, 3).map(r =>
    `${r.rank}. ${r.name} (${r.fitScore}% fit) - ${r.salaryRange}`
  ).join("\n");
  const wildcard = results.find(r => r.isWildcard);
  const wildcardLine = wildcard ? `\nSurprise pick: ${wildcard.name}` : "";
  const reportUrl = sessionId
    ? `https://buy.stripe.com/fZu6oz7g43bp56w0oR9bO00?client_reference_id=${sessionId}`
    : 'https://findyourmajor.org';
  return `Hey! I just took a free AI quiz that matched me to my top college majors.\n\nMy top matches:\n${top3}${wildcardLine}\n\n---\nWant the full Parent Report based on MY quiz answers? ($14.99)\nIncludes real company names, salary breakdowns, school recommendations, and a 90-day action plan — all personalized to my results:\nThis link is tied to my specific quiz answers:\n${reportUrl}\n\n(Link expires in 24 hours)`;
}

// ─── VideoSection ─────────────────────────────────────────────────────────────

function VideoSection({ major, videoQueries, mobile }) {
  const [open, setOpen] = useState(false);
  const handleToggle = () => { if (!open) Analytics.videoExpanded(major); setOpen(!open); };
  const queries = videoQueries || [
    `${major} college major overview`,
    `studying ${major} what to expect`,
    `${major} degree career paths`,
  ];
  return (
    <div>
      <div style={{ height: 1, background: "#F1F5F9", margin: "16px 0" }} />
      <button
        onClick={handleToggle}
        style={{ background: open ? "#1a3a6e" : NAVY, border: "2px solid " + NAVY, color: "white", fontWeight: "800", fontSize: mobile ? "15px" : "14px", cursor: "pointer", padding: "11px 20px", display: "flex", alignItems: "center", gap: "8px", borderRadius: 50, letterSpacing: "-.2px", WebkitTapHighlightColor: "transparent" }}
      >
        🎬 {open ? "Hide videos" : "Watch " + major + " videos"} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: SLATE, marginBottom: 4 }}>Search on YouTube</div>
          {queries.map((q, i) => (
            <a
              key={i}
              href={ytUrl(q)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 12, background: OFFWHT, border: "1px solid #E8EDF5", borderRadius: 10, padding: "12px 14px", textDecoration: "none", color: NAVY }}
            >
              <span style={{ fontSize: 20 }}>▶️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{q}</div>
                <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>Open YouTube →</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function Quiz() {
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const [phase, setPhase] = useState("name");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "" });
  const [studentName, setStudentName]   = useState("");
  const [studentState, setStudentState] = useState("");
  const [refCode, setRefCode] = useState("");
  const [counselorProfile, setCounselorProfile] = useState(null);
  const topRef = useRef(null);

  const q = QUESTIONS[step];
  const selected = answers[q?.id] || [];


  // Capture counselor referral code from URL (?ref=sarahchen)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || sessionStorage.getItem("fym_ref") || "";
      if (ref) {
        setRefCode(ref);
        sessionStorage.setItem("fym_ref", ref); // persist through quiz
        // Fetch counselor profile for white-label branding
        fetch(`/api/counselor-profile?ref=${encodeURIComponent(ref)}`)
          .then(r => r.ok ? r.json() : null)
          .then(profile => { if (profile?.name) setCounselorProfile(profile); })
          .catch(() => {});
      }
    } catch {}
  }, []);

  function showToast(msg) {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 2800);
  }

  function toggleOption(label) {
    const curr = answers[q.id] || [];
    if (q.type === "single") {
      setAnswers({ ...answers, [q.id]: [label] });
    } else {
      setAnswers({ ...answers, [q.id]: curr.includes(label) ? curr.filter(x => x !== label) : [...curr, label] });
    }
  }

  const canAdvance = q?.type === "state"
    ? (studentState !== "")
    : (answers[q?.id] || []).length > 0;

  function saveResults() {
    try {
      localStorage.setItem("mm_results", JSON.stringify({ results, at: Date.now() }));
      setSaved(true);
      Analytics.resultsSaved();
      showToast("✅ Saved to this device!");
    } catch { showToast("Could not save."); }
  }

  async function shareResults() {
    Analytics.resultsShared();
    let sessionId = '';
    try {
      const res = await fetch('/api/save-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, results, refCode, studentName, studentState: studentState || answers["state"]?.[0] || "" }),
      });
      const data = await res.json();
      sessionId = data.sessionId || '';
    } catch (err) {
      console.warn('Could not save answers for share:', err);
    }
    const txt = shareText(results, sessionId);
    if (navigator.share) {
      navigator.share({ title: 'My college major matches - Find Your Major', text: txt })
        .catch(() => {
          navigator.clipboard.writeText(txt)
            .then(() => showToast('Copied! Paste into iMessage, WhatsApp, or any app.'))
            .catch(() => showToast('Could not copy.'));
        });
    } else {
      navigator.clipboard.writeText(txt)
        .then(() => showToast('Copied! Paste into iMessage, WhatsApp, or any app.'))
        .catch(() => showToast('Could not copy.'));
    }
  }

  function downloadResults() {
    const lines = ["MY FINDYOURMAJOR.ORG RESULTS", "============================", `Date: ${new Date().toLocaleDateString()}`, "", ...results.map(m => `#${m.rank} — ${m.name} (${m.fitScore}% fit)${m.isWildcard ? "  ✨ WILDCARD" : ""}\n${m.why}${m.firstStep ? `\nFirst step this week: ${m.firstStep}` : ""}\nSalary: ${m.salaryRange} | Outlook: ${m.jobOutlook}\nCareers: ${m.careers.join(", ")}\n`)].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines], { type: "text/plain" }));
    a.download = "findyourmajor-results.txt";
    a.click();
    showToast("📄 Downloaded!");
  }

  // ── Parent feature helpers ────────────────────────────────────────────────



  async function submitAnswers() {
    setPhase("loading");
    setError(null);

    // Build a clean payload — split positive preferences from dealbreakers
    // so the backend can treat them differently in the prompt.
    const positiveQs   = QUESTIONS.filter(q => !q.negative && q.type !== "state");
    const negativeQs   = QUESTIONS.filter(q => q.negative);
    // Capture state from answers if not already set via dropdown
    const resolvedState = studentState || answers["state"]?.[0] || "";

    const payload = positiveQs.map(q => ({
      question: q.question,
      answers: answers[q.id] || [],
    }));

    const dealbreakers = negativeQs.map(q => ({
      question: q.question,
      answers: answers[q.id] || [],
    })).filter(q => q.answers.length > 0);

    try {
      // Call our own serverless backend (which holds the API key securely).
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload, dealbreakers }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      const aiResults = Array.isArray(data?.results) ? data.results : null;

      if (aiResults && aiResults.length > 0) {
        setResults(aiResults);
        setPhase("results");
        Analytics.resultsViewed();
        return;
      }
      throw new Error("Empty AI result");
    } catch (err) {
      // Graceful fallback: if the AI call fails for any reason, use the
      // built-in local scoring engine so the user still gets results.
      console.warn("AI call failed, falling back to local scoring:", err);
      const scored = scoreMajors(answers);
      if (scored && scored.length > 0) {
        setResults(scored);
        setPhase("results");
      } else {
        setError("Please select at least one option per question and try again.");
        setPhase("quiz");
      }
    }
  }

  function restart() {
    navigate("/");
    setPhase("hero"); setStep(0); setAnswers({}); setResults(null); setError(null); setSaved(false);
  }

  useEffect(() => {
    if (topRef.current && phase !== "hero") topRef.current.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase, step]);

  useEffect(() => {
    try { if (localStorage.getItem("mm_results")) setSaved(true); } catch {}
  }, []);

  // ─────────────────────────────── HERO ──────────────────────────────────────

  if (phase === "hero") {
    return (
      <div style={{ minHeight: "100dvh", background: `linear-gradient(160deg, #0a1628 0%, ${NAVY} 50%, #0d2557 100%)`, display: "flex", flexDirection: "column", color: WHITE, fontFamily: "'Inter',system-ui,sans-serif", position: "relative", overflow: "hidden" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
          @keyframes pulse { 0%,100% { opacity:.6 } 50% { opacity:1 } }
          .fu { animation: fadeUp .4s ease forwards }
          .fu1 { animation: fadeUp .4s .08s ease both }
          .fu2 { animation: fadeUp .4s .16s ease both }
          .fu3 { animation: fadeUp .4s .24s ease both }
          .fu4 { animation: fadeUp .4s .32s ease both }
          button:active { opacity:.85; transform:scale(.98) }
        `}</style>

        {/* Ambient glows */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 15% 55%, rgba(245,166,35,.08) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(99,102,241,.09) 0%, transparent 50%)" }} />

        {/* Nav */}
        <div style={{ padding: mobile ? "18px 20px" : "22px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
          <CompassWordmark size={mobile ? 0.85 : 0.95} />
          {saved && (
            <button
              onClick={() => { try { const s = localStorage.getItem("mm_results"); if (s) { setResults(JSON.parse(s).results); setPhase("results"); } } catch {} }}
              style={{ background: "rgba(245,166,35,.15)", border: "1px solid rgba(245,166,35,.35)", color: AMBER, padding: "8px 16px", borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              📋 Saved Results
            </button>
          )}
        </div>

        {/* Hero body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: mobile ? "8px 20px 24px" : "0 24px 40px", textAlign: "center", position: "relative", zIndex: 2 }}>

          <span className="fu" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,166,35,.12)", border: "1px solid rgba(245,166,35,.3)", color: AMBER, fontWeight: 600, fontSize: mobile ? 12 : 13, padding: "6px 16px", borderRadius: 20, marginBottom: mobile ? 20 : 28, letterSpacing: ".3px" }}>
            ✦ Free · No sign-up · AI-powered
          </span>

          <h1 className="fu1" style={{ fontSize: mobile ? "clamp(34px,10vw,48px)" : "clamp(44px,6vw,72px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: mobile ? "-1.5px" : "-2.5px", marginBottom: mobile ? 16 : 22, maxWidth: 740 }}>
            Find the major<br />that's <span style={{ color: AMBER }}>built for you.</span>
          </h1>

          <p className="fu2" style={{ fontSize: mobile ? 15 : 18, color: "rgba(255,255,255,.68)", maxWidth: 420, marginBottom: mobile ? 28 : 40, lineHeight: 1.65 }}>
            6 questions. Instant AI results. No account, no email — just your perfect match.
          </p>

          <div className="fu3" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%", maxWidth: mobile ? "100%" : "auto" }}>
            <button
              onClick={() => setPhase("name")}
              style={{ background: AMBER, color: NAVY, border: "none", padding: mobile ? "17px 0" : "17px 48px", width: mobile ? "100%" : "auto", borderRadius: 50, fontSize: mobile ? 17 : 17, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 32px rgba(245,166,35,.5)", letterSpacing: "-.3px", maxWidth: mobile ? 420 : "none" }}
            >
              Start the Quiz →
            </button>
            <span style={{ color: "rgba(255,255,255,.38)", fontSize: 13, fontWeight: 500 }}>Takes about 3 minutes</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="fu4" style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,.08)", position: "relative", zIndex: 2 }}>
          {(mobile
            ? [{ num: "6", label: "Questions" }, { num: "5", label: "Matches" }, { num: "~3 min", label: "Time" }]
            : [{ num: "6", label: "Quick Questions" }, { num: "5", label: "AI Matches" }, { num: "0", label: "Sign-ups" }, { num: "~3 min", label: "Average Time" }]
          ).map((s, i, arr) => (
            <div key={s.label} style={{ flex: 1, textAlign: "center", padding: mobile ? "14px 8px" : "20px 16px", borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,.08)" : "none" }}>
              <div style={{ fontSize: mobile ? 20 : 24, fontWeight: 900, color: AMBER, letterSpacing: "-.5px" }}>{s.num}</div>
              <div style={{ fontSize: mobile ? 10 : 11, color: "rgba(255,255,255,.42)", marginTop: 3, letterSpacing: ".7px", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature strip — below fold on desktop, scrollable on mobile */}
        <div style={{ background: WHITE, borderTop: "1px solid #E8EDF5" }}>
          <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)" }}>
            {[
              { icon: "⚡", title: "Instant Results", desc: "Get matches the moment you finish — no wait." },
              { icon: "🎯", title: "AI-Personalized", desc: "Built around your interests and strengths." },
              { icon: "🎬", title: "Video Insights", desc: "YouTube searches for each major." },
              { icon: "💾", title: "Save & Share", desc: "Download or share your results." },
            ].map((f, i) => (
              <div key={f.title} style={{ padding: mobile ? "18px 14px" : "26px 22px", borderRight: mobile ? (i % 2 === 0 ? "1px solid #E8EDF5" : "none") : (i < 3 ? "1px solid #E8EDF5" : "none"), borderBottom: mobile && i < 2 ? "1px solid #E8EDF5" : "none" }}>
                <div style={{ fontSize: mobile ? 20 : 22, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontWeight: 800, fontSize: mobile ? 13 : 14, marginBottom: 4, color: NAVY }}>{f.title}</div>
                <div style={{ color: SLATE, fontSize: mobile ? 12 : 13, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────── QUIZ ───────────────────────────────────────

  if (phase === "name") {
    return (
      <div style={{ minHeight: "100dvh", background: `linear-gradient(160deg, #0a1628 0%, ${NAVY} 50%, #0d2557 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: WHITE, fontFamily: "'Inter',system-ui,sans-serif", padding: "24px 20px" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes fadeUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
          .fu { animation: fadeUp .35s ease forwards }
          .name-input::placeholder { color: rgba(255,255,255,.25); }
          .name-input:focus { outline: none; border-color: ${AMBER}; background: rgba(255,255,255,.12); }
        `}</style>

        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div className="fu" style={{ marginBottom: 32 }}>
            <CompassWordmark size={0.9} dark />
          </div>

          <div className="fu" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: AMBER }}>Before we begin</span>
          </div>

          <h2 className="fu" style={{ fontSize: mobile ? 28 : 34, fontWeight: 900, letterSpacing: "-.5px", lineHeight: 1.15, marginBottom: 12, color: WHITE }}>
            What's your first name?
          </h2>
          <p className="fu" style={{ fontSize: 15, color: "rgba(255,255,255,.85)", marginBottom: 36, lineHeight: 1.6 }}>
            We'll personalize your results and the Parent Report with your name.
          </p>

          <input
            className="name-input"
            type="text"
            autoFocus
            placeholder="Enter your first name..."
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && studentName.trim()) setPhase("quiz"); }}
            style={{
              width: "100%", padding: "16px 20px", fontSize: 18, fontWeight: 600,
              background: "rgba(255,255,255,.15)", border: `2px solid rgba(255,255,255,.5)`,
              borderRadius: 14, color: WHITE, fontFamily: "inherit", marginBottom: 16,
              transition: "border-color .15s, background .15s",
            }}
          />

          <button
            onClick={() => { if (studentName.trim()) setPhase("quiz"); }}
            disabled={!studentName.trim()}
            style={{
              width: "100%", padding: "16px", background: studentName.trim() ? AMBER : "rgba(255,255,255,.15)",
              color: studentName.trim() ? NAVY : "rgba(255,255,255,.6)",
              border: "none", borderRadius: 50, fontSize: 17, fontWeight: 800,
              cursor: studentName.trim() ? "pointer" : "not-allowed",
              transition: "all .2s", letterSpacing: "-.2px",
              boxShadow: studentName.trim() ? "0 6px 24px rgba(245,166,35,.4)" : "none",
            }}
          >
            {studentName.trim() ? `Let's go, ${studentName.trim().split(" ")[0]}! →` : "Enter your name to continue"}
          </button>

          <button
            onClick={() => { setStudentName(""); setPhase("quiz"); }}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,.55)", fontSize: 13, cursor: "pointer", marginTop: 16, textDecoration: "underline" }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  if (phase === "quiz") {
    const pct = ((step + 1) / QUESTIONS.length) * 100;
    return (
      <div style={{ minHeight: "100dvh", background: OFFWHT, fontFamily: "'Inter',system-ui,sans-serif", color: NAVY, display: "flex", flexDirection: "column" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing:border-box; margin:0; padding:0; }
          @keyframes fadeUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
          .fu { animation: fadeUp .3s ease forwards }
          button:active { transform:scale(.97) }
        `}</style>

        <div ref={topRef} />

        {/* Sticky top bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 20, background: WHITE, borderBottom: "1px solid #E8EDF5", padding: mobile ? "12px 16px" : "14px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: mobile ? 10 : 14, maxWidth: 700, margin: "0 auto" }}>
            <button
              onClick={() => step === 0 ? setPhase("hero") : setStep(step - 1)}
              style={{ background: "none", border: "none", color: SLATE, fontSize: mobile ? 20 : 18, cursor: "pointer", padding: "4px 6px", lineHeight: 1, flexShrink: 0 }}
              aria-label="Back"
            >
              ←
            </button>
            <div style={{ flex: 1, height: mobile ? 6 : 5, background: "#E8EDF5", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${AMBER},#FF8C00)`, borderRadius: 6, transition: "width .4s ease" }} />
            </div>
            <span style={{ fontSize: mobile ? 13 : 12, fontWeight: 700, color: SLATE, whiteSpace: "nowrap", flexShrink: 0 }}>{step + 1} / {QUESTIONS.length}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: mobile ? "24px 16px 120px" : "36px 24px 120px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }} className="fu">
            <h2 style={{ fontSize: mobile ? "clamp(20px,5.5vw,26px)" : "clamp(22px,3.5vw,30px)", fontWeight: 800, letterSpacing: "-.5px", lineHeight: 1.25, marginBottom: 8 }}>
              {q.question}
            </h2>
            <p style={{ fontSize: mobile ? 14 : 15, color: SLATE, marginBottom: mobile ? 20 : 26 }}>{q.subtitle}</p>

            {/* Options — state dropdown or button grid */}
            {q.type === "state" ? (
              <div>
                <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>🏫</span>
                  <p style={{ fontSize: 13, color: "#4338CA", fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
                    Your state helps us recommend in-state schools — which can save you $20,000+ per year compared to out-of-state tuition.
                  </p>
                </div>
                <select
                  value={studentState}
                  onChange={e => setStudentState(e.target.value)}
                  style={{
                    width: "100%", padding: "14px 16px", fontSize: 16,
                    border: `2px solid ${studentState ? AMBER : "#E2E8F0"}`,
                    borderRadius: 12, background: studentState ? AMBER_L : WHITE,
                    color: studentState ? NAVY : "#94A3B8",
                    fontWeight: studentState ? 700 : 400,
                    appearance: "none", WebkitAppearance: "none",
                    cursor: "pointer", outline: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7A99' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 16px center",
                    paddingRight: 40,
                  }}
                >
                  <option value="">Select your state...</option>
                  {["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p style={{ fontSize: 12, color: SLATE, marginTop: 10, textAlign: "center" }}>
                  You can skip this — but we won't be able to include in-state school recommendations.
                </p>
                <button
                  onClick={() => setStudentState("skip")}
                  style={{ background: "none", border: "none", color: SLATE, fontSize: 13, cursor: "pointer", display: "block", margin: "4px auto 0", textDecoration: "underline" }}
                >
                  Skip this question
                </button>
              </div>
            ) : (
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(2,1fr)", gap: mobile ? 10 : 12 }}>
              {q.options.map(opt => {
                const sel = selected.includes(opt.label);
                return (
                  <button
                    key={opt.label}
                    onClick={() => toggleOption(opt.label)}
                    style={{
                      background: sel ? AMBER_L : WHITE,
                      border: `2px solid ${sel ? AMBER : "#E2E8F0"}`,
                      borderRadius: mobile ? 14 : 12,
                      padding: mobile ? "15px 16px" : "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      minHeight: mobile ? 58 : 52,
                      transition: "all .15s",
                      boxShadow: sel ? `0 0 0 1px ${AMBER}` : "0 1px 3px rgba(0,0,0,.05)",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span style={{ fontSize: mobile ? 22 : 20, flexShrink: 0, lineHeight: 1 }}>{opt.icon}</span>
                    <span style={{ fontSize: mobile ? 15 : 14, fontWeight: sel ? 700 : 500, color: sel ? NAVY : "#334155", lineHeight: 1.35, flex: 1 }}>
                      {opt.label}
                    </span>
                    {sel && (
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: AMBER, color: NAVY, fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            )}

            {error && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "16px 18px", marginTop: 16, color: "#DC2626", fontSize: 14, lineHeight: 1.6 }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Sticky bottom CTA */}
        <div style={{ position: "sticky", bottom: 0, background: WHITE, borderTop: "1px solid #E8EDF5", padding: mobile ? "12px 16px calc(12px + env(safe-area-inset-bottom))" : "14px 24px", zIndex: 20 }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            {step < QUESTIONS.length - 1 ? (
              <button
                disabled={!canAdvance}
                onClick={() => canAdvance && setStep(step + 1)}
                style={{ width: "100%", background: canAdvance ? NAVY : "#CBD5E1", color: WHITE, border: "none", padding: mobile ? "16px" : "15px", borderRadius: 50, fontSize: mobile ? 16 : 15, fontWeight: 800, cursor: canAdvance ? "pointer" : "not-allowed", letterSpacing: "-.2px", transition: "background .2s" }}
              >
                Next →
              </button>
            ) : (
              <button
                disabled={!canAdvance}
                onClick={() => canAdvance && submitAnswers()}
                style={{ width: "100%", background: canAdvance ? `linear-gradient(135deg,${AMBER},#FF8C00)` : "#CBD5E1", color: canAdvance ? NAVY : WHITE, border: "none", padding: mobile ? "16px" : "15px", borderRadius: 50, fontSize: mobile ? 16 : 15, fontWeight: 800, cursor: canAdvance ? "pointer" : "not-allowed", letterSpacing: "-.2px", boxShadow: canAdvance ? "0 4px 20px rgba(245,166,35,.4)" : "none", transition: "all .2s" }}
              >
                Get My Results ✨
              </button>
            )}
            {!canAdvance && (
              <p style={{ textAlign: "center", color: SLATE, fontSize: 13, marginTop: 8 }}>
                Select at least one option to continue
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────── LOADING ────────────────────────────────────

  if (phase === "loading") {
    return (
      <div style={{ minHeight: "100dvh", background: OFFWHT, fontFamily: "'Inter',system-ui,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { box-sizing:border-box; margin:0; padding:0; }
          @keyframes spin { to { transform: rotate(360deg) } }
          @keyframes dotPulse { 0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1.1)} }
        `}</style>
        <div style={{ width: mobile ? 52 : 56, height: mobile ? 52 : 56, border: `4px solid ${AMBER_L}`, borderTop: `4px solid ${AMBER}`, borderRadius: "50%", animation: "spin .85s linear infinite", marginBottom: 28 }} />
        <h2 style={{ fontSize: mobile ? 22 : 26, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 12 }}>Analyzing your profile…</h2>
        <p style={{ color: SLATE, fontSize: mobile ? 14 : 15, lineHeight: 1.65, maxWidth: 380 }}>
          Matching your interests, strengths, and values to real college major outcomes.
        </p>
        <div style={{ display: "flex", gap: 6, marginTop: 24, justifyContent: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: AMBER, animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────── RESULTS ────────────────────────────────────

  return (
    <div style={{ minHeight: "100dvh", background: OFFWHT, fontFamily: "'Inter',system-ui,sans-serif", color: NAVY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .35s ease forwards }
        button:active { transform:scale(.97) }
      `}</style>

      <div ref={topRef} />

      {/* Sticky results header */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: NAVY, padding: mobile ? "14px 16px" : "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <CompassWordmark size={mobile ? 0.78 : 0.88} dark={true} />
        <button
          onClick={restart}
          style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: WHITE, padding: "7px 14px", borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          ↺ Retake
        </button>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: mobile ? "20px 16px 60px" : "36px 24px 80px" }}>

        {/* Banner */}
        <div className="fu" style={{ background: `linear-gradient(135deg,${NAVY},#1a3a6e)`, borderRadius: mobile ? 16 : 20, padding: mobile ? "24px 20px" : "36px", color: WHITE, marginBottom: 16, textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(245,166,35,.2)", border: "1px solid rgba(245,166,35,.4)", color: AMBER, fontWeight: 700, fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", padding: "5px 14px", borderRadius: 20, marginBottom: 12 }}>Your Results</div>
          <h2 style={{ fontSize: mobile ? 22 : 28, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 8 }}>{studentName ? `${studentName}'s top 5 major matches` : "Your top 5 major matches"}</h2>
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: mobile ? 14 : 15, lineHeight: 1.55, marginBottom: 20, maxWidth: 420, margin: "0 auto 20px" }}>
            Personalized by AI based on your answers. Tap a card to explore videos.
          </p>
          {/* Action buttons — large tap targets on mobile */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {saved ? (
              <span style={{ background: "#22C55E18", color: GREEN, border: "1px solid #22C55E35", padding: "10px 18px", borderRadius: 50, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>✅ Saved</span>
            ) : (
              <button onClick={saveResults} style={{ background: "#22C55E", color: WHITE, border: "none", padding: mobile ? "12px 20px" : "10px 18px", borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: "pointer", minWidth: mobile ? 90 : "auto" }}>💾 Save</button>
            )}
            <button onClick={shareResults} style={{ background: "white", color: NAVY, border: `2px solid white`, padding: mobile ? "12px 20px" : "10px 20px", borderRadius: 50, fontSize: 14, fontWeight: 800, cursor: "pointer", minWidth: mobile ? 100 : "auto" }}>📲 Send to Parent</button>
            <button onClick={downloadResults} style={{ background: AMBER, color: NAVY, border: "none", padding: mobile ? "12px 20px" : "10px 18px", borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: "pointer", minWidth: mobile ? 90 : "auto" }}>📄 Download</button>
          </div>
        </div>

        {/* Counselor white-label banner */}
        {refCode && (
          <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
            {counselorProfile?.logo ? (
              <img src={counselorProfile.logo} alt={counselorProfile.school || "School logo"} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "contain", background: "white", padding: 2 }} />
            ) : (
              <span style={{ fontSize: 22 }}>🎓</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {counselorProfile?.name ? (
                <>
                  <div style={{ fontSize: 13, color: "#4338CA", fontWeight: 700, lineHeight: 1.3 }}>
                    Shared by {counselorProfile.name}
                    {counselorProfile.title ? ` · ${counselorProfile.title}` : ""}
                  </div>
                  {counselorProfile.school && (
                    <div style={{ fontSize: 12, color: "#6366F1", marginTop: 2 }}>{counselorProfile.school}</div>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 13, color: "#4338CA", fontWeight: 600 }}>Shared by your counselor · Personalized by Find Your Major AI</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#818CF8", fontWeight: 600, whiteSpace: "nowrap" }}>Powered by Find Your Major</div>
          </div>
        )}

        {/* Major cards */}
        {results.map((m, idx) => {
          const accentColor = m.rank === 1 ? AMBER : m.rank === 2 ? INDIGO : m.rank === 3 ? GREEN : "#94A3B8";
          return (
            <div key={m.rank} className="fu" style={{ background: WHITE, borderRadius: mobile ? 16 : 18, padding: mobile ? "18px 16px 16px" : "24px 24px 20px", marginBottom: 12, boxShadow: "0 2px 12px rgba(15,31,61,.07)", border: "1px solid #E8EDF5", position: "relative", overflow: "hidden", animationDelay: `${idx * 0.07}s` }}>
              {/* Rank accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: accentColor, borderRadius: "18px 0 0 18px" }} />
              <div style={{ paddingLeft: mobile ? 10 : 12 }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: m.isWildcard ? 6 : 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.rank === 1 ? AMBER : m.rank === 2 ? "#EEF2FF" : m.rank === 3 ? "#F0FDF4" : "#F1F5F9", color: m.rank === 1 ? NAVY : m.rank === 2 ? INDIGO : m.rank === 3 ? GREEN : SLATE, fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{m.rank}</div>
                  <div style={{ flex: 1, fontSize: mobile ? 17 : 19, fontWeight: 800, letterSpacing: "-.3px", lineHeight: 1.2 }}>{m.name}</div>
                  <span style={{ background: m.fitScore >= 85 ? "#F0FDF4" : m.fitScore >= 70 ? AMBER_L : "#F1F5F9", color: m.fitScore >= 85 ? GREEN : m.fitScore >= 70 ? "#D97706" : SLATE, fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>{m.fitScore}%</span>
                </div>
                {m.isWildcard && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#F5F3FF", border: "1px solid #DDD6FE", color: "#7C3AED", fontSize: 11, fontWeight: 800, letterSpacing: ".4px", textTransform: "uppercase", padding: "3px 10px", borderRadius: 20, marginBottom: 10 }}>
                    ✨ Wildcard — worth exploring
                  </div>
                )}
                <p style={{ fontSize: mobile ? 14 : 15, color: "#475569", lineHeight: 1.65, marginBottom: 12 }}>{m.why}</p>
                {/* First step — concrete action from the AI */}
                {m.firstStep && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: AMBER_L, border: "1px solid #FDE6B8", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                    <span style={{ fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>👟</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".8px", textTransform: "uppercase", color: "#B45309", marginBottom: 3 }}>Your first step this week</div>
                      <div style={{ fontSize: mobile ? 13 : 14, color: "#78350F", lineHeight: 1.55 }}>{m.firstStep}</div>
                    </div>
                  </div>
                )}
                {/* Meta chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <span style={{ background: OFFWHT, border: "1px solid #E2E8F0", borderRadius: 8, padding: "5px 11px", fontSize: 13, color: SLATE, fontWeight: 500 }}>💰 {m.salaryRange}</span>
                  <span style={{ background: OFFWHT, border: "1px solid #E2E8F0", borderRadius: 8, padding: "5px 11px", fontSize: 13, color: SLATE, fontWeight: 500 }}>📈 {m.jobOutlook}</span>
                </div>

                {/* AI Impact badge */}
                {m.aiImpact?.level && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    background: m.aiImpact.level === "accelerates" ? "#F0FDF4" : m.aiImpact.level === "automating" ? "#FFF7ED" : "#EFF6FF",
                    border: `1px solid ${m.aiImpact.level === "accelerates" ? "#BBF7D0" : m.aiImpact.level === "automating" ? "#FED7AA" : "#BFDBFE"}`,
                    borderRadius: 10, padding: "10px 12px", marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                      {m.aiImpact.level === "accelerates" ? "🚀" : m.aiImpact.level === "automating" ? "⚠️" : "🔄"}
                    </span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".8px", textTransform: "uppercase", marginBottom: 3,
                        color: m.aiImpact.level === "accelerates" ? "#166534" : m.aiImpact.level === "automating" ? "#9A3412" : "#1E40AF"
                      }}>
                        AI {m.aiImpact.level === "accelerates" ? "Accelerates This" : m.aiImpact.level === "automating" ? "Is Automating Parts" : "Is Changing This"}
                      </div>
                      <div style={{ fontSize: mobile ? 13 : 13, lineHeight: 1.55,
                        color: m.aiImpact.level === "accelerates" ? "#14532D" : m.aiImpact.level === "automating" ? "#7C2D12" : "#1E3A8A"
                      }}>
                        {m.aiImpact.summary}
                      </div>
                    </div>
                  </div>
                )}
                {/* Careers */}
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: SLATE, marginBottom: 8 }}>Careers</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {m.careers.map(c => (
                    <span key={c} style={{ background: `${NAVY}09`, color: NAVY, fontSize: mobile ? 13 : 13, fontWeight: 600, padding: "5px 10px", borderRadius: 6 }}>{c}</span>
                  ))}
                </div>
                <VideoSection major={m.name} videoQueries={m.videoQueries} mobile={mobile} />
              </div>
            </div>
          );
        })}

        {/* ── Parent Report Upsell ($14.99) ──────────────────────────────────── */}
        <div className="fu" style={{ marginTop: 16, background: `linear-gradient(135deg,${NAVY} 0%,#1a3a6e 100%)`, borderRadius: mobile ? 16 : 18, overflow: "hidden", position: "relative" }}>
          <div style={{ padding: mobile ? "28px 22px 24px" : "36px 36px 32px", color: WHITE, textAlign: "center" }}>

            {/* Headline */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: AMBER, marginBottom: 14 }}>Full Parent Report</div>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: mobile ? 26 : 32, fontWeight: 900, lineHeight: 1.25, marginBottom: 16, letterSpacing: "-.3px" }}>
              Most students pick a major and hope for the best.<br />
              <em style={{ color: AMBER, fontStyle: "italic" }}>Yours doesn't have to.</em>
            </h3>
            <p style={{ fontSize: mobile ? 14 : 16, color: "rgba(255,255,255,.75)", lineHeight: 1.7, marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
              For $14.99, your student gets a personalized AI report based on their exact quiz answers — salary data, school recommendations, a 4-year course plan, and a parent conversation guide. It's the clearest picture of their future you can get in under 60 seconds.
            </p>

            {/* Price + CTA */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={async () => {
                  Analytics.affiliateClick("parent_report");
                  try {
                    const res = await fetch("/api/save-answers", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ answers, results, refCode, studentName, studentState: studentState || answers["state"]?.[0] || "" }),
                    });
                    const data = await res.json();
                    const sessionId = data.sessionId || "";
                    const stripeUrl = `https://findyourmajor.org/report?client_reference_id=${sessionId}`;
                    window.open(stripeUrl, "_blank");
                  } catch (err) {
                    console.warn("Could not save answers, redirecting anyway:", err);
                    window.open("https://findyourmajor.org/report", "_blank");
                  }
                }}
                style={{ background: AMBER, color: NAVY, border: "none", padding: mobile ? "18px 0" : "18px 52px", width: mobile ? "100%" : "auto", borderRadius: 50, fontSize: 17, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 24px rgba(245,166,35,.45)", letterSpacing: "-.2px" }}>
                Get the Full Report — $14.99 →
              </button>
              <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
                <span style={{ textDecoration: "line-through", marginRight: 6 }}>$24.99</span>Launch price · One-time · In your inbox in 60 seconds
              </div>
            </div>

            {/* Money-back guarantee */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18, fontSize: 12, color: "rgba(255,255,255,.5)" }}>
              <span>🛡️</span>
              <span>7-day money-back guarantee — no questions asked</span>
            </div>

          </div>
        </div>

        {/* ── Comparison Table ── */}
        <div style={{ marginTop: 12, background: WHITE, borderRadius: mobile ? 14 : 16, border: "1px solid #E8EDF5", overflow: "hidden", boxShadow: "0 2px 12px rgba(15,31,61,.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: NAVY, padding: "12px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: "1px" }}>What you get</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center" }}>Free results</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: AMBER, textTransform: "uppercase", letterSpacing: "1px", textAlign: "center" }}>Full report</div>
          </div>
          {[
            ["Top 5 major matches",          true,  true],
            ["Fit score & brief reason",      true,  true],
            ["In-depth major deep-dive",      false, true],
            ["Salary ranges by career level", false, true],
            ["School recommendations",        false, true],
            ["4-year course path",            false, true],
            ["Parent conversation guide",     false, true],
            ["90-day action plan",            false, true],
          ].map(([label, free, paid], i) => (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 16px", borderTop: "1px solid #F0F4FA", background: i % 2 === 0 ? WHITE : "#FAFBFF", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{label}</div>
              <div style={{ textAlign: "center", fontSize: 16 }}>{free ? <span style={{ color: "#22C55E" }}>✓</span> : <span style={{ color: "#CBD5E1" }}>—</span>}</div>
              <div style={{ textAlign: "center", fontSize: 16 }}>{paid ? <span style={{ color: AMBER, fontWeight: 900 }}>✓</span> : "—"}</div>
            </div>
          ))}
          <div style={{ padding: "14px 16px", background: "#FFFBF0", borderTop: `2px solid ${AMBER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>📄 See a sample report first</div>
              <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>Real report, student name redacted</div>
            </div>
            <a href="/sample-report" target="_blank" rel="noopener noreferrer"
              style={{ background: NAVY, color: WHITE, padding: "8px 20px", borderRadius: 30, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              View sample →
            </a>
          </div>
        </div>

        {/* ── Resources (affiliate) ── */}
        <div className="fu" style={{ marginTop: 28, background: WHITE, borderRadius: mobile ? 16 : 18, border: "1px solid #E8EDF5", boxShadow: "0 2px 12px rgba(15,31,61,.07)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: `linear-gradient(135deg,${INDIGO},#4f46e5)`, padding: mobile ? "20px" : "26px 28px", color: WHITE }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", opacity: 0.85, marginBottom: 8 }}>Free Resources</div>
            <h3 style={{ fontSize: mobile ? 20 : 23, fontWeight: 800, letterSpacing: "-.4px", marginBottom: 6, lineHeight: 1.2 }}>Scholarships, courses & more</h3>
            <p style={{ fontSize: mobile ? 14 : 15, lineHeight: 1.55, color: "rgba(255,255,255,.8)", maxWidth: 480 }}>
              Now that you know your top majors, take the next step — find funding, test-drive a course, or get ahead with a tutor.
            </p>
          </div>

          {/* Partner cards */}
          <div style={{ padding: mobile ? "8px" : "12px" }}>
            {PARTNERS.map((p, i) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => { Analytics.affiliateClick(p.id); try { localStorage.setItem("mm_click_" + p.id, Date.now().toString()); } catch {} }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: mobile ? 12 : 16,
                  padding: mobile ? "14px 12px" : "18px 16px",
                  textDecoration: "none",
                  color: NAVY,
                  borderRadius: 12,
                  transition: "background .15s",
                  borderBottom: i < PARTNERS.length - 1 ? "1px solid #F1F5F9" : "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = OFFWHT; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ fontSize: mobile ? 26 : 30, flexShrink: 0, width: mobile ? 44 : 52, height: mobile ? 44 : 52, borderRadius: 12, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>{p.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: mobile ? 15 : 16, fontWeight: 800, letterSpacing: "-.2px" }}>{p.title}</span>
                    {p.tag && (
                      <span style={{ background: AMBER_L, color: "#D97706", fontSize: 10, fontWeight: 800, letterSpacing: ".5px", textTransform: "uppercase", padding: "2px 8px", borderRadius: 20 }}>{p.tag}</span>
                    )}
                  </div>
                  <div style={{ fontSize: mobile ? 13 : 14, color: SLATE, lineHeight: 1.5, marginBottom: 8 }}>{p.blurb}</div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: INDIGO }}>
                    {p.cta} →
                  </span>
                </div>
              </a>
            ))}
          </div>

          {/* FTC disclosure */}
          <div style={{ padding: mobile ? "12px 16px 16px" : "12px 20px 18px", borderTop: "1px solid #F1F5F9" }}>
            <p style={{ fontSize: 11, color: SLATE, lineHeight: 1.5, textAlign: "center" }}>
              Some links above are affiliate links. If you sign up or purchase through them, FindYourMajor.org may earn a small commission at no extra cost to you. We only recommend tools we believe are genuinely helpful.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
          <button onClick={restart} style={{ background: "transparent", border: `2px solid ${NAVY}`, color: NAVY, padding: mobile ? "13px 28px" : "13px 32px", borderRadius: 50, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>↺ Retake</button>
          <button onClick={shareResults} style={{ background: AMBER, color: NAVY, border: "none", padding: mobile ? "14px 32px" : "14px 36px", borderRadius: 50, fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(245,166,35,.4)" }}>📲 Share with a Parent</button>
        </div>
      </div>

      {/* Toast */}
      <div style={{ position: "fixed", bottom: mobile ? "calc(20px + env(safe-area-inset-bottom))" : 24, left: "50%", transform: `translateX(-50%) translateY(${toast.show ? "0" : "80px"})`, background: NAVY, color: WHITE, padding: "12px 24px", borderRadius: 50, fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(15,31,61,.25)", transition: "transform .3s ease", zIndex: 999, whiteSpace: "nowrap", pointerEvents: "none" }}>
        {toast.msg}
      </div>
    </div>
  );
}
