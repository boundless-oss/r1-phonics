(function () {
  'use strict';
  const { audio, hardware, sequence } = window.R1Phonics;

  const NAME_TO_SOUND_PAUSE = 500;
  const SOUND_PAUSE = 800;
  const FINAL_PAUSE = 600;

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

    // Model: name → pause → sound → pause → sound.
    // User can interrupt at any time.
    await audio.playName(letter);
    if (advanced) return;
    await sleep(NAME_TO_SOUND_PAUSE);
    if (advanced) return;

    await audio.playLetter(letter);
    if (advanced) return;
    await sleep(SOUND_PAUSE);
    if (advanced) return;

    await audio.playLetter(letter);
    if (advanced) return;
    await sleep(FINAL_PAUSE);
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
