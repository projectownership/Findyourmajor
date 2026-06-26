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

  console.log("ENV CHECK:", {
    hasStripeSecret:  !!stripeSecret,
    hasWebhookSecret: !!webhookSecret,
    hasAnthropic:     !!anthropicKey,
    hasResend:        !!resendKey,
    hasKvUrl:         !!kvUrl,
    hasKvToken:       !!kvToken,
  });

  if (!stripeSecret || !webhookSecret) {
    console.error("Missing Stripe env vars");
    return res.status(500).json({ error: "Server config error" });
  }

  const stripe = new Stripe(stripeSecret);

  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig     = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  console.log("Webhook event type:", event.type);

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  const session       = event.data.object;
  const customerEmail = session.customer_details?.email;
  const customerName  = session.customer_details?.name || "there";
  const sessionId     = session.client_reference_id || session.metadata?.sessionId;

  console.log("Payment details:", { customerEmail, customerName, sessionId });

  if (!customerEmail) {
    console.error("No customer email found");
    return res.status(200).json({ received: true });
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
        console.log("Quiz data retrieved, majors:", quizData?.results?.length);
      }
    } catch (err) {
      console.warn("KV lookup failed:", err.message);
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
    const html      = buildEmail(firstName, sections, quizData);
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
        subject: `Your Find Your Major Parent Report is ready, ${firstName}!`,
        html,
      }),
    });

    const emailData = await emailRes.json();
    console.log("Email send result:", emailData);
    if (!emailRes.ok) console.error("Resend error:", emailData);
  } catch (err) {
    console.error("Email send failed:", err.message);
  }

  // Clean up KV
  if (sessionId && sessionId !== "no-kv" && kvUrl && kvToken) {
    fetch(`${kvUrl}/del/session:${sessionId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}` },
    }).catch(() => {});
  }

  return res.status(200).json({ received: true });
}

// ─── Full report generation ───────────────────────────────────────────────────

async function generateFullReport(quizData, apiKey) {
  if (!apiKey) throw new Error("No Anthropic API key");

  const results    = quizData?.results || [];
  const answers    = quizData?.answers || {};
  const hasResults = results.length > 0;

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
- What a typical day looks like in this career
- The type of person who thrives (specific personality traits)
- One fact most students don't know about this field
- Why the job market is strong (or any caveats)

SECTION 3 — ALL 5 MAJORS AT A GLANCE
For each of the 5 recommended majors, write 2-3 sentences explaining the unique fit for this student and what makes it worth exploring. Don't just repeat the why — add something new about each one.

SECTION 4 — ${wildcard ? `WILDCARD SPOTLIGHT: ${wildcard.name}` : "HIDDEN GEM MAJOR"}
Write 3-4 sentences about why this surprising pick actually makes perfect sense for this student. Help the parent understand why the AI recommended something unexpected. Make it feel exciting rather than confusing.

SECTION 5 — RECOMMENDED SCHOOLS
For the top 2 majors, list 3 schools each:
- One budget-friendly / state school option
- One mid-range private option  
- One highly-ranked program option
Include 1 sentence about what makes each program notable.

SECTION 6 — SALARY DEEP-DIVE
For the top 3 majors, provide:
- Entry-level salary range (0-3 years experience)
- Mid-career salary range (5-10 years)
- Senior/peak salary range
- One specific high-paying career path in the field
- Geographic note (where salaries are highest)

SECTION 7 — 4-YEAR COURSE PATH
For the #1 recommended major, outline a realistic 4-year college path:
- Year 1: Foundation courses (list 3-4 typical courses)
- Year 2: Core major courses (list 3-4 typical courses)
- Year 3: Specialization + internship (list 2-3 courses + internship note)
- Year 4: Capstone/advanced work + job prep

SECTION 8 — PARENT CONVERSATION GUIDE
Write 5 specific, thoughtful questions parents can use to explore these majors with their student. Make them open-ended and non-pressuring. Tailor them to what the student's results reveal.

SECTION 9 — 90-DAY ACTION PLAN
Write a concrete month-by-month plan:
Month 1 — Explore: 3 specific free actions (YouTube searches, free courses, people to talk to)
Month 2 — Engage: 3 actions to go deeper (campus visits, job shadows, clubs to join)
Month 3 — Decide: 3 actions to narrow down and commit to a direction

SECTION 10 — CLOSING NOTE
Write 2-3 warm sentences of encouragement for the parent. Remind them that most students change their major and that's okay — this report is a starting point, not a life sentence.

---

Format each section with its title in ALL CAPS on its own line, followed by the content. Keep the tone warm, professional, and encouraging throughout. Total length: 900-1200 words.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
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

function buildEmail(firstName, sections, quizData) {
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
  function sectionHTML(key, icon, title, fallback) {
    const content = Object.entries(sections).find(([k]) => k.includes(key))?.[1] || fallback || "";
    if (!content) return "";
    const formatted = content
      .split("\n\n").filter(p => p.trim())
      .map(para => {
        // Convert bullet-like lines
        if (para.trim().startsWith("-") || para.trim().startsWith("•")) {
          const items = para.split("\n").filter(l => l.trim());
          return `<ul style="margin:0 0 12px;padding-left:20px;">${items.map(i => `<li style="color:#374151;font-size:14px;line-height:1.7;margin-bottom:4px;">${i.replace(/^[-•]\s*/,"")}</li>`).join("")}</ul>`;
        }
        // Bold lines that look like sub-headers
        if (para.trim().match(/^(Year [1-4]|Month [1-3]|Entry|Mid|Senior)/)) {
          const [head, ...rest] = para.split("\n");
          return `<p style="margin:0 0 6px;"><strong style="color:${NAVY};font-size:14px;">${head}</strong>${rest.length ? `<br><span style="color:#374151;font-size:14px;line-height:1.7;">${rest.join("<br>")}</span>` : ""}</p>`;
        }
        return `<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 12px;">${para.replace(/\n/g,"<br>")}</p>`;
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

  <!-- Header -->
  <div style="background:${NAVY};padding:18px 28px;display:flex;align-items:center;justify-content:space-between;">
    <span style="font-size:20px;font-weight:900;color:#fff;">Find Your Major<span style="color:${AMBER};">.</span></span>
    <span style="font-size:12px;color:rgba(255,255,255,0.5);">Full Parent Report</span>
  </div>

  <div style="max-width:620px;margin:0 auto;padding:28px 16px 60px;">

    <!-- Hero -->
    <div style="background:linear-gradient(135deg,${NAVY},#1a3a6e);border-radius:16px;padding:28px;color:#fff;margin-bottom:24px;text-align:center;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${AMBER};margin-bottom:10px;">Full Parent Report — Ready</div>
      <h1 style="font-size:22px;font-weight:900;margin:0 0 10px;">Hi ${firstName}! Your student's full report is here.</h1>
      <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0;line-height:1.6;">
        Everything you need to have a great college major conversation — personalized to your student's specific quiz answers.
      </p>
    </div>

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
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
      <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;">
        This report is for informational and educational purposes only. It is not professional academic or career counselling.<br>
        <a href="https://findyourmajor.org" style="color:#6b7a99;">findyourmajor.org</a> &nbsp;|&nbsp;
        <a href="https://findyourmajor.org/privacy" style="color:#6b7a99;">Privacy Policy</a>
      </p>
    </div>

  </div>
</body></html>`;
}
