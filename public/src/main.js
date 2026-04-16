(function () {
  'use strict';
  const { storage, scenes, manifest } = window.R1Phonics;

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
    // Hold the splash visible briefly so the version tag is readable.
    await new Promise((r) => setTimeout(r, 1200));
    router.state = await storage.load();

    // Storage is the source of truth — not the setupDone flag. Check every
    // expected clip; if all present, setup is effectively done regardless of
    // what the flag says. If any missing, resume at the first gap.
    const presence = await Promise.all(
      manifest.allSlugs.map((slug) =>
        storage.loadClipWithMeta(slug).then((c) => !!c)
      )
    );
    const firstMissing = presence.findIndex((ok) => !ok);
    const allPresent = firstMissing === -1;

    if (allPresent) {
      if (!router.state.setupDone) {
        router.state.setupDone = true;
        await storage.save(router.state);
      }
      await router.goto('opening');
    } else {
      // Resume setup at the first gap so partial progress isn't thrown away.
      if (router.state.setupDone || router.state.setupNextIndex !== firstMissing) {
        router.state.setupDone = false;
        router.state.setupNextIndex = firstMissing;
        await storage.save(router.state);
      }
      await router.goto('setup');
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
