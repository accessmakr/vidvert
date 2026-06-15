/**
 * VidVert — frontend/src/services/api.js
 * TikTok fix: TikTok URLs call Cobalt DIRECTLY from the browser,
 * bypassing the Netlify function which has a 10-second hard timeout.
 * All other platforms still route through the Netlify proxy.
 *
 * Why this works for TikTok:
 *   Netlify free timeout = 10s
 *   TikTok via Cobalt = 12–25s
 *   Direct browser call = no timeout limit (browser waits as long as needed)
 *
 * CORS works because FRONTEND_URL on the Cobalt Render service
 * is set to https://vidvert.netlify.app — Cobalt allows that origin.
 */

const COBALT_DIRECT = import.meta.env.VITE_COBALT_URL ?? '';
const CONVERTER_URL = import.meta.env.VITE_CONVERTER_URL ?? '';

// Platforms that must bypass Netlify due to timeout
const DIRECT_PLATFORMS = [
  /tiktok\.com/,
  /vm\.tiktok\.com/,
];

function needsDirectCall(url) {
  try {
    return DIRECT_PLATFORMS.some(p => p.test(url));
  } catch {
    return false;
  }
}

// ── Cobalt downloader ─────────────────────────────────────────────────────────

export async function getPreview(url) {
  try {
    const res = await fetch('/api/preview', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url }),
    });
    if (!res.ok) return { thumbnail: null, title: null };
    return res.json();
  } catch {
    return { thumbnail: null, title: null };
  }
}

export async function getDownloadLink(url, videoQuality) {
  const body = JSON.stringify({
    url,
    videoQuality,
    downloadMode:  'auto',
    filenameStyle: 'pretty',
  });

  let res;

  if (needsDirectCall(url)) {
    // ── TikTok: call Cobalt directly — no Netlify timeout ──────────────────
    if (!COBALT_DIRECT) {
      throw new Error('Direct Cobalt URL not configured. Set VITE_COBALT_URL on Netlify.');
    }
    res = await fetch(`${COBALT_DIRECT}/`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
      body,
    });
  } else {
    // ── All other platforms: route through Netlify proxy ───────────────────
    res = await fetch('/api/cobalt', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  const data = await res.json();
  if (!res.ok || data.status === 'error') {
    throw new Error(data.error?.code ?? 'Unknown error');
  }
  return data;
}

// ── Audio / video converter ───────────────────────────────────────────────────

export async function createConversionJob({ url, format, quality, filename, advanced = {} }) {
  const res = await fetch('/api/convert/job', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url, format, quality, filename, ...advanced }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Job creation failed (${res.status})`);
  return data;
}

export async function getConversionStatus(jobId) {
  const res  = await fetch(`/api/convert/status/${jobId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Status fetch failed');
  return data;
}

export function getConverterDownloadUrl(jobId) {
  return `${CONVERTER_URL}/jobs/${jobId}/download`;
}

function _xhrUpload(url, formData, onUploadProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || `Server error (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror   = () => reject(new Error('Network error — check your connection'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.timeout   = 5 * 60 * 1000;
    xhr.open('POST', url);
    xhr.send(formData);
  });
}

export function uploadFileForConversion(formData, onUploadProgress) {
  if (!CONVERTER_URL) return Promise.reject(new Error('Converter not configured. Set VITE_CONVERTER_URL on Netlify.'));
  return _xhrUpload(`${CONVERTER_URL}/jobs`, formData, onUploadProgress);
}

export function uploadFileAdvanced(formData, onUploadProgress) {
  if (!CONVERTER_URL) return Promise.reject(new Error('Converter not configured.'));
  return _xhrUpload(`${CONVERTER_URL}/jobs/advanced`, formData, onUploadProgress);
}

export function uploadVideoForProcessing(endpoint, formData, onUploadProgress) {
  if (!CONVERTER_URL) return Promise.reject(new Error('Converter not configured.'));
  return _xhrUpload(`${CONVERTER_URL}/${endpoint}`, formData, onUploadProgress);
}

export function uploadForWatermarkRemoval(imageEndpoint, formData, onUploadProgress) {
  if (!CONVERTER_URL) return Promise.reject(new Error('Converter not configured.'));
  return _xhrUpload(`${CONVERTER_URL}/${imageEndpoint}`, formData, onUploadProgress);
}
