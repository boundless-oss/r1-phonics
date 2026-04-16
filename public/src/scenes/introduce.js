(function () {
  'use strict';
  const { audio, sequence } = window.R1Phonics;

  const NAME_TO_SOUND_PAUSE = 500;
  const SOUND_PAUSE = 800;

  async function enter(router) {
    const state = router.state;
    const letter = sequence.currentLetter(state);
    const root = document.getElementById('scene');
    root.innerHTML = `
      <div class="introduce">
        <div class="letter-big">${letter}</div>
      </div>`;

    await audio.playName(letter);
    await sleep(NAME_TO_SOUND_PAUSE);

    await audio.playLetter(letter);
    await sleep(SOUND_PAUSE);

    await audio.playLetter(letter);
    await sleep(SOUND_PAUSE);

    await audio.playLetter(letter);
    await sleep(SOUND_PAUSE);

    await router.goto('discriminate');
  }

  function exit() {
    document.getElementById('scene').innerHTML = '';
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.scenes = window.R1Phonics.scenes || {};
  window.R1Phonics.scenes.introduce = { enter, exit, name: 'introduce' };
})();
