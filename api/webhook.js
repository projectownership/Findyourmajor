// api/webhook.js
// Receives Stripe payment notifications and emails the full Parent Report.

import Stripe from "stripe";

export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeSecret  = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const anthropicKey  = process.env.ANTHROPIC_API_KEY;
  const resendKey     = process.env.RESEND_API_KEY;
  const kvUrl         = process.env.KV_REST_API_URL;
  const kvToken       = process.env.KV_REST_API_TOKEN;

  // Parse and verify Stripe signature
  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig     = req.headers["stripe-signature"];
    const stripe  = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  // ── Respond to Stripe immediately to prevent timeouts and retries ──────
  // Stripe marks webhooks as failed if they take too long to respond.
  // We acknowledge receipt now and process the report in the background.
  res.status(200).json({ received: true });

  // ── Process report in background ────────────────────────────────────────
  processReport({ event, anthropicKey, resendKey, kvUrl, kvToken }).catch(err => {
    console.error("Background report processing error:", err);
  });
}

async function processReport({ event, anthropicKey, resendKey, kvUrl, kvToken }) {
  const session       = event.data.object;
  const customerEmail = session.customer_details?.email;
  const customerName  = session.customer_details?.name || "there";
  const sessionId     = session.client_reference_id || session.metadata?.sessionId;
  const stripeEventId = session.id;

  console.log("Processing report for:", { customerEmail, customerName, sessionId, stripeEventId });

  if (!customerEmail) {
    console.error("No customer email found");
    return;
  }
  // ── Idempotency check ────────────────────────────────────────────────────
  if (stripeEventId && kvUrl && kvToken) {
    try {
      const dupeCheck = await fetch(`${kvUrl}/get/processed:${stripeEventId}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const dupeData = await dupeCheck.json();
      if (dupeData.result) {
        console.log("Duplicate webhook — already processed:", stripeEventId);
        return;
      }
    } catch (err) {
      console.warn("Idempotency check failed, proceeding:", err.message);
    }
  }
  // ────────────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────

  if (!customerEmail) {
    console.error("No customer email found");
    return;
  }

  // Retrieve quiz answers from Upstash
  let quizData = null;
  if (sessionId && sessionId !== "no-kv" && kvUrl && kvToken) {
    try {
      const kvRes  = await fetch(`${kvUrl}/get/session:${sessionId}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const kvJson = await kvRes.json();
      if (kvJson.result) {
        quizData = JSON.parse(kvJson.result);
        console.log("Quiz data retrieved, majors:", quizData?.results?.length, "refCode:", quizData?.refCode || "none");
      }
    } catch (err) {
      console.warn("KV lookup failed:", err.message);
    }
  }

  // Fetch counselor profile for white-label branding (if referred)
  let counselorProfile = null;
  if (quizData?.refCode && kvUrl && kvToken) {
    try {
      const cpRes  = await fetch(`${kvUrl}/get/counselor:${quizData.refCode.toLowerCase()}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const cpJson = await cpRes.json();
      if (cpJson.result) {
        counselorProfile = JSON.parse(cpJson.result);
        console.log("Counselor profile loaded:", counselorProfile.name, "/", counselorProfile.school);
      }
    } catch (err) {
      console.warn("Counselor profile lookup failed:", err.message);
    }
  }

  // Generate full report with Claude
  let sections = null;
  try {
    sections = await generateFullReport(quizData, anthropicKey);
    console.log("Report generated successfully");
  } catch (err) {
    console.error("Report generation failed:", err.message);
    sections = buildFallbackSections(quizData);
  }

  // Send email via Resend
  try {
    const firstName = customerName.split(" ")[0];
    const html      = buildEmail(firstName, sections, quizData, counselorProfile, sessionId);
    const fromAddr  = process.env.RESEND_FROM || "Find Your Major <onboarding@resend.dev>";

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
          : quizData?.refCode
            ? `Your Find Your Major Parent Report is ready, ${firstName}!`
            : `Your Find Your Major Parent Report is ready, ${firstName}!`,
        html,
      }),
    });

    const emailData = await emailRes.json();
    console.log("Email send result:", emailData);
    if (!emailRes.ok) console.error("Resend error:", emailData);

    // Mark this Stripe session as processed (7-day TTL) to prevent duplicate sends
    if (stripeEventId && kvUrl && kvToken) {
      fetch(`${kvUrl}/set/processed:${stripeEventId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value: "1", ex: 60 * 60 * 24 * 7 }), // 7 days
      }).catch(() => {});
    }
  } catch (err) {
    console.error("Email send failed:", err.message);
  }

  // Save results permanently for the email deep-link (30 days)
  if (sessionId && sessionId !== "no-kv" && kvUrl && kvToken && quizData?.results) {
    const reportPayload = JSON.stringify({
      results: quizData.results,
      refCode: quizData.refCode || "",
      savedAt: Date.now(),
    });
    fetch(`${kvUrl}/set/report:${sessionId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: reportPayload, ex: 60 * 60 * 24 * 30 }), // 30 days
    }).catch(() => {});
  }

  // Clean up temp session KV
  if (sessionId && sessionId !== "no-kv" && kvUrl && kvToken) {
    fetch(`${kvUrl}/del/session:${sessionId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}` },
    }).catch(() => {});
  }

  return;
}

// ─── Full report generation ───────────────────────────────────────────────────

async function generateFullReport(quizData, apiKey) {
  if (!apiKey) throw new Error("No Anthropic API key");

  const results      = quizData?.results || [];
  const answers      = quizData?.answers || {};
  const hasResults   = results.length > 0;
  const studentState = (quizData?.studentState && quizData.studentState !== "skip") ? quizData.studentState : null;
  const studentName  = quizData?.studentName || "";

  // Build rich context from quiz answers + AI results
  const majorContext = hasResults
    ? results.map(r =>
        `#${r.rank} ${r.name} (${r.fitScore}% fit)${r.isWildcard ? " [WILDCARD]" : ""}\n` +
        `Why it fits: ${r.why || ""}\n` +
        `Salary: ${r.salaryRange} | Outlook: ${r.jobOutlook}\n` +
        `Careers: ${(r.careers || []).join(", ")}\n` +
        `First step: ${r.firstStep || "Explore online"}`
      ).join("\n\n")
    : "No specific majors available";

  const top1    = hasResults ? results[0] : null;
  const wildcard = hasResults ? results.find(r => r.isWildcard) : null;

  const prompt = `You are an expert college major advisor writing a comprehensive, personalized Parent Report. This is a paid $9.99 report — it should feel thorough, professional, and genuinely valuable.

${hasResults ? `THE STUDENT'S AI-RECOMMENDED MAJORS:\n${majorContext}` : "No quiz data — write general guidance."}

Write a complete report with ALL of the following sections. Be specific, warm, and practical throughout. Reference actual major names from the list above.

---

SECTION 1 — PERSONAL PROFILE SUMMARY
Write 3-4 sentences describing what this student's major matches reveal about them as a person — their thinking style, what motivates them, and what kind of work environment they'd thrive in. Make the parent feel like you truly understand their student.

SECTION 2 — YOUR #1 MAJOR: ${top1 ? top1.name : "Top Recommendation"}
Write 4-5 sentences covering:
- What a typical workday looks like in this field — be specific and vivid
- The type of person who thrives (3 specific personality traits)
- One surprising fact most students don't know about this field
- Why the job market is strong right now, with one specific growing sector hiring in this field

SECTION 3 — ALL 5 MAJORS AT A GLANCE
For each of the 5 recommended majors write 2-3 sentences covering:
- What makes this major a unique fit for this specific student
- One career path from this major most people overlook
- One real company or industry actively hiring from this major right now

SECTION 4 — ${wildcard ? `WILDCARD SPOTLIGHT: ${wildcard.name}` : "HIDDEN GEM MAJOR"}
Write 4 sentences covering:
- Why this surprising pick makes sense for this specific student
- What a career in this field actually looks like day to day
- One company type or industry that loves hiring from this major
- Why a student who picks this stands out from the crowd

SECTION 5 — RECOMMENDED SCHOOLS
${studentState ? `The student lives in ${studentState}. Lead with IN-STATE options first — they are often $20,000+ cheaper per year than out-of-state.` : ""}
For the top 2 majors, list 3 schools each:
${studentState ? `- One strong in-state public university in ${studentState} with a good program for this major (most important — list this first)` : "- One budget-friendly / state school option"}
- One mid-range private option (any state)
- One highly-ranked program option (any state)
For each school include: what makes the program notable AND one specific advantage (location, co-op program, industry connections, research opportunities).${studentState ? ` For the in-state school, also mention the approximate in-state tuition savings compared to out-of-state.` : ""}

SECTION 6 — CAREER & SALARY DEEP-DIVE
For the top 3 majors provide a complete career picture:
- Entry-level salary range (0-3 years) with a specific entry-level job title
- Mid-career salary range (5-10 years) with a specific mid-level job title
- Senior/peak salary range with a specific senior job title
- Top 3 companies or employers known for hiring from this major (be specific — name real companies)
- The single highest-paying career path available from this major
- Where salaries are highest geographically (top 2-3 cities or regions)
- One emerging career path in this field that didn't exist 10 years ago

SECTION 7 — 4-YEAR COURSE PATH
For the #1 recommended major outline a realistic 4-year path:
- Year 1: Foundation (list 4 typical courses with 1-sentence descriptions)
- Year 2: Core major courses (list 4 typical courses with 1-sentence descriptions)
- Year 3: Specialization + internship (list 3 courses + specific internship advice — what companies to target, what to look for)
- Year 4: Capstone/advanced work + job prep (what the senior experience looks like, how to land the first job)
Also include: one professional certification or skill that significantly boosts employability from this major

SECTION 8 — PARENT CONVERSATION GUIDE
Write 6 specific, thoughtful questions tailored to what this student's results reveal:
- 2 questions about the majors themselves
- 2 questions about career vision and values
- 2 questions about practical next steps
Make them open-ended, non-pressuring, and designed to create dialogue not defensiveness.

SECTION 9 — 90-DAY ACTION PLAN
Month 1 — Explore (3 specific free actions):
- One specific YouTube search term to use
- One free online course (name the actual course and platform)
- One specific type of professional to find and talk to (and how to find them)

Month 2 — Engage (3 deeper actions):
- One campus visit or virtual tour recommendation
- One specific club, organization, or extracurricular to join or explore
- One job shadow or informational interview target (specific industry or company type)

Month 3 — Decide (3 commitment actions):
- One way to test the major before committing (summer program, online class, project)
- One concrete college application action (research specific program, contact admissions)
- One family decision conversation to have (with suggested talking points)

SECTION 10 — CLOSING NOTE
Write 3 warm, specific sentences of encouragement. Reference something specific from the student's results. Remind the parent that exploration is the goal right now — not a final answer.

---

Format each section with its title in ALL CAPS on its own line, followed by the content. Use plain text only — no asterisks, no markdown bold (**), no markdown italic (*). For bullet points use a dash (-) at the start of the line. For sub-headers within sections (like Year 1, Month 1, Entry-level) put them on their own line. Be specific throughout — name real companies, real courses, real job titles. Avoid generic advice. Keep the tone warm, professional, and encouraging. Total length: 1100-1500 words.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 3500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = (data.content || []).map(b => b.text || "").join("");

  // Parse sections from the response
  return parseSections(text);
}

