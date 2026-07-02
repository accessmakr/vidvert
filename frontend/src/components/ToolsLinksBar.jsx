/**
 * src/components/ToolsLinksBar.jsx
 * Links the homepage to all 9 SEO tool pages. Renders on ToolApp,
 * below the main tab content, above the SEO keyword footer.
 *
 * Not a hub page — that's still a separate, real, future addition.
 * This is the minimum honest fix: every /tools/:slug page is now
 * reachable from the homepage, not just from sitemap.xml.
 */

import { Link } from 'react-router-dom';
import { SEO_TOOL_PAGES } from '../data/seoToolPages';

export default function ToolsLinksBar() {
  return (
    <div className="w-full max-w-xl flex flex-col gap-2 mt-4">
      <p className="text-zinc-600 text-xs font-medium uppercase tracking-wide text-center">
        More ways to use VidVert
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {SEO_TOOL_PAGES.map(page => (
          <Link
            key={page.slug}
            to={`/tools/${page.slug}`}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            {page.h1}
          </Link>
        ))}
      </div>
      <Link
  to="/tools"
  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 text-xs px-3 py-1.5 rounded-lg transition-colors"
>
  All Tools →
</Link>
    </div>
  );
}
