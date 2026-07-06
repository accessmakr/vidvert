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
  runGifToMp4FFmpeg, runVideoMuteFFmpeg, runVideoRotateFFmpeg,
  runVideoMergeFFmpeg, runAudioVideoMergeFFmpeg, runVideoFrameExtractFFmpeg,
  runVideoSpeedFFmpeg, runVideoReverseFFmpeg, runAudioMergeFFmpeg,
  runImageConvertFFmpeg, runImageCompressFFmpeg, runImageResizeFFmpeg,
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
  methods:['GET','POST','OPTIONS'],allowedHeaders:['Content-Type','Accept'],
}));
app.options('*',cors());
app.use(express.json({limit:'2mb'}));

const limiter = rateLimit({windowMs:15*60*1000,max:15,message:{error:'Too many requests.'}});

const ALL_MIMES = new Set([
  'video/mp4','video/quicktime','video/x-msvideo','video/webm','video/x-matroska',
  'video/3gpp','video/x-flv','video/x-ms-wmv','video/mpeg','video/ogg','video/mp2t',
  'audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/flac','audio/aac','audio/x-ms-wma',
  'image/jpeg','image/png','image/webp','image/gif','image/bmp','image/tiff',
]);

const storage = multer.diskStorage({
  destination(req,file,cb){ensureDirs();cb(null,UPLOAD_DIR);},
  filename(req,file,cb){cb(null,uuid()+path.extname(file.originalname));},
});
const upload = multer({storage,limits:{fileSize:500*1024*1024},fileFilter(req,file,cb){ALL_MIMES.has(file.mimetype)?cb(null,true):cb(new Error('Unsupported: '+file.mimetype));}});

const VA=new Set(['mp3','m4a','aac','wav','flac','ogg','wma','alac','aiff']);
const VQ=new Set(['64','128','192','256','320']);
const VF=new Set(['mp4','mkv','webm','avi','mov','wmv','flv','3gp']);
const VVQ=new Set(['high','medium','low']);
const VRATIO=new Set(['9:16','1:1','4:5','16:9']);
const VCROP=new Set(['1:1','9:16','16:9','4:3','4:5']);
const VROT=new Set(['cw90','ccw90','180','hflip','vflip']);
const IMGFMT=new Set(['jpg','jpeg','png','webp','bmp','tiff']);

const safe=(p)=>{if(p&&fs.existsSync(p))try{fs.unlinkSync(p);}catch{}};
const mkJob=(id,x={})=>createJob(id,{status:'queued',statusText:'Queued…',progress:0,eta:null,fileSizeBytes:null,error:null,createdAt:Date.now(),...x});

