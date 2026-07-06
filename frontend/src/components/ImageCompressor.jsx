import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadVideoForProcessing, getConversionStatus, getConverterDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/formatBytes';

const ACCEPT='image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
const ALLOWED=/\.(jpg|jpeg|png|webp)$/i;
const LEVELS=[{id:'2',label:'Maximum Quality',desc:'Smallest compression, largest file'},{id:'8',label:'Balanced',desc:'Good quality, noticeably smaller'},{id:'18',label:'Maximum Compress',desc:'Smallest file, some quality loss'}];
const POLL_MS=2000,TIMEOUT_MS=5*60*1000,MAX_FAILS=5;
const save=(url,name)=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);};

export default function ImageCompressor() {
  const [file,setFile]=useState(null);const [drag,setDrag]=useState(false);const [quality,setQuality]=useState('8');const [preview,setPreview]=useState(null);
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
  const accept=(f)=>{if(!f)return;if(!ALLOWED.test(f.name)){setErr('Please select a JPG, PNG or WebP file.');return;}reset();setFile(f);if(preview)URL.revokeObjectURL(preview);setPreview(URL.createObjectURL(f));};
  const start=async()=>{reset();setPhase('uploading');setPct(0);
    try{const form=new FormData();form.append('file',file);form.append('quality',quality);form.append('filename',file.name.replace(/\.[^.]+$/,''));
      const d=await uploadVideoForProcessing('compress-image',form,p=>setPct(p));setJobId(d.jobId);setPhase('converting');
    }catch(e){setPhase('error');setErr(e.message);}};
  const ext=file?file.name.split('.').pop():'jpg';

  return(
    <section className="w-full max-w-xl flex flex-col gap-4" aria-label="Image Compressor">
      <div><h2 className="text-white font-bold text-base">Image Compressor</h2><p className="text-zinc-500 text-xs mt-0.5">Reduce JPG, PNG and WebP file size without changing the image dimensions.</p></div>
      <div onDrop={e=>{e.preventDefault();setDrag(false);accept(e.dataTransfer.files?.[0]);}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onClick={()=>!working&&ref.current?.click()} role="button" tabIndex={0} className={'border-2 border-dashed rounded-xl overflow-hidden transition-all cursor-pointer '+(drag?'border-amber-400 bg-amber-950/20':file?'border-zinc-600':'border-zinc-700 hover:border-zinc-500')+(working?' pointer-events-none opacity-50':'')}>
        <input ref={ref} type="file" accept={ACCEPT} onChange={e=>accept(e.target.files?.[0])} className="hidden"/>
        {preview&&file?<div className="relative"><img src={preview} alt="Preview" className="w-full max-h-40 object-contain bg-zinc-900"/><div className="absolute bottom-0 left-0 right-0 bg-zinc-950/80 px-3 py-2 flex justify-between"><span className="text-zinc-300 text-xs truncate">{file.name}</span><span className="text-zinc-500 text-xs">{formatBytes(file.size)}</span></div>{!working&&<button onClick={e=>{e.stopPropagation();setFile(null);setPreview(null);reset();}} className="absolute top-2 right-2 bg-zinc-950/80 text-zinc-400 hover:text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">✕</button>}</div>:<div className="p-8 text-center"><p className="text-zinc-400 text-sm font-medium">{drag?'Drop image here':'Tap or drag a JPG, PNG or WebP file here'}</p></div>}
      </div>
      <div><p className="text-zinc-400 text-xs mb-2 font-medium uppercase tracking-wide">Compression Level</p>
        <div className="flex flex-col gap-1.5">{LEVELS.map(l=>(
          <button key={l.id} onClick={()=>!working&&setQuality(l.id)} disabled={working} aria-pressed={quality===l.id}
            className={'flex items-center justify-between px-4 py-3 rounded-xl border transition-all disabled:opacity-50 '+(quality===l.id?'border-amber-500 bg-amber-950/30 text-white':'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600')}>
            <div className="text-left"><p className="font-semibold text-sm">{l.label}</p><p className="text-xs opacity-70">{l.desc}</p></div>
            <span className={'w-4 h-4 rounded-full border-2 flex-shrink-0 '+(quality===l.id?'border-amber-400 bg-amber-400':'border-zinc-600')}/>
          </button>))}
      </div></div>
      {!done&&<button onClick={start} disabled={working||!file} className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">{working?(phase==='uploading'?'Uploading… '+pct+'%':'Compressing…'):'Compress Image'}</button>}
      {working&&<div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden"><div className={'h-2 '+(phase==='uploading'?'bg-blue-500':'bg-amber-500')+' rounded-full transition-all duration-500'} style={{width:(phase==='uploading'?pct:(job?.progress||0))+'%'}}/></div>}
      {done&&<div className="flex flex-col gap-2">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex justify-between text-xs"><span className="text-zinc-400">Original</span><span className="text-zinc-300 font-mono">{formatBytes(file?.size)}</span><span className="text-zinc-600">→</span><span className="text-zinc-400">Compressed</span><span className="text-green-400 font-mono">{formatBytes(job?.fileSizeBytes)}</span></div>
        <button onClick={()=>save(getConverterDownloadUrl(job.jobId),'image_compressed.'+ext)} className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">✓ Download Compressed Image{job?.fileSizeBytes?' ('+formatBytes(job.fileSizeBytes)+')':''}</button>
        <button onClick={()=>{reset();setFile(null);setPreview(null);}} className="text-zinc-500 hover:text-zinc-300 text-xs text-center py-1">Compress another image</button>
      </div>}
      {failed&&<div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3"><span className="text-red-400">⚠</span><div><p className="text-red-300 text-xs">{err}</p><button onClick={()=>{reset();setErr(null);}} className="text-red-400 text-xs mt-1 underline">Try again</button></div></div>}
    </section>
  );
}
