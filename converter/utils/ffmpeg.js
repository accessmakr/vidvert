'use strict';
const { spawn } = require('child_process');
const fs        = require('fs');
const path      = require('path');

// ── Audio format map ──────────────────────────────────────────────────────────
const AUDIO_FORMATS = {
  mp3:  { codec: 'libmp3lame', lossless: false },
  m4a:  { codec: 'aac',        lossless: false, extra: ['-movflags','+faststart'] },
  aac:  { codec: 'aac',        lossless: false },
  wav:  { codec: 'pcm_s16le',  lossless: true  },
  flac: { codec: 'flac',       lossless: true  },
  ogg:  { codec: 'libvorbis',  lossless: false },
  wma:  { codec: 'wmav2',      lossless: false },
  alac: { codec: 'alac',       lossless: true, ext: 'm4a', extra: ['-movflags','+faststart'] },
  aiff: { codec: 'pcm_s16be',  lossless: true  },
};

const RATIO_DIMENSIONS = {
  '9:16': { w: 720,  h: 1280 },
  '1:1':  { w: 720,  h: 720  },
  '4:5':  { w: 720,  h: 900  },
  '16:9': { w: 1280, h: 720  },
};

const CROP_RATIOS = {
  '1:1':  1, '9:16': 9/16, '16:9': 16/9, '4:3': 4/3, '4:5': 4/5,
};

const MAX_PROCESS_WIDTH = 1280;

const VIDEO_CODECS = {
  mp4:  ['-c:v','libx264','-c:a','aac'],
  mkv:  ['-c:v','libx264','-c:a','aac'],
  webm: ['-c:v','libvpx-vp9','-c:a','libopus'],
  avi:  ['-c:v','libxvid','-c:a','mp3'],
  mov:  ['-c:v','libx264','-c:a','aac','-movflags','+faststart'],
  wmv:  ['-c:v','wmv2','-c:a','wmav2'],
  flv:  ['-c:v','libx264','-c:a','aac'],
  '3gp':['-c:v','libx264','-c:a','aac','-vf','scale=320:-2'],
};

const CRF_MAP = { high:'18', medium:'23', low:'30' };
const COMPRESS_REDUCTION = { high:0.30, medium:0.50, low:0.70 };

function getAudioExtension(format) { return AUDIO_FORMATS[format]?.ext || format; }

// ── Probe helpers ─────────────────────────────────────────────────────────────
function probeAudioStream(inputPath) {
  return new Promise(resolve => {
    const p = spawn('ffprobe',['-v','error','-select_streams','a','-show_entries','stream=codec_type','-of','json',inputPath]);
    let out='';
    p.stdout.on('data',d=>out+=d.toString());
    p.on('close',()=>{ try{resolve(JSON.parse(out).streams?.length>0);}catch{resolve(false);} });
    p.on('error',()=>resolve(false));
  });
}

function probeVideoDimensions(inputPath) {
  return new Promise((resolve,reject)=>{
    const p=spawn('ffprobe',['-v','quiet','-print_format','json','-show_streams','-select_streams','v:0',inputPath]);
    let out='';
    p.stdout.on('data',d=>out+=d.toString());
    p.on('close',code=>{
      if(code!==0) return reject(new Error('ffprobe failed'));
      try{const s=JSON.parse(out).streams[0];resolve({width:s.width,height:s.height});}
      catch(e){reject(e);}
    });
    p.on('error',reject);
  });
}

function probeDuration(inputPath) {
  return new Promise((resolve,reject)=>{
    const p=spawn('ffprobe',['-v','error','-show_entries','format=duration','-of','json',inputPath]);
    let out='';
    p.stdout.on('data',d=>out+=d.toString());
    p.on('close',code=>{
      if(code!==0) return reject(new Error('ffprobe duration failed'));
      try{resolve(parseFloat(JSON.parse(out).format.duration));}catch(e){reject(e);}
    });
    p.on('error',reject);
  });
}

