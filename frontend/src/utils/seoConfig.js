/**
 * src/utils/seoConfig.js
 * PHASE 0 — Foundation. Every later SEO file reads from this.
 *
 * Fill in TWITTER_HANDLE and SOCIAL_LINKS once those exist —
 * left as clearly-marked placeholders rather than invented values.
 */

export const SITE_NAME        = 'VidVert';
export const SITE_URL         = 'https://vidvert.cc';
export const SITE_TAGLINE     = 'Free Video Downloader, Converter & Editor';
export const DEFAULT_DESCRIPTION =
  'Download videos from Facebook, Instagram and X, then convert, compress, trim, crop, reframe and remove watermarks — all free, no sign-up.';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const THEME_COLOR      = '#09090b';
export const LOCALE           = 'en_US';

export const ORG_NAME = 'VidVert';

// Placeholder — replace with the real handle once one exists.
export const TWITTER_HANDLE = '@vidvert';

// Placeholder array — replace with real profile URLs once they exist.
export const SOCIAL_LINKS = [
  // 'https://twitter.com/vidvert',
  // 'https://github.com/accessmakr/vidvert',
];

export function absoluteUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
