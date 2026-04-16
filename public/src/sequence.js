(function () {
  'use strict';

  // V1: pure Jolly Phonics order for early CVC word formation (sat, pin, tap...).
  // V2: parent-set name letters will prepend here (loaded from creationStorage).
  const LETTERS = ['s', 'a', 't', 'p', 'i', 'n'];

  // Distractor selection — deliberately distinct from every target.
  // Shape contrast first, phonetic contrast second. Never overlaps with LETTERS.
  const DISTRACTORS = {
    s: 'o',
    a: 'x',
    t: 'o',
    p: 'l',
    i: 'm',
    n: 'o',
  };

  function currentLetter(state) {
    return LETTERS[state.letterIndex % LETTERS.length];
  }

  function distractorFor(letter) {
    return DISTRACTORS[letter] || 'o';
  }

  function advance(state) {
    return {
      ...state,
      letterIndex: (state.letterIndex + 1) % LETTERS.length,
      sessionCount: state.sessionCount + 1,
      lastSessionISO: new Date().toISOString(),
    };
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.sequence = { LETTERS, DISTRACTORS, currentLetter, distractorFor, advance };
})();
