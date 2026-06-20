'use strict';
const express      = require('express');
const cors         = require('cors');
const multer       = require('multer');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const fs           = require('fs');
const { spawn }    = require('child_process');
const { v4: uuid } = require('uuid');
const { createJob, getJob, updateJob } = require('./utils/jobs');
const { processAudioJob }               = require('./utils/queue');
const { scheduleCleanup }               = require('./utils/cleanup');
const { acquireSlot, releaseSlot }      = require('./utils/concurrency');
const {
  probeVideoDimensions, getAudioExtension, buildWatermarkFilter,
  runVideoConvertFFmpeg, runVideoCompressFFmpeg, runVideoTrimFFmpeg,
  runVideoToGifFFmpeg, runVideoReframeFFmpeg, runVideoCropFFmpeg,
} = require('./utils/ffmpeg');

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = '/tmp/uploads';
const OUTPUT_DIR = '/tmp/outputs';

function ensureDirs() { [UPLOAD_DIR,OUTPUT_DIR].forEach(d=>fs.mkdirSync(d,{recursive:true})); }
ensureDirs();

app.use(cors({
  origin(origin,cb){
    if(!origin) return cb(null,true);
    if(origin.endsWith('.netlify.app')||origin.includes('vidvert.cc')||origin.includes('localhost')) return cb(null,true);
    const ex=process.env.FRONTEND_URL;
    if(ex&&origin.startsWith(ex)) return cb(null,true);
    cb(null,true);
  },
  methods:['GET','POST','OPTIONS'], allowedHeaders:['Content-Type','Accept'],
}));
app.options('*',cors());
app.use(express.json({limit:'2mb'}));

const limiter = rateLimit({windowMs:15*60*1000,max:15,message:{error:'Too many requests.'}});

const ALL_MIMES = new Set([
  'video/mp4','video/quicktime','video/x-msvideo','video/webm','video/x-matroska',
  'video/3gpp','video/x-flv','video/x-ms-wmv','video/mpeg','video/ogg','video/mp2t',
  'audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/flac','audio/aac','audio/x-ms-wma',
  'image/jpeg','image/png','image/webp','image/gif','image/bmp',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination(req,file,cb){ensureDirs();cb(null,UPLOAD_DIR);},
    filename(req,file,cb){cb(null,`${uuid()}${path.extname(file.originalname)}`);},
  }),
  limits:{fileSize:500*1024*1024},
  fileFilter(req,file,cb){ALL_MIMES.has(file.mimetype)?cb(null,true):cb(new Error(`Unsupported: ${file.mimetype}`));},
});

const VA=new Set(['mp3','m4a','aac','wav','flac','ogg','wma','alac','aiff']);
const VQ=new Set(['64','128','192','256','320']);
const VF=new Set(['mp4','mkv','webm','avi','mov','wmv','flv','3gp']);
const VVQ=new Set(['high','medium','low']);
const VRATIO=new Set(['9:16','1:1','4:5','16:9']);
const VCROP=new Set(['1:1','9:16','16:9','4:3','4:5']);
const safe=(p)=>{if(p&&fs.existsSync(p))try{fs.unlinkSync(p);}catch{}};
const mkJob=(id,x={})=>createJob(id,{status:'queued',statusText:'Queued…',progress:0,eta:null,fileSizeBytes:null,error:null,createdAt:Date.now(),...x});

app.get('/health',(req,res)=>res.json({ok:true,service:'vidvert-converter',v:'7.0'}));

app.post('/jobs',limiter,upload.single('file'),(req,res)=>{
  try{
    const fmt=(req.body.format||'mp3').toLowerCase();
    const ql=String(req.body.quality||'128');
    if(!VA.has(fmt)) return res.status(400).json({error:'Invalid format.'});
    if(!VQ.has(ql))  return res.status(400).json({error:'Invalid quality.'});
    const file=req.file,url=req.body.url?.trim();
    if(!file&&!url) return res.status(400).json({error:'Provide file or url.'});
    const id=uuid();
    const ext=getAudioExtension(fmt);
    const base=req.body.filename||(file?path.basename(file.originalname,path.extname(file.originalname)):'audio');
    mkJob(id,{format:fmt,quality:ql,inputPath:file?.path||null,inputUrl:url||null,
      outputPath:path.join(OUTPUT_DIR,`${id}.${ext}`),filename:`${base}.${ext}`});
    processAudioJob(id);
    res.json({jobId:id,status:'queued'});
  }catch(e){safe(req.file?.path);res.status(500).json({error:e.message});}
});

