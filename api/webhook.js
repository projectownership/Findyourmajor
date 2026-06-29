// api/webhook.js
// Stripe webhook — validates payment, then calls generate-report synchronously.

import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify Stripe signature
  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig     = req.headers["stripe-signature"];
    const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe signature error:", err.message);
    return res.status(400).json({ error: err.message });
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;

  // Call generate-report and await it — this function has a 300s timeout
  // The webhook has a 30s timeout so we need generate-report to respond quickly
  try {
    const resp = await fetch("https://www.findyourmajor.org/api/generate-report", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId:     session.client_reference_id || session.metadata?.sessionId || "",
        customerEmail: session.customer_details?.email || "",
        customerName:  session.customer_details?.name  || "there",
        stripeEventId: session.id || "",
      }),
    });
    console.log("generate-report response status:", resp.status);
  } catch (err) {
    console.error("generate-report call failed:", err.message);
  }

  return res.status(200).json({ received: true });
}
