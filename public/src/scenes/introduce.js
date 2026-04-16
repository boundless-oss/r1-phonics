(function () {
  'use strict';
  const { audio, hardware, sequence } = window.R1Phonics;

  const MODEL_PAUSE_MS = 800;

  async function enter(router) {
    const state = router.state;
    const letter = sequence.currentLetter(state);
    const root = document.getElementById('scene');
    root.innerHTML = `
      <div class="introduce">
        <div class="letter-big">${letter}</div>
      </div>`;

    let advanced = false;
    const advance = async () => {
      if (advanced) return;
      advanced = true;
      off1(); off2(); off3();
      await router.goto('discriminate');
    };
    const off1 = hardware.on('sideClick', advance);
    const off2 = hardware.on('longPressEnd', advance);
    const onTap = () => advance();
    root.addEventListener('click', onTap, { once: true });
    const off3 = () => root.removeEventListener('click', onTap);

    // Model the sound 3× with gentle pauses. User can interrupt at any time.
    for (let i = 0; i < 3 && !advanced; i++) {
      await audio.playLetter(letter);
      if (advanced) break;
      await sleep(MODEL_PAUSE_MS);
    }
    if (!advanced) await sleep(600);
    advance();
  }

  function exit() {
    document.getElementById('scene').innerHTML = '';
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.scenes = window.R1Phonics.scenes || {};
  window.R1Phonics.scenes.introduce = { enter, exit, name: 'introduce' };
})();
