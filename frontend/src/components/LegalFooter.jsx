/**
 * src/components/LegalFooter.jsx
 * PHASE 3 — All 5 legal links, social links as plain text (not
 * icons), per spec. Slugs match generateSitemap.cjs's legalSlugs
 * array exactly — keep these two in sync if either changes.
 */

import { Link } from 'react-router-dom';

const LEGAL_LINKS = [
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'Terms of Use',   path: '/terms-of-use'   },
  { label: 'About',          path: '/about'          },
  { label: 'Cookie Policy',  path: '/cookie-policy'  },
  { label: 'Contact',        path: '/contact'        },
];

export default function LegalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-zinc-800 mt-12 py-8 px-4 flex flex-col items-center gap-4">
      <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {LEGAL_LINKS.map(link => (
          <Link key={link.path} to={link.path} className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex gap-4">
        <a href="https://twitter.com/vidvert" target="_blank" rel="noopener noreferrer"
          className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">
          Twitter / X
        </a>
        <a href="https://github.com/accessmakr/vidvert" target="_blank" rel="noopener noreferrer"
          className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">
          GitHub
        </a>
      </div>

      <p className="text-zinc-700 text-xs">© {year} VidVert. All rights reserved.</p>
    </footer>
  );
}
