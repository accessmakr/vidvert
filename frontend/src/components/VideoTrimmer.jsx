/**
 * VideoTrimmer.jsx — v2
 *
 * FIX: replaced the single "type HH:MM:SS with colons" text field
 * with three separate number inputs (mobile numeric keyboard, no
 * colon-typing needed) and added a real <video> preview with
 * "Set as Start" / "Set as End" buttons that read the video's
 * current playback position — so you can scrub to the right spot
 * and tap a button instead of guessing timestamps.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadVideoForProcessing, getConversionStatus, getConverterDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/formatBytes';

const ACCEPT='video/*,.mp4,.mkv,.webm,.avi,.mov,.wmv,.flv,.3gp,.m4v,.mpeg,.mpg';
const ALLOWED=/\.(mp4|mkv|webm|avi|mov|wmv|flv|3gp|m4v|mpeg|mpg)$/i;
const POLL_MS=2000,TIMEOUT_MS=10*60*1000;
const MAX_CONSECUTIVE_FAILURES=5;

function saveFile(url,name){const a=document.createElement('a');a.href=url;a.download=name||'video';document.body.appendChild(a);a.click();document.body.removeChild(a);}

function parseHMS(str) {
  const [h=0,m=0,s=0] = (str||'00:00:00').split(':').map(v=>parseInt(v)||0);
  return { h, m, s };
}
function toHMS(h,m,s) {
  const pad=(n)=>String(Math.max(0,n)).padStart(2,'0');
  return `${pad(h)}:${pad(Math.min(59,m))}:${pad(Math.min(59,s))}`;
}
function secondsToHMS(totalSeconds) {
  const t = Math.max(0, Math.floor(totalSeconds||0));
  const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), s = t%60;
  return toHMS(h,m,s);
}

/** Three separate number inputs instead of one free-text field */
function TimeInput({ value, onChange, disabled, label }) {
  const { h, m, s } = parseHMS(value);
  const update = (nh,nm,ns) => onChange(toHMS(nh,nm,ns));
  return (
    <div className="flex flex-col gap-1">
      <label className="text-zinc-500 text-xs">{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" min="0" max="23" value={h} disabled={disabled}
          onChange={(e)=>update(parseInt(e.target.value)||0, m, s)}
          className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-2 text-white text-sm text-center outline-none disabled:opacity-50" />
        <span className="text-zinc-600 text-sm">:</span>
        <input type="number" min="0" max="59" value={m} disabled={disabled}
          onChange={(e)=>update(h, Math.min(59,parseInt(e.target.value)||0), s)}
          className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-2 text-white text-sm text-center outline-none disabled:opacity-50" />
        <span className="text-zinc-600 text-sm">:</span>
        <input type="number" min="0" max="59" value={s} disabled={disabled}
          onChange={(e)=>update(h, m, Math.min(59,parseInt(e.target.value)||0))}
          className="w-12 bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-2 text-white text-sm text-center outline-none disabled:opacity-50" />
      </div>
    </div>
  );
}

export default function VideoTrimmer(){
  const [file,setFile]=useState(null);const [dragging,setDragging]=useState(false);
  const [previewUrl,setPreviewUrl]=useState(null);
  const [startTime,setStartTime]=useState('00:00:00');const [endTime,setEndTime]=useState('');
  const [phase,setPhase]=useState('idle');const [uploadPct,setUploadPct]=useState(0);
  const [jobId,setJobId]=useState(null);const [jobState,setJobState]=useState(null);
  const [error,setError]=useState(null);
  const inputRef=useRef(null);const videoRef=useRef(null);
  const pollRef=useRef(null);const startRef=useRef(null);const failRef=useRef(0);
  const isDone=phase==='done',isFailed=phase==='error',isWorking=phase==='uploading'||phase==='converting';
  const canStart=file&&endTime;

  useEffect(()=>{
    return ()=>{ if(previewUrl) URL.revokeObjectURL(previewUrl); };
  },[previewUrl]);

  const stopPoll=useCallback(()=>{if(pollRef.current){clearTimeout(pollRef.current);pollRef.current=null;}},[]);
  useEffect(()=>{
    if(!jobId||phase!=='converting') return;
    startRef.current=Date.now();
    failRef.current=0;
    const tick=async()=>{
      if(Date.now()-startRef.current>TIMEOUT_MS){stopPoll();setPhase('error');setError('Timed out.');return;}
      try{
        const d=await getConversionStatus(jobId);
        failRef.current=0;
        setJobState(d);
        if(d.status==='done'){stopPoll();setPhase('done');}
        else if(d.status==='error'){stopPoll();setPhase('error');setError(d.error||'Trim failed.');}
        else pollRef.current=setTimeout(tick,POLL_MS);
      }catch{
        failRef.current++;
        if(failRef.current>=MAX_CONSECUTIVE_FAILURES){
          stopPoll();setPhase('error');
          setError('Lost connection to the server — it may have restarted. Please try again.');
          return;
        }
        pollRef.current=setTimeout(tick,POLL_MS*2);
      }
    };
    tick(); return stopPoll;
  },[jobId,phase,stopPoll]);

  const resetJob=()=>{stopPoll();setJobId(null);setJobState(null);setError(null);setPhase('idle');setUploadPct(0);};
  const acceptFile=(f)=>{
    if(!f)return;
    if(!ALLOWED.test(f.name)){setError('Please select a video file.');return;}
    resetJob();setFile(f);
    if(previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setStartTime('00:00:00'); setEndTime('');
  };

  const setStartFromVideo=()=>{ if(videoRef.current) setStartTime(secondsToHMS(videoRef.current.currentTime)); };
  const setEndFromVideo  =()=>{ if(videoRef.current) setEndTime(secondsToHMS(videoRef.current.currentTime)); };

  const start=async()=>{
    if(!canStart) return;
    resetJob();setPhase('uploading');setUploadPct(0);
    try{
      const form=new FormData();
      form.append('file',file);form.append('startTime',startTime);form.append('endTime',endTime);
      form.append('filename',file.name.replace(/\.[^.]+$/,''));
      const d=await uploadVideoForProcessing('trim-video',form,(p)=>setUploadPct(p));
      setJobId(d.jobId);setPhase('converting');
    }catch(e){setPhase('error');setError(e.message);}
  };
  const progress=phase==='uploading'?uploadPct:(jobState?.progress||0);
  const statusLabel=phase==='uploading'?`Uploading… ${uploadPct}%`:(jobState?.statusText||'Trimming…');

  return(
    <section className="w-full max-w-xl flex flex-col gap-4" aria-label="Video Trimmer">
      <div><h2 className="text-white font-bold text-base">Video Trimmer</h2>
        <p className="text-zinc-500 text-xs mt-0.5">Cut a specific section from your video. Fast stream copy — no quality loss.</p></div>

      {!previewUrl ? (
        <div onDrop={(e)=>{e.preventDefault();setDragging(false);acceptFile(e.dataTransfer.files?.[0]);}}
          onDragOver={(e)=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onClick={()=>!isWorking&&inputRef.current?.click()} role="button" tabIndex={0}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${dragging?'border-yellow-400 bg-yellow-950/20':'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'} ${isWorking?'opacity-50 cursor-not-allowed pointer-events-none':'cursor-pointer'}`}>
          <input ref={inputRef} type="file" accept={ACCEPT} onChange={(e)=>acceptFile(e.target.files?.[0])} className="hidden"/>
          <p className="text-zinc-400 text-sm font-medium">{dragging?'Drop video here':'Tap or drag a video file here'}</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
          <video ref={videoRef} src={previewUrl} controls className="w-full max-h-64 bg-black" />
          <div className="flex items-center justify-between gap-2 p-2.5">
            <div className="overflow-hidden flex-1">
              <p className="text-zinc-300 text-xs truncate">{file.name}</p>
              <p className="text-zinc-600 text-xs">{formatBytes(file.size)}</p>
            </div>
            {!isWorking&&<button onClick={()=>{setFile(null);URL.revokeObjectURL(previewUrl);setPreviewUrl(null);resetJob();}}
              className="text-zinc-600 hover:text-zinc-400 flex-shrink-0" aria-label="Remove">✕</button>}
          </div>
          <div className="grid grid-cols-2 gap-2 p-2.5 pt-0">
            <button onClick={setStartFromVideo} disabled={isWorking}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-2 rounded-lg border border-zinc-700 disabled:opacity-50 transition-colors">
              ⏮ Set as Start
            </button>
            <button onClick={setEndFromVideo} disabled={isWorking}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-2 rounded-lg border border-zinc-700 disabled:opacity-50 transition-colors">
              ⏭ Set as End
            </button>
          </div>
          <p className="text-zinc-600 text-xs px-2.5 pb-2.5">Play or scrub the video above, then tap a button to use that moment.</p>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Trim Range</p>
        <div className="flex items-center gap-4">
          <TimeInput value={startTime} onChange={setStartTime} disabled={isWorking} label="Start (H : M : S)" />
          <span className="text-zinc-600 mt-5">→</span>
          <TimeInput value={endTime || '00:00:00'} onChange={setEndTime} disabled={isWorking} label="End (H : M : S)" />
        </div>
      </div>

      {!isDone&&<button onClick={start} disabled={isWorking||!canStart}
        className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">
        {isWorking?statusLabel:'Trim Video'}</button>}

      {isWorking&&(<div className="flex flex-col gap-1.5">
        <div className="flex justify-between"><span className="text-zinc-300 text-xs">{statusLabel}</span><span className="text-zinc-500 text-xs">{progress>0?`${progress}%`:''}</span></div>
        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden"><div className={`h-2 ${phase==='uploading'?'bg-blue-500':'bg-yellow-500'} rounded-full transition-all duration-500`} style={{width:`${progress}%`}}/></div>
      </div>)}

      {isDone&&(<div className="flex flex-col gap-2">
        <button onClick={()=>saveFile(getConverterDownloadUrl(jobState.jobId),`trimmed.mp4`)}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">
          ✓ Download Trimmed Video{jobState?.fileSizeBytes?` (${formatBytes(jobState.fileSizeBytes)})`:''}</button>
        <button onClick={()=>{resetJob();setFile(null);if(previewUrl)URL.revokeObjectURL(previewUrl);setPreviewUrl(null);}} className="text-zinc-500 hover:text-zinc-300 text-xs text-center py-1">Trim another file</button>
      </div>)}

      {isFailed&&(<div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-red-400">⚠</span>
        <div><p className="text-red-300 text-xs">{error}</p>
          <button onClick={()=>{resetJob();setError(null);}} className="text-red-400 text-xs mt-1 underline">Try again</button></div>
      </div>)}
    </section>
  );
}
