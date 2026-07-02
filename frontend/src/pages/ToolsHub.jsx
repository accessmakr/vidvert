/**
 * src/pages/ToolsHub.jsx
 * Route: /tools
 * Lists all 9 SEO tool pages with descriptions.
 * Gives Google a real hub page rather than 9 orphaned pages.
 */

import { Link } from 'react-router-dom';
import SeoMeta           from '../components/SeoMeta';
import ScrollProgressBar from '../components/ScrollProgressBar';
import Breadcrumb        from '../components/Breadcrumb';
import LegalFooter       from '../components/LegalFooter';
import { SEO_TOOL_PAGES } from '../data/seoToolPages';
import {
  buildWebSiteSchema,
  buildBreadcrumbSchema,
  buildOrganizationSchema,
} from '../utils/schema';

export default function ToolsHub() {
  const schemas = [
    buildOrganizationSchema(),
    buildWebSiteSchema(),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Tools' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center">
      <SeoMeta
        title="Free Online Video Tools"
        description="Convert, compress, trim, crop, reframe and remove watermarks from any video or image — free, no sign-up, 9 tools in one place."
        path="/tools"
        schemas={schemas}
      />
      <ScrollProgressBar />

      <main className="w-full max-w-xl px-4 py-10 flex flex-col gap-6">

        <Breadcrumb items={[{ name: 'Home', path: '/' }, { name: 'Tools' }]} />

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Free Online Video Tools</h1>
          <p className="text-zinc-400 text-sm">
            Convert, compress, trim, reframe, crop and remove watermarks — all free, no sign-up.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {SEO_TOOL_PAGES.map(page => (
            <Link
              key={page.slug}
              to={`/tools/${page.slug}`}
              className="
                group flex flex-col gap-1
                bg-zinc-900 hover:bg-zinc-800
                border border-zinc-800 hover:border-zinc-600
                rounded-xl px-4 py-4 transition-all
              "
            >
              <p className="text-zinc-100 text-sm font-semibold group-hover:text-white transition-colors">
                {page.h1}
              </p>
              <p className="text-zinc-500 text-xs leading-relaxed">
                {page.metaDescription}
              </p>
              <p className="text-blue-400 text-xs mt-1">
                Use tool →
              </p>
            </Link>
          ))}
        </div>

        <Link
          to="/"
          className="text-zinc-500 hover:text-zinc-300 text-xs text-center py-2 transition-colors"
        >
          ← Back to VidVert
        </Link>

      </main>

      <LegalFooter />
    </div>
  );
}