// Helper — wraps a single-file async video/image job with slot + cleanup
function videoJob(id, file, outputPath, filename, fn) {
  mkJob(id,{inputPath:file.path,outputPath,filename});
  (async()=>{
    let slot=false;
    try{
      await acquireSlot(id,updateJob); slot=true;
      await fn();
      const{size}=fs.statSync(outputPath);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',error:e.message,statusText:'Failed'});}
    finally{if(slot)releaseSlot();safe(file.path);}
  })();
}

app.get('/health',(req,res)=>res.json({ok:true,service:'vidvert-converter',v:'8.0'}));

// ── Audio endpoints ───────────────────────────────────────────────────────────
app.post('/jobs',limiter,upload.single('file'),(req,res)=>{
  try{
    const fmt=(req.body.format||'mp3').toLowerCase(),ql=String(req.body.quality||'128');
    if(!VA.has(fmt)) return res.status(400).json({error:'Invalid format.'});
    if(!VQ.has(ql))  return res.status(400).json({error:'Invalid quality.'});
    const file=req.file,url=req.body.url?.trim();
    if(!file&&!url) return res.status(400).json({error:'Provide file or url.'});
    const id=uuid(),ext=getAudioExtension(fmt);
    const base=req.body.filename||(file?path.basename(file.originalname,path.extname(file.originalname)):'audio');
    mkJob(id,{format:fmt,quality:ql,inputPath:file?.path||null,inputUrl:url||null,outputPath:path.join(OUTPUT_DIR,id+'.'+ext),filename:base+'.'+ext});
    processAudioJob(id);
    res.json({jobId:id,status:'queued'});
  }catch(e){safe(req.file?.path);res.status(500).json({error:e.message});}
});

app.post('/jobs/advanced',limiter,upload.single('file'),(req,res)=>{
  try{
    const fmt=(req.body.format||'mp3').toLowerCase(),ql=String(req.body.quality||'128');
    if(!VA.has(fmt)) return res.status(400).json({error:'Invalid format.'});
    if(!VQ.has(ql))  return res.status(400).json({error:'Invalid quality.'});
    const file=req.file,url=req.body.url?.trim();
    if(!file&&!url) return res.status(400).json({error:'Provide file or url.'});
    const adv={trimStart:req.body.trimStart||null,trimEnd:req.body.trimEnd||null,volume:parseInt(req.body.volume||'100'),fadeIn:parseFloat(req.body.fadeIn||'0'),fadeOut:parseFloat(req.body.fadeOut||'0'),reverse:req.body.reverse==='true',codecMode:req.body.codecMode||'auto'};
    const id=uuid(),ext=getAudioExtension(fmt);
    const base=req.body.filename||(file?path.basename(file.originalname,path.extname(file.originalname)):'audio');
    mkJob(id,{format:fmt,quality:ql,inputPath:file?.path||null,inputUrl:url||null,outputPath:path.join(OUTPUT_DIR,id+'.'+ext),filename:base+'.'+ext,advanced:adv});
    processAudioJob(id,{advanced:adv});
    res.json({jobId:id,status:'queued'});
  }catch(e){safe(req.file?.path);res.status(500).json({error:e.message});}
});

app.post('/merge-audio',limiter,upload.array('files',10),(req,res)=>{
  const files=req.files;
  if(!files||files.length<2) return res.status(400).json({error:'At least 2 audio files required.'});
  const fmt=(req.body.format||'mp3').toLowerCase();
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_merged.'+fmt);
  mkJob(id,{outputPath:out,filename:'merged.'+fmt});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      await acquireSlot(id,updateJob); slot=true;
      updateJob(id,{status:'converting',statusText:'Merging audio…'});
      await runAudioMergeFFmpeg(files.map(f=>f.path),out,fmt,({progress})=>updateJob(id,{progress}));
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',error:e.message,statusText:'Failed'});}
    finally{if(slot)releaseSlot();files.forEach(f=>safe(f.path));}
  })();
});

