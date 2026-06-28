// api/save-answers.js
// Saves quiz answers temporarily before Stripe checkout.
// Uses Upstash Redis (connected via Vercel Storage).
// Answers expire after 24 hours automatically.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { answers, results, refCode, studentState, studentName } = req.body || {};
    if (!answers || !results) {
      return res.status(400).json({ error: "Missing answers or results" });
    }

    // Generate a unique session ID
    const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");

    // Store in Upstash Redis via REST API
    const url   = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      console.error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
      // Graceful fallback — still redirect to Stripe, just no personalization
      return res.status(200).json({ sessionId: "no-kv" });
    }

    const payload = JSON.stringify({ answers, results, refCode: refCode || "", studentName: studentName || "", studentState: studentState || "", createdAt: Date.now() });

    // SET key value EX 86400 (24 hours)
    const kvRes = await fetch(`${url}/set/session:${sessionId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: payload, ex: 86400 }),
    });

    if (!kvRes.ok) {
      const err = await kvRes.text().catch(() => "");
      console.error("KV set failed:", err);
      return res.status(200).json({ sessionId: "no-kv" });
    }

    return res.status(200).json({ sessionId });
  } catch (err) {
    console.error("save-answers error:", err);
    // Never block the user — return a fallback session ID
    return res.status(200).json({ sessionId: "no-kv" });
  }
}
