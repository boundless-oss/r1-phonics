(function () {
  'use strict';
  const { audio, hardware } = window.R1Phonics;

  const PARENT_GATE_MS = 5000;

  async function enter(router) {
    const root = document.getElementById('scene');
    root.innerHTML = `
      <div class="opening">
        <div class="opening-glyph">&gt;_</div>
        <div class="opening-hint">press to begin</div>
      </div>`;

    let advanced = false;
    let pressStart = 0;

    const advance = async (toScene) => {
      if (advanced) return;
      advanced = true;
      off1(); off2(); off3(); off4();
      await audio.unlock();
      if (toScene === 'parent') {
        router.parentMode = true;
        await router.goto('setup');
      } else {
        await audio.playChime('open');
        await router.goto('introduce');
      }
    };

    const off1 = hardware.on('sideClick', () => advance('introduce'));
    const off3 = hardware.on('longPressStart', () => { pressStart = Date.now(); });
    const off2 = hardware.on('longPressEnd', () => {
      const duration = Date.now() - pressStart;
      advance(duration >= PARENT_GATE_MS ? 'parent' : 'introduce');
    });
    const clickHandler = () => advance('introduce');
    root.addEventListener('click', clickHandler, { once: true });
    const off4 = () => root.removeEventListener('click', clickHandler);
  }

  function exit() {
    document.getElementById('scene').innerHTML = '';
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.scenes = window.R1Phonics.scenes || {};
  window.R1Phonics.scenes.opening = { enter, exit, name: 'opening' };
})();
