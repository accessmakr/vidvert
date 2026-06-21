'use strict';
const { spawn } = require('child_process');
const fs        = require('fs');

const AUDIO_FORMATS = {
  mp3:  { codec: 'libmp3lame', lossless: false },
  m4a:  { codec: 'aac',        lossless: false, extra: ['-movflags','+faststart'] },
  aac:  { codec: 'aac',        lossless: false },
  wav:  { codec: 'pcm_s16le',  lossless: true  },
  flac: { codec: 'flac',       lossless: true  },
  ogg:  { codec: 'libvorbis',  lossless: false },
  wma:  { codec: 'wmav2',      lossless: false },
  alac: { codec: 'alac',       lossless: true,  ext: 'm4a', extra: ['-movflags','+faststart'] },
  aiff: { codec: 'pcm_s16be',  lossless: true  },
};

function getAudioExtension(format) {
  return AUDIO_FORMATS[format]?.ext || format;
}

// REDUCED from 1080-based to 720-based — see runVideoReframeFFmpeg comment.
// Halving linear dimensions cuts pixel count to ~44%, which is what
// actually drives the boxblur cost on the full output canvas.
const RATIO_DIMENSIONS = {
  '9:16': { w: 720,  h: 1280 },
  '1:1':  { w: 720,  h: 720  },
  '4:5':  { w: 720,  h: 900  },
  '16:9': { w: 1280, h: 720  },
};

const CROP_RATIOS = {
  '1:1':  1,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '4:3':  4 / 3,
  '4:5':  4 / 5,
};

const MAX_PROCESS_WIDTH = 1280;

function probeAudioStream(inputPath) {
  return new Promise(resolve => {
    const p = spawn('ffprobe',['-v','error','-select_streams','a','-show_entries','stream=codec_type','-of','json',inputPath]);
    let out = '';
    p.stdout.on('data', d => out += d.toString());
    p.on('close', () => { try { resolve(JSON.parse(out).streams?.length > 0); } catch { resolve(false); } });
    p.on('error', () => resolve(false));
  });
}

function probeVideoDimensions(inputPath) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe',['-v','quiet','-print_format','json','-show_streams','-select_streams','v:0',inputPath]);
    let out = '';
    p.stdout.on('data', d => out += d.toString());
    p.on('close', code => {
      if (code !== 0) return reject(new Error('ffprobe failed'));
      try { const s = JSON.parse(out).streams[0]; resolve({ width: s.width, height: s.height }); }
      catch(e) { reject(e); }
    });
    p.on('error', reject);
  });
}

function probeDuration(inputPath) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe',['-v','error','-show_entries','format=duration','-of','json',inputPath]);
    let out = '';
    p.stdout.on('data', d => out += d.toString());
    p.on('close', code => {
      if (code !== 0) return reject(new Error('ffprobe duration failed'));
      try { resolve(parseFloat(JSON.parse(out).format.duration)); } catch(e) { reject(e); }
    });
    p.on('error', reject);
  });
}

function probeVideoBitrate(inputPath) {
  return new Promise((resolve) => {
    const p = spawn('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=bit_rate:format=bit_rate','-of','json',inputPath]);
    let out = '';
    p.stdout.on('data', d => out += d.toString());
    p.on('close', () => {
      try {
        const data = JSON.parse(out);
        const streamBR = data.streams?.[0]?.bit_rate ? parseInt(data.streams[0].bit_rate) : null;
        const formatBR = data.format?.bit_rate ? parseInt(data.format.bit_rate) : null;
        resolve(streamBR || formatBR || null);
      } catch { resolve(null); }
    });
    p.on('error', () => resolve(null));
  });
}

