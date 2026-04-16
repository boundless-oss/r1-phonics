(function () {
  'use strict';
  const { audio, hardware, sequence } = window.R1Phonics;

  async function enter(router) {
    const state = router.state;
    const target = sequence.currentLetter(state);
    const distractor = sequence.distractorFor(target);
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
    let inputEnabled = false;
    const buttons = Array.from(root.querySelectorAll('.choice'));

    const settle = async (choseLetter, chosenBtn) => {
      if (settled || !inputEnabled) return;
      settled = true;
      off1(); off2(); off3();

      const correct = choseLetter === target;
      if (chosenBtn) {
        chosenBtn.classList.add(correct ? 'selected-correct' : 'selected-wrong');
      }
      buttons.forEach((b) => b.setAttribute('disabled', 'true'));

      if (correct) {
        await audio.playPraise(pickOne(['found-1', 'found-2']));
      } else {
        await audio.playPraise(pickOne(['remodel-1', 'remodel-2']));
        await sleep(400);
        await audio.playLetter(target);
      }
      await sleep(600);
      await router.goto('closing');
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => settle(btn.dataset.letter, btn));
    });

    const off1 = hardware.on('scrollUp', () => settle(onLeft, buttons.find((b) => b.dataset.letter === onLeft)));
    const off2 = hardware.on('scrollDown', () => settle(onRight, buttons.find((b) => b.dataset.letter === onRight)));
    const off3 = hardware.on('sideClick', async () => {
      if (settled || !inputEnabled) return;
      await audio.playLetter(target);
    });

    // Prompt sequence: sound → phrase → letter name. Input gated until done.
    await sleep(200);
    await audio.playLetter(target);
    await sleep(400);
    await audio.playPhrase('find-letter');
    await sleep(150);
    await audio.playName(target);

    inputEnabled = true;
    buttons.forEach((b) => b.classList.add('ready'));
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