app.post('/jobs/advanced',limiter,upload.single('file'),(req,res)=>{
  try{
    const fmt=(req.body.format||'mp3').toLowerCase();
    const ql=String(req.body.quality||'128');
    if(!VA.has(fmt)) return res.status(400).json({error:'Invalid format.'});
    if(!VQ.has(ql))  return res.status(400).json({error:'Invalid quality.'});
    const file=req.file,url=req.body.url?.trim();
    if(!file&&!url) return res.status(400).json({error:'Provide file or url.'});
    const adv={trimStart:req.body.trimStart||null,trimEnd:req.body.trimEnd||null,
      volume:parseInt(req.body.volume||'100'),fadeIn:parseFloat(req.body.fadeIn||'0'),
      fadeOut:parseFloat(req.body.fadeOut||'0'),reverse:req.body.reverse==='true',codecMode:req.body.codecMode||'auto'};
    const id=uuid();
    const ext=getAudioExtension(fmt);
    const base=req.body.filename||(file?path.basename(file.originalname,path.extname(file.originalname)):'audio');
    mkJob(id,{format:fmt,quality:ql,inputPath:file?.path||null,inputUrl:url||null,
      outputPath:path.join(OUTPUT_DIR,`${id}.${ext}`),filename:`${base}.${ext}`,advanced:adv});
    processAudioJob(id,{advanced:adv});
    res.json({jobId:id,status:'queued'});
  }catch(e){safe(req.file?.path);res.status(500).json({error:e.message});}
});

app.post('/convert-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file;
  if(!file) return res.status(400).json({error:'Video file required.'});
  const fmt=(req.body.format||'mp4').toLowerCase();
  const ql=(req.body.quality||'medium').toLowerCase();
  if(!VF.has(fmt))  return res.status(400).json({error:`Invalid format. Use: ${[...VF].join(', ')}`});
  if(!VVQ.has(ql))  return res.status(400).json({error:'Invalid quality. Use: high, medium, low'});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid();const out=path.join(OUTPUT_DIR,`${id}.${fmt}`);
  mkJob(id,{inputPath:file.path,outputPath:out,filename:`${base}.${fmt}`});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      await acquireSlot(id,updateJob); slot=true;
      updateJob(id,{status:'converting',statusText:'Converting format…'});
      await runVideoConvertFFmpeg(file.path,out,fmt,ql,({progress})=>updateJob(id,{progress}));
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',error:e.message,statusText:'Failed'});}
    finally{if(slot)releaseSlot();safe(file.path);}
  })();
});

app.post('/compress-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file;
  if(!file) return res.status(400).json({error:'Video file required.'});
  const ql=(req.body.quality||'medium').toLowerCase();
  if(!VVQ.has(ql)) return res.status(400).json({error:'Invalid quality.'});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid();const out=path.join(OUTPUT_DIR,`${id}_compressed.mp4`);
  mkJob(id,{inputPath:file.path,outputPath:out,filename:`${base}_compressed.mp4`});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      await acquireSlot(id,updateJob); slot=true;
      updateJob(id,{status:'converting',statusText:'Compressing…'});
      await runVideoCompressFFmpeg(file.path,out,ql,({progress})=>updateJob(id,{progress}));
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',error:e.message,statusText:'Failed'});}
    finally{if(slot)releaseSlot();safe(file.path);}
  })();
});

app.post('/trim-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file;
  if(!file) return res.status(400).json({error:'Video file required.'});
  const start=req.body.startTime||'00:00:00',end=req.body.endTime;
  if(!end) return res.status(400).json({error:'endTime required.'});
  const ext=path.extname(file.originalname)||'.mp4';
  const base=req.body.filename||path.basename(file.originalname,ext);
  const id=uuid();const out=path.join(OUTPUT_DIR,`${id}_trimmed${ext}`);
  mkJob(id,{inputPath:file.path,outputPath:out,filename:`${base}_trimmed${ext}`});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      await acquireSlot(id,updateJob); slot=true;
      updateJob(id,{status:'converting',statusText:'Trimming video…'});
      await runVideoTrimFFmpeg(file.path,out,start,end,({progress})=>updateJob(id,{progress}));
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',error:e.message,statusText:'Failed'});}
    finally{if(slot)releaseSlot();safe(file.path);}
  })();
});

