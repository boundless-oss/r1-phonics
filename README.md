# r1-phonics

A Rabbit R1 creation: a calm, predictable, voice-driven letter companion for a 3–5 year old neurodivergent child. Designed for brief parent-assisted sessions (~3 minutes/day).

See `design.md` for the research synthesis and the plan file (`~/.claude/plans/wise-munching-koala.md`) for the implementation roadmap.

## Local development

```sh
cd public && python3 -m http.server 8765
```

Then open http://localhost:8765/ in Chrome and set the viewport to 240×282 (devtools → responsive mode).

Simulate hardware events from the console:

```js
window.dispatchEvent(new Event('sideClick'));
window.dispatchEvent(new Event('scrollUp'));
window.dispatchEvent(new Event('longPressStart'));
```

## Deployment

Static host on Netlify. `netlify.toml` sets `public/` as the publish dir. The creation is installed onto an R1 by pointing the SDK's `qr/` tool at the deployed HTTPS URL and scanning.

## Status

V1 scaffold — verbatim plugin-demo from [`rabbit-hmi-oss/creations-sdk`](https://github.com/rabbit-hmi-oss/creations-sdk). Strip and rebuild in M1 (see plan file).
