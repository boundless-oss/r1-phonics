(function () {
  'use strict';
  const { storage, scenes } = window.R1Phonics;

  const router = {
    state: null,
    currentScene: null,
    async goto(sceneName) {
      if (this.currentScene) {
        try { await this.currentScene.exit(); } catch (e) { console.error(e); }
      }
      this.currentScene = scenes[sceneName];
      if (!this.currentScene) throw new Error(`unknown scene: ${sceneName}`);
      await this.currentScene.enter(this);
    },
  };

  async function boot() {
    router.state = await storage.load();
    if (router.state.setupDone) {
      // Auto-heal: setupDone=true but clips gone (storage cleared, quota blowup, etc).
      // Verify a few expected clips actually exist before trusting the flag.
      const sampleKeys = ['letters-s', 'names-s', 'praise-said-1'];
      const present = await Promise.all(
        sampleKeys.map((k) => storage.loadClipWithMeta(k).then((c) => !!c))
      );
      if (!present.every(Boolean)) {
        router.state.setupDone = false;
        router.state.setupNextIndex = 0;
        await storage.save(router.state);
      }
    }
    if (!router.state.setupDone) {
      await router.goto('setup');
    } else {
      await router.goto('opening');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.router = router;
})();
