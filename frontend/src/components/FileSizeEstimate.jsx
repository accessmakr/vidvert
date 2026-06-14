/**
 * FileSizeEstimate.jsx
 * GAP 5 — Show estimated video file size before download.
 *
 * Critical for Nigerian/African mobile data users who pay per MB.
 * Cobalt's response includes file metadata when available.
 * We surface it in the preview card so users can decide
 * before tapping "Get Download Link" whether their data can handle it.
 *
 * Also used in the result card after Cobalt responds —
 * Cobalt's stream/redirect response sometimes includes
 * Content-Length in headers which we can surface.
 *
 * Usage: Drop inside the preview card in App.jsx
 * Pass `qualityMeta` from Cobalt response if available.
 */

import { formatBytes } from '../utils/formatBytes';

// Rough size estimates per minute of video at each quality
// Based on typical H.264 encoding at each resolution
const SIZE_PER_MINUTE_MB = {
  '360':  5,   // ~5 MB/min at 360p
  '480':  10,  // ~10 MB/min at 480p
  '720':  20,  // ~20 MB/min at 720p
  '1080': 40,  // ~40 MB/min at 1080p
};

/**
 * Estimate download size from video duration and quality.
 * duration — seconds (from Cobalt/noembed metadata)
 * quality  — '360' | '480' | '720' | '1080'
 */
export function estimateDownloadSize(durationSeconds, quality) {
  if (!durationSeconds || !quality) return null;
  const mbPerMin  = SIZE_PER_MINUTE_MB[quality] ?? 20;
  const totalMB   = (durationSeconds / 60) * mbPerMin;
  return totalMB * 1024 * 1024; // return bytes
}

/**
 * DataWarning — shown when estimated file > 50MB on mobile.
 * Warns mobile data users before they commit to the download.
 */
export function DataWarning({ estimatedBytes }) {
  if (!estimatedBytes || estimatedBytes < 50 * 1024 * 1024) return null;

  return (
    <div className="flex items-start gap-2 bg-yellow-950/40 border border-yellow-800/50 rounded-xl px-3 py-2.5">
      <span className="text-yellow-400 text-sm flex-shrink-0 mt-0.5" aria-hidden="true">⚠</span>
      <p className="text-yellow-300 text-xs">
        This video is approximately <strong>{formatBytes(estimatedBytes)}</strong>.
        Make sure you have enough mobile data before downloading.
      </p>
    </div>
  );
}

/**
 * FileSizeBadge — compact inline badge for the preview card.
 */
export function FileSizeBadge({ estimatedBytes, quality }) {
  if (!estimatedBytes) return null;

  return (
    <span className="inline-flex items-center gap-1 text-zinc-500 text-xs">
      <span aria-hidden="true">📦</span>
      <span>~{formatBytes(estimatedBytes)} at {quality}p</span>
    </span>
  );
}
