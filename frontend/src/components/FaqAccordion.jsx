/**
 * src/components/FaqAccordion.jsx
 * PHASE 3 — Pure visual accordion. Deliberately does NOT inject its
 * own JSON-LD — the calling page builds FAQPage schema once via
 * buildFaqSchema(faqs) from schema.js and passes it into SeoMeta,
 * keeping all structured data centralized in one place per page
 * rather than scattered across components.
 *
 * faqs: [{ q: string, a: string }, ...]
 */

import { useState } from 'react';

function ChevronIcon({ open }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function FaqAccordion({ faqs = [] }) {
  const [openIndex, setOpenIndex] = useState(null);
  if (!faqs.length) return null;

  return (
    <div className="w-full max-w-xl flex flex-col gap-2" aria-label="Frequently asked questions">
      {faqs.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-zinc-200 text-sm font-medium">{item.q}</span>
              <ChevronIcon open={isOpen} />
            </button>
            <div
              className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
              style={{ maxHeight: isOpen ? '500px' : '0px' }}
            >
              <p className="px-4 pb-3 text-zinc-500 text-sm">{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
