// /api/recommend.js
// Vercel serverless function. Receives quiz answers from the frontend,
// calls the Anthropic API (using a SECRET key stored as an env var),
// and returns 5 personalized major recommendations as JSON.
//
// The API key NEVER reaches the browser — it lives only on the server.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing ANTHROPIC_API_KEY. Set it in your Vercel project settings.",
    });
  }

  try {
    const { answers } = req.body || {};

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Missing or invalid 'answers' in request body." });
    }

    // Turn the answers into a readable summary for the model.
    const summary = (answers || [])
      .map((a) => `${a.question}\nAnswers: ${(a.answers || []).join(", ") || "(none selected)"}`)
      .join("\n\n");

    // Format dealbreakers as a clear exclusion list for the prompt.
    const { dealbreakers = [] } = req.body || {};
    const dealbreakersText = dealbreakers.length > 0
      ? dealbreakers.flatMap(d => (d.answers || []).map(a => `- ${a}`)).join("\n")
      : "(none specified)";

    const prompt = `You are an expert college major advisor with deep knowledge of the full landscape of college majors — not just the popular ones, but specialized and emerging fields too (e.g. linguistics, supply chain management, kinesiology, game design, public health, cognitive science, materials science, urban planning, actuarial science, human-computer interaction, and many more).

A student completed a quiz. Here are their answers:

${summary}

DEALBREAKERS — things this student has said would make a career feel wrong for them:
${dealbreakersText}

Before recommending, reason carefully about the WHOLE profile, not each answer in isolation:
- Look for the intersections. A student who picked both "making art" and "solving puzzles" is a different person than one who picked either alone — the combination might point to game design, architecture, or HCI rather than fine art or pure math.
- Notice tensions and what they reveal. Someone who values both "high earning potential" and "making a difference" needs majors that genuinely deliver both, not a compromise on either.
- Weigh what they did NOT select. Skipped options are signal too.
- Consider the world problem they chose as a window into what motivates them long-term, not just a topic interest.
- TAKE DEALBREAKERS SERIOUSLY. If a student says they hate sitting at a desk, do not recommend a job that is 100% desk-bound. If they hate hospitals, do not recommend Nursing or Pre-Med even if other signals point there. Dealbreakers are hard constraints, not soft preferences. A major that conflicts with a dealbreaker should be deprioritized or excluded entirely — mention the dealbreaker in the "why" if it helped you rule something out and redirect them toward something better.

Recommend exactly 5 college majors personalized to this specific profile. Aim for genuinely helpful breadth that still helps the student narrow down:

- The first 3 should be strong, well-grounded matches for their answers that do NOT conflict with their dealbreakers.
- At least 1 (ideally 2) of the 5 must be a WILDCARD: a less-obvious major the student probably hasn't considered but that genuinely fits the intersection of their answers AND avoids their dealbreakers. The best wildcards make the student think "I didn't know that was a major, but that's so me." Mark these with "isWildcard": true.
- Draw from a WIDE variety of fields across results — don't cluster everything in one area unless their answers truly point only one direction.
- Each "why" must reference their actual answer combinations, not generic praise. Show them you saw THEM.

Respond with ONLY a raw JSON array and nothing else — no markdown, no code fences, no commentary before or after.

Use this exact structure for each of the 5 objects:
{
  "rank": 1,
  "name": "Major Name",
  "fitScore": 92,
  "isWildcard": false,
  "why": "2-3 sentences explaining, in a warm and specific way, why this major fits THIS student based on the intersection of their actual answers and avoids their dealbreakers. For wildcards, briefly note why it might surprise them.",
  "firstStep": "One concrete, doable action the student can take this week to explore this major (e.g. a specific type of video to watch, a free intro course topic, a person to talk to, a project to try).",
  "salaryRange": "$60k-$110k",
  "jobOutlook": "Strong",
  "careers": ["Career 1", "Career 2", "Career 3", "Career 4"],
  "videoQueries": ["studying [major] college overview", "what do [major] majors actually do", "[major] degree careers and salary"],
  "aiImpact": {
    "level": "accelerates",
    "summary": "One honest, specific sentence about how AI is affecting this major right now. Choose level: accelerates (AI makes graduates more valuable — they use AI as a tool), changing (AI is reshaping the field but human judgment remains essential), or automating (AI is handling routine tasks, shrinking some roles but specialist demand remains). Be specific — name what exactly is changing, not just that change is happening."
  }
}

Rules:
- fitScore is a number between 60 and 99 (rank 1 highest).
- Set "isWildcard": true on the 1-2 surprising picks, false on the rest.
- "firstStep" must be specific and achievable within a week with no money — not "research the field."
- Never recommend a major that directly conflicts with a stated dealbreaker unless there is truly no alternative and you explain why.
- Use straight double quotes only. No trailing commas.
- Return all 5 objects in a single JSON array.
- Your entire response must start with [ and end with ].
- aiImpact.level must be exactly one of: "accelerates", "changing", or "automating".
- aiImpact.summary must be a single sentence — specific and honest, not generic.`;

    // Call the Anthropic Messages API
    // Model: Claude Fable 5 — Anthropic's most intelligent generally available
    // model. Produces deeper, more nuanced personalization than smaller models.
    // To control costs you can set MODEL env var to a cheaper model
    // (e.g. "claude-sonnet-4-6") without changing code.
    const model = process.env.MODEL || "claude-sonnet-4-6";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "");
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return res.status(502).json({ error: "Upstream AI request failed.", detail: errText });
    }

    const data = await anthropicRes.json();
    const text = (data.content || []).map((b) => b.text || "").join("");

    const results = parseResults(text);

    if (!results || results.length === 0) {
      return res.status(502).json({ error: "Could not parse AI response.", raw: text.slice(0, 300) });
    }

    return res.status(200).json({ results });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error.", detail: String(err) });
  }
}