app.post('/convert-gif',limiter,upload.single('file'),(req,res)=>{
  const file=req.file;
  if(!file) return res.status(400).json({error:'Video file required.'});
  const opts={
    fps:Math.min(20,Math.max(5,parseInt(req.body.fps||'10'))),
    width:Math.min(720,Math.max(240,parseInt(req.body.width||'480'))),
    startTime:req.body.startTime||null,
    duration:req.body.duration?parseFloat(req.body.duration):null,
  };
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid();const out=path.join(OUTPUT_DIR,`${id}.gif`);
  mkJob(id,{inputPath:file.path,outputPath:out,filename:`${base}.gif`});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      await acquireSlot(id,updateJob); slot=true;
      updateJob(id,{status:'converting',statusText:'Generating GIF…'});
      await runVideoToGifFFmpeg(file.path,out,opts,({progress})=>updateJob(id,{progress}));
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',error:e.message,statusText:'Failed'});}
    finally{if(slot)releaseSlot();safe(file.path);}
  })();
});

app.post('/reframe-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file;
  if(!file) return res.status(400).json({error:'Video file required.'});
  const ratio=req.body.ratio||'9:16';
  if(!VRATIO.has(ratio)) return res.status(400).json({error:`Invalid ratio. Use: ${[...VRATIO].join(', ')}`});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid();const out=path.join(OUTPUT_DIR,`${id}_reframed.mp4`);
  mkJob(id,{inputPath:file.path,outputPath:out,filename:`${base}_${ratio.replace(':','x')}.mp4`});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      await acquireSlot(id,updateJob); slot=true;
      updateJob(id,{status:'converting',statusText:'Reframing video…'});
      await runVideoReframeFFmpeg(file.path,out,ratio,({progress})=>updateJob(id,{progress}));
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',error:e.message,statusText:'Failed'});}
    finally{if(slot)releaseSlot();safe(file.path);}
  })();
});

app.post('/crop-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file;
  if(!file) return res.status(400).json({error:'Video file required.'});
  const ratio=req.body.ratio||'1:1';
  if(!VCROP.has(ratio)) return res.status(400).json({error:`Invalid ratio. Use: ${[...VCROP].join(', ')}`});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid();const out=path.join(OUTPUT_DIR,`${id}_cropped.mp4`);
  mkJob(id,{inputPath:file.path,outputPath:out,filename:`${base}_${ratio.replace(':','x')}_cropped.mp4`});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      await acquireSlot(id,updateJob); slot=true;
      updateJob(id,{status:'converting',statusText:'Cropping video…'});
      await runVideoCropFFmpeg(file.path,out,ratio,({progress})=>updateJob(id,{progress}));
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',error:e.message,statusText:'Failed'});}
    finally{if(slot)releaseSlot();safe(file.path);}
  })();
});

/**
 * POST /watermark — video watermark removal.
 * FIX: now uses the shared buildWatermarkFilter helper, which caps
 * source resolution before the blur filter on large videos, and
 * guarantees the blur patch and overlay base are always the same
 * resolution via `split` (prevents mismatched-size overlay failures).
 */
app.post('/watermark',limiter,upload.single('file'),async(req,res)=>{
  const file=req.file;
  if(!file) return res.status(400).json({error:'Video file required.'});
  const mode=req.body.mode||'percent';
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid();const out=path.join(OUTPUT_DIR,`${id}.mp4`);
  const xR=parseFloat(req.body.x||0),yR=parseFloat(req.body.y||0);
  const wR=parseFloat(req.body.w||25),hR=parseFloat(req.body.h||15);
  mkJob(id,{inputPath:file.path,outputPath:out,filename:`${base}_clean.mp4`});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      const{width,height}=await probeVideoDimensions(file.path);
      const{filter}=buildWatermarkFilter({width,height,xInput:xR,yInput:yR,wInput:wR,hInput:hR,mode,blurRadius:20});
      await acquireSlot(id,updateJob); slot=true;
      updateJob(id,{status:'converting',statusText:'Removing watermark…'});
      await new Promise((res2,rej)=>{
        const ff=spawn('ffmpeg',['-i',file.path,'-filter_complex',filter,'-map','[out]','-map','0:a?','-c:a','copy','-c:v','libx264','-preset','fast','-crf','23','-y',out]);
        let dur=null,errBuf='';
        ff.stderr.on('data',c=>{const t=c.toString();errBuf=(errBuf+t).slice(-2000);
          if(!dur){const m=t.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);if(m)dur=+m[1]*3600+ +m[2]*60+parseFloat(m[3]);}
          if(dur){const x=t.match(/time=\s*(\d+):(\d+):(\d+\.?\d*)/);if(x){const c2=+x[1]*3600+ +x[2]*60+parseFloat(x[3]);updateJob(id,{progress:Math.min(99,Math.round((c2/dur)*100))});}}
        });
        ff.on('close',code=>code===0?res2():rej(new Error(`FFmpeg ${code}: ${errBuf.slice(-200)}`)));ff.on('error',rej);
      });
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',statusText:'Removal failed',error:e.message});}
    finally{if(slot)releaseSlot();safe(file?.path);}
  })();
});

