import { useState, useRef, useCallback, useEffect } from 'react';
import { getConversionStatus, getConverterDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/formatBytes';

const ALLOWED=/\.(mp3|m4a|aac|wav|flac|ogg|wma|aiff)$/i;
const POLL_MS=2000,TIMEOUT_MS=10*60*1000,MAX_FAILS=5;
const CONVERTER_URL=import.meta.env.VITE_CONVERTER_URL??'';
const save=(url,name)=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);};

function uploadAudioFiles(files,onProgress){
  return new Promise((resolve,reject)=>{
    const form=new FormData();
    files.forEach(f=>form.append('files',f));
    const xhr=new XMLHttpRequest();
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round((e.loaded/e.total)*100));};
    xhr.onload=()=>{try{const d=JSON.parse(xhr.responseText);if(xhr.status>=200&&xhr.status<300)resolve(d);else reject(new Error(d.error||'Upload failed'));}catch{reject(new Error('Upload failed'));}};
    xhr.onerror=()=>reject(new Error('Network error'));
    xhr.timeout=10*60*1000;
    xhr.open('POST',CONVERTER_URL+'/merge-audio');
    xhr.send(form);
  });
}

export default function AudioMerge() {
  const [files,setFiles]=useState([]);const [drag,setDrag]=useState(false);
  const [phase,setPhase]=useState('idle');const [pct,setPct]=useState(0);
  const [jobId,setJobId]=useState(null);const [job,setJob]=useState(null);
  const [err,setErr]=useState(null);const ref=useRef(null);
  const pollRef=useRef(null);const startRef=useRef(null);const fails=useRef(0);
  const done=phase==='done',failed=phase==='error',working=phase==='uploading'||phase==='converting';

  const stopPoll=useCallback(()=>{if(pollRef.current){clearTimeout(pollRef.current);pollRef.current=null;}},[]);
  useEffect(()=>{if(!jobId||phase!=='converting') return;startRef.current=Date.now();fails.current=0;
    const tick=async()=>{if(Date.now()-startRef.current>TIMEOUT_MS){stopPoll();setPhase('error');setErr('Timed out.');return;}
      try{const d=await getConversionStatus(jobId);fails.current=0;setJob(d);if(d.status==='done'){stopPoll();setPhase('done');}else if(d.status==='error'){stopPoll();setPhase('error');setErr(d.error||'Failed.');}else pollRef.current=setTimeout(tick,POLL_MS);}
      catch{fails.current++;if(fails.current>=MAX_FAILS){stopPoll();setPhase('error');setErr('Server connection lost.');return;}pollRef.current=setTimeout(tick,POLL_MS*2);}
    };tick();return stopPoll;
  },[jobId,phase,stopPoll]);

  const reset=()=>{stopPoll();setJobId(null);setJob(null);setErr(null);setPhase('idle');setPct(0);};
  const addFiles=e=>{const nf=Array.from(e.target.files||[]).filter(f=>ALLOWED.test(f.name));setFiles(prev=>[...prev,...nf]);e.target.value='';};
  const removeFile=i=>setFiles(prev=>prev.filter((_,idx)=>idx!==i));
  const start=async()=>{if(files.length<2){setErr('Add at least 2 audio files to merge.');return;}reset();setPhase('uploading');setPct(0);
    try{const d=await uploadAudioFiles(files,p=>setPct(p));setJobId(d.jobId);setPhase('converting');}
    catch(e){setPhase('error');setErr(e.message);}};
  const progress=phase==='uploading'?pct:(job?.progress||0);

  return(
    <section className="w-full max-w-xl flex flex-col gap-4" aria-label="Audio Merge">
      <div><h2 className="text-white font-bold text-base">Audio Merge</h2><p className="text-zinc-500 text-xs mt-0.5">Join multiple audio files into one. Clips are joined in the order shown.</p></div>
      <div onDrop={e=>{e.preventDefault();setDrag(false);const nf=Array.from(e.dataTransfer.files).filter(f=>ALLOWED.test(f.name));setFiles(prev=>[...prev,...nf]);}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onClick={()=>!working&&ref.current?.click()} role="button" tabIndex={0}
        className={'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all '+(drag?'border-purple-400 bg-purple-950/20':'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50')+(working?' pointer-events-none opacity-50':'')}>
        <input ref={ref} type="file" multiple accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.wma,.aiff" onChange={addFiles} className="hidden"/>
        <p className="text-zinc-400 text-sm font-medium">{drag?'Drop audio files here':'Tap to add audio files'}</p>
        <p className="text-zinc-600 text-xs mt-1">MP3 · M4A · WAV · FLAC · OGG and more</p>
      </div>
      {files.length>0&&<div className="flex flex-col gap-1.5">
        {files.map((f,i)=>(
          <div key={i} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
            <span className="text-zinc-600 text-xs font-mono w-5 flex-shrink-0">{i+1}</span>
            <div className="flex-1 overflow-hidden"><p className="text-zinc-200 text-xs truncate">{f.name}</p><p className="text-zinc-600 text-xs">{formatBytes(f.size)}</p></div>
            {!working&&<button onClick={()=>removeFile(i)} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>}
          </div>
        ))}
        {!working&&<button onClick={()=>ref.current?.click()} className="text-zinc-500 hover:text-zinc-300 text-xs py-1 text-center">+ Add more files</button>}
      </div>}
      {!done&&<button onClick={start} disabled={working||files.length<2} className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">{working?(phase==='uploading'?'Uploading… '+pct+'%':(job?.statusText||'Merging…')):'Merge '+files.length+' Audio Files'}</button>}
      {working&&<div className="flex flex-col gap-1.5"><div className="flex justify-between"><span className="text-zinc-300 text-xs">{phase==='uploading'?'Uploading… '+pct+'%':(job?.statusText||'Merging…')}</span><span className="text-zinc-500 text-xs">{progress>0?progress+'%':''}</span></div><div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden"><div className={'h-2 '+(phase==='uploading'?'bg-blue-500':'bg-purple-500')+' rounded-full transition-all duration-500'} style={{width:progress+'%'}}/></div></div>}
      {done&&<div className="flex flex-col gap-2"><button onClick={()=>save(getConverterDownloadUrl(job.jobId),'merged_audio.mp3')} className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">✓ Download Merged Audio{job?.fileSizeBytes?' ('+formatBytes(job.fileSizeBytes)+')':''}</button><button onClick={()=>{reset();setFiles([]);}} className="text-zinc-500 hover:text-zinc-300 text-xs text-center py-1">Merge another batch</button></div>}
      {failed&&<div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3"><span className="text-red-400">⚠</span><div><p className="text-red-300 text-xs">{err}</p><button onClick={()=>{reset();setErr(null);}} className="text-red-400 text-xs mt-1 underline">Try again</button></div></div>}
    </section>
  );
}
