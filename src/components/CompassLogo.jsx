// CompassLogo.jsx — Concept 1: The Compass
// Reusable logo component for FindYourMajor.org

const NAVY  = "#0F1F3D";
const AMBER = "#F5A623";
const WHITE = "#FFFFFF";

export function CompassIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer navy circle */}
      <circle cx="28" cy="28" r="26" fill={NAVY} />
      {/* Inner amber ring */}
      <circle cx="28" cy="28" r="20" fill="none" stroke={AMBER} strokeWidth="1.5" strokeOpacity="0.4"/>
      {/* Compass needle — north (amber) */}
      <path d="M28 12 L31 28 L28 25 L25 28 Z" fill={AMBER}/>
      {/* Compass needle — south (white, dimmed) */}
      <path d="M28 44 L25 28 L28 31 L31 28 Z" fill="rgba(255,255,255,0.45)"/>
      {/* Center dot */}
      <circle cx="28" cy="28" r="3" fill={WHITE}/>
      {/* Cardinal tick marks */}
      <line x1="28" y1="4"  x2="28" y2="8"  stroke={WHITE} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.35"/>
      <line x1="28" y1="48" x2="28" y2="52" stroke={WHITE} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.35"/>
      <line x1="4"  y1="28" x2="8"  y2="28" stroke={WHITE} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.35"/>
      <line x1="48" y1="28" x2="52" y2="28" stroke={WHITE} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.35"/>
    </svg>
  );
}

// Full horizontal lockup: icon + wordmark
export function CompassWordmark({ size = 1, dark = false }) {
  const textColor = dark ? WHITE : NAVY;
  const subColor  = dark ? "rgba(255,255,255,0.5)" : "#6B7A99";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(12 * size) }}>
      <CompassIcon size={Math.round(40 * size)} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: Math.round(22 * size),
          fontWeight: 700,
          color: textColor,
          letterSpacing: "-0.3px",
          lineHeight: 1.1,
        }}>
          Find Your Major<span style={{ color: AMBER }}>.</span>
        </span>
        <span style={{
          fontFamily: "Arial, sans-serif",
          fontSize: Math.round(10 * size),
          color: subColor,
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginTop: 2,
          lineHeight: 1,
        }}>
          AI Major Advisor
        </span>
      </div>
    </div>
  );
}

export default CompassIcon;
