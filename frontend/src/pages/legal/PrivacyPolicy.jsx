/**
 * src/pages/legal/PrivacyPolicy.jsx
 * PHASE 4 — Route: /privacy-policy
 */

import SeoMeta from '../../components/SeoMeta';
import ScrollProgressBar from '../../components/ScrollProgressBar';
import LegalFooter from '../../components/LegalFooter';
import { buildOrganizationSchema } from '../../utils/schema';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center">
      <SeoMeta
        title="Privacy Policy"
        description="How VidVert handles the videos and files you submit, what is and isn't stored, and how long anything stays on our servers."
        path="/privacy-policy"
        schemas={[buildOrganizationSchema()]}
      />
      <ScrollProgressBar />

      <main className="w-full max-w-2xl px-4 py-12 flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-zinc-500 text-xs">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">What we collect</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            VidVert does not require an account, and we do not collect names, emails, or personal
            identifiers to use the core tools. What we do temporarily handle:
          </p>
          <ul className="text-zinc-400 text-sm leading-relaxed list-disc pl-5 flex flex-col gap-1">
            <li>The video URL you paste in, sent to our download service to retrieve a video.</li>
            <li>Any file you upload for conversion, compression, trimming, or watermark removal.</li>
            <li>Standard server logs (IP address, timestamp, requested endpoint) used only for abuse prevention and rate limiting, not for tracking individuals.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">What happens to your files</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Uploaded and processed files are stored temporarily on our server only for as long as
            needed to complete your request. Output files are automatically deleted within 10
            minutes of being downloaded. We do not retain copies, do not inspect file content
            beyond what's needed to process it, and do not sell or share file content with anyone.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Third-party services we rely on</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Video retrieval is handled by Cobalt, an open-source media downloading service. Our
            frontend is hosted on Netlify and our conversion backend on Render. We may in the
            future work with advertising partners to keep VidVert free — when that happens, this
            policy and our Cookie Policy will be updated to reflect exactly which partners and
            what data they handle.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Children's privacy</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            VidVert is not directed at children under 13, and we do not knowingly collect
            information from children.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Changes to this policy</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            If this policy changes meaningfully, the updated date at the top of this page will
            reflect it. Continued use of VidVert after a change means you accept the updated policy.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Contact</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Questions about this policy can be sent through our <a href="/contact" className="text-blue-400 hover:underline">contact page</a>.
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
