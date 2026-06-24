// ─── Brand tokens ──────────────────────────────────────────────────────────
export const NAVY    = "#0F1F3D";
export const AMBER   = "#F5A623";
export const AMBER_L = "#FEF3DC";
export const SLATE   = "#6B7A99";
export const OFFWHT  = "#F8F9FC";
export const WHITE   = "#FFFFFF";
export const GREEN   = "#22C55E";
export const INDIGO  = "#6366F1";
export const PURPLE  = "#7C3AED";

export const SITE_NAME = "Find Your Major";
export const SITE_URL  = "https://findyourmajor.org";

// ─── Plausible analytics helpers ───────────────────────────────────────────
// Wraps window.plausible so calls are safe even if the script hasn't loaded.
export function track(eventName, props) {
  try {
    if (typeof window !== "undefined" && window.plausible) {
      window.plausible(eventName, { props });
    }
  } catch (_) {}
}

// Convenience events used throughout the app:
export const Analytics = {
  quizStarted:    ()      => track("Quiz Started"),
  quizCompleted:  ()      => track("Quiz Completed"),
  resultsViewed:  ()      => track("Results Viewed"),
  resultsSaved:   ()      => track("Results Saved"),
  resultsShared:  ()      => track("Results Shared"),
  affiliateClick: (id)    => track("Affiliate Click", { partner: id }),
  videoExpanded:  (major) => track("Video Expanded", { major }),
};
