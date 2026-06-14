/**
 * netlify/functions/service-status.js
 * GAP 4 — Health check proxy for both Render services.
 *
 * Called by StatusPage.jsx to check if backends are alive.
 * Prevents CORS issues by proxying from Netlify.
 *
 * ?service=cobalt    → pings videodl-backend.onrender.com/health (Cobalt doesn't have /health — check /)
 * ?service=converter → pings audio-converter-hozf.onrender.com/health
 */

const COBALT_URL    = process.env.COBALT_URL    || '';
const CONVERTER_URL = process.env.CONVERTER_URL || '';

exports.handler = async (event) => {
  const service = event.queryStringParameters?.service;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (!service) return { statusCode: 400, headers, body: JSON.stringify({ error: 'service param required' }) };

  const targets = {
    cobalt:    `${COBALT_URL}/`,
    converter: `${CONVERTER_URL}/health`,
  };

  const url = targets[service];
  if (!url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'unknown service' }) };

  try {
    const start = Date.now();
    const res   = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10_000) });
    const ms    = Date.now() - start;
    return {
      statusCode: res.ok ? 200 : 502,
      headers,
      body: JSON.stringify({ ok: res.ok, latencyMs: ms, service }),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ ok: false, error: e.message, service }),
    };
  }
};
