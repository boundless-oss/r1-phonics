(function () {
  'use strict';

  const SILENCE_THRESHOLD_DB = -40;
  const SILENCE_THRESHOLD = Math.pow(10, SILENCE_THRESHOLD_DB / 20);
  const MIN_CLIP_DURATION = 0.15;
  const TARGET_RMS_DB = -24;
  const TARGET_RMS = Math.pow(10, TARGET_RMS_DB / 20);
  const GAIN_MIN = 0.2;
  const GAIN_MAX = 4.0;

  async function analyze(blob) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const arrayBuf = await blob.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuf.slice(0));
    const channel = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    const trimStart = findTrimStart(channel, sampleRate);
    const trimEnd = findTrimEnd(channel, sampleRate);

    if (trimEnd - trimStart < MIN_CLIP_DURATION) {
      ctx.close();
      return { valid: false, reason: 'too short or silent' };
    }

    const rms = measureRMS(channel, trimStart, trimEnd, sampleRate);
    let gain = 1;
    if (rms > 0) {
      gain = TARGET_RMS / rms;
      gain = Math.max(GAIN_MIN, Math.min(GAIN_MAX, gain));
    }

    ctx.close();
    return {
      valid: true,
      trimStart,
      trimEnd,
      gain,
      duration: buffer.duration,
      trimmedDuration: trimEnd - trimStart,
      rmsDb: rms > 0 ? 20 * Math.log10(rms) : -Infinity,
    };
  }

  function findTrimStart(channel, sampleRate) {
    const windowSize = Math.floor(sampleRate * 0.01);
    for (let i = 0; i < channel.length - windowSize; i += windowSize) {
      let peak = 0;
      for (let j = i; j < i + windowSize; j++) {
        const abs = Math.abs(channel[j]);
        if (abs > peak) peak = abs;
      }
      if (peak >= SILENCE_THRESHOLD) {
        return Math.max(0, (i - windowSize)) / sampleRate;
      }
    }
    return 0;
  }

  function findTrimEnd(channel, sampleRate) {
    const windowSize = Math.floor(sampleRate * 0.01);
    for (let i = channel.length - 1; i >= windowSize; i -= windowSize) {
      let peak = 0;
      for (let j = i; j > i - windowSize; j--) {
        const abs = Math.abs(channel[j]);
        if (abs > peak) peak = abs;
      }
      if (peak >= SILENCE_THRESHOLD) {
        return Math.min(channel.length, (i + windowSize)) / sampleRate;
      }
    }
    return channel.length / sampleRate;
  }

  function measureRMS(channel, trimStartSec, trimEndSec, sampleRate) {
    const start = Math.floor(trimStartSec * sampleRate);
    const end = Math.floor(trimEndSec * sampleRate);
    if (end <= start) return 0;
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += channel[i] * channel[i];
    }
    return Math.sqrt(sum / (end - start));
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.audioProcessing = { analyze };
})();
