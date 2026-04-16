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

  // Touch delegation on document.body per SDK gotcha (inline onclick silently fails).
  function onTap(fn) {
    let lastTouchTs = 0;
    const touchHandler = (ev) => {
      ev.preventDefault();
      lastTouchTs = Date.now();
      fn(ev);
    };
    const clickHandler = (ev) => {
      if (Date.now() - lastTouchTs < 500) return;
      fn(ev);
    };
    document.body.addEventListener('touchstart', touchHandler, { passive: false });
    document.body.addEventListener('click', clickHandler);
    return () => {
      document.body.removeEventListener('touchstart', touchHandler);
      document.body.removeEventListener('click', clickHandler);
    };
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.hardware = { on, onTap, EVENTS };
})();
