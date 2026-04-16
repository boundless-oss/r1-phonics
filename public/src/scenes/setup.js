(function () {
  'use strict';
  const { audio, hardware, recorder, storage, audioProcessing } = window.R1Phonics;

  const LETTER_SOUNDS = {
    a: { say: 'aaa',  context: 'the sound, as in apple' },
    b: { say: 'b',    context: 'the sound — quick puff, no vowel' },
    c: { say: 'k',    context: 'the sound — hard c, as in cat' },
    d: { say: 'd',    context: 'the sound — quick tap' },
    e: { say: 'eee',  context: 'the sound, as in egg' },
    f: { say: 'fff',  context: 'the sound — teeth on lip, sustained' },
    g: { say: 'g',    context: 'the sound — hard g, as in go' },
    h: { say: 'h',    context: 'the sound — soft breath' },
    i: { say: 'ih',   context: 'the sound, as in it' },
    j: { say: 'j',    context: 'the sound, as in jam' },
    k: { say: 'k',    context: 'the sound — same as c' },
    l: { say: 'lll',  context: 'the sound — hummed' },
    m: { say: 'mmm',  context: 'the sound — lips closed hum' },
    n: { say: 'nnn',  context: 'the sound — tongue-behind-teeth hum' },
    o: { say: 'ooo',  context: 'the sound, as in octopus' },
    p: { say: 'p',    context: 'the sound — light puff, no vowel' },
    q: { say: 'kw',   context: 'the sound — kw blend' },
    r: { say: 'rrr',  context: 'the sound — soft growl' },
    s: { say: 'sss',  context: 'the sound — hiss like a snake' },
    t: { say: 't',    context: 'the sound — tongue tap' },
    u: { say: 'uh',   context: 'the sound, as in up' },
    v: { say: 'vvv',  context: 'the sound — buzzy' },
    w: { say: 'w',    context: 'the sound — round and release' },
    x: { say: 'ks',   context: 'the sound, as in fox' },
    y: { say: 'y',    context: 'the sound, as in yellow' },
    z: { say: 'zzz',  context: 'the sound — buzzy hiss' },
  };

  const LETTER_NAMES = {
    a: 'ay',   b: 'bee',  c: 'see',  d: 'dee',  e: 'ee',
    f: 'eff',  g: 'gee',  h: 'aitch', i: 'eye', j: 'jay',
    k: 'kay',  l: 'ell',  m: 'em',   n: 'en',   o: 'oh',
    p: 'pee',  q: 'cue',  r: 'ar',   s: 'ess',  t: 'tee',
    u: 'you',  v: 'vee',  w: 'double-you', x: 'ex', y: 'why', z: 'zee',
  };

  const PRAISE_TEXT = audio.PRAISE_TEXT;

  function buildPrompts() {
    // Paired per letter: name first, then sound. Reduces mental context-switching.
    const letterPairs = 'abcdefghijklmnopqrstuvwxyz'.split('').flatMap((ch) => {
      const s = LETTER_SOUNDS[ch];
      return [
        {
          slug: `names-${ch}`,
          big: ch,
          say: `"${LETTER_NAMES[ch]}"`,
          context: 'the letter name',
          category: 'name',
        },
        {
          slug: `letters-${ch}`,
          big: ch,
          say: `"${s.say}"`,
          context: s.context,
          category: 'sound',
        },
      ];
    });
    const praise = Object.entries(PRAISE_TEXT).map(([slug, text]) => ({
      slug: `praise-${slug}`,
      big: '\u266A',
      say: `"${text}"`,
      context: 'say this phrase warmly',
      category: 'praise',
    }));
    return [...letterPairs, ...praise];
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
        <div class="setup-say">say: <em>${prompt.say}</em></div>
        <div class="setup-context">${prompt.context}</div>
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
