/**
 * src/pages/ToolApp.jsx
 * PHASE 6 — Relocated content of the former App.jsx, now living at
 * the "/" route. Faithful to the confirmed-live structure — same 12
 * tabs, same gap features, same footer — with two changes:
 *   1. The inline downloader block is now <VideoDownloader />
 *      (extracted in Phase 3).
 *   2. <ToolsLinksBar /> added so all 9 SEO tool pages are reachable
 *      from the homepage, not just from sitemap.xml.
 *
 * KNOWN GAP, stated plainly: there is still no /tools hub/index page
 * listing all 9 tool pages in one place. ToolsLinksBar covers
 * homepage discoverability; a dedicated hub page is a separate,
 * real, future addition.
 */

import { useState } from 'react';

import StatusTicker          from '../components/StatusTicker';
import AudioConverter        from '../components/AudioConverter';
import WatermarkRemover      from '../components/WatermarkRemover';
import VideoConverter        from '../components/VideoConverter';
import VideoCompressor       from '../components/VideoCompressor';
import VideoTrimmer          from '../components/VideoTrimmer';
import VideoReframe          from '../components/VideoReframe';
import VideoCropper          from '../components/VideoCropper';
import BatchConverter        from '../components/BatchConverter';
import GifConverter          from '../components/GifConverter';
import ImageWatermarkRemover from '../components/ImageWatermarkRemover';

import VideoDownloader, { PLATFORMS } from '../components/VideoDownloader';
import TrustStrip      from '../components/TrustStrip';
import HeaderTrustBar  from '../components/HeaderTrustBar';
import DataSaverToggle from '../components/DataSaverToggle';
import LegalFooter     from '../components/LegalFooter';
import ToolsLinksBar   from '../components/ToolsLinksBar';

import { useDataSaver } from '../hooks/useDataSaver';

import StatusPage from './StatusPage';

const TABS = [
  { id: 'downloader', icon: '⬇',  label: 'Download'  },
  { id: 'audio',      icon: '🎵', label: 'Audio'     },
  { id: 'video',      icon: '🎬', label: 'Video'     },
  { id: 'compress',   icon: '🗜',  label: 'Compress'  },
  { id: 'trim',       icon: '✂',  label: 'Trim'      },
  { id: 'reframe',    icon: '📐', label: 'Reframe'   },
  { id: 'crop',       icon: '🔲', label: 'Crop'      },
  { id: 'batch',      icon: '🗂', label: 'Batch'     },
  { id: 'gif',        icon: '🎞',  label: 'GIF'       },
  { id: 'watermark',  icon: '🚫', label: 'Watermark' },
  { id: 'imgwm',      icon: '🖼',  label: 'Image WM'  },
  { id: 'status',     icon: '📡', label: 'Status'    },
];

export default function ToolApp() {
  const [activeTab,      setActiveTab]      = useState('downloader');
  const [downloadedUrl,  setDownloadedUrl]  = useState(null);
  const [downloadedName, setDownloadedName] = useState(null);

  const { dataSaver, toggleDataSaver } = useDataSaver();

  const handleDownloadReady = (url, title) => {
    setDownloadedUrl(url);
    setDownloadedName(title);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* ── Header ── */}
      <header className="flex flex-col items-center px-4 pt-8 pb-3 gap-2">
        <div className="flex items-center gap-3 w-full max-w-xl justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Vid<span className="text-blue-400">Vert</span>
          </h1>
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
        <HeaderTrustBar />
      </header>

      <StatusTicker />
      <TrustStrip />

      {/* ── Tool Grid ── */}
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

        {activeTab === 'downloader' && (
          <VideoDownloader
            dataSaver={dataSaver}
            onDownloadReady={handleDownloadReady}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'audio'     && <AudioConverter sourceUrl={downloadedUrl} sourceFilename={downloadedName} />}
        {activeTab === 'video'     && <VideoConverter />}
        {activeTab === 'compress'  && <VideoCompressor />}
        {activeTab === 'trim'      && <VideoTrimmer />}
        {activeTab === 'reframe'   && <VideoReframe />}
        {activeTab === 'crop'      && <VideoCropper />}
        {activeTab === 'batch'     && <BatchConverter />}
        {activeTab === 'gif'       && <GifConverter />}
        {activeTab === 'watermark' && <WatermarkRemover />}
        {activeTab === 'imgwm'     && <ImageWatermarkRemover />}
        {activeTab === 'status'    && <StatusPage />}

        <ToolsLinksBar />

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

      <LegalFooter />
    </div>
  );
}
