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
    await router.goto('opening');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.R1Phonics = window.R1Phonics || {};
  window.R1Phonics.router = router;
})();