// ── Video endpoints ───────────────────────────────────────────────────────────
app.post('/convert-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const fmt=(req.body.format||'mp4').toLowerCase(),ql=(req.body.quality||'medium').toLowerCase();
  if(!VF.has(fmt))  return res.status(400).json({error:'Invalid format.'});
  if(!VVQ.has(ql))  return res.status(400).json({error:'Invalid quality.'});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'.'+fmt);
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'.'+fmt,async()=>{
    updateJob(id,{status:'converting',statusText:'Converting format…'});
    await runVideoConvertFFmpeg(file.path,out,fmt,ql,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/compress-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const ql=(req.body.quality||'medium').toLowerCase();
  if(!VVQ.has(ql)) return res.status(400).json({error:'Invalid quality.'});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_compressed.mp4');
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_compressed.mp4',async()=>{
    updateJob(id,{status:'converting',statusText:'Compressing…'});
    await runVideoCompressFFmpeg(file.path,out,ql,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/trim-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const start=req.body.startTime||'00:00:00',end=req.body.endTime;
  if(!end) return res.status(400).json({error:'endTime required.'});
  const ext=path.extname(file.originalname)||'.mp4';
  const base=req.body.filename||path.basename(file.originalname,ext);
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_trimmed'+ext);
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_trimmed'+ext,async()=>{
    updateJob(id,{status:'converting',statusText:'Trimming video…'});
    await runVideoTrimFFmpeg(file.path,out,start,end,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/convert-gif',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const opts={fps:Math.min(20,Math.max(5,parseInt(req.body.fps||'10'))),width:Math.min(720,Math.max(240,parseInt(req.body.width||'480'))),startTime:req.body.startTime||null,duration:req.body.duration?parseFloat(req.body.duration):null};
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'.gif');
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'.gif',async()=>{
    updateJob(id,{status:'converting',statusText:'Generating GIF…'});
    await runVideoToGifFFmpeg(file.path,out,opts,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/reframe-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const ratio=req.body.ratio||'9:16';
  if(!VRATIO.has(ratio)) return res.status(400).json({error:'Invalid ratio.'});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_reframed.mp4');
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_'+ratio.replace(':','x')+'.mp4',async()=>{
    updateJob(id,{status:'converting',statusText:'Reframing video…'});
    await runVideoReframeFFmpeg(file.path,out,ratio,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/crop-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const ratio=req.body.ratio||'1:1';
  if(!VCROP.has(ratio)) return res.status(400).json({error:'Invalid ratio.'});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_cropped.mp4');
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_'+ratio.replace(':','x')+'_cropped.mp4',async()=>{
    updateJob(id,{status:'converting',statusText:'Cropping video…'});
    await runVideoCropFFmpeg(file.path,out,ratio,({progress})=>updateJob(id,{progress}));
  });
});

// NEW endpoints ────────────────────────────────────────────────────────────────

app.post('/gif-to-mp4',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'GIF file required.'});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'.mp4');
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'.mp4',async()=>{
    updateJob(id,{status:'converting',statusText:'Converting GIF to MP4…'});
    await runGifToMp4FFmpeg(file.path,out,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/mute-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const ext=path.extname(file.originalname)||'.mp4';
  const base=req.body.filename||path.basename(file.originalname,ext);
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_muted'+ext);
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_muted'+ext,async()=>{
    updateJob(id,{status:'converting',statusText:'Removing audio…'});
    await runVideoMuteFFmpeg(file.path,out,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/rotate-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const transform=(req.body.transform||'cw90').toLowerCase();
  if(!VROT.has(transform)) return res.status(400).json({error:'Invalid transform. Use: cw90, ccw90, 180, hflip, vflip'});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_'+transform+'.mp4');
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_'+transform+'.mp4',async()=>{
    updateJob(id,{status:'converting',statusText:'Rotating video…'});
    await runVideoRotateFFmpeg(file.path,out,transform,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/merge-videos',limiter,upload.array('files',10),(req,res)=>{
  const files=req.files;
  if(!files||files.length<2) return res.status(400).json({error:'At least 2 video files required.'});
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_merged.mp4');
  mkJob(id,{outputPath:out,filename:'merged.mp4'});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      await acquireSlot(id,updateJob); slot=true;
      updateJob(id,{status:'converting',statusText:'Merging videos…'});
      await runVideoMergeFFmpeg(files.map(f=>f.path),out,({progress})=>updateJob(id,{progress}));
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',error:e.message,statusText:'Failed'});}
    finally{if(slot)releaseSlot();files.forEach(f=>safe(f.path));}
  })();
});

app.post('/add-audio',limiter,upload.fields([{name:'video',maxCount:1},{name:'audio',maxCount:1}]),(req,res)=>{
  const videoFile=req.files?.video?.[0],audioFile=req.files?.audio?.[0];
  if(!videoFile||!audioFile) return res.status(400).json({error:'Both video and audio files required.'});
  const base=req.body.filename||path.basename(videoFile.originalname,path.extname(videoFile.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_with_audio.mp4');
  mkJob(id,{outputPath:out,filename:base+'_with_audio.mp4'});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      await acquireSlot(id,updateJob); slot=true;
      updateJob(id,{status:'converting',statusText:'Adding audio to video…'});
      await runAudioVideoMergeFFmpeg(videoFile.path,audioFile.path,out,({progress})=>updateJob(id,{progress}));
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',error:e.message,statusText:'Failed'});}
    finally{if(slot)releaseSlot();safe(videoFile.path);safe(audioFile.path);}
  })();
});

