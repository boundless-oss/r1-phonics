(function () {
  'use strict';

  const KEY = 'r1phonics:state:v1';
  const DEFAULT_STATE = Object.freeze({
    letterIndex: 0,
    sessionCount: 0,
    lastSessionISO: null,
  });

  const backend = (window.creationStorage && window.creationStorage.plain) || {
    async getItem(k) { return localStorage.getItem(k); },
    async setItem(k, v) { localStorage.setItem(k, v); },
    async removeItem(k) { localStorage.removeItem(k); },
  };

  async function load() {
    try {
      const raw = await backend.getItem(KEY);
      if (!raw) return { ...DEFAULT_STATE };
      return { ...DEFAULT_STATE, ...JSON.parse(atob(raw)) };
    } catch (e) {
      console.warn('[storage] load failed, returning defaults', e);
      return { ...DEFAULT_STATE };
    }
  }

  async function save(state) {
    const encoded = btoa(JSON.stringify(state));
    await backend.setItem(KEY, encoded);
  }

  async function reset() {
    await backend.removeItem(KEY);
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.storage = { load, save, reset, KEY, DEFAULT_STATE };
})();