/**
 * POST /watermark-image — image watermark removal.
 * FIX: this endpoint previously NEVER converted percent coordinates
 * to pixels and never probed actual image dimensions — it treated
 * every input as raw pixel values regardless of the `mode` sent by
 * the frontend. A percent-based preset (e.g. "Top Right" = x:75,
 * y:0, w:25, h:20) was being read as literal pixels, producing a
 * tiny or invalid crop box unrelated to the actual image size. That
 * mismatch is what caused "at least one of its streams received no
 * packets" — the crop region didn't make sense for the real image,
 * so the filter graph produced zero output frames.
 *
 * Now probes real dimensions first and uses the same shared filter
 * builder as the video endpoint, so percent mode is actually honored.
 */
app.post('/watermark-image',limiter,upload.single('file'),async(req,res)=>{
  const file=req.file;
  if(!file) return res.status(400).json({error:'Image file required.'});
  const mode=req.body.mode||'percent';
  const xR=parseFloat(req.body.x||0),yR=parseFloat(req.body.y||0);
  const wR=parseFloat(req.body.w||25),hR=parseFloat(req.body.h||20);
  const ext=path.extname(file.originalname)||'.jpg';
  const base=req.body.filename||path.basename(file.originalname,ext);
  const id=uuid();const out=path.join(OUTPUT_DIR,`${id}_clean${ext}`);
  mkJob(id,{inputPath:file.path,outputPath:out,filename:`${base}_clean${ext}`});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      updateJob(id,{status:'converting',statusText:'Removing watermark…',progress:20});
      const{width,height}=await probeVideoDimensions(file.path); // works for static images too
      const{filter}=buildWatermarkFilter({width,height,xInput:xR,yInput:yR,wInput:wR,hInput:hR,mode,blurRadius:25});
      await acquireSlot(id,updateJob); slot=true;
      await new Promise((res2,rej)=>{
        const ff=spawn('ffmpeg',['-i',file.path,'-filter_complex',filter,'-map','[out]','-frames:v','1','-y',out]);
        let errBuf='';ff.stderr.on('data',c=>{errBuf=(errBuf+c.toString()).slice(-1000);});
        ff.on('close',code=>code===0?res2():rej(new Error(`FFmpeg ${code}: ${errBuf.slice(-200)}`)));ff.on('error',rej);
      });
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',statusText:'Image processing failed',error:e.message});}
    finally{if(slot)releaseSlot();safe(file?.path);}
  })();
});

app.get('/jobs/:id',(req,res)=>{
  const job=getJob(req.params.id);
  if(!job) return res.status(404).json({error:'Job not found or expired.'});
  const{inputPath,outputPath,inputUrl,advanced,...safe2}=job;
  res.json({...safe2,jobId:req.params.id});
});

app.get('/jobs/:id/download',(req,res)=>{
  const job=getJob(req.params.id);
  if(!job)                    return res.status(404).json({error:'Job not found.'});
  if(job.status!=='done')     return res.status(400).json({error:`Not ready (${job.status}).`});
  if(!fs.existsSync(job.outputPath)) return res.status(404).json({error:'Output file missing.'});
  res.setHeader('Access-Control-Allow-Origin','*');
  res.download(job.outputPath,job.filename,()=>scheduleCleanup(req.params.id,10*60*1000));
});

app.use((err,req,res,_next)=>{
  if(req.file?.path) safe(req.file.path);
  res.status(err.status||500).json({error:err.message||'Internal server error.'});
});

app.listen(PORT,()=>console.log(`VidVert Converter v7 on :${PORT}`));
