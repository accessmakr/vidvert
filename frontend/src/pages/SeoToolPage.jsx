/**
 * src/pages/SeoToolPage.jsx
 * PHASE 5 — The reusable template every /tools/:slug route renders.
 * This is the React-shaped equivalent of the blueprint's
 * generateGuides.js — one component, driven entirely by data,
 * rather than 9 separate hand-written page files.
 *
 * KNOWN GAP, stated plainly rather than worked around: there is no
 * /tools hub/index page yet listing all 9 tool pages. The breadcrumb
 * below is therefore Home > [Tool Name] only — a middle "Tools" crumb
 * was deliberately NOT added, since linking to a hub route that
 * doesn't exist would just be a second, self-inflicted 404. A real
 * hub page is a small, clean future addition once this template is
 * confirmed working.
 *
 * Tool component embed: each existing standalone tool component is
 * rendered with NO pre-filled props (no sourceUrl, no initialFile) —
 * a visitor arriving from search has no prior context to carry in,
 * unlike the QuickConvertBar handoff that happens after an in-app
 * download. This is intentional, not an oversight.
 */

import { useParams, Navigate, Link } from 'react-router-dom';

import SeoMeta            from '../components/SeoMeta';
import ScrollProgressBar  from '../components/ScrollProgressBar';
import Breadcrumb         from '../components/Breadcrumb';
import FaqAccordion       from '../components/FaqAccordion';
import InternalLinks      from '../components/InternalLinks';
import LegalFooter        from '../components/LegalFooter';

import AudioConverter        from '../components/AudioConverter';
import VideoCompressor       from '../components/VideoCompressor';
import VideoTrimmer          from '../components/VideoTrimmer';
import GifConverter          from '../components/GifConverter';
import WatermarkRemover      from '../components/WatermarkRemover';
import ImageWatermarkRemover from '../components/ImageWatermarkRemover';
import VideoReframe          from '../components/VideoReframe';
import VideoCropper          from '../components/VideoCropper';

import { getToolPageBySlug } from '../data/seoToolPages';
import {
  buildWebApplicationSchema,
  buildFaqSchema,
  buildBreadcrumbSchema,
} from '../utils/schema';

// Maps the toolComponent string in seoToolPages.js to the actual
// imported component. Add a new line here whenever a new tool gets
// its own SEO page — nothing else in this file needs to change.
const TOOL_COMPONENTS = {
  AudioConverter,
  VideoCompressor,
  VideoTrimmer,
  GifConverter,
  WatermarkRemover,
  ImageWatermarkRemover,
  VideoReframe,
  VideoCropper,
};

export default function SeoToolPage() {
  const { slug } = useParams();
  const page = getToolPageBySlug(slug);

  // Unknown slug — redirect home rather than rendering a blank page.
  if (!page) return <Navigate to="/" replace />;

  const ToolComponent = TOOL_COMPONENTS[page.toolComponent];

  const schemas = [
    buildWebApplicationSchema({
      name: page.h1,
      description: page.metaDescription,
      path: `/tools/${page.slug}`,
    }),
    buildFaqSchema(page.faqs),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: page.h1 },
    ]),
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center">
      <SeoMeta
        title={page.title}
        description={page.metaDescription}
        path={`/tools/${page.slug}`}
        schemas={schemas}
      />
      <ScrollProgressBar />

      <main className="w-full flex flex-col items-center px-4 py-8 gap-6">

        <Breadcrumb items={[{ name: 'Home', path: '/' }, { name: page.h1 }]} />

        {/* Hero */}
        <div className="w-full max-w-xl flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{page.h1}</h1>
          <p className="text-zinc-400 text-sm">{page.subheading}</p>
        </div>

        {/* The actual tool, embedded live on the page */}
        {ToolComponent ? <ToolComponent /> : (
          <p className="text-red-400 text-xs">Tool component "{page.toolComponent}" not found.</p>
        )}

        {/* H2 content sections */}
        <div className="w-full max-w-xl flex flex-col gap-5">
          {page.contentSections.map((section, i) => (
            <section key={i} className="flex flex-col gap-1.5">
              <h2 className="text-base font-semibold text-zinc-200">{section.heading}</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>

        {/* Logic + Methodology — one sentence each, per spec */}
        <div className="w-full max-w-xl flex flex-col gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">Logic</p>
            <p className="text-zinc-400 text-sm">{page.logic}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">Methodology</p>
            <p className="text-zinc-400 text-sm">{page.methodology}</p>
          </div>
        </div>

        {/* Citations — compulsory, hyperlinked */}
        {page.citations?.length > 0 && (
          <div className="w-full max-w-xl flex flex-col gap-2">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">References</p>
            <ul className="flex flex-col gap-1">
              {page.citations.map((c, i) => (
                <li key={i}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs underline underline-offset-2"
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* FAQ */}
        <FaqAccordion faqs={page.faqs} />

        {/* Internal links */}
        <InternalLinks currentSlug={page.slug} />

      </main>

      <LegalFooter />
    </div>
  );
}
