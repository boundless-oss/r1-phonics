(function () {
  'use strict';
  const { audio, hardware, sequence } = window.R1Phonics;

  const NAME_TO_SOUND_PAUSE = 500;
  const SOUND_PAUSE = 800;
  const POST_MODEL_GRACE = 4000;

  async function enter(router) {
    const state = router.state;
    const letter = sequence.currentLetter(state);
    const root = document.getElementById('scene');
    root.innerHTML = `
      <div class="introduce">
        <div class="letter-big">${letter}</div>
      </div>`;

    let advanced = false;
    let inputEnabled = false;

    const advance = async () => {
      if (advanced || !inputEnabled) return;
      advanced = true;
      off1(); off2(); off3();
      await router.goto('discriminate');
    };

    const off1 = hardware.on('sideClick', advance);
    const off2 = hardware.on('longPressEnd', advance);
    const onTap = () => advance();
    root.addEventListener('click', onTap);
    const off3 = () => root.removeEventListener('click', onTap);

    // Model: name then sound three times. Input is ignored while modeling.
    await audio.playName(letter);
    await sleep(NAME_TO_SOUND_PAUSE);

    await audio.playLetter(letter);
    await sleep(SOUND_PAUSE);

    await audio.playLetter(letter);
    await sleep(SOUND_PAUSE);

    await audio.playLetter(letter);
    await sleep(SOUND_PAUSE);

    // Modeling complete. Child can now tap to advance, or we auto-advance
    // after a grace window so the ritual doesn't get stuck.
    inputEnabled = true;
    root.querySelector('.letter-big').classList.add('ready');

    await sleep(POST_MODEL_GRACE);
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
