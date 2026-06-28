/**
 * src/components/InternalLinks.jsx
 * PHASE 3 — Looks up related tool pages from the seoToolPages.js
 * data file and renders links to them, plus a link back to the
 * tool homepage. This is the React equivalent of the blueprint's
 * #dynamic-internal-links block.
 */

import { Link } from 'react-router-dom';
import { getRelatedPages } from '../data/seoToolPages';

export default function InternalLinks({ currentSlug }) {
  const related = getRelatedPages(currentSlug, 3);

  return (
    <div className="w-full max-w-xl flex flex-col gap-2">
      <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Related tools</p>
      <div className="flex flex-wrap gap-2">
        {related.map(page => (
          <Link
            key={page.slug}
            to={`/tools/${page.slug}`}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-300 text-xs px-3 py-2 rounded-xl transition-colors"
          >
            {page.h1}
          </Link>
        ))}
        <Link
          to="/"
          className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-300 text-xs px-3 py-2 rounded-xl transition-colors"
        >
          All Tools — Home
        </Link>
      </div>
    </div>
  );
}
