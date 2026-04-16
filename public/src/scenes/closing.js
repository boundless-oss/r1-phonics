(function () {
  'use strict';
  const { audio, sequence, storage } = window.R1Phonics;

  async function enter(router) {
    const root = document.getElementById('scene');
    root.innerHTML = `
      <div class="closing">
        <div class="closing-glyph">//ok</div>
      </div>`;

    await audio.playChime('close');
    const nextState = sequence.advance(router.state);
    await storage.save(nextState);
    router.state = nextState;
    await sleep(600);
    await router.goto('opening');
  }

  function exit() {
    document.getElementById('scene').innerHTML = '';
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.scenes = window.R1Phonics.scenes || {};
  window.R1Phonics.scenes.closing = { enter, exit, name: 'closing' };
})();
