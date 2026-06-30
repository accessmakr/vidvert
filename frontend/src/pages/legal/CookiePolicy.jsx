/**
 * src/pages/legal/CookiePolicy.jsx
 * PHASE 4 — Route: /cookie-policy
 */

import SeoMeta from '../../components/SeoMeta';
import ScrollProgressBar from '../../components/ScrollProgressBar';
import LegalFooter from '../../components/LegalFooter';
import { buildOrganizationSchema } from '../../utils/schema';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center">
      <SeoMeta
        title="Cookie Policy"
        description="What cookies and local storage VidVert uses today, and how that will be disclosed as advertising partners are added."
        path="/cookie-policy"
        schemas={[buildOrganizationSchema()]}
      />
      <ScrollProgressBar />

      <main className="w-full max-w-2xl px-4 py-12 flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Cookie Policy</h1>
        <p className="text-zinc-500 text-xs">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">What we use today</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            VidVert currently uses browser local storage — not cookies — to remember a small set
            of preferences on your device, such as whether Data Saver mode is turned on. This
            information stays on your device and is never sent to our servers or shared with
            anyone.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Advertising, going forward</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            VidVert is free to use and may in the future display advertising from third-party
            advertising networks to help cover hosting costs. Those networks may set their own
            cookies to serve relevant ads. When an advertising partner is added, this page will be
            updated to name that partner specifically and describe what their cookies do.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Controlling cookies</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Cookies and local storage can be cleared or blocked at any time through your browser's
            settings. Clearing local storage will reset preferences like Data Saver mode back to
            their defaults.
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
