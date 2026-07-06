import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadVideoForProcessing, getConversionStatus, getConverterDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/formatBytes';

const ACCEPT='image/gif,.gif';
const POLL_MS=2000,TIMEOUT_MS=10*60*1000,MAX_FAILS=5;
const save=(url,name)=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);};

export default function GifToMp4() {
  const [file,setFile]=useState(null);const [drag,setDrag]=useState(false);
  const [phase,setPhase]=useState('idle');const [pct,setPct]=useState(0);
  const [jobId,setJobId]=useState(null);const [job,setJob]=useState(null);
  const [err,setErr]=useState(null);const ref=useRef(null);
  const pollRef=useRef(null);const startRef=useRef(null);const fails=useRef(0);
  const done=phase==='done',failed=phase==='error',working=phase==='uploading'||phase==='converting';

  const stopPoll=useCallback(()=>{if(pollRef.current){clearTimeout(pollRef.current);pollRef.current=null;}},[]);
  useEffect(()=>{
    if(!jobId||phase!=='converting') return;
    startRef.current=Date.now(); fails.current=0;
    const tick=async()=>{
      if(Date.now()-startRef.current>TIMEOUT_MS){stopPoll();setPhase('error');setErr('Timed out.');return;}
      try{const d=await getConversionStatus(jobId);fails.current=0;setJob(d);
        if(d.status==='done'){stopPoll();setPhase('done');}
        else if(d.status==='error'){stopPoll();setPhase('error');setErr(d.error||'Failed.');}
        else pollRef.current=setTimeout(tick,POLL_MS);
      }catch{fails.current++;if(fails.current>=MAX_FAILS){stopPoll();setPhase('error');setErr('Server connection lost. Try again.');return;}pollRef.current=setTimeout(tick,POLL_MS*2);}
    };
    tick(); return stopPoll;
  },[jobId,phase,stopPoll]);

  const reset=()=>{stopPoll();setJobId(null);setJob(null);setErr(null);setPhase('idle');setPct(0);};
  const accept=(f)=>{if(!f)return;if(!f.name.match(/\.gif$/i)){setErr('Please select a GIF file.');return;}reset();setFile(f);};
  const start=async()=>{
    reset();setPhase('uploading');setPct(0);
    try{const form=new FormData();form.append('file',file);form.append('filename',file.name.replace(/\.gif$/i,''));
      const d=await uploadVideoForProcessing('gif-to-mp4',form,p=>setPct(p));setJobId(d.jobId);setPhase('converting');
    }catch(e){setPhase('error');setErr(e.message);}
  };
  const progress=phase==='uploading'?pct:(job?.progress||0);

  return(
    <section className="w-full max-w-xl flex flex-col gap-4" aria-label="GIF to MP4">
      <div><h2 className="text-white font-bold text-base">GIF to MP4</h2><p className="text-zinc-500 text-xs mt-0.5">Convert an animated GIF to a compact, shareable MP4 video.</p></div>
      <div onDrop={e=>{e.preventDefault();setDrag(false);accept(e.dataTransfer.files?.[0]);}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onClick={()=>!working&&ref.current?.click()} role="button" tabIndex={0} className={'border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer '+(drag?'border-green-400 bg-green-950/20':file?'border-zinc-600 bg-zinc-900':'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50')+(working?' pointer-events-none opacity-50':'')}>
        <input ref={ref} type="file" accept={ACCEPT} onChange={e=>accept(e.target.files?.[0])} className="hidden"/>
        {file?<div className="flex items-center justify-between gap-3"><div className="text-left overflow-hidden"><p className="text-zinc-200 text-sm font-medium truncate">{file.name}</p><p className="text-zinc-500 text-xs">{formatBytes(file.size)}</p></div>{!working&&<button onClick={e=>{e.stopPropagation();setFile(null);reset();}} className="text-zinc-600 hover:text-zinc-400">✕</button>}</div>:<p className="text-zinc-400 text-sm font-medium">{drag?'Drop GIF here':'Tap or drag a GIF file here'}</p>}
      </div>
      {!done&&<button onClick={start} disabled={working||!file} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">{working?(phase==='uploading'?'Uploading… '+pct+'%':(job?.statusText||'Converting…')):'Convert GIF to MP4'}</button>}
      {working&&<div className="flex flex-col gap-1.5"><div className="flex justify-between"><span className="text-zinc-300 text-xs">{phase==='uploading'?'Uploading… '+pct+'%':(job?.statusText||'Converting…')}</span><span className="text-zinc-500 text-xs">{progress>0?progress+'%':''}</span></div><div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden"><div className={'h-2 '+(phase==='uploading'?'bg-blue-500':'bg-green-500')+' rounded-full transition-all duration-500'} style={{width:progress+'%'}}/></div></div>}
      {done&&<div className="flex flex-col gap-2"><button onClick={()=>save(getConverterDownloadUrl(job.jobId),'video.mp4')} className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">✓ Download MP4{job?.fileSizeBytes?' ('+formatBytes(job.fileSizeBytes)+')':''}</button><button onClick={()=>{reset();setFile(null);}} className="text-zinc-500 hover:text-zinc-300 text-xs text-center py-1">Convert another GIF</button></div>}
      {failed&&<div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3"><span className="text-red-400">⚠</span><div><p className="text-red-300 text-xs">{err}</p><button onClick={()=>{reset();setErr(null);}} className="text-red-400 text-xs mt-1 underline">Try again</button></div></div>}
    </section>
  );
}