function probeVideoBitrate(inputPath) {
  return new Promise(resolve=>{
    const p=spawn('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=bit_rate:format=bit_rate','-of','json',inputPath]);
    let out='';
    p.stdout.on('data',d=>out+=d.toString());
    p.on('close',()=>{
      try{
        const data=JSON.parse(out);
        const s=data.streams?.[0]?.bit_rate?parseInt(data.streams[0].bit_rate):null;
        const f=data.format?.bit_rate?parseInt(data.format.bit_rate):null;
        resolve(s||f||null);
      }catch{resolve(null);}
    });
    p.on('error',()=>resolve(null));
  });
}

// ── Shared run helper ─────────────────────────────────────────────────────────
function _run(args, onProgress) {
  return new Promise((resolve,reject)=>{
    const ff=spawn('ffmpeg',args);
    let dur=null,last=0,errBuf='';
    ff.stderr.on('data',c=>{
      const t=c.toString();
      errBuf=(errBuf+t).slice(-3000);
      if(!dur){const m=t.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);if(m)dur=+m[1]*3600+ +m[2]*60+parseFloat(m[3]);}
      if(dur>0){
        const x=t.match(/time=\s*(\d+):(\d+):(\d+\.?\d*)/);
        if(x){const cur=+x[1]*3600+ +x[2]*60+parseFloat(x[3]);const pct=Math.min(99,Math.round((cur/dur)*100));if(pct!==last){last=pct;onProgress({progress:pct,eta:cur>0?Math.round((dur-cur)/(cur/dur)):null});}}
      }
    });
    ff.on('close',code=>code===0?resolve():reject(new Error('FFmpeg exited '+code+': '+errBuf.slice(-400))));
    ff.on('error',err=>reject(new Error('FFmpeg spawn: '+err.message)));
  });
}

// ── Audio filters builder ─────────────────────────────────────────────────────
function buildAudioFilters({volume=100,fadeIn=0,fadeOut=0,reverse=false,duration=null}) {
  const f=[];
  if(volume!==100) f.push('volume='+(volume/100).toFixed(2));
  if(fadeIn>0)     f.push('afade=t=in:st=0:d='+fadeIn);
  if(fadeOut>0&&duration>0) f.push('afade=t=out:st='+Math.max(0,duration-fadeOut).toFixed(3)+':d='+fadeOut);
  if(reverse)      f.push('areverse');
  return f.length?f.join(','):null;
}

// ── Watermark filter builder ──────────────────────────────────────────────────
function buildWatermarkFilter({width,height,xInput,yInput,wInput,hInput,mode,blurRadius=20}) {
  let w=width,h=height,preScale='';
  if(w>MAX_PROCESS_WIDTH){const scale=MAX_PROCESS_WIDTH/w;preScale='scale='+MAX_PROCESS_WIDTH+':-2,';w=MAX_PROCESS_WIDTH;h=Math.round(h*scale/2)*2;}
  let xP,yP,wP,hP;
  if(mode==='percent'){xP=Math.round(w*(xInput/100));yP=Math.round(h*(yInput/100));wP=Math.round(w*(wInput/100));hP=Math.round(h*(hInput/100));}
  else{const scale=w/width;xP=Math.round(xInput*scale);yP=Math.round(yInput*scale);wP=Math.round(wInput*scale);hP=Math.round(hInput*scale);}
  xP=Math.max(0,Math.min(xP,w-2));yP=Math.max(0,Math.min(yP,h-2));
  wP=Math.max(2,Math.min(wP,w-xP));hP=Math.max(2,Math.min(hP,h-yP));
  const filter=['[0:v]'+preScale+'split=2[base][src]','[src]crop='+wP+':'+hP+':'+xP+':'+yP+',boxblur='+blurRadius+':'+blurRadius+'[wm]','[base][wm]overlay='+xP+':'+yP+'[out]'].join(';');
  return {filter,x:xP,y:yP,w:wP,h:hP};
}

// ═════════════════════════════════════════════════════════════════════════════
// AUDIO FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

