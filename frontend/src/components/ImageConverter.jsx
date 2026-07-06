import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadVideoForProcessing, getConversionStatus, getConverterDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/formatBytes';

const ACCEPT='image/*,.jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif';
const ALLOWED=/\.(jpg|jpeg|png|webp|bmp|tiff|tif|gif)$/i;
const FORMATS=[{id:'png',label:'PNG',desc:'Lossless'},{id:'jpg',label:'JPG',desc:'Compact'},{id:'webp',label:'WebP',desc:'Modern'},{id:'bmp',label:'BMP',desc:'Uncompressed'},{id:'tiff',label:'TIFF',desc:'Print quality'}];
const POLL_MS=2000,TIMEOUT_MS=5*60*1000,MAX_FAILS=5;
const save=(url,name)=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);};

export default function ImageConverter() {
  const [file,setFile]=useState(null);const [drag,setDrag]=useState(false);const [format,setFormat]=useState('png');const [preview,setPreview]=useState(null);
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
  const accept=(f)=>{if(!f)return;if(!ALLOWED.test(f.name)){setErr('Please select an image file.');return;}reset();setFile(f);if(preview)URL.revokeObjectURL(preview);setPreview(URL.createObjectURL(f));};
  const start=async()=>{reset();setPhase('uploading');setPct(0);
    try{const form=new FormData();form.append('file',file);form.append('format',format);form.append('filename',file.name.replace(/\.[^.]+$/,''));
      const d=await uploadVideoForProcessing('convert-image',form,p=>setPct(p));setJobId(d.jobId);setPhase('converting');
    }catch(e){setPhase('error');setErr(e.message);}};

  return(
    <section className="w-full max-w-xl flex flex-col gap-4" aria-label="Image Converter">
      <div><h2 className="text-white font-bold text-base">Image Format Converter</h2><p className="text-zinc-500 text-xs mt-0.5">Convert between JPG, PNG, WebP, BMP and TIFF free.</p></div>
      <div onDrop={e=>{e.preventDefault();setDrag(false);accept(e.dataTransfer.files?.[0]);}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onClick={()=>!working&&ref.current?.click()} role="button" tabIndex={0} className={'border-2 border-dashed rounded-xl overflow-hidden transition-all cursor-pointer '+(drag?'border-cyan-400 bg-cyan-950/20':file?'border-zinc-600':'border-zinc-700 hover:border-zinc-500')+(working?' pointer-events-none opacity-50':'')}>
        <input ref={ref} type="file" accept={ACCEPT} onChange={e=>accept(e.target.files?.[0])} className="hidden"/>
        {preview&&file?<div className="relative"><img src={preview} alt="Preview" className="w-full max-h-40 object-contain bg-zinc-900"/><div className="absolute bottom-0 left-0 right-0 bg-zinc-950/80 px-3 py-2 flex justify-between"><span className="text-zinc-300 text-xs truncate">{file.name}</span><span className="text-zinc-500 text-xs">{formatBytes(file.size)}</span></div>{!working&&<button onClick={e=>{e.stopPropagation();setFile(null);setPreview(null);reset();}} className="absolute top-2 right-2 bg-zinc-950/80 text-zinc-400 hover:text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">✕</button>}</div>:<div className="p-8 text-center"><p className="text-zinc-400 text-sm font-medium">{drag?'Drop image here':'Tap or drag an image here'}</p><p className="text-zinc-600 text-xs mt-1">JPG · PNG · WebP · BMP · TIFF · GIF</p></div>}
      </div>
      <div><p className="text-zinc-400 text-xs mb-2 font-medium uppercase tracking-wide">Output Format</p>
        <div className="grid grid-cols-5 gap-2">{FORMATS.map(f=>(
          <button key={f.id} onClick={()=>!working&&setFormat(f.id)} disabled={working} aria-pressed={format===f.id}
            className={'flex flex-col items-center py-2.5 rounded-xl border text-center transition-all disabled:opacity-50 '+(format===f.id?'border-cyan-500 bg-cyan-950 text-white':'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500')}>
            <span className="font-bold text-xs">{f.label}</span><span className="text-xs opacity-60 mt-0.5">{f.desc}</span>
          </button>))}
        </div>
      </div>
      {!done&&<button onClick={start} disabled={working||!file} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">{working?(phase==='uploading'?'Uploading… '+pct+'%':'Converting…'):('Convert to '+format.toUpperCase())}</button>}
      {working&&<div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden"><div className={'h-2 '+(phase==='uploading'?'bg-blue-500':'bg-cyan-500')+' rounded-full transition-all duration-500'} style={{width:(phase==='uploading'?pct:(job?.progress||0))+'%'}}/></div>}
      {done&&<div className="flex flex-col gap-2"><button onClick={()=>save(getConverterDownloadUrl(job.jobId),'image.'+format)} className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">✓ Download {format.toUpperCase()}{job?.fileSizeBytes?' ('+formatBytes(job.fileSizeBytes)+')':''}</button><button onClick={()=>{reset();setFile(null);setPreview(null);}} className="text-zinc-500 hover:text-zinc-300 text-xs text-center py-1">Convert another image</button></div>}
      {failed&&<div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3"><span className="text-red-400">⚠</span><div><p className="text-red-300 text-xs">{err}</p><button onClick={()=>{reset();setErr(null);}} className="text-red-400 text-xs mt-1 underline">Try again</button></div></div>}
    </section>
  );
}
