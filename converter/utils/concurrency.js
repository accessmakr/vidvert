'use strict';
/**
 * concurrency.js
 * Shared semaphore limiting simultaneous FFmpeg processes across the
 * ENTIRE server — audio jobs (queue.js) and video jobs (server.js)
 * both go through this. This is the direct fix for the Render
 * "exceeded its memory limit" crash: running two or three FFmpeg
 * processes at once on a 512MB free-tier instance is what caused it.
 *
 * MAX_CONCURRENT = 1 is intentionally conservative. Jobs queue up
 * and run one at a time rather than crashing the whole service.
 */

const MAX_CONCURRENT = 1;
let active = 0;
const waitQueue = [];

/**
 * Acquire a processing slot. Resolves once a slot is free.
 * If updateJobFn + jobId are passed, the job status is updated
 * to show "Waiting for server capacity…" while queued, so the
 * user sees an honest reason for the delay instead of silence.
 */
function acquireSlot(jobId, updateJobFn) {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      if (active < MAX_CONCURRENT) {
        active++;
        resolve();
      } else {
        if (jobId && updateJobFn) {
          updateJobFn(jobId, { statusText: 'Waiting for server capacity…' });
        }
        waitQueue.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

function releaseSlot() {
  active = Math.max(0, active - 1);
  const next = waitQueue.shift();
  if (next) next();
}

module.exports = { acquireSlot, releaseSlot };
