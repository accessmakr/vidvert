/**
 * ConversionProgress.jsx
 * GAP 9 — Prominent ETA display from first second of conversion.
 *
 * Replaces the small text ETA with a full progress card.
 * Shows: phase label, % complete, time remaining, animated bar.
 * Reduces abandonment — users know exactly how long to wait.
 *
 * Used inside AudioConverter.jsx, VideoConverter.jsx,
 * VideoCompressor.jsx, VideoTrimmer.jsx, GifConverter.jsx.
 *
 * Props:
 *   phase      — 'uploading' | 'converting' | 'done' | 'error'
 *   uploadPct  — 0-100 (only used in uploading phase)
 *   jobState   — { progress, eta, statusText } from converter polling
 *   format     — 'mp3' | 'mp4' | etc. (shown in label)
 */

export default function ConversionProgress({ phase, uploadPct, jobState, format }) {
  if (!phase || phase === 'idle' || phase === 'done' || phase === 'error') return null;

  const isUploading  = phase === 'uploading';
  const isConverting = phase === 'converting';

  const progress = isUploading ? uploadPct : (jobState?.progress || 0);
  const eta      = isConverting ? jobState?.eta : null;

  // ETA display
  const etaLabel = !eta ? '' :
    eta < 60 ? `~${eta}s remaining` :
    `~${Math.ceil(eta / 60)}m remaining`;

  // Phase-specific labels and colours
  const config = isUploading ? {
    label:    'Uploading file…',
    sublabel: 'Sending your file to the conversion server',
    barColor: 'bg-blue-500',
    dotColor: 'bg-blue-400',
  } : {
    label:    jobState?.statusText || 'Converting…',
    sublabel: etaLabel,
    barColor: format === 'gif' ? 'bg-pink-500' :
              format === 'mp4' || format === 'mkv' ? 'bg-green-500' : 'bg-purple-500',
    dotColor: 'bg-purple-400',
  };

  return (
    <div className="w-full flex flex-col gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">

      {/* Top row: label + percentage */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Animated dot */}
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-60`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dotColor}`} />
          </span>
          <span className="text-zinc-200 text-sm font-medium">{config.label}</span>
        </div>
        <span className="text-zinc-300 text-sm font-bold font-mono flex-shrink-0">
          {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${config.label} ${progress}%`}
      >
        <div
          className={`h-3 ${config.barColor} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Sub-label: ETA or upload status */}
      {config.sublabel && (
        <p className="text-zinc-500 text-xs">{config.sublabel}</p>
      )}

      {/* Upload tip */}
      {isUploading && progress < 100 && (
        <p className="text-zinc-700 text-xs">
          Keep this tab open while uploading. Large files may take a minute on slow connections.
        </p>
      )}
    </div>
  );
}
