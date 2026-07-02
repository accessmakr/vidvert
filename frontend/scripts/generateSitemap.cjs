'use strict';

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://vidvert.cc';

async function main() {
  const mod = await import('../src/data/seoToolPages.js');
  const toolSlugs = mod.getAllSlugs();

  const legalSlugs = ['privacy-policy', 'terms-of-use', 'about', 'cookie-policy', 'contact'];

  const urls = [
    { loc: '/',      priority: '1.0', changefreq: 'weekly'  },
    { loc: '/tools', priority: '0.9', changefreq: 'monthly' },
  ];

  toolSlugs.forEach(function(slug) {
    urls.push({ loc: '/tools/' + slug, priority: '0.8', changefreq: 'monthly' });
  });

  legalSlugs.forEach(function(slug) {
    urls.push({ loc: '/' + slug, priority: '0.3', changefreq: 'yearly' });
  });

  var today = new Date().toISOString().split('T')[0];

  var lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  urls.forEach(function(u) {
    lines.push('  <url>');
    lines.push('    <loc>' + SITE_URL + u.loc + '</loc>');
    lines.push('    <lastmod>' + today + '</lastmod>');
    lines.push('    <changefreq>' + u.changefreq + '</changefreq>');
    lines.push('    <priority>' + u.priority + '</priority>');
    lines.push('  </url>');
  });

  lines.push('</urlset>');

  var xml = lines.join('\n') + '\n';
  var outPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log('sitemap.xml written with ' + urls.length + ' URLs');
}

main().catch(function(err) {
  console.error('generateSitemap failed:', err);
  process.exit(1);
});
