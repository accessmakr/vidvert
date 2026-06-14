/**
 * TrustStrip.jsx
 * GAP 3 — Privacy trust strip.
 *
 * Sits between StatusTicker and the tab grid.
 * Permanently visible on all tabs.
 * Addresses the #1 reason users hesitate to upload files to online tools.
 *
 * Statements are permanently true regardless of ads being added later:
 *   - No malware
 *   - No fake buttons
 *   - No sign-up
 *   - Files auto-deleted (backed by scheduleCleanup in server.js)
 */

const TRUST_ITEMS = [
  { icon: '🛡', label: 'No malware'           },
  { icon: '✋', label: 'No fake buttons'       },
  { icon: '🔒', label: 'No sign-up needed'     },
  { icon: '🗑', label: 'Files deleted in 10min' },
  { icon: '👁', label: 'No data stored'        },
];

export default function TrustStrip() {
  return (
    <div
      className="w-full bg-zinc-900/60 border-y border-zinc-800/60 py-2 px-4 overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
      aria-label="Privacy and safety guarantees"
    >
      <div className="flex items-center justify-start gap-5 min-w-max mx-auto">
        {TRUST_ITEMS.map(({ icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-zinc-500 whitespace-nowrap"
          >
            <span className="text-sm" aria-hidden="true">{icon}</span>
            <span className="text-xs font-medium">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