function parseSections(text) {
  // Split on section headers (ALL CAPS lines)
  const lines    = text.split("\n");
  const sections = {};
  let current    = "intro";
  let buffer     = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect section headers: lines that are mostly uppercase
    if (trimmed.length > 5 && trimmed === trimmed.toUpperCase() && /^SECTION|^YOUR|^ALL 5|^WILDCARD|^HIDDEN|^RECOMMENDED|^SALARY|^4-YEAR|^PARENT|^90-DAY|^CLOSING/.test(trimmed)) {
      if (buffer.length) sections[current] = buffer.join("\n").trim();
      current = trimmed;
      buffer  = [];
    } else {
      buffer.push(line);
    }
  }
  if (buffer.length) sections[current] = buffer.join("\n").trim();
  return sections;
}

function buildFallbackSections(quizData) {
  const top = quizData?.results?.[0]?.name || "your recommended major";
  return {
    "intro": `Thank you for your purchase! We've prepared your Parent Report based on your student's quiz results. Their top recommended major is ${top}.`,
    "CLOSING NOTE": "We encourage you to take the quiz at findyourmajor.org to get fully personalized recommendations, and to use this report as a starting point for a great conversation with your student."
  };
}

// ─── Email builder ────────────────────────────────────────────────────────────

function buildEmail(firstName, sections, quizData, counselorProfile, sessionId) {
  const results  = quizData?.results || [];
  const NAVY     = "#0F1F3D";
  const AMBER    = "#F5A623";
  const LIGHT    = "#F0F4FA";

  // Major cards
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
      ${(m.careers||[]).length ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">${m.careers.map(c=>`<span style="background:#f1f5f9;color:${NAVY};font-size:12px;padding:3px 8px;border-radius:4px;font-weight:600;">${c}</span>`).join("")}</div>` : ""}
      ${m.firstStep ? `<div style="background:#fef3dc;border-radius:8px;padding:10px 12px;margin-top:10px;font-size:13px;color:#78350f;"><strong>👟 First step:</strong> ${m.firstStep}</div>` : ""}
    </div>
  `).join("");

  // Convert sections object to HTML blocks
  function mdToHtml(text) {
    return text
      // **bold** → <strong>
      .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${NAVY};">$1</strong>`)
      // *italic* or _italic_ → remove markers, just show plain (avoid stray asterisks)
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      // ### headings → bold line
      .replace(/^###\s+(.+)$/gm, `<strong style="color:${NAVY};font-size:14px;">$1</strong>`)
      .replace(/^##\s+(.+)$/gm,  `<strong style="color:${NAVY};font-size:15px;">$1</strong>`)
      .replace(/^#\s+(.+)$/gm,   `<strong style="color:${NAVY};font-size:16px;">$1</strong>`);
  }

  function sectionHTML(key, icon, title, fallback) {
    const content = Object.entries(sections).find(([k]) => k.includes(key))?.[1] || fallback || "";
    if (!content) return "";

    // Split into paragraphs/blocks on blank lines
    const blocks = content.split(/\n{2,}/).filter(p => p.trim());

    const formatted = blocks.map(block => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

      // Bullet block: lines starting with -, •, or *
      const isBulletBlock = lines.every(l => /^[-•*]\s/.test(l));
      if (isBulletBlock) {
        const items = lines.map(l => l.replace(/^[-•*]\s+/, ""));
        return `<ul style="margin:0 0 14px;padding-left:20px;">${
          items.map(i => `<li style="color:#374151;font-size:14px;line-height:1.75;margin-bottom:5px;">${mdToHtml(i)}</li>`).join("")
        }</ul>`;
      }

      // Mixed block: some bullet lines, some not — render line by line
      const hasBullets = lines.some(l => /^[-•*]\s/.test(l));
      if (hasBullets) {
        let html = "";
        let listItems = [];
        const flushList = () => {
          if (listItems.length) {
            html += `<ul style="margin:0 0 10px;padding-left:20px;">${listItems.map(i => `<li style="color:#374151;font-size:14px;line-height:1.75;margin-bottom:4px;">${mdToHtml(i)}</li>`).join("")}</ul>`;
            listItems = [];
          }
        };
        for (const line of lines) {
          if (/^[-•*]\s/.test(line)) {
            listItems.push(line.replace(/^[-•*]\s+/, ""));
          } else {
            flushList();
            html += `<p style="color:#374151;font-size:14px;line-height:1.75;margin:0 0 8px;">${mdToHtml(line)}</p>`;
          }
        }
        flushList();
        return html;
      }

      // Sub-header block (Year 1, Month 1, Entry-level, etc.)
      if (lines[0].match(/^(Year [1-4]|Month [1-3]|Entry|Mid-career|Mid career|Senior|Peak)/i)) {
        const [head, ...rest] = lines;
        return `<div style="margin-bottom:14px;">
          <p style="margin:0 0 4px;"><strong style="color:${NAVY};font-size:14px;">${mdToHtml(head)}</strong></p>
          ${rest.length ? `<p style="color:#374151;font-size:14px;line-height:1.75;margin:0;">${rest.map(l => mdToHtml(l)).join("<br>")}</p>` : ""}
        </div>`;
      }

      // Plain paragraph — join lines with spaces (not <br>)
      return `<p style="color:#374151;font-size:14px;line-height:1.75;margin:0 0 14px;">${lines.map(l => mdToHtml(l)).join(" ")}</p>`;
    }).join("");

    return `
      <div style="margin-bottom:24px;">
        <div style="background:${NAVY};border-radius:8px 8px 0 0;padding:10px 18px;display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">${icon}</span>
          <span style="color:${AMBER};font-weight:800;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">${title}</span>
        </div>
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:18px 18px 6px;">
          ${formatted}
        </div>
      </div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Find Your Major Parent Report</title></head>
<body style="margin:0;padding:0;background:#f8f9fc;font-family:Arial,sans-serif;">

  <!-- Cover Page -->
  <div style="background:${NAVY};padding:0;">

    <!-- Logo bar -->
    <div style="padding:18px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);">
      <span style="font-size:20px;font-weight:900;color:#fff;">Find Your Major<span style="color:${AMBER};">.</span></span>
      <span style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:1px;text-transform:uppercase;">Parent Report</span>
    </div>

    <!-- Cover hero -->
    <div style="padding:40px 28px 36px;text-align:center;">
      <div style="display:inline-block;background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.3);border-radius:20px;padding:5px 16px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${AMBER};margin-bottom:20px;">
        Prepared Exclusively For You
      </div>
      <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:900;color:#fff;margin:0 0 6px;line-height:1.1;">
        ${studentName ? `${studentName}'s` : `${firstName}'s Student's`}<br>College Major Report
      </h1>
      <p style="color:rgba(255,255,255,.45);font-size:13px;margin:0 0 28px;">
        Generated ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})} &nbsp;·&nbsp; Personalized to your student's quiz answers
      </p>

      <!-- Top major highlight -->
      ${top1 ? `
      <div style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px 20px;display:inline-block;text-align:center;min-width:260px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${AMBER};margin-bottom:8px;">Top Major Match</div>
        <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">${top1.name}</div>
        <div style="display:inline-block;background:${AMBER};color:${NAVY};font-size:13px;font-weight:800;padding:4px 14px;border-radius:20px;">${top1.fitScore}% fit</div>
      </div>` : ""}

      <!-- Report stats -->
      <div style="display:flex;justify-content:center;gap:28px;margin-top:28px;flex-wrap:wrap;">
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:900;color:${AMBER};">10</div>
          <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;">Report sections</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:900;color:${AMBER};">5</div>
          <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;">Majors analyzed</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:900;color:${AMBER};">AI</div>
          <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px;">Personalized</div>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div style="height:4px;background:linear-gradient(90deg,${AMBER},#f59e0b,${AMBER});"></div>
  </div>

  <div style="max-width:620px;margin:0 auto;padding:28px 16px 60px;">

    <!-- Section 1: Personal Profile -->
    ${sectionHTML("PERSONAL PROFILE", "🎯", "Personal Profile Summary", "")}

    <!-- Major Cards -->
    <div style="margin-bottom:24px;">
      <div style="background:${NAVY};border-radius:8px 8px 0 0;padding:10px 18px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">⭐</span>
        <span style="color:${AMBER};font-weight:800;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">All 5 Major Matches</span>
      </div>
      <div style="background:${LIGHT};border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:16px;">
        ${majorCards || '<p style="color:#6b7280;font-size:14px;">Visit findyourmajor.org to see your full results.</p>'}
        ${sessionId && sessionId !== "no-kv" ? `
        <div style="text-align:center;margin-top:16px;">
          <a href="https://findyourmajor.org/results?id=${sessionId}" style="background:#0F1F3D;color:#ffffff;padding:11px 28px;border-radius:50px;font-size:13px;font-weight:700;text-decoration:none;display:inline-block;">
            View your full results online →
          </a>
        </div>` : ""}
      </div>
    </div>

    <!-- Section 2: Top Major Deep Dive -->
    ${sectionHTML("TOP", "🔍", "Deep Dive: Your #1 Major", "")}

    <!-- Section 4: Wildcard -->
    ${sectionHTML("WILDCARD", "✨", "Wildcard Spotlight", "")}

    <!-- Section 5: Recommended Schools -->
    ${sectionHTML("RECOMMENDED SCHOOL", "🏫", "Recommended Schools", "")}

    <!-- Section 6: Salary Deep-Dive -->
    ${sectionHTML("SALARY", "💰", "Salary Deep-Dive", "")}

    <!-- Section 7: 4-Year Course Path -->
    ${sectionHTML("4-YEAR", "📅", "4-Year Course Path", "")}

    <!-- Section 8: Parent Conversation Guide -->
    ${sectionHTML("PARENT CONVERSATION", "🗣️", "Parent Conversation Guide", "")}

    <!-- Section 9: 90-Day Action Plan -->
    ${sectionHTML("90-DAY", "🎯", "90-Day Action Plan", "")}

    <!-- Section 10: Closing -->
    ${sectionHTML("CLOSING", "💙", "A Note From FindYourMajor.org", "")}

    <!-- Salary Research Tip -->
    <div style="background:#fef3dc;border:1px solid #fde6b8;border-radius:12px;padding:18px;margin-bottom:20px;">
      <strong style="font-size:13px;color:#92400e;">💡 Salary Research Tip</strong>
      <p style="font-size:13px;color:#78350f;line-height:1.6;margin:6px 0 0;">
        Visit <strong>bls.gov/ooh</strong> (Bureau of Labor Statistics) for free, government-verified salary data and job growth projections for every career in this report. Filter by state to see local ranges.
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://findyourmajor.org" style="background:${AMBER};color:${NAVY};padding:14px 36px;border-radius:50px;font-size:15px;font-weight:800;text-decoration:none;display:inline-block;">
        Retake the Quiz →
      </a>
      <p style="font-size:12px;color:#94a3b8;margin-top:10px;">Share findyourmajor.org with other parents — the quiz is completely free.</p>
      <p style="font-size:12px;color:#94a3b8;margin-top:10px;">📬 If this email landed in your spam folder, please mark it as <strong>Not Spam</strong> — it helps ensure future reports reach your inbox directly.</p>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
      ${counselorProfile?.name ? `
      <div style="background:#EEF2FF;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:inline-block;text-align:left;">
        <span style="font-size:12px;color:#4338CA;font-weight:700;">🎓 Shared by ${counselorProfile.name}${counselorProfile.title ? ` · ${counselorProfile.title}` : ""}${counselorProfile.school ? `<br><span style="font-weight:400;color:#6366F1;">${counselorProfile.school}</span>` : ""}</span>
      </div>
      ` : quizData?.refCode ? `<p style="font-size:12px;color:#6366F1;margin-bottom:12px;">🎓 Shared by your counselor</p>` : ""}
      <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;">
        This report is for informational and educational purposes only. It is not professional academic or career counselling.<br>
        <a href="https://findyourmajor.org" style="color:#6b7a99;">findyourmajor.org</a> &nbsp;|&nbsp;
        <a href="https://findyourmajor.org/privacy" style="color:#6b7a99;">Privacy Policy</a>
      </p>
    </div>

  </div>
</body></html>`;
}
