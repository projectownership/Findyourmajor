import { useEffect } from "react";
import { Link } from "react-router-dom";
import { NAVY, AMBER, SLATE, OFFWHT, WHITE } from "../brand.js";

function Section({ title, children, id }) {
  return (
    <section id={id} style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px", marginBottom: 12, color: NAVY }}>{title}</h2>
      <div style={{ color: "#374151", fontSize: 15, lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}

function P({ children }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>;
}

function UL({ items }) {
  return (
    <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
      {items.map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
    </ul>
  );
}

export default function Privacy() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: OFFWHT, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Nav */}
      <nav style={{ background: NAVY, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ fontSize: 18, fontWeight: 900, color: "white", textDecoration: "none", letterSpacing: "-.5px" }}>
          Find Your Major<span style={{ color: AMBER }}>.</span>
        </Link>
        <Link to="/quiz" style={{ background: AMBER, color: NAVY, padding: "8px 20px", borderRadius: 50, fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
          Take the Quiz
        </Link>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ background: WHITE, borderRadius: 20, padding: "40px 36px", boxShadow: "0 2px 16px rgba(15,31,61,.07)", border: "1px solid #E8EDF5" }}>

          <h1 style={{ fontSize: "clamp(26px,5vw,36px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ color: SLATE, fontSize: 14, marginBottom: 40 }}>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          <Section title="1. Who we are">
            <P>FindYourMajor.org ("we", "our", or "us") operates the website at https://findyourmajor.org, an AI-powered college major advisor tool. We are committed to protecting your privacy and being transparent about how our service works.</P>
            <P>If you have questions about this policy, contact us at: <strong>privacy@findyourmajor.org</strong></P>
          </Section>

          <Section title="2. What data we collect">
            <P><strong>We collect as little data as possible.</strong> Here is exactly what we do and do not collect:</P>
            <P><strong>We do NOT collect:</strong></P>
            <UL items={[
              "Your name, email address, or any personal identifying information",
              "Your quiz answers — these are sent directly to our AI provider and are not stored on our servers",
              "Account information (there are no accounts)",
              "Payment information",
            ]} />
            <P><strong>We DO collect, via Plausible Analytics:</strong></P>
            <UL items={[
              "Anonymous page views and visit counts",
              "Approximate country-level location (not city, not IP address)",
              "Referring website (how you found us)",
              "Basic browser/device type",
              "Custom events: quiz started, quiz completed, results viewed, affiliate link clicked",
            ]} />
            <P>Plausible Analytics is a privacy-first analytics tool that does not use cookies, does not track individuals across sites, and is fully GDPR, CCPA, and PECR compliant. No personal data ever reaches Plausible. You can review their privacy policy at plausible.io/privacy.</P>
            <P><strong>We also collect, stored only in your own browser (localStorage):</strong></P>
            <UL items={[
              "Your saved quiz results, if you choose to save them — this data never leaves your device",
            ]} />
          </Section>

          <Section title="3. How we use your information">
            <P>The anonymous analytics data we collect is used solely to:</P>
            <UL items={[
              "Understand how many people use the service and which features are most valuable",
              "Improve the quiz, results, and user experience",
              "Report aggregate usage to affiliate partners (e.g. '500 clicks to partner X this month' — never individual user data)",
            ]} />
            <P>We do not sell, rent, or share your data with any third party for marketing purposes.</P>
          </Section>

          <Section title="4. AI processing of quiz answers">
            <P>When you complete the quiz and tap "Get My Results," your answers are sent to Anthropic, PBC (the maker of Claude AI) via their secure API. Anthropic processes your answers to generate your major recommendations.</P>
            <P>Your quiz answers are not stored by FindYourMajor.org. Anthropic may retain API inputs per their own data retention policy, available at anthropic.com/privacy. Anthropic does not receive any personally identifying information from us — only your anonymized quiz responses.</P>
          </Section>

          <Section title="5. Affiliate links" id="affiliates">
            <P>Some links on our results page are affiliate links. This means if you click a link and sign up for or purchase a product, we may receive a small commission at no extra cost to you.</P>
            <P>We only include affiliate links for tools we genuinely believe are helpful for students. Affiliate relationships do not influence our AI recommendations — the major recommendations are generated independently.</P>
            <P>All affiliate links are clearly disclosed near the point of placement, and outbound affiliate links use <code>rel="sponsored"</code> per Google's guidelines.</P>
          </Section>

          <Section title="6. Children's privacy (COPPA)">
            <P>FindYourMajor.org is intended for use by high school and college-age students (generally 13 and older). We do not knowingly collect personal information from children under 13.</P>
            <P>Because we do not collect any personal information from any users (regardless of age), we do not have a separate process for children's data. Our anonymous analytics system does not collect personally identifying information from anyone.</P>
            <P>If you are a parent and believe your child under 13 has somehow submitted personal information to us, please contact us at privacy@findyourmajor.org and we will promptly address the issue.</P>
          </Section>

          <Section title="7. Your rights (GDPR / CCPA)">
            <P>Since we do not collect personal data, most data rights (access, deletion, portability) do not apply in the traditional sense. However:</P>
            <UL items={[
              "EU residents: You have the right to object to any processing we do. Contact privacy@findyourmajor.org.",
              "California residents: We do not sell personal information as defined by CCPA.",
              "Anyone: You can clear your locally-saved results at any time by clearing your browser's localStorage or site data.",
            ]} />
          </Section>

          <Section title="8. Cookies">
            <P>We do not use cookies. Plausible Analytics operates without cookies. We do not use advertising cookies, tracking pixels, or any third-party cookie-based analytics.</P>
          </Section>

          <Section title="9. Data security">
            <P>All connections to FindYourMajor.org are encrypted via HTTPS/TLS. API calls to Anthropic are made server-side (not from your browser), so your API interactions are never exposed to your network.</P>
          </Section>

          <Section title="10. Changes to this policy">
            <P>We may update this policy periodically. When we do, we will update the "last updated" date at the top of this page. Continued use of the service after a policy update constitutes acceptance of the new policy.</P>
          </Section>

          <Section title="11. Contact us">
            <P>Questions, concerns, or requests related to this privacy policy:</P>
            <P><strong>Email:</strong> privacy@findyourmajor.org<br />
            <strong>Website:</strong> https://findyourmajor.org</P>
          </Section>

        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: NAVY, color: "rgba(255,255,255,.5)", padding: "24px", textAlign: "center", fontSize: 13 }}>
        <Link to="/" style={{ color: "white", textDecoration: "none", fontWeight: 700 }}>FindYourMajor.org</Link>
        {" · "}
        <Link to="/privacy" style={{ color: "rgba(255,255,255,.6)", textDecoration: "none" }}>Privacy</Link>
        {" · "}
        <Link to="/terms" style={{ color: "rgba(255,255,255,.6)", textDecoration: "none" }}>Terms</Link>
      </footer>
    </div>
  );
}
