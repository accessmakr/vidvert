/**
 * VidVert — App.jsx (Final with all 10 gap features integrated)
 *
 * Gap 1:  WhatsAppShare        — below Open Video button
 * Gap 2:  QuickConvertBar      — replaces old 3-button shortcut row
 * Gap 3:  TrustStrip           — between StatusTicker and tab grid
 * Gap 4:  StatusPage           — routed via /status tab
 * Gap 5:  FileSizeEstimate     — below quality selector
 * Gap 6:  DataSaverToggle      — in header, gates preview fetch
 * Gap 7:  PWA                  — manifest + SW already in public/
 * Gap 8:  HeaderTrustBar       — below platform badges in header
 * Gap 9:  ConversionProgress   — inside AudioConverter (standalone)
 * Gap 10: useDownloadVerifier  — wraps download result state
 */

import { useState, useEffect } from 'react';
import { getDownloadLink, getPreview } from './services/api';

// Core components
import StatusTicker          from './components/StatusTicker';
import AudioConverter        from './components/AudioConverter';
import WatermarkRemover      from './components/WatermarkRemover';
import VideoConverter        from './components/VideoConverter';
import VideoCompressor       from './components/VideoCompressor';
import VideoTrimmer          from './components/VideoTrimmer';
import GifConverter          from './components/GifConverter';
import ImageWatermarkRemover from './components/ImageWatermarkRemover';

// Gap components
import WhatsAppShare    from './components/WhatsAppShare';
import QuickConvertBar  from './components/QuickConvertBar';
import TrustStrip       from './components/TrustStrip';
import HeaderTrustBar   from './components/HeaderTrustBar';
import DataSaverToggle  from './components/DataSaverToggle';
import { FileSizeBadge, estimateDownloadSize } from './components/FileSizeEstimate';

// Gap hooks
import { useDataSaver }        from './hooks/useDataSaver';
import { useDownloadVerifier } from './hooks/useDownloadVerifier';

// Pages
import StatusPage from './pages/StatusPage';

// ── Config ────────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'facebook',  label: 'Facebook',  icon: 'f',  color: 'text-blue-400', patterns: [/facebook\.com/, /fb\.watch/] },
  { id: 'twitter',   label: 'X/Twitter', icon: '𝕏',  color: 'text-zinc-200', patterns: [/twitter\.com/, /x\.com/] },
  { id: 'instagram', label: 'Instagram', icon: '◎', color: 'text-pink-400', patterns: [/instagram\.com/] },
  { id: 'tiktok',    label: 'TikTok',    icon: '♪',  color: 'text-cyan-400', patterns: [/tiktok\.com/, /vt\.tiktok\.com/, /vm\.tiktok\.com/] },
];

const QUALITIES = ['360', '480', '720', '1080'];

const TABS = [
  { id: 'downloader', icon: '⬇',  label: 'Download'  },
  { id: 'audio',      icon: '🎵', label: 'Audio'     },
  { id: 'video',      icon: '🎬', label: 'Video'     },
  { id: 'compress',   icon: '🗜',  label: 'Compress'  },
  { id: 'trim',       icon: '✂',  label: 'Trim'      },
  { id: 'gif',        icon: '🎞',  label: 'GIF'       },
  { id: 'watermark',  icon: '🚫', label: 'Watermark' },
  { id: 'imgwm',      icon: '🖼',  label: 'Image WM'  },
  { id: 'status',     icon: '📡', label: 'Status'    },
];

