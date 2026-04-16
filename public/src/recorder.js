(function () {
  'use strict';

  let stream = null;
  let recorder = null;
  let chunks = [];

  async function init() {
    if (stream) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('mediaDevices.getUserMedia not available');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder not available');
    }
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  async function start() {
    await init();
    chunks = [];
    const mimeCandidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      '',
    ];
    const chosen = mimeCandidates.find((m) => m === '' || MediaRecorder.isTypeSupported(m));
    recorder = chosen ? new MediaRecorder(stream, { mimeType: chosen }) : new MediaRecorder(stream);
    recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    recorder.start();
  }

  function stop() {
    return new Promise((resolve, reject) => {
      if (!recorder) { reject(new Error('no active recorder')); return; }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        resolve(blob);
      };
      recorder.onerror = (e) => reject(e.error || new Error('recorder error'));
      recorder.stop();
    });
  }

  function isRecording() { return recorder && recorder.state === 'recording'; }

  function teardown() {
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch (_) {}
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    recorder = null;
    chunks = [];
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.recorder = { init, start, stop, isRecording, teardown };
})();
