(function () {
  'use strict';
  const { audio, hardware } = window.R1Phonics;

  async function enter(router) {
    const root = document.getElementById('scene');
    root.innerHTML = `
      <div class="opening">
        <div class="opening-glyph">&gt;_</div>
        <div class="opening-hint">press to begin</div>
      </div>`;

    let advanced = false;
    const advance = async () => {
      if (advanced) return;
      advanced = true;
      off1(); off2(); off3();
      await audio.unlock();
      await audio.playChime('open');
      await router.goto('introduce');
    };

    const off1 = hardware.on('sideClick', advance);
    const off2 = hardware.on('longPressEnd', advance);
    const clickHandler = () => advance();
    root.addEventListener('click', clickHandler, { once: true });
    const off3 = () => root.removeEventListener('click', clickHandler);
  }

  function exit() {
    document.getElementById('scene').innerHTML = '';
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.scenes = window.R1Phonics.scenes || {};
  window.R1Phonics.scenes.opening = { enter, exit, name: 'opening' };
})();
