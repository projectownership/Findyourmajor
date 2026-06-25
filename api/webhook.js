// api/webhook.js
// Stripe calls this endpoint automatically whenever a payment is completed.
// We verify the webhook signature (security), look up the student's answers,
// generate a personalized report with Claude AI, and email it via Resend.
//
// SETUP REQUIRED:
// 1. Set STRIPE_WEBHOOK_SECRET in Vercel env vars (get from Stripe Dashboard →
//    Developers → Webhooks → your endpoint → Signing secret)
// 2. Set STRIPE_SECRET_KEY in Vercel env vars (Stripe Dashboard → API keys)
// 3. Set RESEND_API_KEY in Vercel env vars
// 4. Set ANTHROPIC_API_KEY in Vercel env vars (already done)
// 5. Enable Vercel KV storage in your Vercel project (Storage tab)

import Stripe from "stripe";
import { kv } from "@vercel/kv";

export const config = {
  api: { bodyParser: false }, // Required for Stripe webhook signature verification
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    console.error("Missing Stripe environment variables");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

  let event;
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Only process completed checkout sessions
  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;

  try {
    const customerEmail = session.customer_details?.email;
    const customerName  = session.customer_details?.name || "there";
    const sessionId     = session.metadata?.sessionId;

    if (!customerEmail) {
      console.error("No customer email in session");
      return res.status(200).json({ received: true });
    }

    // Retrieve the student's quiz answers from Vercel KV
    let quizData = null;
    if (sessionId) {
      const stored = await kv.get(`session:${sessionId}`);
      if (stored) {
        quizData = typeof stored === "string" ? JSON.parse(stored) : stored;
      }
    }

    // Generate the report and send the email
    await generateAndSendReport({ customerEmail, customerName, quizData });

    // Clean up the stored answers
    if (sessionId) {
      await kv.del(`session:${sessionId}`);
    }

    return res.status(200).json({ received: true, sent: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Return 200 so Stripe doesn't retry — we'll handle errors via logs
    return res.status(200).json({ received: true, error: err.message });
  }
}

// ─── Report generation ────────────────────────────────────────────────────────

async function generateAndSendReport({ customerEmail, customerName, quizData }) {
  const firstName = customerName.split(" ")[0];

  // Generate report content with Claude AI
  const reportContent = await generateReportContent(quizData);

  // Build the HTML email
  const html = buildEmailHTML(firstName, reportContent, quizData);

  // Send via Resend
  await sendEmail({ customerEmail, firstName, html });
}

async function generateReportContent(quizData) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  // Build context from quiz answers and AI results
  let context = "";
  if (quizData?.results) {
    const results = quizData.results;
    context = `The student's top 5 AI-recommended majors are:\n${results.map(r =>
      `${r.rank}. ${r.name} (${r.fitScore}% fit) — ${r.why}\nCareers: ${r.careers?.join(", ")}\nSalary: ${r.salaryRange}`
    ).join("\n\n")}`;
  }

  if (quizData?.answers) {
    const answers = quizData.answers;
    context += `\n\nThe student's quiz answers:\n${Object.entries(answers).map(([id, vals]) =>
      `${id}: ${Array.isArray(vals) ? vals.join(", ") : vals}`
    ).join("\n")}`;
  }

  const prompt = `You are an expert college major advisor writing a personalized Parent Report for a student who just paid $9.99 for a detailed analysis of their college major recommendations.

${context || "No quiz data available — provide general guidance."}

Write a warm, professional, detailed report covering:

1. SUMMARY: A 2-3 sentence personal introduction acknowledging what the student's profile reveals about them.

2. TOP MAJOR DEEP-DIVE: For the #1 recommended major, write 3-4 sentences going deeper than the quiz result — what daily life in this field actually looks like, what kind of person thrives in it, and one thing most students don't know about it.

3. WILDCARD SPOTLIGHT: For any wildcard major in the results, write 2-3 sentences explaining why this surprising choice actually makes sense for this specific student.

4. SCHOOLS TO RESEARCH: For the top 2 majors, suggest 2-3 specific college programs known for quality in that field (budget-friendly options preferred).

5. PARENT TALKING POINTS: 3 specific, thoughtful conversation starters tailored to what this student's answers reveal about their personality and concerns.

6. THIS WEEK'S ACTION: One very specific, free action the student can take in the next 7 days to explore their top major.

Write in a warm, encouraging tone. Address the parent directly. Be specific — reference the actual major names and quiz answers. Keep it under 600 words total.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-fable-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  return (data.content || []).map(b => b.text || "").join("");
}

function buildEmailHTML(firstName, reportContent, quizData) {
  const results = quizData?.results || [];

  const majorCards = results.map(m => `
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;background:#ffffff;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:18px;font-weight:800;color:#0F1F3D;">#${m.rank} — ${m.name}</span>
        <span style="background:${m.fitScore>=85?"#f0fdf4":m.fitScore>=70?"#fef3dc":"#f1f5f9"};color:${m.fitScore>=85?"#166534":m.fitScore>=70?"#d97706":"#6b7a99"};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">${m.fitScore}% fit</span>
      </div>
      ${m.isWildcard ? '<div style="background:#ede9fe;color:#7c3aed;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;display:inline-block;margin-bottom:8px;">✨ WILDCARD</div>' : ""}
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 10px;">${m.why}</p>
      <div style="background:#f8f9fc;border-radius:8px;padding:10px 14px;">
        <span style="font-size:12px;font-weight:700;color:#6b7a99;text-transform:uppercase;letter-spacing:0.5px;">Salary Range</span>
        <span style="font-size:14px;font-weight:600;color:#0F1F3D;margin-left:8px;">${m.salaryRange}</span>
        <span style="font-size:12px;color:#6b7a99;margin-left:16px;">Outlook: ${m.jobOutlook}</span>
      </div>
      <div style="margin-top:10px;">
        <span style="font-size:12px;font-weight:700;color:#6b7a99;text-transform:uppercase;letter-spacing:0.5px;">Careers</span>
        <div style="margin-top:6px;">${(m.careers||[]).map(c => `<span style="background:#0F1F3D15;color:#0F1F3D;font-size:12px;font-weight:600;padding:3px 8px;border-radius:4px;margin-right:6px;margin-bottom:4px;display:inline-block;">${c}</span>`).join("")}</div>
      </div>
      ${m.firstStep ? `<div style="background:#fef3dc;border:1px solid #fde6b8;border-radius:8px;padding:10px 12px;margin-top:12px;"><span style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;">First Step This Week</span><p style="margin:4px 0 0;font-size:13px;color:#78350f;line-height:1.5;">${m.firstStep}</p></div>` : ""}
    </div>
  `).join("");

  // Convert the AI report text into HTML paragraphs
  const reportHTML = reportContent
    .split("\n\n")
    .filter(p => p.trim())
    .map(para => {
      if (para.match(/^\d+\./)) {
        return `<h3 style="font-size:16px;font-weight:800;color:#0F1F3D;margin:20px 0 8px;">${para}</h3>`;
      }
      return `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">${para}</p>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f9fc;font-family:Arial,sans-serif;">

  <!-- Header -->
  <div style="background:#0F1F3D;padding:24px 32px;">
    <div style="max-width:600px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:20px;font-weight:900;color:#ffffff;">Find Your Major<span style="color:#F5A623;">.</span></span>
      <span style="font-size:12px;color:rgba(255,255,255,0.5);">Parent Report</span>
    </div>
  </div>

  <!-- Body -->
  <div style="max-width:600px;margin:0 auto;padding:32px 16px 64px;">

    <!-- Welcome banner -->
    <div style="background:linear-gradient(135deg,#0F1F3D,#1a3a6e);border-radius:16px;padding:32px;color:#ffffff;margin-bottom:24px;text-align:center;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#F5A623;margin-bottom:12px;">Parent Report — Ready</div>
      <h1 style="font-size:26px;font-weight:900;margin:0 0 10px;letter-spacing:-0.5px;">Your student's major matches are here</h1>
      <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0;">Hi ${firstName}, here is the full personalized report for your student — including AI analysis, recommended schools, salary data, and a 90-day action plan.</p>
    </div>

    <!-- AI Personalized Analysis -->
    <div style="background:#ffffff;border-radius:16px;padding:28px;margin-bottom:20px;border:1px solid #e8edf5;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#F5A623;margin-bottom:16px;">AI-Personalized Analysis</div>
      ${reportHTML}
    </div>

    <!-- Major Cards -->
    <div style="background:#ffffff;border-radius:16px;padding:28px;margin-bottom:20px;border:1px solid #e8edf5;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6b7a99;margin-bottom:20px;">All 5 Find Your Majores</div>
      ${majorCards || '<p style="color:#6b7a99;">Take the quiz at findyourmajor.org to see personalized major recommendations.</p>'}
    </div>

    <!-- Salary Research Tip -->
    <div style="background:#fef3dc;border:1px solid #fde6b8;border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:800;color:#92400e;margin-bottom:6px;">💰 Salary Research Tip</div>
      <p style="font-size:13px;color:#78350f;line-height:1.6;margin:0;">Visit <strong>bls.gov/ooh</strong> (Bureau of Labor Statistics) for free, government-verified salary data and job growth projections for every career listed above. Filter by state to see local ranges.</p>
    </div>

    <!-- Conversation starters -->
    <div style="background:#eef2ff;border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:800;color:#4338ca;margin-bottom:12px;">🗣️ Starting the conversation</div>
      <p style="font-size:13px;color:#3730a3;line-height:1.6;margin:0 0 8px;"><strong>Try asking:</strong> "When you saw your #1 match, what was your gut reaction?"</p>
      <p style="font-size:13px;color:#3730a3;line-height:1.6;margin:0 0 8px;">"Is there anything on the list that immediately felt like 'that's not me'?"</p>
      <p style="font-size:13px;color:#3730a3;line-height:1.6;margin:0;">"What would you want to try before committing to a major?"</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://findyourmajor.org" style="background:#F5A623;color:#0F1F3D;padding:14px 36px;border-radius:50px;font-size:15px;font-weight:800;text-decoration:none;display:inline-block;">
        Retake the Quiz →
      </a>
      <p style="font-size:12px;color:#94a3b8;margin-top:12px;">Share findyourmajor.org with other parents — it's completely free for students.</p>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
      <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;">
        This report was generated by AI and is for informational and educational purposes only.
        It is not professional academic or career counselling.<br><br>
        <a href="https://findyourmajor.org" style="color:#6b7a99;">findyourmajor.org</a> |
        <a href="https://findyourmajor.org/privacy" style="color:#6b7a99;">Privacy Policy</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

async function sendEmail({ customerEmail, firstName, html }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("Missing RESEND_API_KEY");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "FindYourMajor.org <reports@findyourmajor.org>",
      to: [customerEmail],
      subject: `Your FindYourMajor Parent Report is ready, ${firstName}!`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${err}`);
  }

  const data = await res.json();
  console.log("Email sent:", data.id);
  return data;
}