app.post('/extract-frame',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const timestamp=req.body.timestamp||'00:00:01';
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_frame.jpg');
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_frame.jpg',async()=>{
    updateJob(id,{status:'converting',statusText:'Extracting frame…'});
    await runVideoFrameExtractFFmpeg(file.path,out,timestamp,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/speed-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const speed=parseFloat(req.body.speed||'2');
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_speed.mp4');
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_x'+speed+'.mp4',async()=>{
    updateJob(id,{status:'converting',statusText:'Adjusting speed…'});
    await runVideoSpeedFFmpeg(file.path,out,speed,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/reverse-video',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_reversed.mp4');
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_reversed.mp4',async()=>{
    updateJob(id,{status:'converting',statusText:'Reversing video…'});
    await runVideoReverseFFmpeg(file.path,out,({progress})=>updateJob(id,{progress}));
  });
});

// ── Image endpoints ───────────────────────────────────────────────────────────
app.post('/convert-image',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Image file required.'});
  const fmt=(req.body.format||'png').toLowerCase();
  if(!IMGFMT.has(fmt)) return res.status(400).json({error:'Invalid format. Use: jpg, png, webp, bmp, tiff'});
  const realExt=fmt==='jpg'?'jpg':fmt;
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'.'+realExt);
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'.'+realExt,async()=>{
    updateJob(id,{status:'converting',statusText:'Converting image…',progress:20});
    await runImageConvertFFmpeg(file.path,out,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/compress-image',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Image file required.'});
  const quality=parseInt(req.body.quality||'10');
  const ext=path.extname(file.originalname)||'.jpg';
  const base=req.body.filename||path.basename(file.originalname,ext);
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_compressed'+ext);
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_compressed'+ext,async()=>{
    updateJob(id,{status:'converting',statusText:'Compressing image…',progress:20});
    await runImageCompressFFmpeg(file.path,out,quality,({progress})=>updateJob(id,{progress}));
  });
});

app.post('/resize-image',limiter,upload.single('file'),(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Image file required.'});
  const width=req.body.width?parseInt(req.body.width):null;
  const height=req.body.height?parseInt(req.body.height):null;
  if(!width&&!height) return res.status(400).json({error:'At least one of width or height required.'});
  const ext=path.extname(file.originalname)||'.jpg';
  const base=req.body.filename||path.basename(file.originalname,ext);
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_resized'+ext);
  res.json({jobId:id,status:'processing'});
  videoJob(id,file,out,base+'_resized'+ext,async()=>{
    updateJob(id,{status:'converting',statusText:'Resizing image…',progress:20});
    await runImageResizeFFmpeg(file.path,out,width,height,({progress})=>updateJob(id,{progress}));
  });
});

// ── Watermark endpoints (unchanged) ───────────────────────────────────────────
app.post('/watermark',limiter,upload.single('file'),async(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Video file required.'});
  const mode=req.body.mode||'percent';
  const base=req.body.filename||path.basename(file.originalname,path.extname(file.originalname));
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'.mp4');
  const xR=parseFloat(req.body.x||0),yR=parseFloat(req.body.y||0),wR=parseFloat(req.body.w||25),hR=parseFloat(req.body.h||15);
  mkJob(id,{inputPath:file.path,outputPath:out,filename:base+'_clean.mp4'});
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
        ff.stderr.on('data',c=>{const t=c.toString();errBuf=(errBuf+t).slice(-2000);if(!dur){const m=t.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);if(m)dur=+m[1]*3600+ +m[2]*60+parseFloat(m[3]);}if(dur){const x=t.match(/time=\s*(\d+):(\d+):(\d+\.?\d*)/);if(x){const c2=+x[1]*3600+ +x[2]*60+parseFloat(x[3]);updateJob(id,{progress:Math.min(99,Math.round((c2/dur)*100));}}});
        ff.on('close',code=>code===0?res2():rej(new Error('FFmpeg '+code+': '+errBuf.slice(-200))));ff.on('error',rej);
      });
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',statusText:'Removal failed',error:e.message});}
    finally{if(slot)releaseSlot();safe(file?.path);}
  })();
});

