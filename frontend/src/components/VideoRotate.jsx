import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadVideoForProcessing, getConversionStatus, getConverterDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/formatBytes';

const ACCEPT='video/*,.mp4,.mkv,.webm,.avi,.mov,.wmv,.flv,.3gp,.m4v';
const ALLOWED=/\.(mp4|mkv|webm|avi|mov|wmv|flv|3gp|m4v|mpeg|mpg)$/i;
const POLL_MS=2000,TIMEOUT_MS=10*60*1000,MAX_FAILS=5;
const save=(url,name)=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);};
const TRANSFORMS=[
  {id:'cw90',label:'Rotate 90° Clockwise',icon:'↻'},
  {id:'ccw90',label:'Rotate 90° Counter-Clockwise',icon:'↺'},
  {id:'180',label:'Rotate 180°',icon:'⇅'},
  {id:'hflip',label:'Flip Horizontal',icon:'↔'},
  {id:'vflip',label:'Flip Vertical',icon:'↕'},
];

export default function VideoRotate() {
  const [file,setFile]=useState(null);const [drag,setDrag]=useState(false);const [transform,setTransform]=useState('cw90');
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
  const accept=(f)=>{if(!f)return;if(!ALLOWED.test(f.name)){setErr('Please select a video file.');return;}reset();setFile(f);};
  const start=async()=>{
    reset();setPhase('uploading');setPct(0);
    try{const form=new FormData();form.append('file',file);form.append('transform',transform);form.append('filename',file.name.replace(/\.[^.]+$/,''));
      const d=await uploadVideoForProcessing('rotate-video',form,p=>setPct(p));setJobId(d.jobId);setPhase('converting');
    }catch(e){setPhase('error');setErr(e.message);}
  };
  const progress=phase==='uploading'?pct:(job?.progress||0);

  return(
    <section className="w-full max-w-xl flex flex-col gap-4" aria-label="Video Rotate">
      <div><h2 className="text-white font-bold text-base">Rotate / Flip Video</h2><p className="text-zinc-500 text-xs mt-0.5">Fix a video shot in the wrong orientation, or mirror it horizontally or vertically.</p></div>
      <div onDrop={e=>{e.preventDefault();setDrag(false);accept(e.dataTransfer.files?.[0]);}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onClick={()=>!working&&ref.current?.click()} role="button" tabIndex={0} className={'border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer '+(drag?'border-indigo-400 bg-indigo-950/20':file?'border-zinc-600 bg-zinc-900':'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50')+(working?' pointer-events-none opacity-50':'')}>
        <input ref={ref} type="file" accept={ACCEPT} onChange={e=>accept(e.target.files?.[0])} className="hidden"/>
        {file?<div className="flex items-center justify-between gap-3"><div className="text-left overflow-hidden"><p className="text-zinc-200 text-sm font-medium truncate">{file.name}</p><p className="text-zinc-500 text-xs">{formatBytes(file.size)}</p></div>{!working&&<button onClick={e=>{e.stopPropagation();setFile(null);reset();}} className="text-zinc-600 hover:text-zinc-400">✕</button>}</div>:<p className="text-zinc-400 text-sm font-medium">{drag?'Drop video here':'Tap or drag a video file here'}</p>}
      </div>
      <div><p className="text-zinc-400 text-xs mb-2 font-medium uppercase tracking-wide">Transform</p>
        <div className="flex flex-col gap-1.5">{TRANSFORMS.map(t=>(
          <button key={t.id} onClick={()=>!working&&setTransform(t.id)} disabled={working} aria-pressed={transform===t.id}
            className={'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all disabled:opacity-50 '+(transform===t.id?'border-indigo-500 bg-indigo-950/30':'border-zinc-700 bg-zinc-900 hover:border-zinc-600')}>
            <span className="text-zinc-200 text-lg w-6 text-center">{t.icon}</span>
            <span className="text-zinc-200 text-xs font-medium">{t.label}</span>
          </button>
        ))}</div>
      </div>
      {!done&&<button onClick={start} disabled={working||!file} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">{working?(phase==='uploading'?'Uploading… '+pct+'%':(job?.statusText||'Processing…')):'Apply Transform'}</button>}
      {working&&<div className="flex flex-col gap-1.5"><div className="flex justify-between"><span className="text-zinc-300 text-xs">{phase==='uploading'?'Uploading… '+pct+'%':(job?.statusText||'Processing…')}</span><span className="text-zinc-500 text-xs">{progress>0?progress+'%':''}</span></div><div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden"><div className={'h-2 '+(phase==='uploading'?'bg-blue-500':'bg-indigo-500')+' rounded-full transition-all duration-500'} style={{width:progress+'%'}}/></div></div>}
      {done&&<div className="flex flex-col gap-2"><button onClick={()=>save(getConverterDownloadUrl(job.jobId),'video_rotated.mp4')} className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">✓ Download Rotated Video{job?.fileSizeBytes?' ('+formatBytes(job.fileSizeBytes)+')':''}</button><button onClick={()=>{reset();setFile(null);}} className="text-zinc-500 hover:text-zinc-300 text-xs text-center py-1">Rotate another file</button></div>}
      {failed&&<div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3"><span className="text-red-400">⚠</span><div><p className="text-red-300 text-xs">{err}</p><button onClick={()=>{reset();setErr(null);}} className="text-red-400 text-xs mt-1 underline">Try again</button></div></div>}
    </section>
  );
}
