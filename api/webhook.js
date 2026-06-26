// api/webhook.js
// Receives Stripe payment notifications and emails the Parent Report.

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

  // Log env var presence for debugging
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

  // Verify Stripe signature
  let event;
  try {
    const rawBody  = await getRawBody(req);
    const sig      = req.headers["stripe-signature"];
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

  // Try to retrieve quiz answers from Upstash
  let quizData = null;
  if (sessionId && sessionId !== "no-kv" && kvUrl && kvToken) {
    try {
      const kvRes = await fetch(`${kvUrl}/get/session:${sessionId}`, {
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

  // Generate report with Claude
  let reportContent = "";
  try {
    reportContent = await generateReport(quizData, anthropicKey);
    console.log("Report generated, length:", reportContent.length);
  } catch (err) {
    console.error("Report generation failed:", err.message);
    reportContent = buildFallbackReport(quizData);
  }

  // Send email via Resend
  try {
    const firstName = customerName.split(" ")[0];
    const html      = buildEmail(firstName, reportContent, quizData);
    const fromAddr  = process.env.RESEND_FROM || "onboarding@resend.dev";

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:    fromAddr,
        to:      [customerEmail],
        subject: `Your Find Your Major Parent Report is ready!`,
        html,
      }),
    });

    const emailData = await emailRes.json();
    console.log("Email send result:", emailData);

    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
    }
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

// ─── Report generation ────────────────────────────────────────────────────────

async function generateReport(quizData, apiKey) {
  if (!apiKey) throw new Error("No Anthropic API key");

  const hasQuizData = quizData?.results?.length > 0;
  console.log("Has quiz data:", hasQuizData, "SessionId:", sessionId);

  let context = "";
  if (hasQuizData) {
    context = quizData.results.map(r =>
      `${r.rank}. ${r.name} (${r.fitScore}% fit) — ${r.why || ""}\nSalary: ${r.salaryRange} | Outlook: ${r.jobOutlook}\nCareers: ${(r.careers || []).join(", ")}`
    ).join("\n\n");
  }

  const prompt = hasQuizData
    ? `You are an expert college major advisor writing a personalized Parent Report for a specific student.

The student's AI-recommended majors (based on their quiz answers):
${context}

Write a warm, professional report with these sections:
1. PERSONAL SUMMARY: 2-3 sentences about what this student's profile reveals about them as a person.
2. TOP MAJOR DEEP-DIVE: For the #1 major, what daily life looks like, who thrives in it, one surprising fact most people don't know.
3. WILDCARD SPOTLIGHT: If there's a wildcard major, explain in 2-3 sentences why it surprisingly fits this student.
4. SCHOOLS TO RESEARCH: 2-3 specific programs known for quality in the top major (include budget-friendly options).
5. CONVERSATION STARTERS: 3 specific, thoughtful questions for parent and student to discuss together.
6. THIS WEEK'S ACTION: One free, specific action the student can take in the next 7 days.

Keep it under 500 words. Warm, encouraging tone. Reference the actual major names throughout.`

    : `You are an expert college major advisor writing a helpful Parent Report for a family exploring college major options.

This report was purchased directly, so we don't have the student's specific quiz answers. Write a general but highly useful guide covering:

1. HOW TO USE FINDYOURMAJOR.ORG: Encourage the student to take the free quiz at findyourmajor.org to get personalized recommendations. Explain that the quiz takes 3 minutes and asks about interests, strengths, values, and dealbreakers.
2. TOP MAJORS TO EXPLORE: Cover 5 diverse, in-demand majors that many undecided students find surprising fits: (1) Behavioral Economics, (2) Human-Computer Interaction, (3) Public Health, (4) Environmental Science, (5) Organizational Psychology. For each, explain who tends to thrive in it.
3. QUESTIONS TO ASK YOUR STUDENT: 5 powerful questions parents can ask to help their student discover what they really want.
4. RED FLAGS TO AVOID: Common mistakes students make when choosing a major (following friends, chasing salary only, ignoring strengths).
5. THIS WEEK'S ACTION: One specific step to take as a family this week.

Note at the end: For a fully personalized report based on your student's specific answers, have them take the free quiz at findyourmajor.org and click "Get the Full Report" from their results page.

Keep it under 600 words. Warm, practical, encouraging.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.content || []).map(b => b.text || "").join("");
}

function buildFallbackReport(quizData) {
  const top = quizData?.results?.[0]?.name || "your top recommended major";
  return `Thank you for your purchase! Based on your student's quiz answers, their #1 recommended major is ${top}. We recommend exploring this field through YouTube videos, free intro courses on Coursera, and speaking with professionals in the field. Please retake the quiz at findyourmajor.org anytime to update recommendations as your student's interests evolve.`;
}

// ─── Email HTML builder ───────────────────────────────────────────────────────

function buildEmail(firstName, reportContent, quizData) {
  const results  = quizData?.results || [];
  const NAVY     = "#0F1F3D";
  const AMBER    = "#F5A623";

  const majorCards = results.map(m => `
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:14px;background:#ffffff;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:17px;color:${NAVY};">#${m.rank} — ${m.name}</strong>
        <span style="background:#fef3dc;color:#d97706;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${m.fitScore}% fit</span>
      </div>
      ${m.isWildcard ? '<div style="background:#ede9fe;color:#7c3aed;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;display:inline-block;margin-bottom:8px;">✨ WILDCARD</div>' : ""}
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 10px;">${m.why || ""}</p>
      <div style="font-size:13px;color:#64748b;">
        💰 ${m.salaryRange || "Varies"} &nbsp;|&nbsp; 📈 ${m.jobOutlook || "Stable"}
      </div>
      ${m.firstStep ? `<div style="background:#fef3dc;border-radius:8px;padding:10px 12px;margin-top:10px;font-size:13px;color:#78350f;"><strong>👟 First step this week:</strong> ${m.firstStep}</div>` : ""}
    </div>
  `).join("");

  const reportHtml = reportContent
    .split("\n\n").filter(p => p.trim())
    .map(para => `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">${para.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f9fc;font-family:Arial,sans-serif;">
  <div style="background:${NAVY};padding:20px 32px;">
    <span style="font-size:20px;font-weight:900;color:#fff;">Find Your Major<span style="color:${AMBER}">.</span></span>
    <span style="font-size:12px;color:rgba(255,255,255,0.5);margin-left:12px;">Parent Report</span>
  </div>
  <div style="max-width:600px;margin:0 auto;padding:32px 16px 64px;">
    <div style="background:linear-gradient(135deg,${NAVY},#1a3a6e);border-radius:16px;padding:32px;color:#fff;margin-bottom:24px;text-align:center;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${AMBER};margin-bottom:10px;">Parent Report — Ready</div>
      <h1 style="font-size:24px;font-weight:900;margin:0 0 10px;">Hi ${firstName}! Your student's report is here.</h1>
      <p style="color:rgba(255,255,255,0.75);font-size:15px;margin:0;">Here are their personalized major recommendations with full analysis.</p>
    </div>
    <div style="background:#fff;border-radius:16px;padding:28px;margin-bottom:20px;border:1px solid #e8edf5;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${AMBER};margin-bottom:16px;">AI-Personalized Analysis</div>
      ${reportHtml || "<p style='color:#6b7280;'>Your personalized analysis is included below with your major matches.</p>"}
    </div>
    <div style="background:#fff;border-radius:16px;padding:28px;margin-bottom:20px;border:1px solid #e8edf5;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6b7a99;margin-bottom:20px;">All 5 Major Matches</div>
      ${majorCards || "<p style='color:#6b7280;'>Visit findyourmajor.org to see your full results.</p>"}
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://findyourmajor.org" style="background:${AMBER};color:${NAVY};padding:14px 36px;border-radius:50px;font-size:15px;font-weight:800;text-decoration:none;display:inline-block;">Retake the Quiz →</a>
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
      This report is for informational purposes only and is not professional academic counselling.<br>
      <a href="https://findyourmajor.org" style="color:#6b7a99;">findyourmajor.org</a>
    </p>
  </div>
</body></html>`;
}
