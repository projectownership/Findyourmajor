// api/generate-report.js
// Called by the webhook after responding 200 to Stripe.
// Runs the full AI report generation and email delivery independently.
// Has its own 300s timeout so it can complete without Stripe timing out.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId, customerEmail, customerName, stripeEventId } = req.body || {};

  const kvUrl        = process.env.KV_REST_API_URL;
  const kvToken      = process.env.KV_REST_API_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const resendKey    = process.env.RESEND_API_KEY;

  console.log("generate-report: starting for", customerEmail, "session:", sessionId);

  if (!customerEmail) {
    console.error("generate-report: no customerEmail");
    return;
  }

  // ── Idempotency check ──────────────────────────────────────────────────
  if (stripeEventId && kvUrl && kvToken) {
    try {
      const dupeCheck = await fetch(`${kvUrl}/get/processed:${stripeEventId}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const dupeData = await dupeCheck.json();
      if (dupeData.result) {
        console.log("generate-report: duplicate, skipping", stripeEventId);
        return;
      }
    } catch (err) {
      console.warn("generate-report: idempotency check failed, proceeding:", err.message);
    }
  }

  // ── Load quiz data from Upstash ────────────────────────────────────────
  let quizData = null;
  if (sessionId && sessionId !== "no-kv" && kvUrl && kvToken) {
    try {
      const kvRes  = await fetch(`${kvUrl}/get/session:${sessionId}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const kvJson = await kvRes.json();
      if (kvJson.result) {
        quizData = JSON.parse(kvJson.result);
        console.log("generate-report: quiz data loaded, majors:", quizData?.results?.length);
      } else {
        console.warn("generate-report: no quiz data found for session:", sessionId);
      }
    } catch (err) {
      console.error("generate-report: KV lookup failed:", err.message);
    }
  }

  // ── Load counselor profile ─────────────────────────────────────────────
  let counselorProfile = null;
  if (quizData?.refCode && kvUrl && kvToken) {
    try {
      const cpRes  = await fetch(`${kvUrl}/get/counselor:${quizData.refCode.toLowerCase()}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const cpJson = await cpRes.json();
      if (cpJson.result) counselorProfile = JSON.parse(cpJson.result);
    } catch {}
  }

  // ── Generate report with Claude ────────────────────────────────────────
  let sections = null;
  try {
    console.log("generate-report: calling Claude...");
    sections = await generateFullReport(quizData, anthropicKey);
    console.log("generate-report: Claude done, sections:", Object.keys(sections || {}).length);
  } catch (err) {
    console.error("generate-report: Claude failed:", err.message);
    sections = buildFallbackSections(quizData);
  }

  // ── Send email ─────────────────────────────────────────────────────────
  const firstName   = (customerName || "there").split(" ")[0];
  const studentName = quizData?.studentName || "";
  const top1        = quizData?.results?.[0] || null;
  const studentState = (quizData?.studentState && quizData.studentState !== "skip") ? quizData.studentState : null;

  try {
    const html     = buildEmail(firstName, sections, quizData, counselorProfile, sessionId, studentName, top1);
    const fromAddr = process.env.RESEND_FROM || "Find Your Major <onboarding@resend.dev>";

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:    fromAddr,
        to:      [customerEmail],
        subject: counselorProfile?.name
          ? `Your Find Your Major Parent Report is ready, ${firstName}! (from ${counselorProfile.name})`
          : `Your Find Your Major Parent Report is ready, ${firstName}!`,
        html,
      }),
    });

    const emailData = await emailRes.json();
    console.log("generate-report: email sent:", emailData?.id, emailRes.ok ? "OK" : "FAILED");
    if (!emailRes.ok) console.error("generate-report: Resend error:", emailData);

    // Mark as processed
    if (stripeEventId && kvUrl && kvToken) {
      fetch(`${kvUrl}/set/processed:${stripeEventId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value: "1", ex: 60 * 60 * 24 * 7 }),
      }).catch(() => {});
    }
  } catch (err) {
    console.error("generate-report: email send failed:", err.message);
  }

  // ── Save results for deep-link ─────────────────────────────────────────
  if (sessionId && sessionId !== "no-kv" && kvUrl && kvToken && quizData?.results) {
    fetch(`${kvUrl}/set/report:${sessionId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: JSON.stringify({ results: quizData.results, refCode: quizData.refCode || "", savedAt: Date.now() }), ex: 60 * 60 * 24 * 30 }),
    }).catch(() => {});
  }

  // ── Clean up session ───────────────────────────────────────────────────
  if (sessionId && sessionId !== "no-kv" && kvUrl && kvToken) {
    fetch(`${kvUrl}/del/session:${sessionId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}` },
    }).catch(() => {});
  }

  return res.status(200).json({ ok: true });
}

// ─── Helpers (copied from webhook.js) ────────────────────────────────────────

async function generateFullReport(quizData, apiKey) {
  const results   = quizData?.results || [];
  const answers   = quizData?.answers || {};
  const hasResults = results.length > 0;
  const studentState = (quizData?.studentState && quizData.studentState !== "skip") ? quizData.studentState : null;

  const majorContext = hasResults
    ? results.map(r =>
        `#${r.rank} ${r.name} (${r.fitScore}% fit)${r.isWildcard ? " [WILDCARD]" : ""}\n` +
        `Why it fits: ${r.why || ""}\n` +
        `Salary: ${r.salaryRange} | Outlook: ${r.jobOutlook}\n` +
        `Careers: ${(r.careers || []).join(", ")}\n` +
        `First step: ${r.firstStep || "Explore online"}`
      ).join("\n\n")
    : "No specific majors available";

  const top1 = hasResults ? results[0] : null;

  const prompt = `You are a college major advisor. Write a personalized Parent Report for ${quizData?.studentName || "this student"} based on their quiz answers.

STUDENT ANSWERS:
- Activities: ${(answers.activities||[]).join(", ")}
- Subjects: ${(answers.school||[]).join(", ")}
- Work style: ${(answers.work_style||[]).join(", ")}
- Values: ${(answers.values||[]).join(", ")}
- Strengths: ${(answers.strengths||[]).join(", ")}
- Dealbreakers: ${(answers.dealbreakers||[]).join(", ")}

TOP MAJOR MATCHES:
${majorContext}

Write these 5 sections using plain text only (no asterisks, no markdown, use dashes for bullets):

SECTION 1 — PERSONAL PROFILE
3 sentences about who this student is based on their answers.

SECTION 2 — TOP MAJOR DEEP-DIVE
Detailed look at ${top1 ? top1.name : "their top major"}: what students study, day-to-day work life, why it fits this student specifically, and 3 specific job titles they could hold.

SECTION 3 — ALL 5 MAJORS BREAKDOWN
For each major: one paragraph on why it fits, salary range, and top 3 careers.

SECTION 4 — RECOMMENDED SCHOOLS
For the top 2 majors, list 3 schools each (budget, mid-range, top-ranked) with one sentence on why each is worth considering.${studentState ? " Student is from " + studentState + " — prioritize in-state options." : ""}

SECTION 5 — 90-DAY ACTION PLAN
Month 1, Month 2, Month 3 — 3 specific actions each month to explore these majors.

Keep the total response under 800 words. Be specific and warm.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";

  // Parse sections
  const sections = {};
  const lines = text.split("\n");
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    if (line.match(/^SECTION \d+[A-Z]? —/)) {
      if (currentSection) sections[currentSection] = currentContent.join("\n").trim();
      currentSection = line.trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  if (currentSection) sections[currentSection] = currentContent.join("\n").trim();

  return sections;
}

function buildFallbackSections(quizData) {
  const results = quizData?.results || [];
  const top1    = results[0];
  return {
    "SECTION 1 — PERSONAL PROFILE": "Based on your quiz answers, your student shows a unique combination of interests and strengths that point toward several exciting major paths.",
    "SECTION 10 — CLOSING NOTE": `${top1 ? `Your student's top match is ${top1.name} at ${top1.fitScore}% fit.` : ""} Every student's path is different, and the fact that they've taken this step shows real initiative. Trust the process.`,
  };
}

function mdToHtml(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0F1F3D;">$1</strong>')
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^###\s+(.+)$/gm, '<strong style="color:#0F1F3D;font-size:14px;">$1</strong>')
    .replace(/^##\s+(.+)$/gm, '<strong style="color:#0F1F3D;font-size:15px;">$1</strong>')
    .replace(/^#\s+(.+)$/gm,  '<strong style="color:#0F1F3D;font-size:16px;">$1</strong>');
}

function sectionHTML(sections, key, icon, title, fallback, NAVY, AMBER, LIGHT) {
  const content = Object.entries(sections).find(([k]) => k.includes(key))?.[1] || fallback || "";
  if (!content) return "";
  const blocks = content.split(/\n{2,}/).filter(p => p.trim());
  const formatted = blocks.map(block => {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    const isBulletBlock = lines.every(l => /^[-•*]\s/.test(l));
    if (isBulletBlock) {
      const items = lines.map(l => l.replace(/^[-•*]\s+/, ""));
      return `<ul style="margin:0 0 14px;padding-left:20px;">${items.map(i => `<li style="color:#374151;font-size:14px;line-height:1.75;margin-bottom:5px;">${mdToHtml(i)}</li>`).join("")}</ul>`;
    }
    const hasBullets = lines.some(l => /^[-•*]\s/.test(l));
    if (hasBullets) {
      let html = ""; let listItems = [];
      const flushList = () => { if (listItems.length) { html += `<ul style="margin:0 0 10px;padding-left:20px;">${listItems.map(i => `<li style="color:#374151;font-size:14px;line-height:1.75;margin-bottom:4px;">${mdToHtml(i)}</li>`).join("")}</ul>`; listItems = []; } };
      for (const line of lines) {
        if (/^[-•*]\s/.test(line)) { listItems.push(line.replace(/^[-•*]\s+/, "")); }
        else { flushList(); html += `<p style="color:#374151;font-size:14px;line-height:1.75;margin:0 0 8px;">${mdToHtml(line)}</p>`; }
      }
      flushList();
      return html;
    }
    if (lines[0].match(/^(Year [1-4]|Month [1-3]|Entry|Mid-career|Mid career|Senior|Peak)/i)) {
      const [head, ...rest] = lines;
      return `<div style="margin-bottom:14px;"><p style="margin:0 0 4px;"><strong style="color:${NAVY};font-size:14px;">${mdToHtml(head)}</strong></p>${rest.length ? `<p style="color:#374151;font-size:14px;line-height:1.75;margin:0;">${rest.map(l => mdToHtml(l)).join("<br>")}</p>` : ""}</div>`;
    }
    return `<p style="color:#374151;font-size:14px;line-height:1.75;margin:0 0 14px;">${lines.map(l => mdToHtml(l)).join(" ")}</p>`;
  }).join("");
  return `<div style="margin-bottom:24px;"><div style="background:${NAVY};border-radius:8px 8px 0 0;padding:10px 18px;display:flex;align-items:center;gap:8px;"><span style="font-size:16px;">${icon}</span><span style="color:${AMBER};font-weight:800;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">${title}</span></div><div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:18px 18px 6px;">${formatted}</div></div>`;
}

