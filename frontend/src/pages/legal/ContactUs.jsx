/**
 * src/pages/legal/ContactUs.jsx
 * PHASE 4 — Route: /contact
 * CORRECTED — the naked mailto: email link has been removed
 * entirely, per explicit instruction. The form is the sole
 * contact mechanism, exactly as specced.
 */

import SeoMeta from '../../components/SeoMeta';
import ScrollProgressBar from '../../components/ScrollProgressBar';
import LegalFooter from '../../components/LegalFooter';
import ContactForm from '../../components/ContactForm';
import { buildOrganizationSchema } from '../../utils/schema';

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center">
      <SeoMeta
        title="Contact"
        description="Get in touch with VidVert for questions, feedback, or support."
        path="/contact"
        schemas={[buildOrganizationSchema()]}
      />
      <ScrollProgressBar />

      <main className="w-full max-w-2xl px-4 py-12 flex flex-col gap-6 items-center">
        <div className="w-full flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold">Contact Us</h1>
          <p className="text-zinc-400 text-sm">
            Questions, feedback, or something not working as expected — send it through the form below.
          </p>
        </div>

        <ContactForm />
      </main>

      <LegalFooter />
    </div>
  );
}
