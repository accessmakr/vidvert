/**
 * useDataSaver.js
 * GAP 6 — Data-saver mode hook.
 *
 * Persists to localStorage. When enabled:
 *   - Preview thumbnails are NOT fetched (saves ~100-300KB per paste)
 *   - Animated pulse skeletons are replaced with static placeholders
 *   - No auto-preview on URL paste — user must manually tap "Preview"
 *
 * Critical for Nigerian / West African market where
 * median mobile download speed dropped 28.6% in 2025.
 * Many users are on prepaid data plans.
 *
 * Usage:
 *   const { dataSaver, toggleDataSaver } = useDataSaver();
 *   // In App.jsx useEffect for preview:
 *   if (!dataSaver) { fetchPreview(url); }
 */

import { useState, useEffect } from 'react';

const KEY = 'vidvert_data_saver';

export function useDataSaver() {
  const [dataSaver, setDataSaver] = useState(() => {
    try { return localStorage.getItem(KEY) === 'true'; } catch { return false; }
  });

  // Also respect the browser's built-in data saver hint if available
  useEffect(() => {
    try {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection?.saveData && !localStorage.getItem(KEY)) {
        // Browser reports user has data saver on — auto-enable
        setDataSaver(true);
        localStorage.setItem(KEY, 'true');
      }
    } catch {}
  }, []);

  const toggleDataSaver = () => {
    setDataSaver(prev => {
      const next = !prev;
      try { localStorage.setItem(KEY, String(next)); } catch {}
      return next;
    });
  };

  return { dataSaver, toggleDataSaver };
}
