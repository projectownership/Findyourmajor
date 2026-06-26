import { useNavigate } from "react-router-dom";
import { NAVY, AMBER, AMBER_L, SLATE, OFFWHT, WHITE, GREEN, INDIGO } from "../brand.js";
import { Analytics } from "../brand.js";

const TESTIMONIALS = [
  { text: "I was completely stuck between business and computer science. This tool pointed me toward Data Science and it just clicked — that's exactly what I'm studying now.", name: "Marcus T.", detail: "Sophomore, North Carolina A&T" },
  { text: "The wildcard major it suggested — Cognitive Science — wasn't even on my radar. Three months in and I'm obsessed. Best decision I ever made.", name: "Priya S.", detail: "Freshman, University of Michigan" },
  { text: "My daughter was stressed for months. She took the quiz, got her results, and said 'Mom, this is literally me.' Worth every minute.", name: "Diane R.", detail: "Parent" },
];

const FEATURES = [
  { icon: "🤖", title: "Genuinely AI-powered", desc: "Claude — one of the world's most advanced AI systems — analyzes your answers and builds personalized recommendations, not a templated list." },
  { icon: "🎯", title: "5 focused matches", desc: "You get exactly 5 majors, including at least one wildcard you probably haven't considered. Enough to explore, not so many it's overwhelming." },
  { icon: "🌍", title: "Works worldwide", desc: "Whether you're in the US, UK, Nigeria, India, or anywhere else — the majors, careers, and insights apply globally." },
  { icon: "🎬", title: "Video resources", desc: "Each recommended major comes with curated YouTube searches so you can hear from real students and professionals in that field." },
  { icon: "💾", title: "Save & share", desc: "Save your results to your device, copy a share link, or send them directly to a parent — instantly." },
  { icon: "🔒", title: "Private by design", desc: "No account required. No email. No tracking. Your answers stay on your device. We built this for students, not for data harvesting." },
];

const STATS = [
  { num: "8", label: "Quick questions" },
  { num: "5", label: "AI-matched majors" },
  { num: "40+", label: "Majors in our engine" },
  { num: "Free", label: "Always" },
];

