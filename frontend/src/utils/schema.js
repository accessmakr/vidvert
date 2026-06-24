/**
 * src/utils/schema.js
 * PHASE 2 — JSON-LD builder functions.
 *
 * Pure functions, no side effects. Each returns a plain object ready
 * to be JSON.stringify'd into a <script type="application/ld+json">
 * tag by SeoMeta.jsx (Phase 3).
 *
 * NOTE: WebSite schema deliberately omits a SearchAction block.
 * There is no functioning site search yet — claiming one in schema
 * that doesn't actually work risks a Search Console structured-data
 * error rather than a benefit. Add it back if/when real search ships.
 */

import { SITE_NAME, SITE_URL, ORG_NAME, SOCIAL_LINKS, DEFAULT_OG_IMAGE, absoluteUrl } from './seoConfig';

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: ORG_NAME,
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE,
    ...(SOCIAL_LINKS.length > 0 ? { sameAs: SOCIAL_LINKS } : {}),
  };
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

/**
 * For an individual tool page — these are functioning software tools,
 * not articles, so WebApplication fits the actual content better
 * than the generic Article type.
 */
export function buildWebApplicationSchema({ name, description, path }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url: absoluteUrl(path),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

export function buildFaqSchema(faqs = []) {
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/**
 * items: [{ name: 'Home', path: '/' }, { name: 'Tools', path: '/tools' }, ...]
 * Last item should be the current page (no path needed for the final item).
 */
export function buildBreadcrumbSchema(items = []) {
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}
