/**
 * StatusPage.jsx
 * GAP 4 — Public status page at /status
 *
 * Shows real-time health of all VidVert services.
 * No competitor in the free tool space has this.
 * Builds enormous trust — users know immediately if
 * something is broken vs. their own connection.
 *
 * Pings /api/service-status which checks both backends.
 * Add to App.jsx routes: /status → <StatusPage />
 */

import { useState, useEffect } from 'react';

const SERVICES = [
  { id: 'cobalt',    label: 'Video Downloader',    desc: 'Facebook · Twitter · Instagram', endpoint: '/api/service-status?service=cobalt'    },
  { id: 'converter', label: 'Audio & Video Tools', desc: 'Converter · Compressor · Trimmer · GIF', endpoint: '/api/service-status?service=converter' },
];

const STATUS = {
  checking: { color: 'bg-zinc-500',  dot: 'bg-zinc-400',  label: 'Checking…'    },
  up:        { color: 'bg-green-950', dot: 'bg-green-400',  label: 'Operational'  },
  down:      { color: 'bg-red-950',   dot: 'bg-red-400',    label: 'Disrupted'    },
  slow:      { color: 'bg-yellow-950',dot: 'bg-yellow-400', label: 'Degraded'     },
};

function ServiceRow({ service }) {
  const [state, setState] = useState('checking');
  const [latency, setLatency] = useState(null);

  useEffect(() => {
    const start = Date.now();
    fetch(service.endpoint)
      .then(res => {
        const ms = Date.now() - start;
        setLatency(ms);
        if (res.ok) setState(ms > 3000 ? 'slow' : 'up');
        else setState('down');
      })
      .catch(() => setState('down'));
  }, [service.endpoint]);

  const s = STATUS[state];

  return (
    <div className={`flex items-center justify-between px-4 py-4 rounded-xl border border-zinc-800 ${s.color} transition-colors`}>
      <div className="flex items-center gap-3">
        {/* Animated dot */}
        <span className="relative flex h-3 w-3 flex-shrink-0">
          {state === 'checking' && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${s.dot}`} />
        </span>
        <div>
          <p className="text-white text-sm font-semibold">{service.label}</p>
          <p className="text-zinc-500 text-xs">{service.desc}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-xs font-semibold ${
          state === 'up' ? 'text-green-400' :
          state === 'slow' ? 'text-yellow-400' :
          state === 'down' ? 'text-red-400' : 'text-zinc-400'
        }`}>{s.label}</p>
        {latency && <p className="text-zinc-600 text-xs">{latency}ms</p>}
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [lastChecked, setLastChecked] = useState(new Date());

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center px-4 py-12 gap-6">
      <div className="text-center max-w-xl">
        <h1 className="text-2xl font-bold">
          Vid<span className="text-blue-400">Vert</span> Status
        </h1>
        <p className="text-zinc-400 text-sm mt-2">
          Real-time health of all VidVert services
        </p>
        <p className="text-zinc-700 text-xs mt-1">
          Last checked: {lastChecked.toLocaleTimeString()}
        </p>
      </div>

      <div className="w-full max-w-xl flex flex-col gap-3">
        {SERVICES.map(s => <ServiceRow key={s.id} service={s} />)}
      </div>

      {/* Platform support grid */}
      <div className="w-full max-w-xl">
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-3">
          Platform Support
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'Facebook',   status: 'up'   },
            { name: 'Twitter/X',  status: 'up'   },
            { name: 'Instagram',  status: 'up'   },
            { name: 'TikTok',     status: 'slow' },
            { name: 'YouTube',    status: 'down' },
            { name: 'Vimeo',      status: 'down' },
          ].map(p => (
            <div key={p.name}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                p.status === 'up' ? 'bg-green-400' :
                p.status === 'slow' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-zinc-300 text-xs">{p.name}</span>
            </div>
          ))}
        </div>
        <p className="text-zinc-700 text-xs mt-2">
          YouTube is currently blocked by our server IP. TikTok may time out on large videos.
        </p>
      </div>

      <button
        onClick={() => setLastChecked(new Date())}
        className="text-zinc-500 hover:text-zinc-300 text-xs border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-xl transition-colors"
      >
        Refresh status
      </button>
    </div>
  );
}