function buildEmail(firstName, sections, quizData, counselorProfile, sessionId, studentName = "", top1 = null) {
  const results  = quizData?.results || [];
  const NAVY     = "#0F1F3D";
  const AMBER    = "#F5A623";
  const LIGHT    = "#F0F4FA";
  const WHITE    = "#ffffff";

  const majorCards = results.map(m => `
    <div style="border-left:4px solid ${m.rank===1?AMBER:m.isWildcard?"#7C3AED":"#6366F1"};border-radius:0 10px 10px 0;padding:16px 18px;margin-bottom:12px;background:#ffffff;border-top:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:16px;color:${NAVY};">#${m.rank} — ${m.name}</strong>
        <span style="background:${m.fitScore>=85?"#f0fdf4":m.fitScore>=70?"#fef3dc":"#f1f5f9"};color:${m.fitScore>=85?"#166534":m.fitScore>=70?"#d97706":"#6b7a99"};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${m.fitScore}% fit</span>
      </div>
      ${m.isWildcard ? '<div style="background:#ede9fe;color:#7c3aed;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;display:inline-block;margin-bottom:8px;">✨ WILDCARD PICK</div>' : ""}
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 10px;">${m.why || ""}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:#64748b;">
        <span>💰 ${m.salaryRange || "Varies"}</span>
        <span>📈 ${m.jobOutlook || "Stable"}</span>
      </div>
      ${m.aiImpact?.summary ? `<div style="margin-top:10px;background:${m.aiImpact.level==="accelerates"?"#f0fdf4":m.aiImpact.level==="automating"?"#fff7ed":"#eff6ff"};border-radius:8px;padding:10px 12px;font-size:13px;color:${m.aiImpact.level==="accelerates"?"#14532d":m.aiImpact.level==="automating"?"#7c2d12":"#1e3a8a"};"><strong>${m.aiImpact.level==="accelerates"?"🚀 AI Accelerates This":m.aiImpact.level==="automating"?"⚠️ AI Is Automating Parts":"🔄 AI Is Changing This"}</strong><br>${m.aiImpact.summary}</div>` : ""}
      ${(m.careers||[]).length ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">${m.careers.map(c=>`<span style="background:#f1f5f9;color:${NAVY};font-size:12px;padding:3px 8px;border-radius:4px;font-weight:600;">${c}</span>`).join("")}</div>` : ""}
    </div>
  `).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4fa;font-family:Arial,sans-serif;">
<div style="max-width:660px;margin:0 auto;background:#f0f4fa;padding:20px 0 40px;">

  <!-- Cover Page -->
  <div style="background:${NAVY};">
    <div style="padding:18px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);">
      <span style="font-size:20px;font-weight:900;color:#fff;">Find Your Major<span style="color:${AMBER};">.</span></span>
      <span style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:1px;text-transform:uppercase;">Parent Report</span>
    </div>
    <div style="padding:40px 28px 36px;text-align:center;">
      <div style="display:inline-block;background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.3);border-radius:20px;padding:5px 16px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${AMBER};margin-bottom:20px;">Prepared Exclusively For You</div>
      <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:900;color:#fff;margin:0 0 6px;line-height:1.1;">
        ${studentName ? `${studentName}'s` : `${firstName}'s Student's`}<br>College Major Report
      </h1>
      <p style="color:rgba(255,255,255,.45);font-size:13px;margin:0 0 28px;">
        Generated ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})} &nbsp;·&nbsp; Personalized to your student's quiz answers
      </p>
      ${top1 ? `<div style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px 20px;display:inline-block;text-align:center;min-width:260px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${AMBER};margin-bottom:8px;">Top Major Match</div>
        <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">${top1.name}</div>
        <div style="display:inline-block;background:${AMBER};color:${NAVY};font-size:13px;font-weight:800;padding:4px 14px;border-radius:20px;">${top1.fitScore}% fit</div>
      </div>` : ""}
      <div style="display:flex;justify-content:center;gap:28px;margin-top:28px;flex-wrap:wrap;">
        <div style="text-align:center;"><div style="font-size:22px;font-weight:900;color:${AMBER};">10</div><div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;">Report sections</div></div>
        <div style="text-align:center;"><div style="font-size:22px;font-weight:900;color:${AMBER};">5</div><div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;">Majors analyzed</div></div>
        <div style="text-align:center;"><div style="font-size:22px;font-weight:900;color:${AMBER};">AI</div><div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;">Personalized</div></div>
      </div>
    </div>
    <div style="height:4px;background:linear-gradient(90deg,${AMBER},#f59e0b,${AMBER});"></div>
  </div>

  <div style="max-width:620px;margin:0 auto;padding:28px 16px 60px;">
    ${counselorProfile?.name ? `<div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:20px;">🎓</span>
      <div><div style="font-size:13px;color:#4338CA;font-weight:700;">Shared by ${counselorProfile.name}${counselorProfile.title ? ` · ${counselorProfile.title}` : ""}${counselorProfile.school ? `<br><span style="font-weight:400;color:#6366F1;">${counselorProfile.school}</span>` : ""}</div></div>
    </div>` : ""}

    ${sectionHTML(sections, "PERSONAL PROFILE", "🧠", "Personal Profile Summary", "", NAVY, AMBER, LIGHT)}
    ${sectionHTML(sections, "YOUR #1 MAJOR", "🔍", "Your #1 Major Deep-Dive", "", NAVY, AMBER, LIGHT)}
    ${sectionHTML(sections, "ALL 5 MAJOR", "⭐", "All 5 Major Matches", "", NAVY, AMBER, LIGHT) || `<div style="margin-bottom:24px;"><div style="background:${NAVY};border-radius:8px 8px 0 0;padding:10px 18px;display:flex;align-items:center;gap:8px;"><span>⭐</span><span style="color:${AMBER};font-weight:800;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">All 5 Major Matches</span></div><div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:16px;">${majorCards}${sessionId && sessionId !== "no-kv" ? `<div style="text-align:center;margin-top:16px;"><a href="https://findyourmajor.org/results?id=${sessionId}" style="background:${NAVY};color:#fff;padding:11px 28px;border-radius:50px;font-size:13px;font-weight:700;text-decoration:none;display:inline-block;">View your full results online →</a></div>` : ""}</div></div>`}
    ${sectionHTML(sections, "WILDCARD", "✨", "Wildcard Spotlight", "", NAVY, AMBER, LIGHT)}
    ${sectionHTML(sections, "RECOMMENDED SCHOOL", "🏫", "Recommended Schools", "", NAVY, AMBER, LIGHT)}
    ${sectionHTML(sections, "CAREER", "💰", "Career & Salary Deep-Dive", "", NAVY, AMBER, LIGHT)}
    ${sectionHTML(sections, "AI IMPACT", "🤖", "AI Impact Analysis", "", NAVY, AMBER, LIGHT)}
    ${sectionHTML(sections, "4-YEAR", "📅", "4-Year Course Path", "", NAVY, AMBER, LIGHT)}
    ${sectionHTML(sections, "PARENT CONVERSATION", "🗣️", "Parent Conversation Guide", "", NAVY, AMBER, LIGHT)}
    ${sectionHTML(sections, "90-DAY", "🎯", "90-Day Action Plan", "", NAVY, AMBER, LIGHT)}
    ${sectionHTML(sections, "CLOSING", "💙", "Closing Note", "", NAVY, AMBER, LIGHT)}

    <p style="font-size:12px;color:#94a3b8;margin-top:10px;">Share findyourmajor.org with other parents — the quiz is completely free.</p>
    <p style="font-size:12px;color:#94a3b8;margin-top:10px;">📬 If this email landed in your spam folder, please mark it as <strong>Not Spam</strong> — it helps ensure future reports reach your inbox directly.</p>

    ${counselorProfile?.name ? `<div style="background:#EEF2FF;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:inline-block;text-align:left;">
      <span style="font-size:12px;color:#4338CA;font-weight:700;">🎓 Shared by ${counselorProfile.name}${counselorProfile.title ? ` · ${counselorProfile.title}` : ""}${counselorProfile.school ? `<br><span style="font-weight:400;color:#6366F1;">${counselorProfile.school}</span>` : ""}</span>
    </div>` : quizData?.refCode ? `<p style="font-size:12px;color:#6366F1;margin-bottom:12px;">🎓 Shared by your counselor</p>` : ""}

    <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;">
      This report is for informational and educational purposes only. It is not professional academic or career counselling.<br>
      <a href="https://findyourmajor.org" style="color:#6b7a99;">findyourmajor.org</a> &nbsp;|&nbsp;
      <a href="https://findyourmajor.org/privacy" style="color:#6b7a99;">Privacy Policy</a>
    </p>
  </div>
</div>
</body></html>`;
}
