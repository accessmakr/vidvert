/**
 * HeaderTrustBar.jsx
 * GAP 8 — "No malware · No fake buttons · No sign-up" in header.
 *
 * A single line directly under the tagline in the header.
 * Small, always visible, permanent credibility signal.
 * These three statements remain true even when ads are added.
 *
 * Usage: Place inside <header> in App.jsx below the platform badges.
 */

export default function HeaderTrustBar() {
  return (
    <div
      className="flex items-center justify-center gap-3 flex-wrap"
      aria-label="Safety guarantees"
    >
      {[
        '🛡 No malware',
        '✋ No fake buttons',
        '🔓 No sign-up',
        '🗑 Files auto-deleted',
      ].map((item) => (
        <span
          key={item}
          className="text-zinc-600 text-xs font-medium"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