function buildAudioFilters({ volume=100, fadeIn=0, fadeOut=0, reverse=false, duration=null }) {
  const f = [];
  if (volume !== 100)              f.push(`volume=${(volume/100).toFixed(2)}`);
  if (fadeIn > 0)                  f.push(`afade=t=in:st=0:d=${fadeIn}`);
  if (fadeOut > 0 && duration > 0) f.push(`afade=t=out:st=${Math.max(0,duration-fadeOut).toFixed(3)}:d=${fadeOut}`);
  if (reverse)                     f.push('areverse');
  return f.length ? f.join(',') : null;
}

function _run(args, onProgress) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', args);
    let dur = null, last = 0, errBuf = '';
    ff.stderr.on('data', c => {
      const t = c.toString();
      errBuf = (errBuf + t).slice(-3000);
      if (!dur) { const m = t.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/); if (m) dur = +m[1]*3600 + +m[2]*60 + parseFloat(m[3]); }
      if (dur > 0) {
        const x = t.match(/time=\s*(\d+):(\d+):(\d+\.?\d*)/);
        if (x) {
          const cur = +x[1]*3600 + +x[2]*60 + parseFloat(x[3]);
          const pct = Math.min(99, Math.round((cur/dur)*100));
          if (pct !== last) { last = pct; onProgress({ progress: pct, eta: cur>0 ? Math.round((dur-cur)/(cur/dur)) : null }); }
        }
      }
    });
    ff.on('close',  code => code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}: ${errBuf.slice(-400)}`)));
    ff.on('error',  err  => reject(new Error(`FFmpeg spawn: ${err.message}`)));
  });
}

async function runAudioFFmpeg(inputPath, outputPath, format, qualityKbps, advanced={}, onProgress) {
  const { codec, lossless, extra=[] } = AUDIO_FORMATS[format];
  const { trimStart, trimEnd, codecMode='auto' } = advanced;

  let duration = null;
  if (advanced.fadeOut > 0) {
    try { duration = await probeDuration(inputPath); } catch {}
  }

  const args = [];
  if (trimStart && trimStart !== '00:00:00') args.push('-ss', trimStart);
  args.push('-i', inputPath);
  if (trimEnd   && trimEnd   !== '00:00:00') args.push('-to', trimEnd);
  args.push('-map', '0:a:0');

  if (codecMode === 'copy') {
    args.push('-acodec', 'copy');
  } else {
    args.push('-acodec', codec);
    if (!lossless) args.push('-b:a', `${qualityKbps}k`);
    const af = buildAudioFilters({ ...advanced, duration });
    if (af) args.push('-af', af);
  }

  args.push(...extra, '-y', outputPath);
  return _run(args, onProgress);
}

const VIDEO_CODECS = {
  mp4: ['-c:v','libx264','-c:a','aac'],
  mkv: ['-c:v','libx264','-c:a','aac'],
  webm:['-c:v','libvpx-vp9','-c:a','libopus'],
  avi: ['-c:v','libxvid','-c:a','mp3'],
  mov: ['-c:v','libx264','-c:a','aac','-movflags','+faststart'],
  wmv: ['-c:v','wmv2','-c:a','wmav2'],
  flv: ['-c:v','libx264','-c:a','aac'],
  '3gp':['-c:v','libx264','-c:a','aac','-vf','scale=320:-2'],
};

const CRF_MAP = { high: '18', medium: '23', low: '30' };

function runVideoConvertFFmpeg(inputPath, outputPath, format, quality, onProgress) {
  const codecArgs = VIDEO_CODECS[format] || VIDEO_CODECS.mp4;
  const crf = CRF_MAP[quality] || '23';
  return _run(['-i',inputPath,...codecArgs,'-crf',crf,'-preset','fast','-y',outputPath], onProgress);
}

const COMPRESS_REDUCTION = { high: 0.30, medium: 0.50, low: 0.70 };

async function runVideoCompressFFmpeg(inputPath, outputPath, quality, onProgress) {
  const reduction = COMPRESS_REDUCTION[quality] ?? 0.50;
  let targetBitrate = null;

  try {
    const sourceBitrate = await probeVideoBitrate(inputPath);
    if (sourceBitrate && sourceBitrate > 100000) {
      targetBitrate = Math.round(sourceBitrate * (1 - reduction));
      targetBitrate = Math.max(targetBitrate, 150000);
    }
  } catch {}

  if (!targetBitrate) {
    targetBitrate = { high: 2000000, medium: 1200000, low: 600000 }[quality] ?? 1200000;
  }

  return _run([
    '-i', inputPath,
    '-c:v', 'libx264',
    '-b:v', String(targetBitrate),
    '-maxrate', String(Math.round(targetBitrate * 1.5)),
    '-bufsize', String(Math.round(targetBitrate * 2)),
    '-preset', 'fast',
    '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart',
    '-y', outputPath,
  ], onProgress);
}

function runVideoTrimFFmpeg(inputPath, outputPath, startTime, endTime, onProgress) {
  return _run(['-ss',startTime,'-i',inputPath,'-to',endTime,'-c','copy','-avoid_negative_ts','make_zero','-y',outputPath], onProgress);
}

async function runVideoToGifFFmpeg(inputPath, outputPath, { fps=10, width=480, startTime=null, duration:dur=null }, onProgress) {
  let preScale = '';
  try {
    const { width: srcWidth } = await probeVideoDimensions(inputPath);
    if (srcWidth > MAX_PROCESS_WIDTH) preScale = `scale=${MAX_PROCESS_WIDTH}:-2,`;
  } catch {}

  const palettePath = outputPath.replace('.gif','_pal.png');
  const scale = `${preScale}fps=${fps},scale=${width}:-1:flags=lanczos`;
  const seek  = startTime ? ['-ss',startTime] : [];
  const durA  = dur       ? ['-t',String(dur)] : [];

  await new Promise((res,rej) => {
    const ff = spawn('ffmpeg',[...seek,'-i',inputPath,...durA,'-vf',`${scale},palettegen=stats_mode=diff`,'-y',palettePath]);
    ff.on('close',code => code===0?res():rej(new Error(`Palette gen failed (${code})`)));
    ff.on('error',rej);
  });
  onProgress({ progress: 50 });
  await new Promise((res,rej) => {
    const ff = spawn('ffmpeg',[...seek,'-i',inputPath,...durA,'-i',palettePath,
      '-filter_complex',`${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,'-y',outputPath]);
    ff.on('close',code => code===0?res():rej(new Error(`GIF encode failed (${code})`)));
    ff.on('error',rej);
  });
  onProgress({ progress: 100 });
  if (fs.existsSync(palettePath)) try { fs.unlinkSync(palettePath); } catch {}
}

