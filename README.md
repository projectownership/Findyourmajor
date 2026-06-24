# FindYourMajor.org — Complete Commercial Deployment Guide 

An AI-powered college major advisor. Free for users worldwide. Built on
React + Vite (frontend), Vercel serverless functions (backend), and Claude AI
(Anthropic). Includes Privacy Policy, Terms of Service, affiliate partner
integration, and Plausible Analytics.

\---

## Project structure

```
findyourmajor/
├── api/
│   └── recommend.js         ← Serverless backend — calls Claude, returns results
├── src/
│   ├── App.jsx              ← Router (/, /quiz, /privacy, /terms)
│   ├── brand.js             ← Colors, site constants, analytics helpers
│   ├── main.jsx             ← React entry point
│   └── pages/
│       ├── Landing.jsx      ← Marketing landing page (/)
│       ├── Quiz.jsx         ← Full quiz + results (/quiz)
│       ├── Privacy.jsx      ← Privacy Policy (/privacy)
│       └── Terms.jsx        ← Terms of Service (/terms)
├── public/
│   └── favicon.svg
├── index.html               ← SEO meta tags + Plausible script
├── package.json
├── vite.config.js
├── vercel.json              ← SPA rewrites + function config
├── .env.example
└── .gitignore
```

\---

## PART 1 — Before you deploy: what you need

### A. Anthropic API key

1. Go to https://console.anthropic.com and sign in (or create an account).
2. Add credit under Billing (a few dollars covers thousands of quiz completions).
3. Go to API Keys → Create Key. Name it "findyourmajor-prod". Copy the key.
4. Keep it private. It starts with `sk-ant-...`.

### B. Vercel account

Free at https://vercel.com. Sign up with GitHub.

### C. GitHub account

Free at https://github.com. You'll push the code here so Vercel can deploy it.

### D. Plausible Analytics account (optional but recommended)

$9/month at https://plausible.io. Privacy-friendly, GDPR-compliant.

* Sign up and add `findyourmajor.org` as your site.
* The tracking script is already in index.html — no code changes needed.
* You can skip this and just delete the Plausible script tag in index.html
if you don't want analytics.

\---

## PART 2 — Deploy to Vercel

### Step 1: Put the code on GitHub

Option A — GitHub website (easiest):

1. Go to github.com → New repository → name it `findyourmajor` → Create.
2. Click "Add file → Upload files".
3. Drag the entire `findyourmajor/` folder contents in (not the folder itself —
the files inside it). Make sure .env.local is NOT uploaded.
4. Commit changes.

Option B — Command line:

```bash
cd findyourmajor
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/findyourmajor.git
git push -u origin main
```

### Step 2: Import into Vercel

1. Go to https://vercel.com → Add New → Project.
2. Select your `findyourmajor` repository → Import.
3. Vercel auto-detects Vite. Leave all build settings as-is.
4. Before clicking Deploy, expand Environment Variables and add:

   * Name:  ANTHROPIC\_API\_KEY
   * Value: your real sk-ant-... key
   * Apply to: Production, Preview, Development (all three)
5. Click Deploy.

After \~60 seconds you get a live URL like `https://findyourmajor.vercel.app`.

### Step 3: Connect your custom domain (findyourmajor.org)

1. In Vercel, go to your project → Settings → Domains.
2. Click "Add Domain" → type `findyourmajor.org` → Add.
3. Also add `www.findyourmajor.org` (Vercel will auto-redirect www → root).
4. Vercel shows you DNS records to add. Log into your domain registrar
(wherever you bought findyourmajor.org) and add:

   * Type: A  |  Name: @  |  Value: 76.76.21.21
   * Type: CNAME  |  Name: www  |  Value: cname.vercel-dns.com
5. DNS changes take 5–60 minutes to propagate. Once they do, your site is
live at https://findyourmajor.org with a free SSL certificate.

\---

## PART 3 — Set up Plausible Analytics

