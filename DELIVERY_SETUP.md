# Automated Report Delivery — Setup Guide

Follow these steps ONCE to activate automated email delivery of the
Parent Report after every $9.99 Stripe payment.

---

## Step 1 — Add environment variables to Vercel

Go to vercel.com → your findyourmajor project → Settings → Environment Variables

Add these 4 new variables (in addition to ANTHROPIC_API_KEY which is already there):

| Name | Value | Where to get it |
|---|---|---|
| RESEND_API_KEY | re_Q9jJGbcz_D4tVo3KZfzYeQvvE747KC2Qh | Already have it |
| STRIPE_SECRET_KEY | sk_live_... | Stripe Dashboard → API keys → Secret key |
| STRIPE_WEBHOOK_SECRET | whsec_... | Step 3 below |

---

## Step 2 — Enable Vercel KV Storage

Vercel KV temporarily stores student quiz answers between quiz completion
and payment (max 24 hours, then auto-deleted).

1. Go to vercel.com → your project → Storage tab
2. Click "Create Database"
3. Select "KV" (Key-Value)
4. Name it "findyourmajor-kv"
5. Click "Create and Continue"
6. Click "Connect to Project" → select findyourmajor → Connect

Vercel automatically adds the KV connection variables to your project.

---

## Step 3 — Set up the Stripe Webhook

This tells Stripe to notify your server whenever a payment completes.

1. Go to dashboard.stripe.com
2. Click "Developers" in the top right
3. Click "Webhooks" in the left sidebar
4. Click "Add endpoint"
5. Endpoint URL: https://findyourmajor.org/api/webhook
6. Select events: check "checkout.session.completed"
7. Click "Add endpoint"
8. On the next page, click "Reveal" next to "Signing secret"
9. Copy that value (starts with whsec_)
10. Go back to Vercel → Environment Variables and add:
    Name: STRIPE_WEBHOOK_SECRET
    Value: whsec_... (what you just copied)

---

## Step 4 — Add your Stripe Secret Key to Vercel

1. Go to dashboard.stripe.com → Developers → API keys
2. Click "Reveal live key" next to Secret key
3. Copy it (starts with sk_live_)
4. Go to Vercel → Environment Variables and add:
    Name: STRIPE_SECRET_KEY
    Value: sk_live_... (what you just copied)

---

## Step 5 — Verify domain in Resend

So emails arrive from reports@findyourmajor.org instead of a generic address:

1. Go to resend.com → Domains → Add Domain
2. Enter: findyourmajor.org
3. Resend shows you DNS records to add in Namecheap
4. Add them in Namecheap → Advanced DNS (same way you added Vercel records)
5. Wait 5-30 minutes for verification

---

## Step 6 — Redeploy

After adding all environment variables:
1. Go to Vercel → Deployments
2. Click the "..." on the latest deployment
3. Click "Redeploy"

OR push any small change through GitHub Desktop (easiest).

---

## Step 7 — Test the full flow

1. Go to findyourmajor.org and take the quiz
2. Click "Get the Full Report — $9.99"
3. Complete the Stripe checkout
4. Within 60 seconds you should receive a beautiful HTML email
   at the address you used to pay

Check Vercel → Logs → Functions → api/webhook if anything goes wrong.
Check resend.com → Emails for delivery status.

---

## How it works end-to-end

Student completes quiz
  → Clicks "Get the Full Report"
  → Quiz answers saved to Vercel KV (24hr expiry)
  → Student redirected to Stripe checkout
  → Student pays $9.99
  → Stripe sends webhook to /api/webhook
  → Webhook looks up quiz answers from KV
  → Claude Fable 5 generates personalized report
  → Resend sends beautiful HTML email to customer
  → Quiz answers deleted from KV
  → Customer has report within 60 seconds
