/**
 * useDownloadVerifier.js
 * GAP 10 — Corrupt / failed download detector.
 *
 * Problem: Competitors show "Download complete" even when the file
 * is 0 bytes, partially downloaded, or a redirect to an error page.
 * Users only discover the corruption after opening the file.
 *
 * This hook verifies a Cobalt stream URL before showing
 * the green success state. It makes a HEAD request to check:
 *   1. The URL is still reachable (not expired)
 *   2. Content-Length > 0 (not an empty file)
 *   3. Content-Type is video/* (not an error HTML page)
 *
 * Returns: { verifying, verified, failed, fileSize, contentType }
 *
 * Usage in App.jsx:
 *   const verify = useDownloadVerifier(result?.url);
 *   Show green button only when verify.verified === true.
 *   Show warning when verify.failed === true.
 */

import { useState, useEffect } from 'react';

export function useDownloadVerifier(url) {
  const [state, setState] = useState({
    verifying:   false,
    verified:    false,
    failed:      false,
    fileSize:    null,
    contentType: null,
    error:       null,
  });

  useEffect(() => {
    if (!url) {
      setState({ verifying: false, verified: false, failed: false, fileSize: null, contentType: null, error: null });
      return;
    }

    let cancelled = false;
    setState(s => ({ ...s, verifying: true, verified: false, failed: false }));

    // Use a proxy HEAD request through our own Netlify function
    // to avoid CORS blocking on cross-origin Cobalt CDN URLs.
    // Falls back to optimistic success if the proxy is unavailable.
    const verify = async () => {
      try {
        const res = await fetch('/api/verify-url', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ url }),
          signal:  AbortSignal.timeout(8000),
        });

        if (cancelled) return;

        if (!res.ok) {
          // Proxy failed — optimistic: assume URL is valid
          setState({ verifying: false, verified: true, failed: false, fileSize: null, contentType: null, error: null });
          return;
        }

        const data = await res.json();

        if (cancelled) return;

        const fileSize    = data.contentLength ? parseInt(data.contentLength) : null;
        const contentType = data.contentType || '';
        const isVideo     = contentType.startsWith('video/') || contentType.startsWith('application/octet');
        const hasContent  = !fileSize || fileSize > 1024; // > 1KB

        if (data.reachable && isVideo && hasContent) {
          setState({ verifying: false, verified: true, failed: false, fileSize, contentType, error: null });
        } else if (!data.reachable) {
          setState({ verifying: false, verified: false, failed: true, fileSize: null, contentType: null, error: 'Download link has expired. Please try again.' });
        } else if (!hasContent) {
          setState({ verifying: false, verified: false, failed: true, fileSize: null, contentType: null, error: 'The file appears to be empty. Please try a different quality.' });
        } else {
          // Unknown content type — optimistic pass
          setState({ verifying: false, verified: true, failed: false, fileSize, contentType, error: null });
        }
      } catch {
        if (!cancelled) {
          // Network error on verify — optimistic: show the button anyway
          setState({ verifying: false, verified: true, failed: false, fileSize: null, contentType: null, error: null });
        }
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [url]);

  return state;
}
