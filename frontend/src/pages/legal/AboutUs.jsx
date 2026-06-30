/**
 * src/pages/legal/AboutUs.jsx
 * PHASE 4 — Route: /about
 */

import SeoMeta from '../../components/SeoMeta';
import ScrollProgressBar from '../../components/ScrollProgressBar';
import LegalFooter from '../../components/LegalFooter';
import { buildOrganizationSchema } from '../../utils/schema';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center">
      <SeoMeta
        title="About"
        description="VidVert is a free video downloader and editing suite — download from Facebook, Instagram and X, then convert, compress, trim and edit, all in one place."
        path="/about"
        schemas={[buildOrganizationSchema()]}
      />
      <ScrollProgressBar />

      <main className="w-full max-w-2xl px-4 py-12 flex flex-col gap-6">
        <h1 className="text-2xl font-bold">About VidVert</h1>

        <section className="flex flex-col gap-2">
          <p className="text-zinc-400 text-sm leading-relaxed">
            VidVert started from a simple frustration: downloading a video and editing it always
            meant bouncing between different sites — one to save the file, another to convert it,
            a third to trim it, a fourth to deal with a watermark. VidVert puts all of it in one
            place, so a video you just downloaded can be converted, compressed, trimmed, reframed,
            or cleaned up immediately, without re-uploading anything.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">What VidVert does</h2>
          <ul className="text-zinc-400 text-sm leading-relaxed list-disc pl-5 flex flex-col gap-1">
            <li>Download videos from Facebook, Instagram, and X (Twitter)</li>
            <li>Extract or convert audio between MP3, M4A, AAC, WAV, FLAC, OGG, WMA, ALAC, and AIFF</li>
            <li>Convert, compress, trim, crop, and reframe video for different platforms</li>
            <li>Convert video clips to GIF</li>
            <li>Remove watermarks from both video and images</li>
            <li>Batch-convert multiple files at once</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">What we guarantee</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            No malware, no fake download buttons, no sign-up required to use any tool, and files
            are automatically deleted from our servers within 10 minutes of download. These are
            permanent commitments, not a temporary promotion.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Built on open tools</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            VidVert's download functionality is powered by Cobalt, an open-source media retrieval
            project, and conversion is handled by FFmpeg, the open-source multimedia framework
            used by the vast majority of video tools on the web.
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
