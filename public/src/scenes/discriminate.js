(function () {
  'use strict';
  const { audio, hardware, sequence } = window.R1Phonics;

  async function enter(router) {
    const state = router.state;
    const target = sequence.currentLetter(state);
    const distractor = sequence.distractorFor(target);
    // Randomize left/right so correct answer isn't always the same side.
    const onLeft = Math.random() < 0.5 ? target : distractor;
    const onRight = onLeft === target ? distractor : target;

    const root = document.getElementById('scene');
    root.innerHTML = `
      <div class="discriminate">
        <div class="pair">
          <button class="choice" data-letter="${onLeft}">${onLeft}</button>
          <button class="choice" data-letter="${onRight}">${onRight}</button>
        </div>
      </div>`;

    let settled = false;

    const settle = async (choseLetter) => {
      if (settled) return;
      settled = true;
      off1(); off2(); off3();

      if (choseLetter === target) {
        await audio.playPraise(pickOne(['found-1', 'found-2', 'said-1']));
      } else {
        await audio.playPraise(pickOne(['remodel-1', 'remodel-2']));
        await sleep(400);
        await audio.playLetter(target);
      }
      await sleep(400);
      await router.goto('closing');
    };

    // Play target sound once on entry, then wait for choice.
    await sleep(200);
    await audio.playLetter(target);

    // Button clicks
    Array.from(root.querySelectorAll('.choice')).forEach((btn) => {
      btn.addEventListener('click', () => settle(btn.dataset.letter), { once: true });
    });

    // Scroll wheel as selector: scrollUp picks left, scrollDown picks right
    const off1 = hardware.on('scrollUp', () => settle(onLeft));
    const off2 = hardware.on('scrollDown', () => settle(onRight));
    // sideClick re-plays the target sound for hesitant children
    const off3 = hardware.on('sideClick', async () => {
      if (settled) return;
      await audio.playLetter(target);
    });
  }

  function exit() {
    document.getElementById('scene').innerHTML = '';
  }

  function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.scenes = window.R1Phonics.scenes || {};
  window.R1Phonics.scenes.discriminate = { enter, exit, name: 'discriminate' };
})();
