/**
 * SplitPreview.jsx
 * Draggable before/after comparison slider.
 *
 * Uses clip-path on the "before" image rather than width/overflow
 * tricks — avoids sizing math bugs since both images stay at their
 * natural full size and only the visible portion changes.
 *
 * Works with any beforeSrc/afterSrc — including a Render converter
 * download URL used directly as an <img> src.
 */

import { useState, useRef, useCallback } from 'react';

export default function SplitPreview({ beforeSrc, afterSrc, beforeLabel = 'Before', afterLabel = 'After' }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const draggingRef   = useRef(false);

  const updatePosition = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || clientX == null) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const getX = (e) => e.touches?.[0]?.clientX ?? e.clientX;

  const onDown = (e) => { draggingRef.current = true;  updatePosition(getX(e)); };
  const onMove = (e) => { if (draggingRef.current) updatePosition(getX(e)); };
  const onUp   = ()  => { draggingRef.current = false; };

  if (!beforeSrc || !afterSrc) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden select-none bg-zinc-900 border border-zinc-800"
      style={{ touchAction: 'none', aspectRatio: '16/9' }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      role="slider"
      aria-label="Drag to compare before and after"
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft')  setPosition(p => Math.max(0, p - 5));
        if (e.key === 'ArrowRight') setPosition(p => Math.min(100, p + 5));
      }}
    >
      {/* After — base layer, full image */}
      <img src={afterSrc} alt={afterLabel} draggable={false}
        className="absolute inset-0 w-full h-full object-contain" />

      {/* Before — same full image, clipped via clip-path to reveal only `position`% from the left */}
      <img src={beforeSrc} alt={beforeLabel} draggable={false}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} />

      {/* Divider + drag handle */}
      <div className="absolute top-0 bottom-0 bg-white/90 pointer-events-none" style={{ left: `${position}%`, width: '2px' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center">
          <span className="text-zinc-700 text-sm" aria-hidden="true">⇔</span>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-2 left-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-md pointer-events-none">
        {beforeLabel}
      </span>
      <span className="absolute top-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-md pointer-events-none">
        {afterLabel}
      </span>

      {/* Drag hint */}
      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-zinc-400 text-xs bg-black/50 px-2 py-0.5 rounded-md pointer-events-none">
        Drag to compare
      </p>
    </div>
  );
}
