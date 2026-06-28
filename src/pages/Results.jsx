import { useState, useEffect } from "react";
import { NAVY, AMBER, AMBER_L, SLATE, OFFWHT, WHITE, GREEN, INDIGO, PURPLE } from "../brand.js";
import { CompassWordmark } from "../components/CompassLogo.jsx";

export default function Results() {
  const [data, setData]     = useState(null);
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { setError("No results ID found in this link."); setLoading(false); return; }

    fetch(`/api/results?id=${encodeURIComponent(id)}`)
      .then(r => r.ok ? r.json() : Promise.reject("not found"))
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("These results have expired or the link is invalid."); setLoading(false); });
  }, []);

  const mobile = typeof window !== "undefined" && window.innerWidth < 600;

  const accentFor = (m, idx) =>
    m.rank === 1 ? AMBER : m.isWildcard ? PURPLE : idx === 1 ? INDIGO : idx === 2 ? GREEN : "#94A3B8";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: OFFWHT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 36, height: 36, border: `3px solid #e2e8f0`, borderTopColor: AMBER, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color: SLATE, fontSize: 14 }}>Loading your results…</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: OFFWHT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
      <h2 style={{ color: NAVY, fontSize: 20, marginBottom: 8 }}>Results not found</h2>
      <p style={{ color: SLATE, fontSize: 14, marginBottom: 24 }}>{error}</p>
      <a href="/quiz" style={{ background: NAVY, color: WHITE, padding: "12px 28px", borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Retake the quiz →</a>
    </div>
  );

  const { results = [], refCode } = data;

  return (
    <div style={{ minHeight: "100vh", background: OFFWHT }}>
      {/* Nav */}
      <nav style={{ background: NAVY, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <CompassWordmark size={0.8} dark />
        <a href="/quiz" style={{ background: AMBER, color: NAVY, padding: "8px 20px", borderRadius: 50, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          Retake quiz
        </a>
      </nav>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: mobile ? "24px 16px" : "32px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: AMBER, marginBottom: 8 }}>Your results</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: mobile ? 26 : 32, color: NAVY, lineHeight: 1.2, marginBottom: 8 }}>Your top major matches</h1>
          <p style={{ color: SLATE, fontSize: 14 }}>Based on your quiz answers — saved from your Parent Report.</p>
        </div>

        {refCode && (
          <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#4338CA", fontWeight: 600 }}>
            <span style={{ fontSize: 18 }}>🎓</span> Shared by your counselor
          </div>
        )}

        {results.map((m, idx) => (
          <div key={m.rank} style={{
            background: WHITE, borderRadius: 14, marginBottom: 12,
            boxShadow: "0 2px 12px rgba(15,31,61,.07)",
            border: "1px solid #E8EDF5", overflow: "hidden",
          }}>
            <div style={{ width: "100%", height: 4, background: accentFor(m, idx) }} />
            <div style={{ padding: mobile ? "16px 14px" : "20px 20px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: mobile ? 15 : 17, fontWeight: 700, color: NAVY }}>#{ m.rank } — {m.name}</div>
                  {m.isWildcard && (
                    <span style={{ display: "inline-block", background: "#EDE9FE", color: PURPLE, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, marginTop: 4 }}>✨ Wildcard pick</span>
                  )}
                </div>
                <span style={{
                  background: m.fitScore >= 85 ? "#F0FDF4" : m.fitScore >= 70 ? AMBER_L : "#F1F5F9",
                  color:      m.fitScore >= 85 ? "#166534" : m.fitScore >= 70 ? "#B45309" : "#6B7A99",
                  fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, flexShrink: 0, marginLeft: 8,
                }}>{m.fitScore}% fit</span>
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.6, margin: "0 0 10px" }}>{m.why}</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#64748B" }}>
                <span>💰 {m.salaryRange || "Varies"}</span>
                <span>📈 {m.jobOutlook || "Stable"}</span>
              </div>
            </div>
          </div>
        ))}

        {/* CTA */}
        <div style={{ background: AMBER_L, border: `2px solid ${AMBER}`, borderRadius: 14, padding: 20, marginTop: 8, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Want more depth?</div>
          <p style={{ color: SLATE, fontSize: 13, marginBottom: 14, lineHeight: 1.55 }}>
            The Parent Report includes salary projections, a 4-year course path, school recommendations, and a parent conversation guide.
          </p>
          <a href="/report" style={{ background: NAVY, color: WHITE, padding: "12px 28px", borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
            Get the full report — $14.99
          </a>
        </div>
      </div>
    </div>
  );
}
