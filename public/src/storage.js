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

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const comma = dataUrl.indexOf(',');
        resolve(dataUrl.slice(comma + 1));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(b64, mime) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime || 'application/octet-stream' });
  }

  async function saveClip(name, blob) {
    const b64 = await blobToBase64(blob);
    const payload = JSON.stringify({ mime: blob.type, b64 });
    await backend.setItem(`r1phonics:clip:${name}`, payload);
    return { storedBytes: payload.length, mime: blob.type };
  }

  async function loadClip(name) {
    const payload = await backend.getItem(`r1phonics:clip:${name}`);
    if (!payload) return null;
    const { mime, b64 } = JSON.parse(payload);
    return base64ToBlob(b64, mime);
  }

  async function removeClip(name) {
    await backend.removeItem(`r1phonics:clip:${name}`);
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.storage = {
    load, save, reset, KEY, DEFAULT_STATE,
    saveClip, loadClip, removeClip,
  };
})();
