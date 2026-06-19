import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadVideoForProcessing, getConversionStatus, getConverterDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/formatBytes';

const RATIOS = [
  { id: '9:16', label: 'Vertical',   desc: 'TikTok · Reels · Shorts' },
  { id: '1:1',  label: 'Square',     desc: 'Instagram Feed'          },
  { id: '4:5',  label: 'Portrait',   desc: 'Instagram Feed'          },
  { id: '16:9', label: 'Horizontal', desc: 'YouTube · Landscape'     },
];
const ACCEPT='video/*,.mp4,.mkv,.webm,.avi,.mov,.wmv,.flv,.3gp,.m4v,.mpeg,.mpg';
const ALLOWED=/\.(mp4|mkv|webm|avi|mov|wmv|flv|3gp|m4v|mpeg|mpg)$/i;
const POLL_MS=2000,TIMEOUT_MS=10*60*1000;
function saveFile(url,name){const a=document.createElement('a');a.href=url;a.download=name||'video';document.body.appendChild(a);a.click();document.body.removeChild(a);}

export default function VideoReframe(){
  const [file,setFile]=useState(null);const [dragging,setDragging]=useState(false);
  const [ratio,setRatio]=useState('9:16');
  const [phase,setPhase]=useState('idle');const [uploadPct,setUploadPct]=useState(0);
  const [jobId,setJobId]=useState(null);const [jobState,setJobState]=useState(null);
  const [error,setError]=useState(null);const inputRef=useRef(null);
  const pollRef=useRef(null);const startRef=useRef(null);
  const isDone=phase==='done',isFailed=phase==='error',isWorking=phase==='uploading'||phase==='converting';

  const stopPoll=useCallback(()=>{if(pollRef.current){clearTimeout(pollRef.current);pollRef.current=null;}},[]);
  useEffect(()=>{
    if(!jobId||phase!=='converting') return;
    startRef.current=Date.now();
    const tick=async()=>{
      if(Date.now()-startRef.current>TIMEOUT_MS){stopPoll();setPhase('error');setError('Timed out.');return;}
      try{const d=await getConversionStatus(jobId);setJobState(d);
        if(d.status==='done'){stopPoll();setPhase('done');}
        else if(d.status==='error'){stopPoll();setPhase('error');setError(d.error||'Reframe failed.');}
        else pollRef.current=setTimeout(tick,POLL_MS);
      }catch{pollRef.current=setTimeout(tick,POLL_MS*2);}
    };
    tick(); return stopPoll;
  },[jobId,phase,stopPoll]);

  const resetJob=()=>{stopPoll();setJobId(null);setJobState(null);setError(null);setPhase('idle');setUploadPct(0);};
  const acceptFile=(f)=>{if(!f)return;if(!ALLOWED.test(f.name)){setError('Please select a video file.');return;}resetJob();setFile(f);};
  const start=async()=>{
    resetJob();setPhase('uploading');setUploadPct(0);
    try{
      const form=new FormData();
      form.append('file',file);form.append('ratio',ratio);
      form.append('filename',file.name.replace(/\.[^.]+$/,''));
      const d=await uploadVideoForProcessing('reframe-video',form,(p)=>setUploadPct(p));
      setJobId(d.jobId);setPhase('converting');
    }catch(e){setPhase('error');setError(e.message);}
  };
  const progress=phase==='uploading'?uploadPct:(jobState?.progress||0);
  const statusLabel=phase==='uploading'?`Uploading… ${uploadPct}%`:(jobState?.statusText||'Reframing…');

  return(
    <section className="w-full max-w-xl flex flex-col gap-4" aria-label="Video Reframe">
      <div><h2 className="text-white font-bold text-base">Reframe for Social Media</h2>
        <p className="text-zinc-500 text-xs mt-0.5">Resize any video for TikTok, Reels, Shorts, or Instagram. No content is cropped out — a blurred background fills the empty space.</p></div>
      <div onDrop={(e)=>{e.preventDefault();setDragging(false);acceptFile(e.dataTransfer.files?.[0]);}}
        onDragOver={(e)=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
        onClick={()=>!isWorking&&inputRef.current?.click()} role="button" tabIndex={0}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${dragging?'border-teal-400 bg-teal-950/20':file?'border-zinc-600 bg-zinc-900':'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'} ${isWorking?'opacity-50 cursor-not-allowed pointer-events-none':'cursor-pointer'}`}>
        <input ref={inputRef} type="file" accept={ACCEPT} onChange={(e)=>acceptFile(e.target.files?.[0])} className="hidden"/>
        {file?(<div className="flex items-center justify-between gap-3">
          <div className="text-left overflow-hidden"><p className="text-zinc-200 text-sm font-medium truncate">{file.name}</p>
            <p className="text-zinc-500 text-xs">{formatBytes(file.size)}</p></div>
          {!isWorking&&<button onClick={(e)=>{e.stopPropagation();setFile(null);resetJob();}} className="text-zinc-600 hover:text-zinc-400">✕</button>}
        </div>):(<p className="text-zinc-400 text-sm font-medium">{dragging?'Drop video here':'Tap or drag a video file here'}</p>)}
      </div>
      <div><p className="text-zinc-400 text-xs mb-2 font-medium uppercase tracking-wide">Output Shape</p>
        <div className="grid grid-cols-2 gap-2">{RATIOS.map(r=>(
          <button key={r.id} onClick={()=>!isWorking&&setRatio(r.id)} disabled={isWorking} aria-pressed={ratio===r.id}
            className={`flex flex-col items-center py-3 rounded-xl border text-center transition-all disabled:opacity-50 ${ratio===r.id?'border-teal-500 bg-teal-950/30 text-white':'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'}`}>
            <span className="font-bold text-sm">{r.label}</span><span className="text-xs opacity-60 mt-0.5">{r.id}</span>
            <span className="text-xs opacity-50 mt-0.5">{r.desc}</span>
          </button>))}</div></div>
      {!isDone&&<button onClick={start} disabled={isWorking||!file}
        className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">
        {isWorking?statusLabel:'Reframe Video'}</button>}
      {isWorking&&(<div className="flex flex-col gap-1.5">
        <div className="flex justify-between"><span className="text-zinc-300 text-xs">{statusLabel}</span><span className="text-zinc-500 text-xs">{progress>0?`${progress}%`:''}</span></div>
        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden"><div className={`h-2 ${phase==='uploading'?'bg-blue-500':'bg-teal-500'} rounded-full transition-all duration-500`} style={{width:`${progress}%`}}/></div>
      </div>)}
      {isDone&&(<div className="flex flex-col gap-2">
        <button onClick={()=>saveFile(getConverterDownloadUrl(jobState.jobId),`reframed_${ratio.replace(':','x')}.mp4`)}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">
          ✓ Download Reframed Video{jobState?.fileSizeBytes?` (${formatBytes(jobState.fileSizeBytes)})`:''}</button>
        <button onClick={()=>{resetJob();setFile(null);}} className="text-zinc-500 hover:text-zinc-300 text-xs text-center py-1">Reframe another file</button>
      </div>)}
      {isFailed&&(<div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-red-400">⚠</span>
        <div><p className="text-red-300 text-xs">{error}</p>
          <button onClick={()=>{resetJob();setError(null);}} className="text-red-400 text-xs mt-1 underline">Try again</button></div>
      </div>)}
    </section>
  );
}