// ─── Robust JSON parsing (handles fences, stray prose, trailing commas) ─────────

function parseResults(raw) {
  if (raw == null) return null;
  let text = typeof raw === "string" ? raw : JSON.stringify(raw);
  text = text.replace(/```(?:json)?/gi, "").trim();

  // Attempt 1: direct parse
  try {
    const direct = JSON.parse(text);
    if (Array.isArray(direct) && direct.length) return normalize(direct);
    if (direct && Array.isArray(direct.majors)) return normalize(direct.majors);
  } catch {}

  // Attempt 2: extract the first [...] block
  const s = text.indexOf("[");
  const e = text.lastIndexOf("]");
  if (s !== -1 && e !== -1 && e > s) {
    let slice = text.slice(s, e + 1);
    try {
      const arr = JSON.parse(slice);
      if (Array.isArray(arr) && arr.length) return normalize(arr);
    } catch {
      // Attempt 3: clean common glitches
      try {
        slice = slice
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/,\s*([\]}])/g, "$1");
        const arr = JSON.parse(slice);
        if (Array.isArray(arr) && arr.length) return normalize(arr);
      } catch {}
    }
  }
  return null;
}

function normalize(arr) {
  return arr.slice(0, 5).map((m, i) => ({
    rank: Number(m.rank) || i + 1,
    name: m.name || m.major || "Recommended Major",
    fitScore: Number(m.fitScore) || Number(m.fit) || 80,
    isWildcard: m.isWildcard === true,
    why: m.why || m.reason || m.description || "A strong match for your interests and strengths.",
    firstStep: m.firstStep || null,
    salaryRange: m.salaryRange || m.salary || "Varies",
    jobOutlook: m.jobOutlook || m.outlook || "Stable",
    careers: Array.isArray(m.careers) ? m.careers : Array.isArray(m.jobs) ? m.jobs : [],
    videoQueries: Array.isArray(m.videoQueries) ? m.videoQueries : undefined,
    aiImpact: {
      level:   ["accelerates","changing","automating"].includes(m.aiImpact?.level?.toLowerCase()) ? m.aiImpact.level.toLowerCase() : "changing",
      summary: m.aiImpact?.summary || "",
    },
  }));
}
