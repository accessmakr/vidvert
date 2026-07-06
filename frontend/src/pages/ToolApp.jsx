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
import GifToMp4              from '../components/GifToMp4';
import VideoMute             from '../components/VideoMute';
import VideoRotate           from '../components/VideoRotate';
import ImageConverter        from '../components/ImageConverter';
import ImageCompressor       from '../components/ImageCompressor';
import ImageResizer          from '../components/ImageResizer';
import VideoMerge            from '../components/VideoMerge';
import AudioVideoMerge       from '../components/AudioVideoMerge';
import VideoFrameExtract     from '../components/VideoFrameExtract';
import VideoSpeed            from '../components/VideoSpeed';
import VideoReverse          from '../components/VideoReverse';
import AudioMerge            from '../components/AudioMerge';
import VideoDownloader, { PLATFORMS } from '../components/VideoDownloader';
import TrustStrip      from '../components/TrustStrip';
import HeaderTrustBar  from '../components/HeaderTrustBar';
import DataSaverToggle from '../components/DataSaverToggle';
import LegalFooter     from '../components/LegalFooter';
import ToolsLinksBar   from '../components/ToolsLinksBar';
import { useDataSaver } from '../hooks/useDataSaver';
import StatusPage from './StatusPage';

const TABS = [
  { id: 'downloader', icon: '⬇',  label: 'Download'    },
  { id: 'audio',      icon: '🎵', label: 'Audio'       },
  { id: 'video',      icon: '🎬', label: 'Video'       },
  { id: 'compress',   icon: '🗜',  label: 'Compress'    },
  { id: 'trim',       icon: '✂',  label: 'Trim'        },
  { id: 'reframe',    icon: '📐', label: 'Reframe'     },
  { id: 'crop',       icon: '🔲', label: 'Crop'        },
  { id: 'batch',      icon: '🗂', label: 'Batch'       },
  { id: 'gif',        icon: '🎞',  label: 'GIF'         },
  { id: 'gifmp4',     icon: '🎥', label: 'GIF→MP4'     },
  { id: 'watermark',  icon: '🚫', label: 'Watermark'   },
  { id: 'imgwm',      icon: '🖼',  label: 'Image WM'    },
  { id: 'imgconv',    icon: '🔁', label: 'Img Convert' },
  { id: 'imgcompress',icon: '📷', label: 'Img Compress'},
  { id: 'imgresize',  icon: '↔',  label: 'Img Resize'  },
  { id: 'mute',       icon: '🔇', label: 'Mute'        },
  { id: 'rotate',     icon: '🔄', label: 'Rotate'      },
  { id: 'speed',      icon: '⚡', label: 'Speed'       },
  { id: 'reverse',    icon: '⏮', label: 'Reverse'     },
  { id: 'mergevid',   icon: '🔗', label: 'Merge Vid'   },
  { id: 'addaudio',   icon: '🎙', label: 'Add Audio'   },
  { id: 'mergeaudio', icon: '🎶', label: 'Merge Audio' },
  { id: 'frame',      icon: '📸', label: 'Frame'       },
  { id: 'status',     icon: '📡', label: 'Status'      },
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
      <header className="flex flex-col items-center px-4 pt-8 pb-3 gap-2">
        <div className="flex items-center gap-3 w-full max-w-xl justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Vid<span className="text-blue-400">Vert</span></h1>
          <DataSaverToggle dataSaver={dataSaver} onToggle={toggleDataSaver} />
        </div>
        <p className="text-zinc-400 text-sm text-center max-w-md">Download · Convert · Compress · Trim · Remove Watermarks — Free</p>
        <div className="flex justify-center gap-4 mt-1 flex-wrap">
          {PLATFORMS.map(p => (
            <span key={p.id} className={'text-xs flex items-center gap-1 '+p.color}>
              <span aria-hidden="true">{p.icon}</span>
              <span className="text-zinc-500">{p.label}</span>
            </span>
          ))}
        </div>
        <HeaderTrustBar />
      </header>

      <StatusTicker />
      <TrustStrip />

      {/* 4×6 grid — all 24 tabs visible without scrolling */}
      <nav className="grid grid-cols-4 gap-2 px-4 pt-4 pb-2" aria-label="Tools">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} aria-pressed={activeTab === t.id}
            className={'flex flex-col items-center justify-center gap-1 py-3 rounded-xl border text-center transition-all '+(activeTab === t.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800')}>
            <span className="text-lg leading-none" aria-hidden="true">{t.icon}</span>
            <span className="text-xs font-semibold leading-none">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="flex flex-col items-center px-4 py-6 gap-6 flex-1">
        {activeTab === 'downloader'  && <VideoDownloader dataSaver={dataSaver} onDownloadReady={handleDownloadReady} onNavigate={setActiveTab} />}
        {activeTab === 'audio'       && <AudioConverter sourceUrl={downloadedUrl} sourceFilename={downloadedName} />}
        {activeTab === 'video'       && <VideoConverter />}
        {activeTab === 'compress'    && <VideoCompressor />}
        {activeTab === 'trim'        && <VideoTrimmer />}
        {activeTab === 'reframe'     && <VideoReframe />}
        {activeTab === 'crop'        && <VideoCropper />}
        {activeTab === 'batch'       && <BatchConverter />}
        {activeTab === 'gif'         && <GifConverter />}
        {activeTab === 'gifmp4'      && <GifToMp4 />}
        {activeTab === 'watermark'   && <WatermarkRemover />}
        {activeTab === 'imgwm'       && <ImageWatermarkRemover />}
        {activeTab === 'imgconv'     && <ImageConverter />}
        {activeTab === 'imgcompress' && <ImageCompressor />}
        {activeTab === 'imgresize'   && <ImageResizer />}
        {activeTab === 'mute'        && <VideoMute />}
        {activeTab === 'rotate'      && <VideoRotate />}
        {activeTab === 'speed'       && <VideoSpeed />}
        {activeTab === 'reverse'     && <VideoReverse />}
        {activeTab === 'mergevid'    && <VideoMerge />}
        {activeTab === 'addaudio'    && <AudioVideoMerge />}
        {activeTab === 'mergeaudio'  && <AudioMerge />}
        {activeTab === 'frame'       && <VideoFrameExtract />}
        {activeTab === 'status'      && <StatusPage />}

        <ToolsLinksBar />

        <footer className="mt-8 text-center text-zinc-700 text-xs max-w-xl space-y-1" aria-hidden="true">
          <p>Download Facebook Videos · Download Facebook Reels · Save Facebook Stories</p>
          <p>Download Twitter Videos · Save X Videos · Download Instagram Reels</p>
          <p>Video to MP3 · MP4 to MP3 · Extract Audio · Online Audio Converter</p>
          <p>Compress Video Online · Trim Video Online · Convert MP4 to GIF · GIF to MP4</p>
          <p>Remove Video Watermark · Remove Image Watermark · Rotate Video Online</p>
          <p>Image Converter · Image Compressor · Resize Image · Merge Videos Online</p>
          <p>Mute Video · Speed Up Video · Slow Motion Video · Reverse Video Online</p>
          <p>Add Audio to Video · Merge Audio Files · Extract Frame from Video</p>
          <p>VidVert — Free Video Downloader, Converter and Editor Online</p>
        </footer>
      </main>
      <LegalFooter />
    </div>
  );
}