/**
 * Reframe video — blur made nearly free via low-resolution blur +
 * upscale, instead of shrinking the whole output canvas further.
 *
 * Box blur is a low-frequency effect — blurring at a small fraction
 * of the target size and scaling the result back up looks visually
 * identical to blurring at full resolution, but the blur operation
 * itself only touches a fraction of the pixels. The foreground
 * (the actual subject) is a SEPARATE, unblurred scale step, so this
 * costs zero sharpness on the part that matters. This gives far more
 * memory/CPU headroom than just reducing output resolution would,
 * while keeping the same 720-based output quality.
 */
async function runVideoReframeFFmpeg(inputPath, outputPath, ratioKey, onProgress) {
  const r = RATIO_DIMENSIONS[ratioKey] || RATIO_DIMENSIONS['9:16'];

  // Blur computed at ~1/4 scale, then upscaled — roughly 16x fewer
  // pixels for the blur step itself.
  const blurW = Math.max(64, Math.round(r.w / 4));
  const blurH = Math.max(64, Math.round(r.h / 4));

  let preScale = '';
  try {
    const { width } = await probeVideoDimensions(inputPath);
    if (width > MAX_PROCESS_WIDTH) preScale = `scale=${MAX_PROCESS_WIDTH}:-2,`;
  } catch {}

  const filter = [
    `[0:v]${preScale}split=2[src1][src2]`,
    `[src1]scale=${blurW}:${blurH}:force_original_aspect_ratio=increase,crop=${blurW}:${blurH},boxblur=6:6,scale=${r.w}:${r.h}[bg]`,
    `[src2]scale=${r.w}:-2:force_original_aspect_ratio=decrease[fg]`,
    `[bg][fg]overlay=(W-w)/2:(H-h)/2[out]`,
  ].join(';');

  return _run([
    '-i', inputPath, '-filter_complex', filter, '-map', '[out]', '-map', '0:a?',
    '-c:a', 'copy', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-y', outputPath,
  ], onProgress);
}