1. Sign up at https://plausible.io/register (free 30-day trial, then $9/mo).
2. Add site → enter `findyourmajor.org`.
3. The script is already in index.html:
`<script defer data-domain="findyourmajor.org" src="https://plausible.io/js/script.js"></script>`
No additional code changes needed.
4. Custom events that fire automatically:

   * Quiz Started
   * Quiz Completed
   * Results Viewed
   * Results Saved
   * Results Shared
   * Affiliate Click (with partner name)
   * Video Expanded (with major name)
All visible in your Plausible dashboard under Goals → Custom Events.
5. To enable custom events in Plausible: Dashboard → Goals → Add Goal →
Custom Event → type the event name exactly as listed above.

\---

## PART 4 — Set up affiliate links

Once you're approved by affiliate programs, update the PARTNERS array in
`src/pages/Quiz.jsx`. Find this near the top of that file:

```js
const PARTNERS = \\\\\\\[
  {
    id: "personality",
    url: "https://www.16personalities.com", // TODO: replace with tracking link
    ...
  },
  ...
];
```

Replace each `url` with your approved affiliate tracking link.

**Recommended affiliate programs to apply for:**

* 16Personalities — check their website footer for partner info
* Truity (typefinder.com) — has run an affiliate program
* Coursera — apply at coursera.org/affiliate
* Udemy — apply at udemy.com/affiliate
* Skillshare — via Impact network

When approved, you'll get a link like:
`https://www.coursera.org?ranMID=40328\\\\\\\&ranEAID=YOUR\\\\\\\_ID\\\\\\\&ranSiteID=YOUR\\\\\\\_SITE`

Paste that as the `url` value, push to GitHub, and Vercel redeploys automatically.

**For B2B licensing to schools / guidance counselors:**
Email schools@findyourmajor.org (set this up in your email provider).
Pitch: white-labeled version for their students, $X/year per school.
The landing page and quiz are already professional enough to pitch directly.

\---

## PART 5 — Legal checklist

Before launching publicly, confirm:

* \[ ] Privacy Policy is live at https://findyourmajor.org/privacy ✓ (already built)
* \[ ] Terms of Service is live at https://findyourmajor.org/terms ✓ (already built)
* \[ ] Affiliate disclosure appears on the results page ✓ (already built)
* \[ ] FTC disclosure: update the Privacy Policy contact email from
privacy@findyourmajor.org to a real email you check
* \[ ] Update Terms of Service contact email: legal@findyourmajor.org
* \[ ] Set up email forwarding for privacy@ and legal@ at your domain registrar
or use a service like ImprovMX (free) to forward to your personal email
* \[ ] OPTIONAL: Register as a business entity (LLC) in your state if you
plan to monetize. Consult a lawyer for specifics.

\---

## PART 6 — Ongoing maintenance

**Updating the app:**
Push any change to your GitHub `main` branch → Vercel auto-redeploys.

**Monitoring costs:**

* Vercel hosting: free on the Hobby plan (generous limits)
* Anthropic API: the app uses **Claude Fable 5** (model string `claude-fable-5`),
Anthropic's most intelligent generally available model, for the deepest
personalization. Fable costs more per call than smaller models. If costs
grow with traffic, you can switch to a cheaper model WITHOUT a code change:
in Vercel → Settings → Environment Variables, add `MODEL` with a value like
`claude-sonnet-4-6` and redeploy. Set a spend limit at console.anthropic.com.
* Plausible: $9/month flat

**Monitoring performance:**

* Vercel dashboard → Functions → api/recommend → shows invocation count,
error rate, and latency
* Plausible dashboard → shows daily users, completion rate, affiliate clicks

\---

## PART 7 — Quick-reference commands

```bash
# Install dependencies
npm install

# Run locally (frontend only — AI fallback to local scoring)
npm run dev

# Run locally with real AI (requires Vercel CLI)
npm install -g vercel
vercel dev

# Build for production
npm run build
```

\---

## Support

Questions about deployment: open an issue on GitHub or email the address
in your Terms of Service. Good luck — this is a product worth building.

