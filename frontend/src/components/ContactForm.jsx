/**
 * src/components/ContactForm.jsx
 * PHASE 3 — Netlify form. The handleContactForm function below is
 * used EXACTLY as specified — not rewritten, not "improved."
 *
 * IMPORTANT NETLIFY + REACT SPA GOTCHA, flagged not glossed over:
 * Netlify detects forms by scanning the STATIC HTML it builds.
 * A React SPA renders this form client-side, so it will NEVER
 * appear in the built index.html for Netlify's bot to find on its
 * own. The standard fix is a hidden static replica of this exact
 * form (same name, same field names, same honeypot) placed directly
 * in index.html, outside the React root div. That replica doesn't
 * exist yet — it's a small addition needed when index.html is
 * touched, not something this component can solve by itself.
 */

import { useState } from 'react';

function handleContactForm(e) {
  e.preventDefault();

  const myForm = e.target;
  const formData = new FormData(myForm);

  fetch("/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(formData).toString()
  })
  .then(() => {
    alert("Thank you! Your request has been transmitted.");
    myForm.reset();
  })
  .catch((error) => {
    alert("Oops! There was a problem submitting your form.");
    console.error("Form submission error:", error);
  });
}

export default function ContactForm() {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e) => {
    setSubmitting(true);
    handleContactForm(e);
    setTimeout(() => setSubmitting(false), 1000);
  };

  return (
    <form
      name="Request And Contact"
      method="POST"
      data-netlify="true"
      netlify-honeypot="bot-field"
      onSubmit={onSubmit}
      className="w-full mx-auto flex flex-col gap-3 p-5 rounded-2xl backdrop-blur-md
                 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80
                 border border-emerald-800/30
                 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
      style={{ maxWidth: '400px' }}
    >
      <input type="hidden" name="form-name" value="Request And Contact" />
      <p hidden>
        <label>Don't fill this out: <input name="bot-field" /></label>
      </p>

      <h3 className="text-zinc-100 text-sm font-semibold">Get in touch</h3>

      <input
        type="text" name="name" required placeholder="Name"
        className="bg-zinc-900/60 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-600 transition-colors"
      />
      <input
        type="email" name="email" required placeholder="Email"
        className="bg-zinc-900/60 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-600 transition-colors"
      />
      <textarea
        name="message" required placeholder="Message" rows={4}
        className="bg-zinc-900/60 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-600 transition-colors resize-none"
      />

      <button
        type="submit" disabled={submitting}
        className="bg-gradient-to-r from-emerald-600 to-violet-600 hover:from-emerald-500 hover:to-violet-500
                   disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-all"
      >
        {submitting ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
