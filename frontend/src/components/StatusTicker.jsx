/**
 * VidVert — StatusTicker.jsx (v2)
 * Updated to reflect all 23 tools now built.
 */
const ITEMS = [
  { icon:'🟢', label:'Facebook Video Download',      status:'LIVE'    },
  { icon:'🟢', label:'Instagram Video Download',     status:'LIVE'    },
  { icon:'🟢', label:'Twitter / X Video Download',   status:'LIVE'    },
  { icon:'🟡', label:'TikTok Download',              status:'SOON'    },
  { icon:'🔴', label:'YouTube Download',             status:'PENDING' },
  { icon:'🟢', label:'MP3 Extraction',               status:'LIVE'    },
  { icon:'🟢', label:'M4A / AAC / OGG Conversion',  status:'LIVE'    },
  { icon:'🟢', label:'WAV / FLAC / ALAC / AIFF',    status:'LIVE'    },
  { icon:'🟢', label:'WMA Conversion',               status:'LIVE'    },
  { icon:'🟢', label:'64 – 320 kbps Quality',        status:'LIVE'    },
  { icon:'🟢', label:'Audio Trim + Fade + Reverse',  status:'LIVE'    },
  { icon:'🟢', label:'Volume Control',               status:'LIVE'    },
  { icon:'🟢', label:'Batch Audio Conversion',       status:'LIVE'    },
  { icon:'🟢', label:'Merge Audio Files',            status:'LIVE'    },
  { icon:'🟢', label:'Video Format Converter',       status:'LIVE'    },
  { icon:'🟢', label:'MP4 → MKV / WebM / AVI',      status:'LIVE'    },
  { icon:'🟢', label:'Video Compressor',             status:'LIVE'    },
  { icon:'🟢', label:'Video Trimmer',                status:'LIVE'    },
  { icon:'🟢', label:'Video to GIF',                 status:'LIVE'    },
  { icon:'🟢', label:'GIF to MP4',                   status:'LIVE'    },
  { icon:'🟢', label:'Video Reframe (9:16 / 1:1)',   status:'LIVE'    },
  { icon:'🟢', label:'Video Cropper',                status:'LIVE'    },
  { icon:'🟢', label:'Rotate / Flip Video',          status:'LIVE'    },
  { icon:'🟢', label:'Mute Video',                   status:'LIVE'    },
  { icon:'🟢', label:'Speed Up / Slow Down Video',   status:'LIVE'    },
  { icon:'🟢', label:'Reverse Video',                status:'LIVE'    },
  { icon:'🟢', label:'Merge Video Clips',            status:'LIVE'    },
  { icon:'🟢', label:'Add Audio to Video',           status:'LIVE'    },
  { icon:'🟢', label:'Extract Frame as JPG',         status:'LIVE'    },
  { icon:'🟢', label:'Video Watermark Removal',      status:'LIVE'    },
  { icon:'🟢', label:'Image Watermark Removal',      status:'LIVE'    },
  { icon:'🟢', label:'Image Format Converter',       status:'LIVE'    },
  { icon:'🟢', label:'Image Compressor',             status:'LIVE'    },
  { icon:'🟢', label:'Image Resizer',                status:'LIVE'    },
  { icon:'🟡', label:'AI Watermark Removal',         status:'SOON'    },
  { icon:'🟡', label:'Auto-Captions',                status:'SOON'    },
  { icon:'🟢', label:'WhatsApp Share',               status:'LIVE'    },
  { icon:'🟢', label:'Data Saver Mode',              status:'LIVE'    },
  { icon:'🟢', label:'Service Status Page',          status:'LIVE'    },
  { icon:'🟢', label:'Install as Mobile App (PWA)',  status:'LIVE'    },
  { icon:'🟢', label:'Works Offline (PWA)',          status:'LIVE'    },
  { icon:'🟢', label:'Files Auto-Deleted in 10min',  status:'LIVE'    },
  { icon:'🟢', label:'Free — No Sign-Up',            status:'LIVE'    },
  { icon:'🟢', label:'No Malware · No Fake Buttons', status:'LIVE'    },
];

const STATUS_COLOURS = { LIVE:'text-green-400', SOON:'text-yellow-400', PENDING:'text-red-400' };

function TickerItem({ icon, label, status }) {
  return (
    <span className="inline-flex items-center gap-2 px-6 whitespace-nowrap select-none">
      <span aria-hidden="true">{icon}</span>
      <span className="text-zinc-200 text-xs font-medium tracking-wide">{label}</span>
      <span className={'text-xs font-bold uppercase '+STATUS_COLOURS[status]}>{status}</span>
      <span className="text-zinc-700 mx-2" aria-hidden="true">•</span>
    </span>
  );
}

export default function StatusTicker() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="w-full bg-zinc-900 border-y border-zinc-800 overflow-hidden py-2"
      role="marquee" aria-label="Live feature status" aria-live="off">
      <div className="flex animate-ticker" style={{width:'max-content'}}>
        {doubled.map((item,i) => <TickerItem key={i} {...item} />)}
      </div>
      <style>{`
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .animate-ticker { animation:ticker 120s linear infinite; }
        .animate-ticker:hover { animation-play-state:paused; }
      `}</style>
    </div>
  );
}
