(function () {
  'use strict';

  const storage = () => window.R1Phonics.storage;

  let ctx = null;
  let unlocked = false;
  const pendingUnlock = [];

  // key -> { buffer, gain, trimStart, trimEnd }
  const decoded = new Map();

  function getCtx() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctx();
    }
    return ctx;
  }

  async function unlock() {
    if (unlocked) return;
    const c = getCtx();
    if (c.state === 'suspended') await c.resume();
    // a single-sample silent buffer to fully satisfy gesture requirement
    const buf = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
    unlocked = true;
    while (pendingUnlock.length) pendingUnlock.shift()();
  }

  function onUnlock(fn) {
    if (unlocked) { fn(); return; }
    pendingUnlock.push(fn);
  }

  function isUnlocked() { return unlocked; }

  // Decode a stored clip into an AudioBuffer; cache per key.
  async function ensureDecoded(key, payload) {
    if (decoded.has(key)) return decoded.get(key);
    const c = getCtx();
    // payload = { blob, gain, trimStart, trimEnd } or { blob } for raw probe clips
    const arrayBuf = await payload.blob.arrayBuffer();
    const buffer = await c.decodeAudioData(arrayBuf.slice(0));
    const entry = {
      buffer,
      gain: payload.gain ?? 1,
      trimStart: payload.trimStart ?? 0,
      trimEnd: payload.trimEnd ?? buffer.duration,
    };
    decoded.set(key, entry);
    return entry;
  }

  async function playClip(key, metaBlob) {
    const c = getCtx();
    if (c.state === 'suspended') await c.resume();
    const entry = await ensureDecoded(key, metaBlob);
    const src = c.createBufferSource();
    src.buffer = entry.buffer;
    const g = c.createGain();
    g.gain.value = entry.gain;
    src.connect(g); g.connect(c.destination);
    const offset = entry.trimStart;
    const duration = Math.max(0.05, entry.trimEnd - entry.trimStart);
    src.start(0, offset, duration);
    return new Promise((resolve) => { src.onended = () => resolve(); });
  }

  // --- Public API: letter, praise, chime ---

  async function playLetter(letter) {
    const clip = await storage().loadClipWithMeta(`letters-${letter}`);
    if (clip) return playClip(`letters-${letter}`, clip);
    const text = LETTER_FALLBACK_TEXT[letter] || letter;
    return speak(text, { rate: 0.7, pitch: 0.95 });
  }

  async function playPraise(slug) {
    const clip = await storage().loadClipWithMeta(`praise-${slug}`);
    if (clip) return playClip(`praise-${slug}`, clip);
    return speak(PRAISE_FALLBACK_TEXT[slug] || slug, { rate: 0.9, pitch: 1.05 });
  }

  // Synthesized chimes — never recorded. Warm sine triads with gentle envelopes.
  async function playChime(which) {
    const c = getCtx();
    if (c.state === 'suspended') await c.resume();
    const notes = which === 'open'
      ? [523.25, 440.00, 349.23]   // C5 → A4 → F4 (falling)
      : [349.23, 440.00, 523.25];  // F4 → A4 → C5 (rising)
    const now = c.currentTime;
    const dur = 0.28;
    const gap = 0.14;
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * gap;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g); g.connect(c.destination);
      osc.start(start);
      osc.stop(start + dur);
    });
    await new Promise((r) => setTimeout(r, (notes.length * gap + 0.1) * 1000));
  }

  // Web Speech API fallback (used until real clips are recorded in M2e).
  function speak(text, opts = {}) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate ?? 1;
      u.pitch = opts.pitch ?? 1;
      u.volume = opts.volume ?? 0.9;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }

  // TTS approximations — used until real clips are recorded in M2e.
  // These aren't pure phonemes (speechSynthesis can't do IPA cleanly), but
  // they're close enough to dogfood the ritual pacing.
  const LETTER_FALLBACK_TEXT = {
    a: 'aah', b: 'buh', c: 'kuh', d: 'duh', e: 'ehh',
    f: 'fff', g: 'guh', h: 'huh', i: 'ih',  j: 'juh',
    k: 'kuh', l: 'lll', m: 'mmm', n: 'nnn', o: 'ahh',
    p: 'puh', q: 'kwuh', r: 'ruh', s: 'sss', t: 'tuh',
    u: 'uhh', v: 'vvv', w: 'wuh', x: 'ks',  y: 'yuh', z: 'zzz',
  };

  // Map praise slug → English fallback for TTS. Real clips override at runtime.
  const PRAISE_FALLBACK_TEXT = {
    'said-1': 'You said the sound.',
    'said-2': 'I heard the sound.',
    'found-1': 'You found the letter.',
    'found-2': "That's the one.",
    'tried-1': 'You tried the sound.',
    'tried-2': "Let's try again.",
    'listening-1': 'Good listening.',
    'listening-2': 'Listening.',
    'remodel-1': "Let's listen again.",
    'remodel-2': 'Listen to the sound.',
  };

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.audio = {
    unlock, onUnlock, isUnlocked,
    playLetter, playPraise, playChime,
    playClip, speak,
  };
})();
