(function () {
  'use strict';

  const EVENTS = ['sideClick', 'scrollUp', 'scrollDown', 'longPressStart', 'longPressEnd'];
  const listeners = new Map(EVENTS.map((e) => [e, []]));

  EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, (ev) => {
      for (const fn of listeners.get(eventName)) {
        try { fn(ev); } catch (e) { console.error(`[hardware] ${eventName} handler threw`, e); }
      }
    });
  });

  function on(eventName, fn) {
    const arr = listeners.get(eventName);
    if (!arr) throw new Error(`[hardware] unknown event: ${eventName}`);
    arr.push(fn);
    return () => {
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    };
  }

  // Passive tap observer — no preventDefault, so normal button clicks still fire.
  function observeTaps(fn) {
    const handler = (ev) => fn(ev);
    document.body.addEventListener('touchstart', handler, { passive: true });
    return () => document.body.removeEventListener('touchstart', handler);
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.hardware = { on, observeTaps, EVENTS };
})();
