/**
 * QuickConvertBar.jsx
 * GAP 2 — Auto-pass downloaded video to converter with one tap.
 *
 * Appears IMMEDIATELY after a successful download result.
 * Passes the Cobalt stream URL directly into the AudioConverter
 * as sourceUrl so the user never needs to re-upload anything.
 *
 * No competitor does download-then-immediately-convert
 * in one interface without re-uploading.
 *
 * Usage in App.jsx after isStream result:
 *   <QuickConvertBar
 *     videoUrl={result.url}
 *     videoTitle={preview?.title}
 *     onNavigate={(tab) => setActiveTab(tab)}
 *   />
 *
 * The parent App already stores downloadedUrl and downloadedName
 * in state and passes them to AudioConverter as sourceUrl/sourceFilename.
 * This component makes that capability VISIBLE and OBVIOUS.
 */

export default function QuickConvertBar({ videoUrl, videoTitle, onNavigate }) {
  if (!videoUrl) return null;

  const ACTIONS = [
    {
      tab:   'audio',
      icon:  '🎵',
      label: 'Extract Audio',
      desc:  'MP3, M4A, WAV, FLAC…',
      color: 'border-purple-800 hover:border-purple-600 hover:bg-purple-950/40',
      accent:'text-purple-400',
    },
    {
      tab:   'trim',
      icon:  '✂',
      label: 'Trim Video',
      desc:  'Cut any section',
      color: 'border-yellow-800 hover:border-yellow-600 hover:bg-yellow-950/40',
      accent:'text-yellow-400',
    },
    {
      tab:   'compress',
      icon:  '🗜',
      label: 'Compress',
      desc:  'Reduce file size',
      color: 'border-orange-800 hover:border-orange-600 hover:bg-orange-950/40',
      accent:'text-orange-400',
    },
    {
      tab:   'watermark',
      icon:  '🚫',
      label: 'Remove WM',
      desc:  'Clean watermarks',
      color: 'border-red-800 hover:border-red-600 hover:bg-red-950/40',
      accent:'text-red-400',
    },
  ];

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Section label */}
      <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">
        What do you want to do with this video?
      </p>

      {/* 2×2 action grid */}
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map(({ tab, icon, label, desc, color, accent }) => (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            className={`
              flex items-center gap-3 px-3 py-3 rounded-xl border
              bg-zinc-900/60 transition-all text-left
              ${color}
            `}
          >
            <span className={`text-xl flex-shrink-0 ${accent}`} aria-hidden="true">
              {icon}
            </span>
            <div className="overflow-hidden">
              <p className="text-zinc-200 text-xs font-semibold leading-none">{label}</p>
              <p className="text-zinc-600 text-xs mt-0.5 leading-none">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Explainer */}
      <p className="text-zinc-700 text-xs text-center">
        No re-upload needed — your video is passed automatically
      </p>
    </div>
  );
}
