/**
 * WhatsAppShare.jsx
 * GAP 1 — WhatsApp share button on download result.
 *
 * One tap after a successful download opens WhatsApp Web
 * with the video link pre-composed. Zero API needed.
 * Highest-impact feature for Nigerian / West African market
 * where WhatsApp is the primary content distribution channel.
 *
 * Usage in App.jsx after isStream result:
 *   <WhatsAppShare url={result.url} title={preview?.title} />
 */

export default function WhatsAppShare({ url, title }) {
  if (!url) return null;

  const message = title
    ? `Check out this video: ${title}\n${url}`
    : `Download this video: ${url}`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="
        flex items-center justify-center gap-2
        bg-[#25D366] hover:bg-[#20bc5a]
        text-white font-semibold py-3 rounded-xl
        transition-colors w-full text-sm
      "
      aria-label="Share on WhatsApp"
    >
      {/* WhatsApp SVG icon — inline, no dependency */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.862L.054 23.447a.5.5 0 00.499.553h.057l5.7-1.494A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.582 9.582 0 01-4.912-1.352l-.35-.209-3.633.952.97-3.533-.228-.362A9.569 9.569 0 012.4 12C2.4 6.698 6.698 2.4 12 2.4S21.6 6.698 21.6 12 17.302 21.6 12 21.6z"/>
      </svg>
      Share on WhatsApp
    </a>
  );
}
