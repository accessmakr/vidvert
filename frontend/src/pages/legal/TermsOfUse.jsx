/**
 * src/pages/legal/TermsOfUse.jsx
 * PHASE 4 — Route: /terms-of-use
 *
 * The "user responsibility for content legality" clause below is
 * not boilerplate filler — it's the same protective pattern real
 * downloader apps in this space use to stay defensible, confirmed
 * via actual app store listings during earlier research this session.
 */

import SeoMeta from '../../components/SeoMeta';
import ScrollProgressBar from '../../components/ScrollProgressBar';
import LegalFooter from '../../components/LegalFooter';
import { buildOrganizationSchema } from '../../utils/schema';

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center">
      <SeoMeta
        title="Terms of Use"
        description="The terms governing use of VidVert's download and conversion tools, including your responsibility for content you process."
        path="/terms-of-use"
        schemas={[buildOrganizationSchema()]}
      />
      <ScrollProgressBar />

      <main className="w-full max-w-2xl px-4 py-12 flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Terms of Use</h1>
        <p className="text-zinc-500 text-xs">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Acceptance of terms</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            By using VidVert, you agree to these terms. If you don't agree, please don't use the service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">What VidVert provides</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            VidVert is a free tool for retrieving publicly accessible video links from supported
            platforms, and for converting, compressing, trimming, reframing, cropping, and editing
            video and audio files you provide. We do not host, store, or distribute copyrighted
            content ourselves.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Your responsibility for content</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            You are solely responsible for ensuring you have the right to download, convert, or
            otherwise process any content using VidVert. This includes obtaining permission from
            the content owner where required by the platform the content came from, or by
            applicable copyright law. VidVert does not review, verify, or take responsibility for
            how the tool is used by any individual user.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Prohibited use</h2>
          <ul className="text-zinc-400 text-sm leading-relaxed list-disc pl-5 flex flex-col gap-1">
            <li>Using VidVert to violate any platform's terms of service or applicable law.</li>
            <li>Attempting to overload, abuse, or disrupt the service through automated or excessive requests.</li>
            <li>Uploading or processing content that is illegal in your jurisdiction.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">No warranty</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            VidVert is provided free, "as is," with no guarantee of uninterrupted availability.
            As a free service running on shared infrastructure, occasional downtime or slower
            processing during high demand can occur.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Limitation of liability</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            VidVert and its operator are not liable for any damages arising from use of the
            service, including but not limited to loss of data, copyright disputes arising from
            content you process, or service interruptions.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Changes to these terms</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            These terms may be updated periodically. Continued use after a change constitutes
            acceptance of the updated terms.
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
