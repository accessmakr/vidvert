import { useState, useRef, useCallback, useEffect } from 'react';
import { getConversionStatus, getConverterDownloadUrl } from '../services/api';
import { formatBytes } from '../utils/formatBytes';

const VIDEO_ALLOWED=/\.(mp4|mkv|webm|avi|mov|wmv|flv|3gp|m4v)$/i;
const AUDIO_ALLOWED=/\.(mp3|m4a|aac|wav|flac|ogg|wma|aiff)$/i;
const POLL_MS=2000,TIMEOUT_MS=10*60*1000,MAX_FAILS=5;
const CONVERTER_URL=import.meta.env.VITE_CONVERTER_URL??'';
const save=(url,name)=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);};

function uploadAudioVideo(videoFile,audioFile,onProgress){
  return new Promise((resolve,reject)=>{
    const form=new FormData();
    form.append('video',videoFile);
    form.append('audio',audioFile);
    const xhr=new XMLHttpRequest();
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round((e.loaded/e.total)*100));};
    xhr.onload=()=>{try{const d=JSON.parse(xhr.responseText);if(xhr.status>=200&&xhr.status<300)resolve(d);else reject(new Error(d.error||'Upload failed'));}catch{reject(new Error('Upload failed'));}};
    xhr.onerror=()=>reject(new Error('Network error'));
    xhr.timeout=10*60*1000;
    xhr.open('POST',CONVERTER_URL+'/add-audio');
    xhr.send(form);
  });
}

export default function AudioVideoMerge() {
  const [videoFile,setVideoFile]=useState(null);const [audioFile,setAudioFile]=useState(null);
  const [phase,setPhase]=useState('idle');const [pct,setPct]=useState(0);
  const [jobId,setJobId]=useState(null);const [job,setJob]=useState(null);
  const [err,setErr]=useState(null);const vRef=useRef(null);const aRef=useRef(null);
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
  const acceptVideo=f=>{if(!f)return;if(!VIDEO_ALLOWED.test(f.name)){setErr('Please select a video file.');return;}reset();setVideoFile(f);};
  const acceptAudio=f=>{if(!f)return;if(!AUDIO_ALLOWED.test(f.name)){setErr('Please select an audio file.');return;}reset();setAudioFile(f);};
  const start=async()=>{if(!videoFile||!audioFile){setErr('Both a video and audio file are required.');return;}reset();setPhase('uploading');setPct(0);
    try{const d=await uploadAudioVideo(videoFile,audioFile,p=>setPct(p));setJobId(d.jobId);setPhase('converting');}
    catch(e){setPhase('error');setErr(e.message);}};

  const FileSlot=({label,file,accept,inputRef,onFile,onClear,color})=>(
    <div className={'border-2 border-dashed rounded-xl overflow-hidden transition-all '+(file?'border-zinc-600 bg-zinc-900':color+' bg-zinc-900/50')+(working?' opacity-50 pointer-events-none':'')}>
      <input ref={inputRef} type="file" accept={accept} onChange={e=>onFile(e.target.files?.[0])} className="hidden"/>
      {file?<div className="flex items-center justify-between gap-2 p-3"><div className="overflow-hidden flex-1"><p className="text-zinc-200 text-xs font-medium truncate">{file.name}</p><p className="text-zinc-600 text-xs">{formatBytes(file.size)}</p></div><button onClick={onClear} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button></div>:
      <button onClick={()=>inputRef.current?.click()} className="w-full p-4 text-center"><p className="text-zinc-400 text-xs font-medium">{label}</p></button>}
    </div>
  );

  return(
    <section className="w-full max-w-xl flex flex-col gap-4" aria-label="Add Audio to Video">
      <div><h2 className="text-white font-bold text-base">Add Audio to Video</h2><p className="text-zinc-500 text-xs mt-0.5">Replace or attach an audio file to a video. If the audio is shorter, the video is cut to match.</p></div>
      <FileSlot label="Tap to select a video file" file={videoFile} accept="video/*" inputRef={vRef} onFile={acceptVideo} onClear={()=>{setVideoFile(null);reset();}} color="border-zinc-700 hover:border-zinc-500"/>
      <FileSlot label="Tap to select an audio file" file={audioFile} accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg" inputRef={aRef} onFile={acceptAudio} onClear={()=>{setAudioFile(null);reset();}} color="border-zinc-700 hover:border-zinc-500"/>
      {err&&!failed&&<p className="text-red-400 text-xs">{err}</p>}
      {!done&&<button onClick={start} disabled={working||!videoFile||!audioFile} className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">{working?(phase==='uploading'?'Uploading… '+pct+'%':(job?.statusText||'Processing…')):'Add Audio to Video'}</button>}
      {working&&<div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden"><div className={'h-2 '+(phase==='uploading'?'bg-blue-500':'bg-sky-500')+' rounded-full transition-all duration-500'} style={{width:(phase==='uploading'?pct:(job?.progress||0))+'%'}}/></div>}
      {done&&<div className="flex flex-col gap-2"><button onClick={()=>save(getConverterDownloadUrl(job.jobId),'video_with_audio.mp4')} className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">✓ Download Video with Audio{job?.fileSizeBytes?' ('+formatBytes(job.fileSizeBytes)+')':''}</button><button onClick={()=>{reset();setVideoFile(null);setAudioFile(null);}} className="text-zinc-500 hover:text-zinc-300 text-xs text-center py-1">Merge another pair</button></div>}
      {failed&&<div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3"><span className="text-red-400">⚠</span><div><p className="text-red-300 text-xs">{err}</p><button onClick={()=>{reset();setErr(null);}} className="text-red-400 text-xs mt-1 underline">Try again</button></div></div>}
    </section>
  );
}
