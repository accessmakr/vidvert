/**
 * src/data/seoToolPages.js
 * PHASE 1 — Data backbone for every programmatic SEO page.
 * AMENDED — original version was missing three blueprint-required
 * fields: logic, methodology, and citations. Caught before Phase 5
 * was built on top of an incomplete foundation, patched here rather
 * than silently working around the gap.
 *
 * logic / methodology: one sentence each, per spec.
 * citations: verified-real URLs only — FFmpeg's own documentation,
 * the H.264/CRF encoding guide, Cobalt's GitHub repo, and MDN's
 * media formats reference. No invented or guessed URLs.
 *
 * Starter set: 9 pages, one per EXISTING standalone tool component.
 * Downloader-themed pages intentionally not here yet — tracked
 * separately, see VideoDownloader.jsx extraction notes.
 */

const CITATIONS = {
  ffmpegDocs: { label: 'FFmpeg Documentation', url: 'https://ffmpeg.org/documentation.html' },
  h264Guide:  { label: 'FFmpeg H.264 Encoding Guide', url: 'https://trac.ffmpeg.org/wiki/Encode/H.264' },
  cobalt:     { label: 'Cobalt (open-source media tool)', url: 'https://github.com/imputnet/cobalt' },
  mdnFormats: { label: 'MDN Web Media Formats Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/Media/Formats' },
};

