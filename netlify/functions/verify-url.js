/**
 * netlify/functions/verify-url.js
 * GAP 10 — Proxy HEAD request to verify a Cobalt download URL.
 *
 * Checks: reachability, Content-Type, Content-Length.
 * Runs server-side to avoid CORS blocking on CDN URLs.
 *
 * POST body: { url: string }
 * Response:  { reachable, contentType, contentLength, status }
 */

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' };

  const { url } = JSON.parse(event.body || '{}');

  if (!url) return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'url required' }),
  };

  try {
    const res = await fetch(url, {
      method:  'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VidVert-Verifier/1.0)' },
      signal:  AbortSignal.timeout(7000),
      redirect: 'follow',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reachable:     res.ok,
        status:        res.status,
        contentType:   res.headers.get('content-type')   || null,
        contentLength: res.headers.get('content-length') || null,
      }),
    };
  } catch (e) {
    return {
      statusCode: 200, // 200 so client receives the body
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reachable: false, error: e.message }),
    };
  }
};
