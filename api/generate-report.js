// api/generate-report.js
// Generates the AI Parent Report and emails it via Resend.
// Called by webhook.js after payment is confirmed.
// Has 300s timeout (Vercel Pro) to complete without Stripe pressure.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId, customerEmail, customerName, stripeEventId } = req.body || {};

  const kvUrl        = process.env.KV_REST_API_URL;
  const kvToken      = process.env.KV_REST_API_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const resendKey    = process.env.RESEND_API_KEY;
  const fromAddr     = process.env.RESEND_FROM || "Find Your Major <onboarding@resend.dev>";

  console.log("generate-report: start", { customerEmail, sessionId, stripeEventId });

  if (!customerEmail) {
    console.error("generate-report: no customerEmail");
    return res.status(400).json({ error: "No email" });
  }

  // ── Idempotency check ──────────────────────────────────────────────────
  if (stripeEventId && kvUrl && kvToken) {
    try {
      const r = await fetch(`${kvUrl}/get/processed:${stripeEventId}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const d = await r.json();
      if (d.result) {
        console.log("generate-report: duplicate, skipping", stripeEventId);
        return res.status(200).json({ ok: true, skipped: true });
      }
    } catch (err) {
      console.warn("generate-report: idempotency check failed:", err.message);
    }
  }

  // ── Load quiz data ─────────────────────────────────────────────────────
  let quizData = null;
  if (sessionId && kvUrl && kvToken) {
    try {
      const r = await fetch(`${kvUrl}/get/session:${sessionId}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const d = await r.json();
      if (d.result) {
        let parsed = JSON.parse(d.result);
        // Defensive: handle old double-wrapped format { value: "...", ex: N } from before the fix
        if (parsed && typeof parsed === "object" && typeof parsed.value === "string" && !parsed.results) {
          try { parsed = JSON.parse(parsed.value); } catch {}
        }
        quizData = parsed;
        console.log("generate-report: quiz data loaded, majors:", quizData?.results?.length);
      } else {
        console.warn("generate-report: no quiz data for session:", sessionId);
      }
    } catch (err) {
      console.error("generate-report: KV error:", err.message);
    }
  }

  // ── Load counselor profile ─────────────────────────────────────────────
  let counselorProfile = null;
  if (quizData?.refCode && kvUrl && kvToken) {
    try {
      const r = await fetch(`${kvUrl}/get/counselor:${quizData.refCode.toLowerCase()}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const d = await r.json();
      if (d.result) counselorProfile = JSON.parse(d.result);
    } catch {}
  }

  // ── Generate report with Claude Sonnet ────────────────────────────────
  const results  = quizData?.results || [];
  const answers  = quizData?.answers || {};
  const top1     = results[0] || null;
  const wildcard = results.find(r => r.isWildcard) || null;
  const studentName  = quizData?.studentName || "";
  const studentState = quizData?.studentState && quizData.studentState !== "skip" ? quizData.studentState : null;

  const majorContext = results.map(r =>
    `#${r.rank} ${r.name} (${r.fitScore}% fit)${r.isWildcard ? " [WILDCARD]" : ""}\n` +
    `Why it fits: ${r.why || ""}\n` +
    `Salary: ${r.salaryRange} | Outlook: ${r.jobOutlook}\n` +
    `Careers: ${(r.careers || []).join(", ")}`
  ).join("\n\n");

  const prompt = `You are a college major advisor. Write a personalized Parent Report for ${studentName || "this student"}.

STUDENT QUIZ ANSWERS:
- Activities enjoyed: ${(answers.activities||[]).join(", ")}
- Favorite subjects: ${(answers.school||[]).join(", ")}
- Work style: ${(answers.work_style||[]).join(", ")}
- Core values: ${(answers.values||[]).join(", ")}
- Key strengths: ${(answers.strengths||[]).join(", ")}
- Dealbreakers: ${(answers.dealbreakers||[]).join(", ")}
${studentState ? `- Student lives in: ${studentState}` : ""}

AI MAJOR MATCHES:
${majorContext || "No major data available"}

Write these 9 sections. Use plain text only — no asterisks, no markdown. Use dashes for bullet points. Be specific and concise — this needs to stay efficient.

SECTION 1 — PERSONAL PROFILE
3 warm sentences about who this student is based on their answers.

SECTION 2 — YOUR #1 MAJOR: ${top1?.name || "Top Match"}
What students in this field actually do day to day. Why it fits this student specifically. 3 specific job titles. One surprising fact about this field.

SECTION 3 — ALL 5 MAJOR MATCHES
For each major: why it fits this student, the salary range, and top 2 career paths.

SECTION 4 — ${wildcard ? `WILDCARD: ${wildcard.name}` : "HIDDEN GEM MAJOR"}
Why this surprising pick makes sense. What the career looks like. Why it stands out.

SECTION 5 — CAREER & SALARY DEEP-DIVE
For the top 2 majors: entry-level salary + job title, mid-career salary + job title, senior salary + job title, and 2 real companies known for hiring from this field.

SECTION 6 — RECOMMENDED SCHOOLS
${studentState ? `Student is from ${studentState} — list in-state options first (they save $20,000+/year).` : ""}
For the top 2 majors, name 3 schools each: one affordable, one mid-range, one top-ranked. One sentence on why each is worth considering.

SECTION 7 — 4-YEAR COURSE PATH
For the #1 major (${top1?.name || "the top match"}), lay out a realistic 4-year course path. Year 1 — Foundations: 3-4 intro courses. Year 2 — Core: 3-4 core major courses. Year 3 — Specialization: 3-4 courses including at least one elective area. Year 4 — Capstone: thesis/capstone project, 1-2 advanced electives, and internship or co-op recommendation. Keep each year to one line of comma-separated course names.

SECTION 8 — PARENT CONVERSATION GUIDE
4 specific talking points for parents: how to support exploration without pushing, one question to ask instead of giving answers, how to discuss the AI impact on their field, and one sign they've found the right major.

SECTION 9 — 90-DAY ACTION PLAN
Month 1 — 3 specific ways to explore these majors this month.
Month 2 — 3 deeper actions (visit, join, shadow).
Month 3 — 3 commitment steps (test, apply, decide).

Keep total response under 800 words. Be specific and warm.`;

  let reportText = "";
  try {
    console.log("generate-report: calling Claude Sonnet...");
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const claudeData = await claudeRes.json();
    reportText = (claudeData.content || []).map(b => b.text || "").join("");
    console.log("generate-report: Claude done, chars:", reportText.length);
  } catch (err) {
    console.error("generate-report: Claude failed:", err.message);
    reportText = `SECTION 1 — PERSONAL PROFILE\nThank you for your purchase. ${top1 ? `Your student's top match is ${top1.name} at ${top1.fitScore}% fit.` : "Please retake the quiz to get your personalized results."}\n\nSECTION 6 — 90-DAY ACTION PLAN\nStart by researching your top major online, connecting with a guidance counselor, and visiting college websites for programs that interest you.`;
  }

  // ── Build and send email ───────────────────────────────────────────────
  const firstName = (customerName || "there").split(" ")[0];
  const html = buildEmail({ firstName, studentName, top1, results, reportText, quizData, counselorProfile, sessionId });

  try {
    console.log("generate-report: sending email to", customerEmail);
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:    fromAddr,
        to:      [customerEmail],
        subject: `Your Find Your Major Parent Report is ready, ${firstName}!`,
        html,
      }),
    });
    const emailData = await emailRes.json();
    console.log("generate-report: email result:", JSON.stringify(emailData));

    if (!emailRes.ok) {
      console.error("generate-report: Resend error:", emailData);
    }
  } catch (err) {
    console.error("generate-report: email failed:", err.message);
  }

  // ── Mark as processed ──────────────────────────────────────────────────
  if (stripeEventId && kvUrl && kvToken) {
    try {
      await fetch(`${kvUrl}/set/processed:${stripeEventId}?EX=${60 * 60 * 24 * 7}`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "text/plain" },
        body:    "1",
      });
    } catch {}
  }

  // ── Save results for deep-link ─────────────────────────────────────────
  if (sessionId && kvUrl && kvToken && results.length) {
    try {
      await fetch(`${kvUrl}/set/report:${sessionId}?EX=${60 * 60 * 24 * 30}`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "text/plain" },
        body:    JSON.stringify({ results, savedAt: Date.now() }),
      });
    } catch {}
  }

  return res.status(200).json({ ok: true });
}

