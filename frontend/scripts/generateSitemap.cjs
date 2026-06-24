'use strict';
/**
 * scripts/generateSitemap.cjs
 * PHASE 2 — Runs at Netlify build time via a "prebuild" npm script
 * hook, NOT something you ever run yourself. Writes public/sitemap.xml
 * fresh on every deploy, reading directly from seoToolPages.js so the
 * sitemap can never drift out of sync with the actual page list.
 *
 * .cjs extension used deliberately — forces CommonJS regardless of
 * whether package.json has "type": "module" set, avoiding any
 * ESM/CommonJS ambiguity. The data file itself is a real ES module
 * (uses `export`), so it's loaded here via dynamic import() — Node
 * supports this interop natively, no build step needed for this
 * script itself.
 */

const fs   = require('fs');
const path = require('path');

const SITE_URL = 'https://vidvert.cc';

async function main() {
  const { getAllSlugs } = await import('../src/data/seoToolPages.js');
  const toolSlugs = getAllSlugs();

  const legalSlugs = ['privacy-policy', 'terms-of-use', 'about', 'cookie-policy', 'contact'];

  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    ...toolSlugs.map(slug => ({ loc: `/tools/${slug}`, priority: '0.8', changefreq: 'monthly' })),
    ...legalSlugs.map(slug => ({ loc: `/${slug}`, priority: '0.3', changefreq: 'yearly' })),
  ];

  const today = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  const outPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`sitemap.xml written with ${urls.length} URLs`);
}

main().catch((err) => {
  console.error('generateSitemap failed:', err);
  process.exit(1);
});