export const SEO_TOOL_PAGES = [
  {
    slug: 'video-to-mp3',
    title: 'Convert Video to MP3 Online Free — No Sign-Up | VidVert',
    metaDescription: 'Extract MP3, M4A, WAV or FLAC audio from any video file free. No upload limits hidden behind a paywall, no account required, no watermark on the result.',
    h1: 'Convert Video to MP3 — Free, No Sign-Up',
    subheading: 'Pull clean audio out of any video file in seconds.',
    toolComponent: 'AudioConverter',
    logic: 'The video file is processed to keep only its audio stream, discarding the video track entirely.',
    methodology: 'Audio extraction and re-encoding is performed server-side using FFmpeg, the open-source multimedia framework.',
    citations: [CITATIONS.ffmpegDocs, CITATIONS.mdnFormats],
    contentSections: [
      {
        heading: 'When you need audio without the video',
        body: 'Podcast clips, voice memos saved as video, lecture recordings, music videos you want as a song — there are dozens of reasons to need just the sound from a video file. This strips the video track entirely and gives you a clean audio file in the format you actually need.',
      },
      {
        heading: 'Quality settings that make sense',
        body: 'Choose 64 to 320 kbps for lossy formats, or skip compression entirely with WAV, FLAC, ALAC or AIFF if you need the audio untouched. A Copy mode is also available for near-instant extraction when re-encoding isn\u2019t necessary.',
      },
    ],
    faqs: [
      { q: 'Does converting to MP3 reduce audio quality?', a: 'At 320 kbps the loss is generally inaudible to most listeners. For archival-quality needs, use a lossless format like FLAC or WAV instead.' },
      { q: 'Can I extract audio from a video I downloaded on this site?', a: 'Yes — after downloading a video, a shortcut appears to send it straight into this converter without re-uploading anything.' },
      { q: 'Is there a file size limit?', a: 'Files up to 500MB are supported.' },
      { q: 'Does this work on a phone?', a: 'Yes, the interface is built mobile-first and works the same on a phone browser as on a desktop one.' },
      { q: 'What happens to my file after conversion?', a: 'Files are automatically deleted from the server within 10 minutes of download.' },
    ],
    relatedSlugs: ['convert-audio-formats', 'video-to-gif'],
  },

  {
    slug: 'convert-audio-formats',
    title: 'Convert Audio Files Between Formats Free | VidVert',
    metaDescription: 'Convert WAV, FLAC, M4A, OGG, WMA, ALAC and AIFF between each other free, with trim, volume, fade and reverse controls. No sign-up.',
    h1: 'Convert Audio Files Between Formats',
    subheading: 'WAV to MP3, FLAC to M4A, and everything in between.',
    toolComponent: 'AudioConverter',
    logic: 'Each format is re-encoded using the codec appropriate to the target container, preserving audio content while changing how it is stored.',
    methodology: 'Conversion runs through FFmpeg with format-specific codec mapping for each of the nine supported audio formats.',
    citations: [CITATIONS.ffmpegDocs, CITATIONS.mdnFormats],
    contentSections: [
      {
        heading: 'Already-recorded audio, the right format',
        body: 'Unlike extracting audio from video, this is for audio files you already have — a WAV recording that needs to become a smaller MP3, or an old WMA file that needs converting to something modern players actually support.',
      },
      {
        heading: 'Built-in editing, not just conversion',
        body: 'Trim a section by exact timestamp, adjust volume up to 200%, add a fade in or out, or reverse the clip entirely — all before the format conversion happens, in one pass.',
      },
    ],
    faqs: [
      { q: 'Which audio formats are supported?', a: 'MP3, M4A, AAC, WAV, FLAC, OGG, WMA, ALAC and AIFF, both as input and output.' },
      { q: 'Can I trim audio without re-encoding it?', a: 'Yes — a Copy codec mode is available that trims via stream copy, avoiding any quality loss from re-encoding.' },
      { q: 'Does this support batch conversion of multiple files?', a: 'Yes, multiple files can be queued and converted in sequence from the Batch tool.' },
    ],
    relatedSlugs: ['video-to-mp3', 'trim-video-online'],
  },

  {
    slug: 'compress-video-online',
    title: 'Compress Video Online Free — Reduce File Size | VidVert',
    metaDescription: 'Shrink large video files by up to 70% without re-encoding garbage quality. Free, no sign-up, works directly in your browser.',
    h1: 'Compress Video Online',
    subheading: 'Smaller file, same content, no quality guesswork.',
    toolComponent: 'VideoCompressor',
    logic: 'The video is re-encoded at a bitrate calculated as a percentage of its own original bitrate, guaranteeing a real size reduction regardless of how the source was originally compressed.',
    methodology: 'Source bitrate is probed first, then a target bitrate (30%, 50%, or 70% lower) is applied via FFmpeg\u2019s libx264 encoder.',
    citations: [CITATIONS.h264Guide, CITATIONS.ffmpegDocs],
    contentSections: [
      {
        heading: 'Why some compressors make files bigger, not smaller',
        body: 'Many free compressors use a fixed quality setting that ignores how efficiently your source video was already encoded. This instead targets an actual percentage reduction from your file\u2019s real bitrate, so the result is reliably smaller \u2014 not occasionally larger than what you started with.',
      },
      {
        heading: 'Three levels, one clear tradeoff',
        body: 'High Quality keeps detail with a modest size cut. Balanced is the middle ground most people want. Maximum Compress prioritizes the smallest possible file when size matters more than fine detail.',
      },
    ],
    faqs: [
      { q: 'Will compressing lower the resolution?', a: 'No, resolution stays the same \u2014 only the bitrate is reduced, which affects detail and file size, not dimensions.' },
      { q: 'How much smaller will my file actually get?', a: 'High Quality targets roughly 30% smaller, Balanced roughly 50%, and Maximum Compress roughly 70% smaller than the original.' },
      { q: 'What video formats can I compress?', a: 'Any common video format \u2014 MP4, MOV, AVI, MKV, WebM and more are accepted as input.' },
    ],
    relatedSlugs: ['trim-video-online', 'crop-video-online'],
  },

  {
    slug: 'trim-video-online',
    title: 'Trim Video Online Free — Cut Any Section | VidVert',
    metaDescription: 'Cut a specific section out of any video with a real preview player, free, no quality loss from re-encoding. No sign-up required.',
    h1: 'Trim Video Online',
    subheading: 'Cut the part you want, skip the rest.',
    toolComponent: 'VideoTrimmer',
    logic: 'The video is cut at the selected start and end points using stream copy, which removes unwanted sections without decoding or re-encoding any frames.',
    methodology: 'FFmpeg\u2019s -ss and -to seek flags are combined with -c copy to trim via container-level stream copy.',
    citations: [CITATIONS.ffmpegDocs],
    contentSections: [
      {
        heading: 'Scrub to the moment, not the math',
        body: 'Rather than guessing timestamps, play the video directly in the tool and tap a button to mark the exact moment as your start or end point.',
      },
      {
        heading: 'Stream copy means no re-encoding',
        body: 'Trimming uses stream copy rather than a full re-encode, which means the cut section keeps the exact original quality and processes almost instantly regardless of file length.',
      },
    ],
    faqs: [
      { q: 'Does trimming reduce video quality?', a: 'No \u2014 trimming uses stream copy, which cuts the file without re-encoding any frames.' },
      { q: 'Can I see what I\u2019m trimming before confirming?', a: 'Yes, a real video player is built into the tool so you can play, pause and scrub before setting your start and end points.' },
      { q: 'Is there a limit on how long the trimmed clip can be?', a: 'No specific length limit \u2014 the constraint is the 500MB file size cap on the original upload.' },
    ],
    relatedSlugs: ['compress-video-online', 'video-to-gif'],
  },

  {
    slug: 'video-to-gif',
    title: 'Convert Video to GIF Free Online | VidVert',
    metaDescription: 'Turn any video clip into an animated GIF free, with control over frame rate and width. No sign-up, no watermark added.',
    h1: 'Convert Video to GIF',
    subheading: 'Turn a clip into a looping GIF in seconds.',
    toolComponent: 'GifConverter',
    logic: 'A custom color palette is generated from the specific clip first, then used to encode the GIF, rather than relying on a fixed generic palette.',
    methodology: 'Two-pass encoding via FFmpeg\u2019s palettegen and paletteuse filters minimizes the color banding common in single-pass GIF conversion.',
    citations: [CITATIONS.ffmpegDocs],
    contentSections: [
      {
        heading: 'Built for short clips, not full videos',
        body: 'GIFs are inherently a short-format medium. Keeping the source clip under 10-15 seconds gives the best balance of smooth motion and reasonable file size.',
      },
      {
        heading: 'Two-pass encoding for cleaner color',
        body: 'Rather than a single quick pass, this generates an optimized color palette from your specific clip first, then encodes against it \u2014 noticeably reducing the banding and color smearing common in quick GIF converters.',
      },
    ],
    faqs: [
      { q: 'What frame rate should I use?', a: '10fps is a good default for most clips \u2014 smooth enough for motion, small enough in file size. Push higher only if the motion genuinely needs it.' },
      { q: 'Why is my GIF file so large?', a: 'GIF is an inherently inefficient format for video-like content. Shorter clips and lower frame rates are the most effective way to keep size down.' },
      { q: 'Can I select just part of a longer video for the GIF?', a: 'Yes, a start time and duration can be set so only the relevant section gets converted.' },
    ],
    relatedSlugs: ['trim-video-online', 'video-to-mp3'],
  },

  {
    slug: 'remove-video-watermark',
    title: 'Remove Watermark from Video Free | VidVert',
    metaDescription: 'Remove logos and watermarks from video using preset positions or custom coordinates. Free, no sign-up, works on any common video format.',
    h1: 'Remove Watermark from Video',
    subheading: 'Clean up a logo or overlay without re-shooting anything.',
    toolComponent: 'WatermarkRemover',
    logic: 'The watermarked region is cropped out, heavily blurred, then composited back over the original frame in the same position.',
    methodology: 'A split filter graph isolates the watermark region for boxblur processing while the rest of the frame remains untouched, via FFmpeg\u2019s filter_complex.',
    citations: [CITATIONS.ffmpegDocs],
    contentSections: [
      {
        heading: 'Preset positions for common platforms',
        body: 'Most platform watermarks land in predictable corners. Preset positions cover the common cases directly, with custom pixel coordinates available for anything that doesn\u2019t match a standard layout.',
      },
      {
        heading: 'How this actually works',
        body: 'The watermarked region is cropped, heavily blurred, then composited back over the original frame in that exact position \u2014 removing the sharp, legible overlay while keeping everything else in the frame untouched.',
      },
    ],
    faqs: [
      { q: 'Will this remove any watermark perfectly?', a: 'It blurs the watermarked region rather than reconstructing what was underneath, so the result is a softened patch rather than a perfect AI-restored image. Works best on small corner watermarks.' },
      { q: 'Can I use custom coordinates instead of a preset?', a: 'Yes, exact pixel position and size can be entered manually for watermarks that don\u2019t fit a standard corner placement.' },
      { q: 'Does this work on large video files?', a: 'Yes \u2014 large sources are automatically scaled before processing to keep the operation fast and reliable.' },
    ],
    relatedSlugs: ['remove-image-watermark', 'compress-video-online'],
  },

  {
    slug: 'remove-image-watermark',
    title: 'Remove Watermark from Image Free | VidVert',
    metaDescription: 'Remove logos and text overlays from JPG, PNG and WebP images free, with a before/after preview slider. No sign-up.',
    h1: 'Remove Watermark from Image',
    subheading: 'Clean up a logo or text overlay from any photo.',
    toolComponent: 'ImageWatermarkRemover',
    logic: 'The same crop-blur-overlay technique used for video is applied to a single still frame, processing in under a second.',
    methodology: 'FFmpeg\u2019s image handling pipeline processes a single frame using the identical filter_complex approach as the video watermark tool.',
    citations: [CITATIONS.ffmpegDocs, CITATIONS.mdnFormats],
    contentSections: [
      {
        heading: 'See the result before downloading',
        body: 'A draggable before/after slider shows the original next to the processed result, so there\u2019s no need to download and check \u2014 the comparison is right there in the tool.',
      },
      {
        heading: 'Preset corners or exact coordinates',
        body: 'Choose a common watermark position \u2014 top-left, bottom-right, and so on \u2014 or specify exact pixel coordinates for anything in a non-standard spot.',
      },
    ],
    faqs: [
      { q: 'What image formats are supported?', a: 'JPG, PNG, WebP, BMP and GIF are all accepted.' },
      { q: 'How do I find the exact pixel coordinates of a watermark?', a: 'A browser\u2019s developer tools or any photo editor can show pixel position when hovering over an image \u2014 useful for the custom coordinate option.' },
      { q: 'Does this use AI to reconstruct the image?', a: 'No, the current version blurs the watermarked region rather than reconstructing it. It works best on small, corner-positioned overlays.' },
    ],
    relatedSlugs: ['remove-video-watermark', 'crop-video-online'],
  },

  {
    slug: 'reframe-video-vertical',
    title: 'Convert Video to Vertical for TikTok & Reels Free | VidVert',
    metaDescription: 'Resize any video for TikTok, Reels or Shorts without cropping out content \u2014 blurred background fills the empty space. Free, no sign-up.',
    h1: 'Convert Video to Vertical',
    subheading: 'Resize for TikTok, Reels and Shorts \u2014 nothing cropped out.',
    toolComponent: 'VideoReframe',
    logic: 'The source is scaled to fit within the target frame, and a separately blurred, scaled copy of the same video fills any remaining empty space.',
    methodology: 'A split filter graph generates a low-resolution blurred background and a sharp foreground scale in parallel, composited via FFmpeg\u2019s overlay filter.',
    citations: [CITATIONS.ffmpegDocs],
    contentSections: [
      {
        heading: 'Why this is different from cropping',
        body: 'Cropping a horizontal video to vertical cuts off whatever was at the sides. This instead scales the original to fit within the new frame and fills the remaining space with a blurred, scaled copy of the same video \u2014 nothing in the original shot is lost.',
      },
      {
        heading: 'Four shapes, covering the platforms that matter',
        body: 'Vertical (9:16) for TikTok, Reels and Shorts. Square (1:1) and Portrait (4:5) for Instagram feed posts. Horizontal (16:9) for standard landscape output.',
      },
    ],
    faqs: [
      { q: 'Will this cut off part of my video?', a: 'No \u2014 that\u2019s the difference between reframing and cropping. Reframing pads the frame instead of cutting content away.' },
      { q: 'What resolution is the output?', a: '720-based output \u2014 720\u00d71280 for vertical, for example \u2014 which matches standard quality for short-form social platforms.' },
      { q: 'Can I reframe to square or landscape instead of vertical?', a: 'Yes, Square, Portrait and Horizontal are all available alongside Vertical.' },
    ],
    relatedSlugs: ['crop-video-online', 'video-to-gif'],
  },

  {
    slug: 'crop-video-online',
    title: 'Crop Video to Square or Vertical Free | VidVert',
    metaDescription: 'Crop video to 1:1, 9:16, 16:9, 4:3 or 4:5 with an automatic centered crop. Free, no sign-up, works on any common video format.',
    h1: 'Crop Video Online',
    subheading: 'Cut to a new shape, centered automatically.',
    toolComponent: 'VideoCropper',
    logic: 'The crop region is calculated automatically from the video\u2019s real dimensions and the target ratio, trimming evenly from the sides or top and bottom to keep the center.',
    methodology: 'Actual source dimensions are probed first via ffprobe, then a centered crop box is computed and applied with FFmpeg\u2019s crop filter.',
    citations: [CITATIONS.ffmpegDocs],
    contentSections: [
      {
        heading: 'Crop versus reframe \u2014 picking the right one',
        body: 'Cropping cuts the edges off to fit a new shape \u2014 useful when the subject is already centered and the goal is simply a different aspect ratio. For content where nothing should be lost, Reframe pads instead of cutting.',
      },
      {
        heading: 'Automatic centered crop',
        body: 'The crop region is calculated automatically based on your chosen ratio and the video\u2019s actual dimensions, keeping the center of the frame and trimming evenly from the sides or top and bottom as needed.',
      },
    ],
    faqs: [
      { q: 'Will cropping cut off part of my video?', a: 'Yes, by design \u2014 cropping removes the edges to fit the new shape. Use Reframe instead if nothing should be lost.' },
      { q: 'Which ratios are supported?', a: '1:1, 9:16, 16:9, 4:3 and 4:5.' },
      { q: 'Can I choose exactly where the crop is positioned?', a: 'The current version centers the crop automatically based on the video\u2019s dimensions rather than allowing manual positioning.' },
    ],
    relatedSlugs: ['reframe-video-vertical', 'compress-video-online'],
  },
];

export function getToolPageBySlug(slug) {
  return SEO_TOOL_PAGES.find(p => p.slug === slug) || null;
}

export function getRelatedPages(slug, max = 3) {
  const page = getToolPageBySlug(slug);
  if (!page) return [];
  return page.relatedSlugs
    .map(getToolPageBySlug)
    .filter(Boolean)
    .slice(0, max);
}

export function getAllSlugs() {
  return SEO_TOOL_PAGES.map(p => p.slug);
}
