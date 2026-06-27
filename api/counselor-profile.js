// api/counselor-profile.js
// GET  /api/counselor-profile?ref=sarahchen  → returns counselor profile JSON
// POST /api/counselor-profile                → saves a counselor profile
//
// Profile stored in Upstash as:  counselor:{refCode}
// TTL: none (permanent until deleted)

export default async function handler(req, res) {
  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return res.status(500).json({ error: "KV not configured" });
  }

  // ── GET ─────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const ref = req.query?.ref || "";
    if (!ref) return res.status(400).json({ error: "Missing ref param" });

    try {
      const r = await fetch(`${kvUrl}/get/counselor:${ref.toLowerCase()}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const data = await r.json();
      if (!data.result) return res.status(404).json({ error: "Counselor not found" });
      return res.status(200).json(JSON.parse(data.result));
    } catch (err) {
      console.error("counselor-profile GET error:", err);
      return res.status(500).json({ error: "Lookup failed" });
    }
  }

  // ── POST ────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const { refCode, name, school, title, email, logo } = req.body || {};

    if (!refCode || !name) {
      return res.status(400).json({ error: "refCode and name are required" });
    }

    // Sanitize refCode: lowercase, alphanumeric + hyphens only
    const safeRef = refCode.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!safeRef) return res.status(400).json({ error: "Invalid refCode" });

    const profile = {
      refCode: safeRef,
      name:    name.trim(),
      school:  (school || "").trim(),
      title:   (title  || "College Counselor").trim(),
      email:   (email  || "").trim(),
      logo:    (logo   || "").trim(),       // optional URL to school logo
      createdAt: Date.now(),
    };

    try {
      const r = await fetch(`${kvUrl}/set/counselor:${safeRef}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kvToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: JSON.stringify(profile) }),
      });
      if (!r.ok) {
        const err = await r.text().catch(() => "");
        console.error("KV set failed:", err);
        return res.status(500).json({ error: "Failed to save profile" });
      }
      return res.status(200).json({ success: true, profile });
    } catch (err) {
      console.error("counselor-profile POST error:", err);
      return res.status(500).json({ error: "Save failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
