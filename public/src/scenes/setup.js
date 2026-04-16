(function () {
  'use strict';
  const { audio, hardware, recorder, storage, audioProcessing } = window.R1Phonics;

  const LETTER_SOUNDS = {
    a: { say: 'aaa',  context: 'the sound, as in apple' },
    b: { say: 'b',    context: 'the sound \u2014 quick puff, no vowel' },
    c: { say: 'k',    context: 'the sound \u2014 hard c, as in cat' },
    d: { say: 'd',    context: 'the sound \u2014 quick tap' },
    e: { say: 'eee',  context: 'the sound, as in egg' },
    f: { say: 'fff',  context: 'the sound \u2014 teeth on lip, sustained' },
    g: { say: 'g',    context: 'the sound \u2014 hard g, as in go' },
    h: { say: 'h',    context: 'the sound \u2014 soft breath' },
    i: { say: 'ih',   context: 'the sound, as in it' },
    j: { say: 'j',    context: 'the sound, as in jam' },
    k: { say: 'k',    context: 'the sound \u2014 same as c' },
    l: { say: 'lll',  context: 'the sound \u2014 hummed' },
    m: { say: 'mmm',  context: 'the sound \u2014 lips closed hum' },
    n: { say: 'nnn',  context: 'the sound \u2014 tongue-behind-teeth hum' },
    o: { say: 'ooo',  context: 'the sound, as in octopus' },
    p: { say: 'p',    context: 'the sound \u2014 light puff, no vowel' },
    q: { say: 'kw',   context: 'the sound \u2014 kw blend' },
    r: { say: 'rrr',  context: 'the sound \u2014 soft growl' },
    s: { say: 'sss',  context: 'the sound \u2014 hiss like a snake' },
    t: { say: 't',    context: 'the sound \u2014 tongue tap' },
    u: { say: 'uh',   context: 'the sound, as in up' },
    v: { say: 'vvv',  context: 'the sound \u2014 buzzy' },
    w: { say: 'w',    context: 'the sound \u2014 round and release' },
    x: { say: 'ks',   context: 'the sound, as in fox' },
    y: { say: 'y',    context: 'the sound, as in yellow' },
    z: { say: 'zzz',  context: 'the sound \u2014 buzzy hiss' },
  };

  const LETTER_NAMES = {
    a: 'ay',   b: 'bee',  c: 'see',  d: 'dee',  e: 'ee',
    f: 'eff',  g: 'gee',  h: 'aitch', i: 'eye', j: 'jay',
    k: 'kay',  l: 'ell',  m: 'em',   n: 'en',   o: 'oh',
    p: 'pee',  q: 'cue',  r: 'ar',   s: 'ess',  t: 'tee',
    u: 'you',  v: 'vee',  w: 'double-you', x: 'ex', y: 'why', z: 'zee',
  };

  const PRAISE_TEXT = audio.PRAISE_TEXT;

  function buildBasePrompts() {
    const letterPairs = 'abcdefghijklmnopqrstuvwxyz'.split('').flatMap((ch) => {
      const s = LETTER_SOUNDS[ch];
      return [
        { slug: `names-${ch}`,   big: ch, say: `"${LETTER_NAMES[ch]}"`, context: 'the letter name',         category: 'name'   },
        { slug: `letters-${ch}`, big: ch, say: `"${s.say}"`,            context: s.context,                 category: 'sound'  },
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

  const EXIT_PROMPT = {
    slug: '__exit__',
    big: '\u2715',
    say: 'exit parent mode',
    context: 'side-click to return',
    category: 'exit',
  };

  const BASE_PROMPTS = buildBasePrompts();

  // --- state ---
  let promptIndex = 0;
  let currentBlob = null;
  let currentMeta = null;
  let recState = 'idle';
  let cleanups = [];
  let parentMode = false;
  let prompts = BASE_PROMPTS;

  function cleanup() {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  }

  async function enter(router) {
    parentMode = !!router.parentMode;
    prompts = parentMode ? [...BASE_PROMPTS, EXIT_PROMPT] : BASE_PROMPTS;
    const saved = await storage.load();
    promptIndex = parentMode ? 0 : (saved.setupNextIndex || 0);
    if (!parentMode && promptIndex >= prompts.length) {
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
    const prompt = prompts[promptIndex];
    const root = document.getElementById('scene');

    if (prompt.category === 'exit') {
      renderExit(router, root);
      return;
    }

    const progressLabel = parentMode
      ? `parent \u00b7 ${promptIndex + 1}/${prompts.length - 1}`
      : `${promptIndex + 1} / ${prompts.length}`;

    root.innerHTML = `
      <div class="setup${parentMode ? ' parent' : ''}">
        <div class="setup-progress">${progressLabel}</div>
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
      updateState('\u25cf recording...', 'recording');
      timerInterval = setInterval(() => {
        const sec = ((Date.now() - recordStart) / 1000).toFixed(1);
        updateState(`\u25cf ${sec}s`, 'recording');
      }, 100);
      try { await recorder.start(); } catch (e) {
        clearInterval(timerInterval);
        updateState('mic error \u2014 try again', 'error');
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
          updateState('too quiet \u2014 redo', 'error');
          recState = 'idle';
          return;
        }
        currentBlob = blob;
        currentMeta = meta;
        recState = 'reviewing';
        updateState(`${meta.trimmedDuration.toFixed(1)}s  \u00b7  playing...`, 'ok');
        await audio.playClipDirect(blob, meta);
        updateState(`${meta.trimmedDuration.toFixed(1)}s  \u00b7  side to keep`, 'ok');
      } catch (e) {
        updateState('error \u2014 try again', 'error');
        recState = 'idle';
      }
    });

    const off3 = hardware.on('sideClick', async () => {
      if (recState !== 'reviewing' || !currentBlob) return;
      recState = 'saving';
      updateState('saving...', '');
      try {
        const result = await storage.saveClipWithMeta(prompt.slug, currentBlob, currentMeta);
        const verify = await storage.loadClipWithMeta(prompt.slug);
        if (!verify) throw new Error(`wrote ${result.storedBytes}B but read back null`);

        if (parentMode) {
          updateState('saved \u2713', 'ok');
          await new Promise((r) => setTimeout(r, 800));
          render(router);
        } else {
          const state = await storage.load();
          state.setupNextIndex = promptIndex + 1;
          await storage.save(state);
          promptIndex++;
          if (promptIndex >= prompts.length) {
            await finishSetup(router);
          } else {
            render(router);
          }
        }
      } catch (e) {
        recState = 'reviewing';
        const msg = (e && e.message) ? e.message.slice(0, 40) : String(e).slice(0, 40);
        updateState(`save failed: ${msg}`, 'error');
      }
    });

    const off4 = hardware.on('scrollUp', () => {
      if (promptIndex > 0 && recState !== 'recording' && recState !== 'saving') {
        promptIndex--;
        render(router);
      }
    });

    const off5 = hardware.on('scrollDown', () => {
      if (recState === 'recording' || recState === 'saving') return;
      if (promptIndex + 1 >= prompts.length) return;
      if (parentMode) {
        promptIndex++;
        render(router);
        return;
      }
      // setup mode: only advance past prompts that already have a saved clip
      storage.loadClip(prompt.slug).then((clip) => {
        if (clip && promptIndex + 1 < prompts.length) {
          promptIndex++;
          render(router);
        }
      });
    });

    cleanups = [off1, off2, off3, off4, off5, () => clearInterval(timerInterval)];
  }

  function renderExit(router, root) {
    root.innerHTML = `
      <div class="setup parent">
        <div class="setup-progress">parent \u00b7 exit</div>
        <div class="setup-big exit-glyph">\u2715</div>
        <div class="setup-say">${EXIT_PROMPT.say}</div>
        <div class="setup-context">${EXIT_PROMPT.context}</div>
        <div class="setup-state">side-click to exit  \u00b7  scroll-up to go back</div>
      </div>`;

    const off1 = hardware.on('sideClick', async () => {
      router.parentMode = false;
      await router.goto('opening');
    });
    const off2 = hardware.on('scrollUp', () => {
      promptIndex = prompts.length - 2;
      render(router);
    });
    cleanups = [off1, off2];
  }

  async function finishSetup(router) {
    const state = await storage.load();
    state.setupDone = true;
    state.setupNextIndex = BASE_PROMPTS.length;
    await storage.save(state);
    recorder.teardown();
    await router.goto('opening');
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.scenes = window.R1Phonics.scenes || {};
  window.R1Phonics.scenes.setup = { enter, exit, name: 'setup' };
})();