export default function Landing() {
  const navigate = useNavigate();
  const mobile = typeof window !== "undefined" && window.innerWidth < 640;

  function startQuiz() {
    Analytics.quizStarted();
    navigate("/quiz");
  }

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", color: NAVY, background: WHITE }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .45s ease forwards; }
        .fu1 { animation: fadeUp .45s .08s ease both; }
        .fu2 { animation: fadeUp .45s .16s ease both; }
        .fu3 { animation: fadeUp .45s .24s ease both; }
        button:active { transform: scale(.98); }
        a { color: inherit; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E8EDF5", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-.5px", color: NAVY }}>
          Find Your Major<span style={{ color: AMBER }}>.</span>
        </span>
        <button onClick={startQuiz} style={{ background: AMBER, color: NAVY, border: "none", padding: "9px 22px", borderRadius: 50, fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 3px 12px rgba(245,166,35,.35)" }}>
          Take the Quiz →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: `radial-gradient(ellipse at center, rgba(10,22,40,0.82) 0%, rgba(15,31,61,0.72) 50%, rgba(13,37,87,0.55) 100%), url("https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1400&q=80") center/cover no-repeat`, padding: "88px 24px 80px", textAlign: "center", color: WHITE, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 60%, rgba(245,166,35,.08) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,.09) 0%, transparent 50%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="fu" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,166,35,.12)", border: "1px solid rgba(245,166,35,.3)", color: AMBER, fontWeight: 600, fontSize: 13, padding: "6px 18px", borderRadius: 20, marginBottom: 28 }}>
            ✦ Free · No sign-up · Powered by Claude AI
          </div>
          <h1 className="fu1" style={{ fontSize: "clamp(38px,7vw,72px)", fontWeight: 900, lineHeight: 1.04, letterSpacing: "-2.5px", marginBottom: 22, maxWidth: 800, margin: "0 auto 22px" }}>
            Stop guessing.<br />
            <span style={{ color: AMBER }}>Find the major that's yours.</span>
          </h1>
          <p className="fu2" style={{ fontSize: "clamp(16px,2.5vw,20px)", color: "rgba(255,255,255,.92)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.65 }}>
            Answer 8 honest questions about who you are. Get 5 personalized college major recommendations — including one that might surprise you.
          </p>
          <div className="fu3" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <button onClick={startQuiz} style={{ background: AMBER, color: NAVY, border: "none", padding: "18px 52px", borderRadius: 50, fontSize: 18, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 32px rgba(245,166,35,.5)", letterSpacing: "-.3px" }}>
              Start the Quiz — It's Free →
            </button>
            <span style={{ color: "rgba(255,255,255,.75)", fontSize: 13 }}>Takes about 3 minutes · No email required</span>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: "flex", justifyContent: "center", borderTop: "1px solid rgba(255,255,255,.08)", marginTop: 64, position: "relative", zIndex: 1 }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ flex: "1", maxWidth: 160, textAlign: "center", padding: "20px 12px", borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,.08)" : "none" }}>
              <div style={{ fontSize: "clamp(22px,4vw,28px)", fontWeight: 900, color: AMBER, letterSpacing: "-.5px" }}>{s.num}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)", marginTop: 4, letterSpacing: ".7px", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      {/* Photo grid — diverse students (Unsplash, free license) */}
      <div style={{ background: "white", padding: "40px 16px 8px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#6B7A99", marginBottom: 16 }}>
            Helping students everywhere find their path
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "span 2", borderRadius: 14, overflow: "hidden", height: 260 }}>
              <img src="https://images.unsplash.com/photo-1758270704524-596810e891b5?auto=format&fit=crop&w=800&q=80"
                alt="Diverse college students smiling in a lecture hall"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
            </div>
            <div style={{ borderRadius: 14, overflow: "hidden", height: 260 }}>
              <img src="https://images.unsplash.com/photo-1758270704025-0e1a1793e1ca?auto=format&fit=crop&w=800&q=80"
                alt="College students taking notes in class"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 40 }}>
            <div style={{ borderRadius: 14, overflow: "hidden", height: 200 }}>
              <img src="https://images.unsplash.com/photo-1758270703878-de80505b6714?auto=format&fit=crop&w=800&q=80"
                alt="Students raising hands in lecture hall"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
            </div>
            <div style={{ gridColumn: "span 2", borderRadius: 14, overflow: "hidden", height: 200 }}>
              <img src="https://images.unsplash.com/photo-1758270705518-b61b40527e76?auto=format&fit=crop&w=800&q=80"
                alt="Diverse students collaborating around a laptop"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", display: "block" }} loading="lazy" />
            </div>
          </div>
        </div>
      </div>

      <section style={{ padding: "80px 24px", background: OFFWHT }}>
        <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: AMBER_L, color: "#D97706", fontWeight: 700, fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", padding: "5px 16px", borderRadius: 20, marginBottom: 16 }}>How it works</div>
          <h2 style={{ fontSize: "clamp(28px,5vw,42px)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 16, lineHeight: 1.1 }}>Three steps to clarity</h2>
          <p style={{ color: SLATE, fontSize: 17, lineHeight: 1.65, maxWidth: 520, margin: "0 auto 56px" }}>
            No fluff, no long personality tests. Just a focused conversation with an AI that actually knows the landscape of college majors.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
            {[
              { step: "01", icon: "✏️", title: "Answer 8 questions", desc: "Tell us about your interests, work style, values, and the kind of impact you want to make. Honest answers = better results." },
              { step: "02", icon: "🤖", title: "AI builds your profile", desc: "Claude — Anthropic's AI — reads your full set of answers together and generates recommendations specific to you, not a template." },
              { step: "03", icon: "🎓", title: "Explore your matches", desc: "Get 5 ranked majors with explanations, salary data, career paths, and video resources for each. Including a wildcard pick." },
            ].map(s => (
              <div key={s.step} style={{ background: WHITE, borderRadius: 18, padding: "28px 24px", border: "1px solid #E8EDF5", boxShadow: "0 2px 12px rgba(15,31,61,.06)", textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: AMBER, letterSpacing: "1px", marginBottom: 12 }}>{s.step}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8, letterSpacing: "-.3px" }}>{s.title}</div>
                <div style={{ color: SLATE, fontSize: 14, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section style={{ padding: "80px 24px", background: WHITE }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ display: "inline-block", background: "#EEF2FF", color: INDIGO, fontWeight: 700, fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", padding: "5px 16px", borderRadius: 20, marginBottom: 16 }}>What you get</div>
            <h2 style={{ fontSize: "clamp(26px,5vw,40px)", fontWeight: 900, letterSpacing: "-1.2px", lineHeight: 1.1 }}>Built for real decisions,<br />not entertainment</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ padding: "24px", borderRadius: 16, border: "1px solid #E8EDF5", background: OFFWHT }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: NAVY }}>{f.title}</div>
                <div style={{ color: SLATE, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "80px 24px", background: `linear-gradient(135deg, ${NAVY}, #1a3a6e)`, color: WHITE }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(245,166,35,.15)", border: "1px solid rgba(245,166,35,.3)", color: AMBER, fontWeight: 700, fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", padding: "5px 16px", borderRadius: 20, marginBottom: 16 }}>Student stories</div>
          <h2 style={{ fontSize: "clamp(26px,5vw,40px)", fontWeight: 900, letterSpacing: "-1.2px", marginBottom: 48, lineHeight: 1.1 }}>Real students. Real clarity.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, padding: "24px 22px", textAlign: "left" }}>
                <div style={{ fontSize: 28, color: AMBER, marginBottom: 12, lineHeight: 1 }}>"</div>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,.95)", marginBottom: 18 }}>{t.text}</p>
                <div style={{ fontWeight: 700, fontSize: 14, color: WHITE }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.72)", marginTop: 2 }}>{t.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ padding: "96px 24px", background: WHITE, textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(30px,6vw,52px)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05, marginBottom: 20 }}>
            Your future major<br />is 3 minutes away.
          </h2>
          <p style={{ color: SLATE, fontSize: 17, lineHeight: 1.65, marginBottom: 40 }}>
            Free. No account. No email. Just answers — and a direction you can actually feel good about.
          </p>
          <button onClick={startQuiz} style={{ background: NAVY, color: WHITE, border: "none", padding: "18px 52px", borderRadius: 50, fontSize: 17, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 32px rgba(15,31,61,.25)", letterSpacing: "-.3px" }}>
            Find My Major Now →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: NAVY, color: "rgba(255,255,255,.70)", padding: "28px 24px", textAlign: "center", fontSize: 13 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "8px 24px" }}>
          <span style={{ color: WHITE, fontWeight: 800, fontSize: 15 }}>Find Your Major<span style={{ color: AMBER }}>.</span></span>
          <span>© {new Date().getFullYear()} FindYourMajor.org</span>
          <a href="/privacy" style={{ color: "rgba(255,255,255,.70)", textDecoration: "none" }} onMouseEnter={e => e.target.style.color=WHITE} onMouseLeave={e => e.target.style.color="rgba(255,255,255,.5)"}>Privacy Policy</a>
          <a href="/terms" style={{ color: "rgba(255,255,255,.70)", textDecoration: "none" }} onMouseEnter={e => e.target.style.color=WHITE} onMouseLeave={e => e.target.style.color="rgba(255,255,255,.5)"}>Terms of Service</a>
          <span>Some links are affiliate links — <a href="/privacy#affiliates" style={{ color: "rgba(255,255,255,.70)" }}>disclosure</a></span>
        </div>
      </footer>
    </div>
  );
}