function detectPlatform(url) {
  try { new URL(url); } catch { return null; }
  return PLATFORMS.find(p => p.patterns.some(r => r.test(url))) ?? null;
}
function isValidURL(u) { try { new URL(u); return true; } catch { return false; } }
function openVideo(href) { window.open(href, '_blank', 'noopener,noreferrer'); }

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [url,           setUrl]           = useState('');
  const [quality,       setQuality]       = useState('720');
  const [loading,       setLoading]       = useState(false);
  const [result,        setResult]        = useState(null);
  const [error,         setError]         = useState(null);
  const [preview,       setPreview]       = useState(null);
  const [previewing,    setPreviewing]    = useState(false);
  const [activeTab,     setActiveTab]     = useState('downloader');
  const [downloadedUrl, setDownloadedUrl] = useState(null);
  const [downloadedName,setDownloadedName]= useState(null);

  // Gap 6 — data saver mode
  const { dataSaver, toggleDataSaver } = useDataSaver();

  // Gap 10 — download URL verifier
  const verify = useDownloadVerifier(result?.url);

  const platform = detectPlatform(url);
  const isStream = result?.status === 'redirect' || result?.status === 'stream';

  // Gap 5 — file size estimate
  const estimatedBytes = preview?.duration
    ? estimateDownloadSize(preview.duration, quality)
    : null;

  const reset = () => {
    setResult(null); setError(null);
    setDownloadedUrl(null); setDownloadedName(null);
  };

  // Preview fetch — gated by data saver (Gap 6)
  useEffect(() => {
    if (!platform) { setPreview(null); return; }
    if (dataSaver) return; // skip preview fetch on slow connections
    let cancelled = false;
    setPreviewing(true); setPreview(null);
    getPreview(url)
      .then(d  => { if (!cancelled) { setPreview(d); setPreviewing(false); } })
      .catch(() => { if (!cancelled) setPreviewing(false); });
    return () => { cancelled = true; };
  }, [url, dataSaver]);

  useEffect(() => {
    if (isStream && result?.url) {
      setDownloadedUrl(result.url);
      setDownloadedName(preview?.title || platform?.label || 'video');
    }
  }, [result]);

  const handleSubmit = async () => {
    if (!platform) return;
    setLoading(true); reset();
    try { setResult(await getDownloadLink(url, quality)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Download result state — Gap 10
  const downloadReady = isStream && (verify.verified || (!verify.verifying && !verify.failed));
  const downloadFailed = isStream && verify.failed;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* ── Header ── */}
      <header className="flex flex-col items-center px-4 pt-8 pb-3 gap-2">
        <div className="flex items-center gap-3 w-full max-w-xl justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Vid<span className="text-blue-400">Vert</span>
          </h1>
          {/* Gap 6 — Data saver toggle */}
          <DataSaverToggle dataSaver={dataSaver} onToggle={toggleDataSaver} />
        </div>
        <p className="text-zinc-400 text-sm text-center max-w-md">
          Download · Convert · Compress · Trim · Remove Watermarks — Free
        </p>
        <div className="flex justify-center gap-4 mt-1 flex-wrap">
          {PLATFORMS.map(p => (
            <span key={p.id} className={`text-xs flex items-center gap-1 ${p.color}`}>
              <span aria-hidden="true">{p.icon}</span>
              <span className="text-zinc-500">{p.label}</span>
            </span>
          ))}
        </div>
        {/* Gap 8 — Trust bar */}
        <HeaderTrustBar />
      </header>

      {/* ── Status Ticker ── */}
      <StatusTicker />

      {/* Gap 3 — Trust Strip */}
      <TrustStrip />

      {/* ── Tool Grid — 4×3 with Status, all visible ── */}
      <nav className="grid grid-cols-4 gap-2 px-4 pt-4 pb-2" aria-label="Tools">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            aria-pressed={activeTab === t.id}
            className={`
              flex flex-col items-center justify-center gap-1
              py-3 rounded-xl border text-center transition-all
              ${activeTab === t.id
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800'}
            `}
          >
            <span className="text-lg leading-none" aria-hidden="true">{t.icon}</span>
            <span className="text-xs font-semibold leading-none">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Main ── */}
      <main className="flex flex-col items-center px-4 py-6 gap-6 flex-1">

        {/* ── DOWNLOADER TAB ── */}
        {activeTab === 'downloader' && (
          <div className="w-full max-w-xl flex flex-col gap-4">

            {/* Data saver notice */}
            {dataSaver && platform && (
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
                <span className="text-green-400 text-xs">📶</span>
                <p className="text-zinc-500 text-xs">
                  Data Saver is on — thumbnail preview disabled to save mobile data.
                </p>
              </div>
            )}

            {/* URL input */}
            <div className={`flex items-center gap-2 border rounded-xl px-4 py-3 bg-zinc-900 transition-colors
              ${platform ? 'border-blue-500' : isValidURL(url) ? 'border-red-700' : 'border-zinc-700 focus-within:border-zinc-500'}`}>
              {platform && (
                <span className={`text-lg flex-shrink-0 ${platform.color}`} aria-hidden="true">
                  {platform.icon}
                </span>
              )}
              <input
                type="text" value={url}
                onChange={(e) => { setUrl(e.target.value); reset(); }}
                placeholder="Paste Facebook, Twitter, Instagram or TikTok URL…"
                className="flex-1 bg-transparent text-white outline-none placeholder-zinc-500 text-sm"
                aria-label="Video URL" autoFocus
              />
              {url && (
                <button onClick={() => { setUrl(''); reset(); setPreview(null); }}
                  className="text-zinc-600 hover:text-zinc-400" aria-label="Clear">✕</button>
              )}
            </div>

            {isValidURL(url) && !platform && (
              <p className="text-red-400 text-xs text-center" role="alert">
                Only Facebook, X (Twitter), Instagram and TikTok links are supported
              </p>
            )}

            {/* Preview card — hidden when data saver is on */}
            {!dataSaver && platform && (previewing || preview !== null) && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex gap-3 p-3 items-center">
                {previewing && !preview?.thumbnail
                  ? <div className="w-28 h-16 bg-zinc-800 rounded-lg flex-shrink-0 animate-pulse" />
                  : preview?.thumbnail
                    ? <img src={preview.thumbnail} alt="Preview" className="w-28 h-16 object-cover rounded-lg flex-shrink-0" />
                    : <div className={`w-28 h-16 bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl ${platform.color}`}>
                        {platform.icon}
                      </div>
                }
                <div className="flex flex-col gap-1 overflow-hidden flex-1">
                  {previewing && !preview?.title
                    ? <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
                    : <p className="text-white text-sm font-medium line-clamp-2">
                        {preview?.title || platform.label + ' Video'}
                      </p>
                  }
                  <span className={`text-xs ${platform.color}`}>{platform.icon} {platform.label}</span>
                </div>
              </div>
            )}

            {/* Quality selector + Gap 5 file size estimate */}
            {platform && (
              <div className="flex flex-col gap-1.5">
                <select value={quality} onChange={(e) => setQuality(e.target.value)}
                  aria-label="Video quality"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                  {QUALITIES.map(q => <option key={q} value={q}>{q}p</option>)}
                </select>
                {/* Gap 5 — show estimated size to help mobile data users decide */}
                {estimatedBytes && (
                  <div className="flex justify-end">
                    <FileSizeBadge estimatedBytes={estimatedBytes} quality={quality} />
                  </div>
                )}
              </div>
            )}

            <button onClick={handleSubmit} disabled={!platform || loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">
              {loading ? 'Getting link…' : 'Get Download Link'}
            </button>

            {error && (
              <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm text-center" role="alert">
                {error}
              </div>
            )}

            {/* Gap 10 — verifying state */}
            {isStream && verify.verifying && (
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                <span className="text-zinc-400 text-xs animate-pulse">Verifying download link…</span>
              </div>
            )}

            {/* Gap 10 — failed/corrupt link */}
            {downloadFailed && (
              <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-red-400 flex-shrink-0">⚠</span>
                <div>
                  <p className="text-red-300 text-xs font-medium">Download link issue</p>
                  <p className="text-red-400 text-xs mt-0.5">{verify.error || 'The link may have expired. Please try again.'}</p>
                  <button onClick={handleSubmit}
                    className="text-red-400 hover:text-red-300 text-xs mt-1 underline">Retry</button>
                </div>
              </div>
            )}

            {/* Download result — only shown when verified */}
            {downloadReady && (
              <div className="flex flex-col gap-2">
                <button onClick={() => openVideo(result.url)}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">
                  ✓ Open Video
                </button>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-start gap-3">
                  <span className="text-lg mt-0.5" aria-hidden="true">📱</span>
                  <div>
                    <p className="text-zinc-300 text-xs font-medium">To save to your phone:</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      Tap <strong className="text-zinc-300">Open Video</strong> → video plays →
                      tap <strong className="text-zinc-300">⋮ three dots</strong> bottom right →
                      tap <strong className="text-zinc-300">Download</strong>
                    </p>
                  </div>
                </div>

                {/* Gap 1 — WhatsApp share */}
                <WhatsAppShare url={result.url} title={preview?.title} />

                {/* Gap 2 — Quick convert bar */}
                <QuickConvertBar
                  videoUrl={result.url}
                  videoTitle={preview?.title}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              </div>
            )}

            {result?.status === 'picker' && (
              <div className="flex flex-col gap-3">
                <p className="text-zinc-400 text-sm text-center">
                  Multiple items — tap each to open, then ⋮ → Download
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {result.picker.map((item, i) => (
                    <button key={i} onClick={() => openVideo(item.url)}
                      className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden hover:border-zinc-500 transition-colors text-left"
                      aria-label={`Open item ${i + 1}`}>
                      {item.thumb && <img src={item.thumb} alt="" className="w-full h-32 object-cover" />}
                      <p className="p-2 text-xs text-zinc-400 text-center">Item {i + 1}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audio'     && <AudioConverter sourceUrl={downloadedUrl} sourceFilename={downloadedName} />}
        {activeTab === 'video'     && <VideoConverter />}
        {activeTab === 'compress'  && <VideoCompressor />}
        {activeTab === 'trim'      && <VideoTrimmer />}
        {activeTab === 'gif'       && <GifConverter />}
        {activeTab === 'watermark' && <WatermarkRemover />}
        {activeTab === 'imgwm'     && <ImageWatermarkRemover />}
        {/* Gap 4 — Status page */}
        {activeTab === 'status'    && <StatusPage />}

        <footer className="mt-8 text-center text-zinc-700 text-xs max-w-xl space-y-1" aria-hidden="true">
          <p>Download Facebook Videos · Download Facebook Reels · Save Facebook Stories</p>
          <p>Download Twitter Videos · Save X Videos · Download Instagram Reels</p>
          <p>Video to MP3 · MP4 to MP3 · Extract Audio · Online Audio Converter</p>
          <p>Compress Video Online · Trim Video Online · Convert MP4 to GIF</p>
          <p>Remove Video Watermark · Remove Image Watermark · TikTok Watermark Remover</p>
          <p>FLV to MP3 · WMV to MP3 · MKV to MP3 · WAV to MP3 · FLAC to MP3</p>
          <p>VidVert — Free Video Downloader and Converter Online</p>
        </footer>
      </main>
    </div>
  );
}
