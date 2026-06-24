import { useEffect } from "react";
import { Link } from "react-router-dom";
import { NAVY, AMBER, SLATE, OFFWHT, WHITE } from "../brand.js";

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px", marginBottom: 12, color: NAVY }}>{title}</h2>
      <div style={{ color: "#374151", fontSize: 15, lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}

function P({ children }) { return <p style={{ marginBottom: 12 }}>{children}</p>; }
function UL({ items }) {
  return (
    <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
      {items.map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
    </ul>
  );
}

export default function Terms() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: OFFWHT, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      <nav style={{ background: NAVY, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ fontSize: 18, fontWeight: 900, color: "white", textDecoration: "none", letterSpacing: "-.5px" }}>
          Find Your Major<span style={{ color: AMBER }}>.</span>
        </Link>
        <Link to="/quiz" style={{ background: AMBER, color: NAVY, padding: "8px 20px", borderRadius: 50, fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
          Take the Quiz
        </Link>
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ background: WHITE, borderRadius: 20, padding: "40px 36px", boxShadow: "0 2px 16px rgba(15,31,61,.07)", border: "1px solid #E8EDF5" }}>

          <h1 style={{ fontSize: "clamp(26px,5vw,36px)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 8 }}>Terms of Service</h1>
          <p style={{ color: SLATE, fontSize: 14, marginBottom: 40 }}>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          <Section title="1. Acceptance of terms">
            <P>By accessing or using FindYourMajor.org ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</P>
            <P>These terms apply to all visitors, users, and others who access or use the Service. "We", "us", or "our" refers to the operators of FindYourMajor.org.</P>
          </Section>

          <Section title="2. Description of service">
            <P>FindYourMajor.org provides an AI-powered college major recommendation quiz. The Service uses artificial intelligence to suggest college majors based on answers provided by the user.</P>
            <P>The Service is provided free of charge. We reserve the right to modify, suspend, or discontinue the Service at any time without notice.</P>
          </Section>

          <Section title="3. Educational purpose — not professional advice">
            <P><strong>Important: The recommendations provided by FindYourMajor.org are for informational and educational purposes only.</strong></P>
            <P>Our AI-generated major recommendations are not:</P>
            <UL items={[
              "Professional academic counseling or advising",
              "Career counseling or vocational guidance",
              "A guarantee of admission to any program or institution",
              "A substitute for speaking with a qualified academic advisor, college counselor, or career professional",
            ]} />
            <P>We strongly encourage users to use our recommendations as a starting point for exploration, and to consult with qualified advisors before making any major academic or career decisions.</P>
            <P>Salary ranges, job outlook data, and career path information provided in results are estimates based on general market data and may not reflect current conditions in your region or field.</P>
          </Section>

          <Section title="4. User conduct">
            <P>You agree to use the Service only for lawful purposes. You may not:</P>
            <UL items={[
              "Attempt to reverse engineer, scrape, or extract data from the Service at scale",
              "Use automated tools to submit quiz answers in bulk",
              "Attempt to circumvent, disable, or interfere with any security features",
              "Use the Service to generate content for spam, misleading advertising, or harmful purposes",
              "Misrepresent the Service or claim affiliation with us without permission",
            ]} />
          </Section>

          <Section title="5. Intellectual property">
            <P>The Service, including its design, code, copy, and AI-generated results displayed to users, is owned by FindYourMajor.org or its licensors. You may not copy, reproduce, distribute, or create derivative works from the Service without our express written permission.</P>
            <P>You are permitted to share your personal results (e.g., screenshot, copy-paste for personal use) for non-commercial purposes.</P>
          </Section>

          <Section title="6. Third-party links and affiliate relationships">
            <P>The Service contains links to third-party websites and services. Some of these are affiliate links — we may earn a commission if you click and make a purchase, at no additional cost to you.</P>
            <P>We are not responsible for the content, privacy practices, or terms of any third-party websites. Linking to a third party does not imply our endorsement.</P>
            <P>Your interactions with third-party services are governed by those services' own terms and privacy policies.</P>
          </Section>

          <Section title="7. AI-generated content disclaimer">
            <P>Major recommendations are generated by an AI language model (Claude, by Anthropic). AI outputs can occasionally be inaccurate, outdated, or not applicable to your specific situation.</P>
            <P>We make no warranty, express or implied, that any AI-generated recommendation is accurate, complete, suitable for your specific circumstances, or that the described career outcomes will be achieved.</P>
          </Section>

          <Section title="8. Limitation of liability">
            <P>To the fullest extent permitted by applicable law, FindYourMajor.org and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or reliance on the Service, including but not limited to:</P>
            <UL items={[
              "Academic or career decisions made based on our recommendations",
              "Loss of data",
              "Errors or inaccuracies in AI-generated content",
              "Interruptions or unavailability of the Service",
            ]} />
            <P>Our total liability to you for any claim shall not exceed $0, as the Service is provided free of charge.</P>
          </Section>

          <Section title="9. Indemnification">
            <P>You agree to defend, indemnify, and hold harmless FindYourMajor.org and its operators from any claims, damages, liabilities, costs, and expenses arising from your violation of these Terms or your use of the Service.</P>
          </Section>

          <Section title="10. Modifications to terms">
            <P>We reserve the right to modify these Terms at any time. Changes take effect when posted to this page. Continued use of the Service after changes are posted constitutes acceptance of the revised Terms.</P>
          </Section>

          <Section title="11. Governing law">
            <P>These Terms shall be governed by the laws of the State of North Carolina, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of North Carolina.</P>
          </Section>

          <Section title="12. Contact">
            <P>Questions about these Terms:</P>
            <P><strong>Email:</strong> legal@findyourmajor.org<br />
            <strong>Website:</strong> https://findyourmajor.org</P>
          </Section>

        </div>
      </div>

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
