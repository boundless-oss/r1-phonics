(function () {
  'use strict';

  const cache = new Map();
  let unlocked = false;
  const pendingUnlock = [];

  // 44-byte PCM WAV, zero samples — enough to satisfy the user-gesture requirement.
  const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=';

  function preload(manifest) {
    for (const [key, url] of Object.entries(manifest)) {
      if (cache.has(key)) continue;
      const audio = new Audio(url);
      audio.preload = 'auto';
      cache.set(key, audio);
    }
  }

  async function unlock() {
    if (unlocked) return;
    try {
      const silent = new Audio(SILENT_WAV);
      silent.volume = 0;
      await silent.play();
    } catch (e) {
      console.warn('[audio] silent unlock rejected — will retry on next gesture', e);
      return;
    }
    // Also prime the Web Audio path in case a scene uses it later.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === 'suspended') await ctx.resume();
      }
    } catch (_) { /* non-fatal */ }
    unlocked = true;
    while (pendingUnlock.length) pendingUnlock.shift()();
  }

  function onUnlock(fn) {
    if (unlocked) { fn(); return; }
    pendingUnlock.push(fn);
  }

  function isUnlocked() { return unlocked; }

  async function play(key) {
    const audio = cache.get(key);
    if (!audio) throw new Error(`[audio] no clip registered for key: ${key}`);
    audio.currentTime = 0;
    return audio.play();
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.audio = { preload, play, unlock, onUnlock, isUnlocked };
})();
