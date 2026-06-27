// api/results.js
// GET /api/results?id={sessionId}
// Returns the saved major results for a report deep-link.

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const id      = req.query?.id || "";
  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!id)              return res.status(400).json({ error: "Missing id" });
  if (!kvUrl || !kvToken) return res.status(500).json({ error: "KV not configured" });

  try {
    const r    = await fetch(`${kvUrl}/get/report:${id}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    const data = await r.json();
    if (!data.result) return res.status(404).json({ error: "Results not found or expired" });

    const parsed = JSON.parse(data.result);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("results lookup error:", err);
    return res.status(500).json({ error: "Lookup failed" });
  }
}