async function runAudioFFmpeg(inputPath,outputPath,format,qualityKbps,advanced={},onProgress) {
  const{codec,lossless,extra=[]}=AUDIO_FORMATS[format];
  const{trimStart,trimEnd,codecMode='auto'}=advanced;
  let duration=null;
  if(advanced.fadeOut>0){try{duration=await probeDuration(inputPath);}catch{}}
  const args=[];
  if(trimStart&&trimStart!=='00:00:00') args.push('-ss',trimStart);
  args.push('-i',inputPath);
  if(trimEnd&&trimEnd!=='00:00:00') args.push('-to',trimEnd);
  args.push('-map','0:a:0');
  if(codecMode==='copy'){args.push('-acodec','copy');}
  else{args.push('-acodec',codec);if(!lossless)args.push('-b:a',qualityKbps+'k');const af=buildAudioFilters({...advanced,duration});if(af)args.push('-af',af);}
  args.push(...extra,'-y',outputPath);
  return _run(args,onProgress);
}

function runAudioMergeFFmpeg(inputPaths, outputPath, format, onProgress) {
  const args = [];
  inputPaths.forEach(p => args.push('-i', p));
  const inputs = inputPaths.map((_,i) => '['+i+':a]').join('');
  args.push('-filter_complex', inputs+'concat=n='+inputPaths.length+':v=0:a=1[out]');
  args.push('-map','[out]','-c:a','libmp3lame','-y',outputPath);
  return _run(args, onProgress);
}

// ═════════════════════════════════════════════════════════════════════════════
// VIDEO FORMAT + QUALITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

function runVideoConvertFFmpeg(inputPath,outputPath,format,quality,onProgress) {
  const codecArgs=VIDEO_CODECS[format]||VIDEO_CODECS.mp4;
  const crf=CRF_MAP[quality]||'23';
  return _run(['-i',inputPath,...codecArgs,'-crf',crf,'-preset','fast','-y',outputPath],onProgress);
}

async function runVideoCompressFFmpeg(inputPath,outputPath,quality,onProgress) {
  const reduction=COMPRESS_REDUCTION[quality]??0.50;
  let targetBitrate=null;
  try{const src=await probeVideoBitrate(inputPath);if(src&&src>100000){targetBitrate=Math.round(src*(1-reduction));targetBitrate=Math.max(targetBitrate,150000);}}catch{}
  if(!targetBitrate) targetBitrate={high:2000000,medium:1200000,low:600000}[quality]??1200000;
  return _run(['-i',inputPath,'-c:v','libx264','-b:v',String(targetBitrate),'-maxrate',String(Math.round(targetBitrate*1.5)),'-bufsize',String(Math.round(targetBitrate*2)),'-preset','fast','-c:a','aac','-b:a','96k','-movflags','+faststart','-y',outputPath],onProgress);
}

function runVideoTrimFFmpeg(inputPath,outputPath,startTime,endTime,onProgress) {
  return _run(['-ss',startTime,'-i',inputPath,'-to',endTime,'-c','copy','-avoid_negative_ts','make_zero','-y',outputPath],onProgress);
}

async function runVideoToGifFFmpeg(inputPath,outputPath,{fps=10,width=480,startTime=null,duration:dur=null},onProgress) {
  let preScale='';
  try{const{width:srcW}=await probeVideoDimensions(inputPath);if(srcW>MAX_PROCESS_WIDTH)preScale='scale='+MAX_PROCESS_WIDTH+':-2,';}catch{}
  const palettePath=outputPath.replace('.gif','_pal.png');
  const scale=preScale+'fps='+fps+',scale='+width+':-1:flags=lanczos';
  const seek=startTime?['-ss',startTime]:[];
  const durA=dur?['-t',String(dur)]:[];
  await new Promise((res,rej)=>{const ff=spawn('ffmpeg',[...seek,'-i',inputPath,...durA,'-vf',scale+',palettegen=stats_mode=diff','-y',palettePath]);ff.on('close',code=>code===0?res():rej(new Error('Palette gen failed')));ff.on('error',rej);});
  onProgress({progress:50});
  await new Promise((res,rej)=>{const ff=spawn('ffmpeg',[...seek,'-i',inputPath,...durA,'-i',palettePath,'-filter_complex',scale+'[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle','-y',outputPath]);ff.on('close',code=>code===0?res():rej(new Error('GIF encode failed')));ff.on('error',rej);});
  onProgress({progress:100});
  if(fs.existsSync(palettePath))try{fs.unlinkSync(palettePath);}catch{}
}

