(function () {
  'use strict';
  const { audio, hardware, recorder, storage, audioProcessing } = window.R1Phonics;

  const LETTER_HINTS = {
    a: '/æ/ — apple',     b: '/b/ — quick puff',   c: '/k/ — cat',
    d: '/d/ — quick tap', e: '/ɛ/ — egg',          f: '/fff/ — sustained',
    g: '/g/ — go',        h: '/h/ — soft breath',  i: '/ɪ/ — it',
    j: '/ʤ/ — jam',       k: '/k/ — quick',        l: '/lll/ — hummed',
    m: '/mmm/ — hummed',  n: '/nnn/ — hummed',     o: '/ɒ/ — octopus',
    p: '/p/ — light puff', q: '/kw/ — quick',      r: '/r/ — soft growl',
    s: '/sss/ — hiss',    t: '/t/ — tongue tap',   u: '/ʌ/ — up',
    v: '/vvv/ — buzz',    w: '/w/ — rounded',      x: '/ks/ — fox',
    y: '/y/ — yellow',    z: '/zzz/ — buzz',
  };

  const PRAISE_TEXT = audio.PRAISE_TEXT;

  function buildPrompts() {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('').map((ch) => ({
      slug: `letters-${ch}`,
      big: ch,
      hint: LETTER_HINTS[ch] || ch,
      category: 'letter',
    }));
    const praise = Object.entries(PRAISE_TEXT).map(([slug, text]) => ({
      slug: `praise-${slug}`,
      big: '♪',
      hint: `"${text}"`,
      category: 'praise',
    }));
    return [...letters, ...praise];
  }

  const PROMPTS = buildPrompts();

  // --- state ---
  let promptIndex = 0;
  let currentBlob = null;
  let currentMeta = null;
  let recState = 'idle'; // idle | recording | reviewing | saving
  let cleanups = [];

  function cleanup() {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  }

  async function enter(router) {
    const saved = await storage.load();
    promptIndex = saved.setupNextIndex || 0;
    if (promptIndex >= PROMPTS.length) {
      await finishSetup(router);
      return;
    }
    await recorder.init();
    render(router);
  }

  function exit() {
    cleanup();
    recorder.teardown();
    document.getElementById('scene').innerHTML = '';
  }

  function render(router) {
    cleanup();
    const prompt = PROMPTS[promptIndex];
    const root = document.getElementById('scene');

    root.innerHTML = `
      <div class="setup">
        <div class="setup-progress">${promptIndex + 1} / ${PROMPTS.length}</div>
        <div class="setup-big">${prompt.big}</div>
        <div class="setup-hint">${prompt.hint}</div>
        <div class="setup-state" id="setup-state">hold PTT to record</div>
      </div>`;

    const stateEl = document.getElementById('setup-state');
    let timerInterval = null;
    let recordStart = 0;
    currentBlob = null;
    currentMeta = null;
    recState = 'idle';

    const updateState = (text, cls) => {
      stateEl.textContent = text;
      stateEl.className = 'setup-state' + (cls ? ` ${cls}` : '');
    };

    const off1 = hardware.on('longPressStart', async () => {
      if (recState === 'saving') return;
      await audio.unlock();
      recState = 'recording';
      currentBlob = null;
      currentMeta = null;
      recordStart = Date.now();
      updateState('● recording...', 'recording');
      timerInterval = setInterval(() => {
        const sec = ((Date.now() - recordStart) / 1000).toFixed(1);
        updateState(`● ${sec}s`, 'recording');
      }, 100);
      try { await recorder.start(); } catch (e) {
        clearInterval(timerInterval);
        updateState('mic error — try again', 'error');
        recState = 'idle';
      }
    });

    const off2 = hardware.on('longPressEnd', async () => {
      if (recState !== 'recording') return;
      clearInterval(timerInterval);
      try {
        const blob = await recorder.stop();
        const meta = await audioProcessing.analyze(blob);
        if (!meta.valid) {
          updateState('too quiet — redo', 'error');
          recState = 'idle';
          return;
        }
        currentBlob = blob;
        currentMeta = meta;
        recState = 'reviewing';
        updateState(`${meta.trimmedDuration.toFixed(1)}s  ·  playing...`, 'ok');
        await audio.playClipDirect(blob, meta);
        updateState(`${meta.trimmedDuration.toFixed(1)}s  ·  side to keep`, 'ok');
      } catch (e) {
        updateState('error — try again', 'error');
        recState = 'idle';
      }
    });

    const off3 = hardware.on('sideClick', async () => {
      if (recState === 'reviewing' && currentBlob) {
        recState = 'saving';
        updateState('saving...', '');
        await storage.saveClipWithMeta(prompt.slug, currentBlob, currentMeta);
        const state = await storage.load();
        state.setupNextIndex = promptIndex + 1;
        await storage.save(state);
        promptIndex++;
        if (promptIndex >= PROMPTS.length) {
          await finishSetup(router);
        } else {
          render(router);
        }
      } else if (recState === 'idle') {
        // sideClick on idle with no recording — skip back to replay last saved if exists
      }
    });

    const off4 = hardware.on('scrollUp', () => {
      if (promptIndex > 0 && recState !== 'recording' && recState !== 'saving') {
        promptIndex--;
        render(router);
      }
    });

    const off5 = hardware.on('scrollDown', () => {
      // only allow scroll-forward past already-saved prompts
      const saved = promptIndex + 1;
      // check if current was already saved; if so allow advancing
      if (recState !== 'recording' && recState !== 'saving') {
        storage.loadClip(prompt.slug).then((clip) => {
          if (clip && promptIndex + 1 < PROMPTS.length) {
            promptIndex++;
            render(router);
          }
        });
      }
    });

    cleanups = [off1, off2, off3, off4, off5, () => clearInterval(timerInterval)];
  }

  async function finishSetup(router) {
    const state = await storage.load();
    state.setupDone = true;
    state.setupNextIndex = PROMPTS.length;
    await storage.save(state);
    recorder.teardown();
    await router.goto('opening');
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.scenes = window.R1Phonics.scenes || {};
  window.R1Phonics.scenes.setup = { enter, exit, name: 'setup' };
})();