async function runVideoCropFFmpeg(inputPath, outputPath, ratioKey, onProgress) {
  const { width, height } = await probeVideoDimensions(inputPath);
  const targetRatio  = CROP_RATIOS[ratioKey] || 1;
  const currentRatio = width / height;

  let cropW, cropH;
  if (currentRatio > targetRatio) {
    cropH = height;
    cropW = Math.round(height * targetRatio);
  } else {
    cropW = width;
    cropH = Math.round(width / targetRatio);
  }
  cropW = cropW % 2 === 0 ? cropW : cropW - 1;
  cropH = cropH % 2 === 0 ? cropH : cropH - 1;
  cropW = Math.max(2, Math.min(cropW, width));
  cropH = Math.max(2, Math.min(cropH, height));

  const x = Math.floor((width  - cropW) / 2);
  const y = Math.floor((height - cropH) / 2);

  return _run([
    '-i', inputPath,
    '-vf', `crop=${cropW}:${cropH}:${x}:${y}`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-c:a', 'copy',
    '-y', outputPath,
  ], onProgress);
}

function buildWatermarkFilter({ width, height, xInput, yInput, wInput, hInput, mode, blurRadius=20 }) {
  let w = width, h = height;
  let preScale = '';
  if (w > MAX_PROCESS_WIDTH) {
    const scale = MAX_PROCESS_WIDTH / w;
    preScale = `scale=${MAX_PROCESS_WIDTH}:-2,`;
    w = MAX_PROCESS_WIDTH;
    h = Math.round(h * scale / 2) * 2;
  }

  let xP, yP, wP, hP;
  if (mode === 'percent') {
    xP = Math.round(w * (xInput / 100));
    yP = Math.round(h * (yInput / 100));
    wP = Math.round(w * (wInput / 100));
    hP = Math.round(h * (hInput / 100));
  } else {
    const scale = w / width;
    xP = Math.round(xInput * scale);
    yP = Math.round(yInput * scale);
    wP = Math.round(wInput * scale);
    hP = Math.round(hInput * scale);
  }

  xP = Math.max(0, Math.min(xP, w - 2));
  yP = Math.max(0, Math.min(yP, h - 2));
  wP = Math.max(2, Math.min(wP, w - xP));
  hP = Math.max(2, Math.min(hP, h - yP));

  const filter = [
    `[0:v]${preScale}split=2[base][src]`,
    `[src]crop=${wP}:${hP}:${xP}:${yP},boxblur=${blurRadius}:${blurRadius}[wm]`,
    `[base][wm]overlay=${xP}:${yP}[out]`,
  ].join(';');

  return { filter, x: xP, y: yP, w: wP, h: hP };
}

module.exports = {
  probeAudioStream, probeVideoDimensions, probeDuration, probeVideoBitrate,
  getAudioExtension, buildWatermarkFilter,
  runAudioFFmpeg, runVideoConvertFFmpeg, runVideoCompressFFmpeg,
  runVideoTrimFFmpeg, runVideoToGifFFmpeg, runVideoReframeFFmpeg,
  runVideoCropFFmpeg,
};
