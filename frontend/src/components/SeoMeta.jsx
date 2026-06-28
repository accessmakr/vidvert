/**
 * src/components/SeoMeta.jsx
 * PHASE 3 — Wraps react-helmet-async. Every page (legal pages,
 * tool SEO pages, the homepage) renders one of these once, near
 * the top of its JSX, with whatever schema objects are relevant
 * to that specific page passed in.
 *
 * schemas: array of plain objects already built via schema.js
 * builder functions (buildOrganizationSchema, buildFaqSchema, etc).
 * Falsy entries (e.g. buildFaqSchema returns null with no FAQs)
 * are filtered out automatically — callers don't need to guard.
 */

import { Helmet } from 'react-helmet-async';
import { SITE_NAME, DEFAULT_OG_IMAGE, THEME_COLOR, LOCALE, absoluteUrl } from '../utils/seoConfig';

export default function SeoMeta({
  title,
  description,
  path = '/',
  ogImage = DEFAULT_OG_IMAGE,
  schemas = [],
  noindex = false,
}) {
  const canonical = absoluteUrl(path);
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const validSchemas = schemas.filter(Boolean);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="theme-color" content={THEME_COLOR} />
      {noindex
        ? <meta name="robots" content="noindex, nofollow" />
        : <meta name="robots" content="index, follow" />
      }

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={LOCALE} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {validSchemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