// NEW: GIF to MP4
function runGifToMp4FFmpeg(inputPath, outputPath, onProgress) {
  return _run([
    '-i', inputPath,
    '-movflags', '+faststart',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264',
    '-crf', '23',
    '-preset', 'fast',
    '-y', outputPath,
  ], onProgress);
}

// NEW: Mute video (remove audio track)
function runVideoMuteFFmpeg(inputPath, outputPath, onProgress) {
  return _run(['-i', inputPath, '-c:v', 'copy', '-an', '-y', outputPath], onProgress);
}

// NEW: Rotate / flip video
// transform: 'cw90' | 'ccw90' | '180' | 'hflip' | 'vflip'
function runVideoRotateFFmpeg(inputPath, outputPath, transform, onProgress) {
  const FILTERS = {
    cw90:  ['-vf','transpose=1','-c:a','copy'],
    ccw90: ['-vf','transpose=2','-c:a','copy'],
    '180': ['-vf','transpose=1,transpose=1','-c:a','copy'],
    hflip: ['-vf','hflip','-c:a','copy'],
    vflip: ['-vf','vflip','-c:a','copy'],
  };
  const filterArgs = FILTERS[transform] || FILTERS.cw90;
  return _run(['-i', inputPath, ...filterArgs, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-y', outputPath], onProgress);
}

// NEW: Video merge (concatenate)
async function runVideoMergeFFmpeg(inputPaths, outputPath, onProgress) {
  const listPath = outputPath + '_list.txt';
  const lines = inputPaths.map(p => "file '" + p + "'").join('\n');
  fs.writeFileSync(listPath, lines, 'utf8');
  try {
    await _run(['-f','concat','-safe','0','-i',listPath,'-c','copy','-y',outputPath], onProgress);
  } finally {
    if (fs.existsSync(listPath)) try { fs.unlinkSync(listPath); } catch {}
  }
}

// NEW: Add audio to video
function runAudioVideoMergeFFmpeg(videoPath, audioPath, outputPath, onProgress) {
  return _run([
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    '-y', outputPath,
  ], onProgress);
}

// NEW: Extract single frame as image
function runVideoFrameExtractFFmpeg(inputPath, outputPath, timestamp, onProgress) {
  const ts = timestamp || '00:00:01';
  return _run([
    '-ss', ts,
    '-i', inputPath,
    '-frames:v', '1',
    '-q:v', '2',
    '-y', outputPath,
  ], onProgress);
}

// NEW: Video speed (slow down or speed up)
// speed: 0.25 = quarter speed, 0.5 = half, 2.0 = double, 4.0 = 4x
function runVideoSpeedFFmpeg(inputPath, outputPath, speed, onProgress) {
  const s = Math.min(4, Math.max(0.25, parseFloat(speed) || 1));
  const vpts = (1/s).toFixed(4);
  // atempo only goes 0.5–2.0 per filter; chain for extremes
  let aFilter;
  if (s >= 0.5 && s <= 2.0) {
    aFilter = 'atempo=' + s.toFixed(4);
  } else if (s < 0.5) {
    aFilter = 'atempo=0.5,atempo=' + (s*2).toFixed(4);
  } else {
    aFilter = 'atempo=2.0,atempo=' + (s/2).toFixed(4);
  }
  return _run([
    '-i', inputPath,
    '-filter_complex', '[0:v]setpts='+vpts+'*PTS[v];[0:a]'+aFilter+'[a]',
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-y', outputPath,
  ], onProgress);
}

// NEW: Video reverse (requires full decode — memory-intensive, use cautiously)
function runVideoReverseFFmpeg(inputPath, outputPath, onProgress) {
  return _run([
    '-i', inputPath,
    '-vf', 'reverse',
    '-af', 'areverse',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-y', outputPath,
  ], onProgress);
}

// ═════════════════════════════════════════════════════════════════════════════
// IMAGE FUNCTIONS (FFmpeg handles JPEG/PNG/WebP/BMP/TIFF/GIF natively)
// ═════════════════════════════════════════════════════════════════════════════

const IMAGE_FORMATS = new Set(['jpg','jpeg','png','webp','bmp','tiff','tif','gif']);

// NEW: Convert image format
function runImageConvertFFmpeg(inputPath, outputPath, onProgress) {
  onProgress({ progress: 50 });
  return _run(['-i', inputPath, '-frames:v', '1', '-y', outputPath], onProgress);
}

// NEW: Compress image (quality 1-31 for JPEG, lower = better)
function runImageCompressFFmpeg(inputPath, outputPath, quality, onProgress) {
  const q = Math.min(31, Math.max(1, parseInt(quality) || 10));
  onProgress({ progress: 50 });
  return _run(['-i', inputPath, '-frames:v', '1', '-q:v', String(q), '-y', outputPath], onProgress);
}

// NEW: Resize image
function runImageResizeFFmpeg(inputPath, outputPath, width, height, onProgress) {
  let scaleFilter;
  if (width && height) {
    scaleFilter = 'scale=' + width + ':' + height;
  } else if (width) {
    scaleFilter = 'scale=' + width + ':-1';
  } else {
    scaleFilter = 'scale=-1:' + height;
  }
  onProgress({ progress: 50 });
  return _run(['-i', inputPath, '-vf', scaleFilter, '-frames:v', '1', '-y', outputPath], onProgress);
}

// Reframe + Crop (unchanged from v9)
async function runVideoReframeFFmpeg(inputPath,outputPath,ratioKey,onProgress) {
  const r=RATIO_DIMENSIONS[ratioKey]||RATIO_DIMENSIONS['9:16'];
  const blurW=Math.max(64,Math.round(r.w/4)),blurH=Math.max(64,Math.round(r.h/4));
  let preScale='';
  try{const{width}=await probeVideoDimensions(inputPath);if(width>MAX_PROCESS_WIDTH)preScale='scale='+MAX_PROCESS_WIDTH+':-2,';}catch{}
  const filter=['[0:v]'+preScale+'split=2[src1][src2]','[src1]scale='+blurW+':'+blurH+':force_original_aspect_ratio=increase,crop='+blurW+':'+blurH+',boxblur=6:6,scale='+r.w+':'+r.h+'[bg]','[src2]scale='+r.w+':-2:force_original_aspect_ratio=decrease[fg]','[bg][fg]overlay=(W-w)/2:(H-h)/2[out]'].join(';');
  return _run(['-i',inputPath,'-filter_complex',filter,'-map','[out]','-map','0:a?','-c:a','copy','-c:v','libx264','-preset','fast','-crf','23','-y',outputPath],onProgress);
}

async function runVideoCropFFmpeg(inputPath,outputPath,ratioKey,onProgress) {
  const{width,height}=await probeVideoDimensions(inputPath);
  const targetRatio=CROP_RATIOS[ratioKey]||1,currentRatio=width/height;
  let cropW,cropH;
  if(currentRatio>targetRatio){cropH=height;cropW=Math.round(height*targetRatio);}
  else{cropW=width;cropH=Math.round(width/targetRatio);}
  cropW=cropW%2===0?cropW:cropW-1;cropH=cropH%2===0?cropH:cropH-1;
  cropW=Math.max(2,Math.min(cropW,width));cropH=Math.max(2,Math.min(cropH,height));
  const x=Math.floor((width-cropW)/2),y=Math.floor((height-cropH)/2);
  return _run(['-i',inputPath,'-vf','crop='+cropW+':'+cropH+':'+x+':'+y,'-c:v','libx264','-preset','fast','-crf','23','-c:a','copy','-y',outputPath],onProgress);
}

module.exports = {
  probeAudioStream, probeVideoDimensions, probeDuration, probeVideoBitrate,
  getAudioExtension, buildWatermarkFilter,
  runAudioFFmpeg, runAudioMergeFFmpeg,
  runVideoConvertFFmpeg, runVideoCompressFFmpeg, runVideoTrimFFmpeg,
  runVideoToGifFFmpeg, runVideoReframeFFmpeg, runVideoCropFFmpeg,
  runGifToMp4FFmpeg, runVideoMuteFFmpeg, runVideoRotateFFmpeg,
  runVideoMergeFFmpeg, runAudioVideoMergeFFmpeg, runVideoFrameExtractFFmpeg,
  runVideoSpeedFFmpeg, runVideoReverseFFmpeg,
  runImageConvertFFmpeg, runImageCompressFFmpeg, runImageResizeFFmpeg,
};