app.post('/watermark-image',limiter,upload.single('file'),async(req,res)=>{
  const file=req.file; if(!file) return res.status(400).json({error:'Image file required.'});
  const mode=req.body.mode||'percent';
  const xR=parseFloat(req.body.x||0),yR=parseFloat(req.body.y||0),wR=parseFloat(req.body.w||25),hR=parseFloat(req.body.h||20);
  const ext=path.extname(file.originalname)||'.jpg';
  const base=req.body.filename||path.basename(file.originalname,ext);
  const id=uuid(),out=path.join(OUTPUT_DIR,id+'_clean'+ext);
  mkJob(id,{inputPath:file.path,outputPath:out,filename:base+'_clean'+ext});
  res.json({jobId:id,status:'processing'});
  (async()=>{
    let slot=false;
    try{
      updateJob(id,{status:'converting',statusText:'Removing watermark…',progress:20});
      const{width,height}=await probeVideoDimensions(file.path);
      const{filter}=buildWatermarkFilter({width,height,xInput:xR,yInput:yR,wInput:wR,hInput:hR,mode,blurRadius:25});
      await acquireSlot(id,updateJob); slot=true;
      await new Promise((res2,rej)=>{
        const ff=spawn('ffmpeg',['-i',file.path,'-filter_complex',filter,'-map','[out]','-frames:v','1','-y',out]);
        let errBuf='';ff.stderr.on('data',c=>{errBuf=(errBuf+c.toString()).slice(-1000);});
        ff.on('close',code=>code===0?res2():rej(new Error('FFmpeg '+code+': '+errBuf.slice(-200))));ff.on('error',rej);
      });
      const{size}=fs.statSync(out);
      updateJob(id,{status:'done',progress:100,statusText:'Complete',fileSizeBytes:size});
    }catch(e){updateJob(id,{status:'error',statusText:'Image processing failed',error:e.message});}
    finally{if(slot)releaseSlot();safe(file?.path);}
  })();
});

// ── Status + download ─────────────────────────────────────────────────────────
app.get('/jobs/:id',(req,res)=>{
  const job=getJob(req.params.id);
  if(!job) return res.status(404).json({error:'Job not found or expired.'});
  const{inputPath,outputPath,inputUrl,advanced,...safe2}=job;
  res.json({...safe2,jobId:req.params.id});
});

app.get('/jobs/:id/download',(req,res)=>{
  const job=getJob(req.params.id);
  if(!job) return res.status(404).json({error:'Job not found.'});
  if(job.status!=='done') return res.status(400).json({error:'Not ready ('+job.status+').'});
  if(!fs.existsSync(job.outputPath)) return res.status(404).json({error:'Output file missing.'});
  res.setHeader('Access-Control-Allow-Origin','*');
  res.download(job.outputPath,job.filename,()=>scheduleCleanup(req.params.id,10*60*1000));
});

app.use((err,req,res,_next)=>{
  if(req.file?.path) safe(req.file.path);
  if(req.files) (Array.isArray(req.files)?req.files:Object.values(req.files).flat()).forEach(f=>safe(f.path));
  res.status(err.status||500).json({error:err.message||'Internal server error.'});
});

app.listen(PORT,()=>console.log('VidVert Converter v8 on :'+PORT));
