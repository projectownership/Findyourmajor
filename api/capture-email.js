// api/capture-email.js
// Stores student email captures for follow-up marketing.
// Called silently after quiz completion, before results are shown.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, studentName, refCode } = req.body || {};
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Invalid email" });

  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) return res.status(200).json({ ok: true }); // fail silently

  try {
    const key     = `lead:${email.toLowerCase().replace(/[^a-z0-9@._-]/g, "")}`;
    const payload = JSON.stringify({
      email:       email.toLowerCase().trim(),
      studentName: studentName || "",
      refCode:     refCode || "",
      capturedAt:  Date.now(),
      converted:   false, // set to true when they purchase
    });

    // Store with 90-day TTL
    await fetch(`${kvUrl}/set/${key}`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ value: payload, ex: 60 * 60 * 24 * 90 }),
    });

    // Also add to a leads index so we can list all leads later
    await fetch(`${kvUrl}/lpush/leads:index`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ value: email.toLowerCase().trim() }),
    });

    console.log("Email captured:", email, "| student:", studentName || "unnamed", "| ref:", refCode || "none");
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Email capture error:", err);
    return res.status(200).json({ ok: true }); // always succeed silently
  }
}
