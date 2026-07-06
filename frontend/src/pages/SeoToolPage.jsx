/**
 * src/pages/SeoToolPage.jsx — v2
 * Updated TOOL_COMPONENTS map to include the 12 new tools.
 * Everything else identical to v1.
 */

import { useParams, Navigate } from 'react-router-dom';

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
import GifToMp4               from '../components/GifToMp4';
import VideoMute              from '../components/VideoMute';
import VideoRotate            from '../components/VideoRotate';
import ImageConverter         from '../components/ImageConverter';
import ImageCompressor        from '../components/ImageCompressor';
import ImageResizer           from '../components/ImageResizer';
import VideoSpeed             from '../components/VideoSpeed';
import VideoReverse           from '../components/VideoReverse';
import VideoMerge             from '../components/VideoMerge';
import AudioVideoMerge        from '../components/AudioVideoMerge';
import AudioMerge             from '../components/AudioMerge';
import VideoFrameExtract      from '../components/VideoFrameExtract';

import { getToolPageBySlug } from '../data/seoToolPages';
import { buildWebApplicationSchema, buildFaqSchema, buildBreadcrumbSchema } from '../utils/schema';

const TOOL_COMPONENTS = {
  AudioConverter, VideoCompressor, VideoTrimmer, GifConverter,
  WatermarkRemover, ImageWatermarkRemover, VideoReframe, VideoCropper,
  GifToMp4, VideoMute, VideoRotate, ImageConverter, ImageCompressor,
  ImageResizer, VideoSpeed, VideoReverse, VideoMerge, AudioVideoMerge,
  AudioMerge, VideoFrameExtract,
};

export default function SeoToolPage() {
  const { slug } = useParams();
  const page = getToolPageBySlug(slug);
  if (!page) return <Navigate to="/" replace />;

  const ToolComponent = TOOL_COMPONENTS[page.toolComponent];

  const schemas = [
    buildWebApplicationSchema({ name: page.h1, description: page.metaDescription, path: '/tools/'+page.slug }),
    buildFaqSchema(page.faqs),
    buildBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: page.h1 }]),
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center">
      <SeoMeta title={page.title} description={page.metaDescription} path={'/tools/'+page.slug} schemas={schemas} />
      <ScrollProgressBar />
      <main className="w-full flex flex-col items-center px-4 py-8 gap-6">
        <Breadcrumb items={[{ name: 'Home', path: '/' }, { name: page.h1 }]} />
        <div className="w-full max-w-xl flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{page.h1}</h1>
          <p className="text-zinc-400 text-sm">{page.subheading}</p>
        </div>
        {ToolComponent ? <ToolComponent /> : <p className="text-red-400 text-xs">Tool component "{page.toolComponent}" not found.</p>}
        <div className="w-full max-w-xl flex flex-col gap-5">
          {page.contentSections.map((section,i) => (
            <section key={i} className="flex flex-col gap-1.5">
              <h2 className="text-base font-semibold text-zinc-200">{section.heading}</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
        <div className="w-full max-w-xl flex flex-col gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div><p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">Logic</p><p className="text-zinc-400 text-sm">{page.logic}</p></div>
          <div><p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">Methodology</p><p className="text-zinc-400 text-sm">{page.methodology}</p></div>
        </div>
        {page.citations?.length > 0 && (
          <div className="w-full max-w-xl flex flex-col gap-2">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">References</p>
            <ul className="flex flex-col gap-1">
              {page.citations.map((c,i) => (
                <li key={i}><a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs underline underline-offset-2">{c.label}</a></li>
              ))}
            </ul>
          </div>
        )}
        <FaqAccordion faqs={page.faqs} />
        <InternalLinks currentSlug={page.slug} />
      </main>
      <LegalFooter />
    </div>
  );
}
