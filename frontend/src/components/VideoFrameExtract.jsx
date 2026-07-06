import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadVideoForProcessing, getConversionStatus, getConverterDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/formatBytes';

const ACCEPT='video/*,.mp4,.mkv,.webm,.avi,.mov,.wmv,.flv,.3gp,.m4v';
const ALLOWED=/\.(mp4|mkv|webm|avi|mov|wmv|flv|3gp|m4v|mpeg|mpg)$/i;
const POLL_MS=2000,TIMEOUT_MS=5*60*1000,MAX_FAILS=5;
const save=(url,name)=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);};
function toHMS(h,m,s){const pad=n=>String(Math.max(0,n)).padStart(2,'0');return pad(h)+':'+pad(Math.min(59,m))+':'+pad(Math.min(59,s));}
function secondsToHMS(t){const s=Math.max(0,Math.floor(t||0));return toHMS(Math.floor(s/3600),Math.floor((s%3600)/60),s%60);}

export default function VideoFrameExtract() {
  const [file,setFile]=useState(null);const [drag,setDrag]=useState(false);const [previewUrl,setPreviewUrl]=useState(null);const [timestamp,setTimestamp]=useState('00:00:01');
  const [phase,setPhase]=useState('idle');const [pct,setPct]=useState(0);
  const [jobId,setJobId]=useState(null);const [job,setJob]=useState(null);
  const [err,setErr]=useState(null);const ref=useRef(null);const videoRef=useRef(null);
  const pollRef=useRef(null);const startRef=useRef(null);const fails=useRef(0);
  const done=phase==='done',failed=phase==='error',working=phase==='uploading'||phase==='converting';

  useEffect(()=>()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);},[previewUrl]);
  const stopPoll=useCallback(()=>{if(pollRef.current){clearTimeout(pollRef.current);pollRef.current=null;}},[]);
  useEffect(()=>{if(!jobId||phase!=='converting') return;startRef.current=Date.now();fails.current=0;
    const tick=async()=>{if(Date.now()-startRef.current>TIMEOUT_MS){stopPoll();setPhase('error');setErr('Timed out.');return;}
      try{const d=await getConversionStatus(jobId);fails.current=0;setJob(d);if(d.status==='done'){stopPoll();setPhase('done');}else if(d.status==='error'){stopPoll();setPhase('error');setErr(d.error||'Failed.');}else pollRef.current=setTimeout(tick,POLL_MS);}
      catch{fails.current++;if(fails.current>=MAX_FAILS){stopPoll();setPhase('error');setErr('Server connection lost.');return;}pollRef.current=setTimeout(tick,POLL_MS*2);}
    };tick();return stopPoll;
  },[jobId,phase,stopPoll]);

  const reset=()=>{stopPoll();setJobId(null);setJob(null);setErr(null);setPhase('idle');setPct(0);};
  const accept=(f)=>{if(!f)return;if(!ALLOWED.test(f.name)){setErr('Please select a video file.');return;}reset();setFile(f);if(previewUrl)URL.revokeObjectURL(previewUrl);setPreviewUrl(URL.createObjectURL(f));};
  const setFromVideo=()=>{if(videoRef.current)setTimestamp(secondsToHMS(videoRef.current.currentTime));};
  const start=async()=>{reset();setPhase('uploading');setPct(0);
    try{const form=new FormData();form.append('file',file);form.append('timestamp',timestamp);form.append('filename',file.name.replace(/\.[^.]+$/,''));
      const d=await uploadVideoForProcessing('extract-frame',form,p=>setPct(p));setJobId(d.jobId);setPhase('converting');
    }catch(e){setPhase('error');setErr(e.message);}};

  return(
    <section className="w-full max-w-xl flex flex-col gap-4" aria-label="Extract Video Frame">
      <div><h2 className="text-white font-bold text-base">Extract Video Frame</h2><p className="text-zinc-500 text-xs mt-0.5">Save any single frame from a video as a JPG image.</p></div>
      {!previewUrl?<div onDrop={e=>{e.preventDefault();setDrag(false);accept(e.dataTransfer.files?.[0]);}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onClick={()=>!working&&ref.current?.click()} role="button" tabIndex={0} className={'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all '+(drag?'border-fuchsia-400 bg-fuchsia-950/20':'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50')+(working?' pointer-events-none opacity-50':'')}>
        <input ref={ref} type="file" accept={ACCEPT} onChange={e=>accept(e.target.files?.[0])} className="hidden"/>
        <p className="text-zinc-400 text-sm font-medium">{drag?'Drop video here':'Tap or drag a video file here'}</p>
      </div>:
      <div className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
        <video ref={videoRef} src={previewUrl} controls className="w-full max-h-56 bg-black"/>
        <div className="flex items-center justify-between gap-2 p-2.5">
          <div className="overflow-hidden flex-1"><p className="text-zinc-300 text-xs truncate">{file.name}</p><p className="text-zinc-600 text-xs">{formatBytes(file.size)}</p></div>
          {!working&&<button onClick={()=>{setFile(null);URL.revokeObjectURL(previewUrl);setPreviewUrl(null);reset();}} className="text-zinc-600 hover:text-zinc-400 flex-shrink-0">✕</button>}
        </div>
        <div className="px-2.5 pb-2.5 flex flex-col gap-2">
          <button onClick={setFromVideo} disabled={working} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-2 rounded-lg border border-zinc-700 disabled:opacity-50">⏸ Use Current Playback Position</button>
          <div className="flex items-center gap-2"><label className="text-zinc-500 text-xs flex-shrink-0">Timestamp</label><input type="text" value={timestamp} onChange={e=>setTimestamp(e.target.value)} placeholder="00:00:01" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono"/></div>
        </div>
      </div>}
      {!done&&<button onClick={start} disabled={working||!file} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">{working?(phase==='uploading'?'Uploading… '+pct+'%':'Extracting frame…'):'Extract Frame as JPG'}</button>}
      {working&&<div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden"><div className={'h-2 '+(phase==='uploading'?'bg-blue-500':'bg-fuchsia-500')+' rounded-full transition-all duration-500'} style={{width:(phase==='uploading'?pct:(job?.progress||0))+'%'}}/></div>}
      {done&&<div className="flex flex-col gap-2"><button onClick={()=>save(getConverterDownloadUrl(job.jobId),'frame.jpg')} className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">✓ Download Frame JPG{job?.fileSizeBytes?' ('+formatBytes(job.fileSizeBytes)+')':''}</button><button onClick={()=>{reset();setFile(null);if(previewUrl)URL.revokeObjectURL(previewUrl);setPreviewUrl(null);}} className="text-zinc-500 hover:text-zinc-300 text-xs text-center py-1">Extract another frame</button></div>}
      {failed&&<div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3"><span className="text-red-400">⚠</span><div><p className="text-red-300 text-xs">{err}</p><button onClick={()=>{reset();setErr(null);}} className="text-red-400 text-xs mt-1 underline">Try again</button></div></div>}
    </section>
  );
}