// ── Email builder ──────────────────────────────────────────────────────────────

function buildEmail({ firstName, studentName, top1, results, reportText, quizData, counselorProfile, sessionId }) {
  const NAVY  = "#0F1F3D";
  const AMBER = "#F5A623";

  // Parse report sections
  const sections = {};
  let current = "";
  let buffer  = [];
  for (const line of reportText.split("\n")) {
    if (/^SECTION \d+ —/.test(line.trim())) {
      if (current) sections[current] = buffer.join("\n").trim();
      current = line.trim();
      buffer  = [];
    } else {
      buffer.push(line);
    }
  }
  if (current) sections[current] = buffer.join("\n").trim();

  function renderSection(keyFragment, icon, title) {
    const entry = Object.entries(sections).find(([k]) => k.includes(keyFragment));
    if (!entry) return "";
    const content = entry[1];
    const lines   = content.split("\n");
    let html = "";
    let listItems = [];
    const flush = () => {
      if (listItems.length) {
        html += `<ul style="margin:8px 0;padding-left:20px;">${listItems.map(i => `<li style="color:#374151;font-size:14px;line-height:1.7;margin-bottom:4px;">${i}</li>`).join("")}</ul>`;
        listItems = [];
      }
    };
    for (const line of lines) {
      const t = line.trim();
      if (!t) { flush(); continue; }
      if (/^[-•]/.test(t)) {
        listItems.push(t.replace(/^[-•]\s*/, ""));
      } else {
        flush();
        html += `<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 10px;">${t}</p>`;
      }
    }
    flush();
    return `<div style="margin-bottom:24px;">
      <div style="background:${NAVY};border-radius:8px 8px 0 0;padding:10px 18px;display:flex;align-items:center;gap:8px;">
        <span>${icon}</span>
        <span style="color:${AMBER};font-weight:800;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">${title}</span>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:18px 18px 8px;">${html}</div>
    </div>`;
  }

  // Major cards
  const majorCards = results.map(m => `
    <div style="border-left:4px solid ${m.rank===1?AMBER:m.isWildcard?"#7C3AED":"#6366F1"};padding:14px 16px;margin-bottom:10px;background:#fff;border-radius:0 8px 8px 0;border-top:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <strong style="font-size:15px;color:${NAVY};">#${m.rank} — ${m.name}</strong>
        <span style="background:${m.fitScore>=85?"#f0fdf4":"#fef3dc"};color:${m.fitScore>=85?"#166534":"#d97706"};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;">${m.fitScore}% fit</span>
      </div>
      ${m.isWildcard ? `<span style="background:#ede9fe;color:#7c3aed;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-block;margin-bottom:6px;">✨ Wildcard Pick</span>` : ""}
      <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 8px;">${m.why||""}</p>
      <div style="font-size:12px;color:#64748b;">💰 ${m.salaryRange||"Varies"} &nbsp;·&nbsp; 📈 ${m.jobOutlook||"Stable"}</div>
      ${m.aiImpact?.summary ? `<div style="margin-top:8px;background:${m.aiImpact.level==="accelerates"?"#f0fdf4":m.aiImpact.level==="automating"?"#fff7ed":"#eff6ff"};border-radius:6px;padding:8px 10px;font-size:12px;color:${m.aiImpact.level==="accelerates"?"#14532d":m.aiImpact.level==="automating"?"#7c2d12":"#1e3a8a"};">${m.aiImpact.level==="accelerates"?"🚀":m.aiImpact.level==="automating"?"⚠️":"🔄"} ${m.aiImpact.summary}</div>` : ""}
    </div>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4fa;font-family:Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;">

  <div style="background:${NAVY};padding:20px 28px 0;">
    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.1);">
      <span style="font-size:18px;font-weight:900;color:#fff;">Find Your Major<span style="color:${AMBER};">.</span></span>
      <span style="font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;">Parent Report</span>
    </div>
    <div style="text-align:center;padding:32px 0 28px;">
      <h1 style="font-family:Georgia,serif;font-size:28px;color:#fff;margin:0 0 8px;">${studentName ? `${studentName}'s` : `${firstName}'s Student's`} College Major Report</h1>
      <p style="color:rgba(255,255,255,.5);font-size:12px;margin:0 0 24px;">Generated ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</p>
      ${top1 ? `<div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:12px;display:inline-block;padding:16px 24px;text-align:center;">
        <div style="font-size:10px;color:${AMBER};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;font-weight:700;">Top Major Match</div>
        <div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:4px;">${top1.name}</div>
        <div style="background:${AMBER};color:${NAVY};font-size:12px;font-weight:800;padding:3px 12px;border-radius:20px;display:inline-block;">${top1.fitScore}% fit</div>
      </div>` : ""}
    </div>
    <div style="height:3px;background:linear-gradient(90deg,${AMBER},#f59e0b,${AMBER});"></div>
  </div>

  <div style="padding:24px 16px 48px;background:#f0f4fa;">

    ${counselorProfile?.name ? `<div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#4338CA;font-weight:600;">🎓 Shared by ${counselorProfile.name}${counselorProfile.school ? ` · ${counselorProfile.school}` : ""}</div>` : ""}

    ${renderSection("PERSONAL PROFILE", "🧠", "Personal Profile Summary")}

    <div style="margin-bottom:24px;">
      <div style="background:${NAVY};border-radius:8px 8px 0 0;padding:10px 18px;display:flex;align-items:center;gap:8px;">
        <span>⭐</span>
        <span style="color:${AMBER};font-weight:800;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">All 5 Major Matches</span>
      </div>
      <div style="background:#f8faff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:14px;">${majorCards}</div>
    </div>

    ${renderSection("YOUR #1 MAJOR", "🔍", "Your #1 Major — Deep Dive")}
    ${renderSection("WILDCARD", "✨", "Wildcard Spotlight")}
    ${renderSection("CAREER & SALARY", "💰", "Career & Salary Deep-Dive")}
    ${renderSection("RECOMMENDED SCHOOL", "🏫", "Recommended Schools")}
    ${renderSection("4-YEAR COURSE PATH", "📅", "4-Year Course Path")}
    ${renderSection("PARENT CONVERSATION", "🗣️", "Parent Conversation Guide")}
    ${renderSection("90-DAY", "📅", "90-Day Action Plan")}

    <div style="background:#fef3dc;border:1px solid #fde6b8;border-radius:10px;padding:16px;margin-bottom:20px;">
      <strong style="font-size:13px;color:#92400e;">💡 Free Salary Research</strong>
      <p style="font-size:13px;color:#78350f;line-height:1.6;margin:6px 0 0;">Visit <strong>bls.gov/ooh</strong> for free government salary data and job growth projections for any career mentioned in this report.</p>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://findyourmajor.org" style="background:${AMBER};color:${NAVY};padding:13px 32px;border-radius:50px;font-size:14px;font-weight:800;text-decoration:none;display:inline-block;">Take the Quiz Again →</a>
      <p style="font-size:12px;color:#94a3b8;margin-top:10px;">Share findyourmajor.org — the quiz is free for every student.</p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
      This report is for informational purposes only and is not professional academic or career counselling.<br>
      <a href="https://findyourmajor.org" style="color:#94a3b8;">findyourmajor.org</a>
    </p>
  </div>
</div>
</body></html>`;
}
