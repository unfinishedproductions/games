# Taxi Wars: the in-game Claude editor

The Claude editor (menu › Developer › Claude) ships inside `taxiwars.html` as the `twEditor` script. Its source is
`editor/*.js`, and `build.js` writes it into `taxiwars.html`, so edit the parts rather than that block.

The game is published with the editor as a claude.ai artifact: https://claude.ai/artifact/G7jt8pZXW9oXKsxFACmAE5
(private to its owner until it is shared). There, Claude runs on the viewer's own Claude plan through the artifact's
`sample` capability, not on API credits. Anywhere else, the Claude tab links to the artifact.

## Build and test

```sh
npm install
npm run build   # editor/*.js into taxiwars.html, then dist/: index.html, data.js, game.js, editor.js
npm run split   # dist/ from taxiwars.html as it is (say, one downloaded from the game after Claude's edits)
npm test        # build, then the four suites (Node only)
```

## Publish

Publish `dist/index.html` as the artifact's page, with `data.js`, `game.js` and `editor.js` beside it and the
capabilities `sample`, `artifact` and `downloads`. From Claude Code, ask for a republish to the URL above so the link
stays the same.

## Edits made in the game

**Save** (Developer › Claude) writes the edited `game.js` into the artifact, so everyone who opens it gets the change.
To bring the edits into this repo, use **Download taxiwars.html** in the same panel and commit that file in place of
`taxiwars.html`.

## Files

| File | What it holds |
| --- | --- |
| `editor/p0-head.js` | Setup, model tiers, the claude.ai capabilities, runtime errors, running injected code |
| `editor/p1-source.js` | The game's source: its index, reading and searching code, hot-patching edits, undo, saving and publishing |
| `editor/p2-world.js` | Naming what you tap, what is in view, screenshots, photos (EXIF position and heading onto the game map) |
| `editor/p3-claude.js` | The conversation: instructions, the tools Claude can call, the context sent with each prompt |
| `editor/p4-ui.js` | The chat bar, tagging, the photo overlay, the Developer panel page, the single-file download |
| `test/hotpatch.test.js` | Live edits: redeclaring functions and methods, rollback when an edit throws |
| `test/scopes.test.js` | The game's source scopes: what each builder made, rebuilding one from its seed |
| `test/editor.test.js` | The whole editor in a jsdom page, with a scripted stand-in for Claude |
| `test/photo.test.js` | EXIF parsing, latitude and longitude onto the game grid, the Markdown renderer's escaping |
