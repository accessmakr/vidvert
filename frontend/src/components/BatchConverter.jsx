/**
 * VidVert — BatchConverter.jsx
 *
 * Multi-file audio conversion. Up to MAX_CONCURRENT files process
 * simultaneously; the rest queue automatically and start as slots
 * free up. Concurrency is capped client-side because the backend
 * runs on a single free-tier Render instance — uncapped parallel
 * FFmpeg processes would slow every job down at once.
 *
 * No backend changes required — reuses the existing /jobs endpoint,
 * which already creates independent jobs per call.
 */

import { useState, useRef, useEffect } from 'react';
import { uploadFileForConversion, getConversionStatus, getConverterDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/formatBytes';

const FORMATS = [
  { id: 'mp3',  label: 'MP3',  lossless: false },
  { id: 'm4a',  label: 'M4A',  lossless: false },
  { id: 'aac',  label: 'AAC',  lossless: false },
  { id: 'wav',  label: 'WAV',  lossless: true  },
  { id: 'flac', label: 'FLAC', lossless: true  },
  { id: 'ogg',  label: 'OGG',  lossless: false },
];
const QUALITIES = ['64', '128', '192', '256', '320'];
const ALLOWED_EXTS = /\.(mp4|mov|avi|webm|mkv|m4v|flv|wmv|mpeg|mpg|3gp|mp3|m4a|aac|wav|flac|ogg)$/i;

const MAX_CONCURRENT = 2; // free-tier backend — keep this conservative
const POLL_MS = 2000;

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function StatusBadge({ status }) {
  const map = {
    queued:     { label: 'Queued',     cls: 'text-zinc-500 bg-zinc-800'    },
    uploading:  { label: 'Uploading',  cls: 'text-blue-400 bg-blue-950'    },
    converting: { label: 'Converting', cls: 'text-purple-400 bg-purple-950'},
    done:       { label: 'Done',       cls: 'text-green-400 bg-green-950'  },
    error:      { label: 'Failed',     cls: 'text-red-400 bg-red-950'      },
  };
  const s = map[status] || map.queued;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>;
}

export default function BatchConverter() {
  const [files,   setFiles]   = useState([]);
  const [format,  setFormat]  = useState('mp3');
  const [quality, setQuality] = useState('128');
  const [started, setStarted] = useState(false);

  const inputRef  = useRef(null);
  const pollRefs  = useRef({});
  const activeRef = useRef(0);
  const filesRef  = useRef([]); // always-current mirror of `files`, avoids stale closures

  const isLossless = FORMATS.find(f => f.id === format)?.lossless ?? false;

  // setFiles wrapper that keeps filesRef in sync synchronously
  const setFilesSynced = (updater) => {
    setFiles(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      filesRef.current = next;
      return next;
    });
  };

  const updateFile = (id, patch) =>
    setFilesSynced(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));

  // Cleanup any pending polls on unmount
  useEffect(() => {
    return () => { Object.values(pollRefs.current).forEach(clearTimeout); };
  }, []);

  const addFiles = (fileList) => {
    const accepted = Array.from(fileList).filter(f => ALLOWED_EXTS.test(f.name));
    if (!accepted.length) return;
    setFilesSynced(prev => [
      ...prev,
      ...accepted.map(file => ({
        id: uid(), file, status: 'queued',
        uploadPct: 0, jobId: null, progress: 0, eta: null,
        error: null, fileSizeBytes: null,
      })),
    ]);
  };

  const removeFile = (id) => {
    if (pollRefs.current[id]) { clearTimeout(pollRefs.current[id]); delete pollRefs.current[id]; }
    setFilesSynced(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    Object.values(pollRefs.current).forEach(clearTimeout);
    pollRefs.current = {};
    activeRef.current = 0;
    setStarted(false);
    setFilesSynced([]);
  };

  function startNext() {
    if (activeRef.current >= MAX_CONCURRENT) return;
    const next = filesRef.current.find(f => f.status === 'queued');
    if (next) processFile(next);
  }

  function pollStatus(id, jobId) {
    const tick = async () => {
      try {
        const data = await getConversionStatus(jobId);
        updateFile(id, { progress: data.progress || 0, eta: data.eta, fileSizeBytes: data.fileSizeBytes });
        if (data.status === 'done') {
          updateFile(id, { status: 'done', progress: 100 });
          activeRef.current--; startNext();
        } else if (data.status === 'error') {
          updateFile(id, { status: 'error', error: data.error || 'Conversion failed' });
          activeRef.current--; startNext();
        } else {
          pollRefs.current[id] = setTimeout(tick, POLL_MS);
        }
      } catch {
        pollRefs.current[id] = setTimeout(tick, POLL_MS * 2);
      }
    };
    tick();
  }

  function processFile(item) {
    activeRef.current++;
    updateFile(item.id, { status: 'uploading', uploadPct: 0 });

    const form = new FormData();
    form.append('file', item.file);
    form.append('format', format);
    form.append('quality', quality);
    form.append('filename', item.file.name.replace(/\.[^.]+$/, ''));

    uploadFileForConversion(form, (pct) => updateFile(item.id, { uploadPct: pct }))
      .then(data => {
        updateFile(item.id, { status: 'converting', jobId: data.jobId });
        pollStatus(item.id, data.jobId);
      })
      .catch(e => {
        updateFile(item.id, { status: 'error', error: e.message });
        activeRef.current--; startNext();
      });
  }

  const startAll = () => {
    setStarted(true);
    for (let i = 0; i < MAX_CONCURRENT; i++) startNext();
  };

  const handleDownload = (item) => {
    const url = getConverterDownloadUrl(item.jobId);
    const a = document.createElement('a');
    a.href = url; a.download = `${item.file.name.replace(/\.[^.]+$/, '')}.${format}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const queuedCount = files.filter(f => f.status === 'queued').length;
  const doneCount   = files.filter(f => f.status === 'done').length;
  const hasFiles    = files.length > 0;
  const canStart    = !started && files.some(f => f.status === 'queued');

  return (
    <section className="w-full max-w-xl flex flex-col gap-4" aria-label="Batch Audio Converter">

      <div>
        <h2 className="text-white font-bold text-base">Batch Audio Converter</h2>
        <p className="text-zinc-500 text-xs mt-0.5">
          Convert multiple files at once. Up to {MAX_CONCURRENT} run at the same time — the rest queue automatically.
        </p>
      </div>

      {/* Drop / select zone */}
      <div
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0}
        className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 rounded-xl p-5 text-center cursor-pointer transition-all"
      >
        <input
          ref={inputRef} type="file" multiple
          accept="video/*,audio/*,.mp4,.mov,.avi,.webm,.mkv,.mp3,.m4a,.wav,.ogg,.flac"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
        <p className="text-zinc-400 text-sm font-medium">Tap or drag multiple files here</p>
        <p className="text-zinc-600 text-xs mt-1">You can keep adding files before or after starting</p>
      </div>

      {/* Format + quality — locked once batch starts */}
      <div>
        <p className="text-zinc-400 text-xs mb-2 font-medium uppercase tracking-wide">
          Output Format <span className="text-zinc-600">— applies to all files</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map(f => (
            <button key={f.id} onClick={() => !started && setFormat(f.id)} disabled={started}
              aria-pressed={format === f.id}
              className={`flex flex-col items-center py-2.5 rounded-xl border text-center transition-all disabled:opacity-40
                ${format === f.id ? 'border-blue-500 bg-blue-950 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}>
              <span className="font-bold text-sm">{f.label}</span>
              {f.lossless && <span className="text-xs text-green-400 mt-0.5">lossless</span>}
            </button>
          ))}
        </div>
      </div>

      {!isLossless && (
        <div>
          <p className="text-zinc-400 text-xs mb-2 font-medium uppercase tracking-wide">Bitrate</p>
          <div className="grid grid-cols-5 gap-1.5">
            {QUALITIES.map(q => (
              <button key={q} onClick={() => !started && setQuality(q)} disabled={started}
                aria-pressed={quality === q}
                className={`flex flex-col items-center py-2 rounded-xl border text-xs transition-all disabled:opacity-40
                  ${quality === q ? 'border-blue-500 bg-blue-950 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}>
                <span className="font-semibold">{q}</span><span className="opacity-60">kbps</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File list */}
      {hasFiles && (
        <div className="flex flex-col gap-2">
          {files.map(item => (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="overflow-hidden flex-1">
                  <p className="text-zinc-200 text-xs font-medium truncate">{item.file.name}</p>
                  <p className="text-zinc-600 text-xs">{formatBytes(item.file.size)}</p>
                </div>
                <StatusBadge status={item.status} />
                {item.status === 'queued' && (
                  <button onClick={() => removeFile(item.id)} className="text-zinc-600 hover:text-zinc-400 flex-shrink-0" aria-label="Remove">✕</button>
                )}
              </div>

              {(item.status === 'uploading' || item.status === 'converting') && (
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${item.status === 'uploading' ? 'bg-blue-500' : 'bg-purple-500'}`}
                    style={{ width: `${item.status === 'uploading' ? item.uploadPct : item.progress}%` }}
                  />
                </div>
              )}

              {item.status === 'done' && (
                <button onClick={() => handleDownload(item)}
                  className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                  ✓ Download {format.toUpperCase()}{item.fileSizeBytes ? ` (${formatBytes(item.fileSizeBytes)})` : ''}
                </button>
              )}

              {item.status === 'error' && (
                <p className="text-red-400 text-xs">{item.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {hasFiles && (
        <div className="flex gap-2">
          {canStart && (
            <button onClick={startAll}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-colors">
              Convert All ({queuedCount} {queuedCount === 1 ? 'file' : 'files'})
            </button>
          )}
          {started && (
            <button onClick={clearAll}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 rounded-xl border border-zinc-700 transition-colors">
              {doneCount === files.length ? 'Convert another batch' : 'Clear and start over'}
            </button>
          )}
        </div>
      )}

    </section>
  );
}
