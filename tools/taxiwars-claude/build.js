// Build: put the Claude editor (editor/*.js) into taxiwars.html, the repo's single-file game, then split that file into the
// claude.ai artifact's files in dist/: index.html (the page, without doctype/html/head/body: the artifact wraps it), data.js,
// game.js and editor.js. Checks that the round trip the in-game "Download taxiwars.html" performs (see singleFileHTML in the
// editor) gives back the same file.
//   node build.js               the editor from editor/*.js, then the split
//   node build.js --split-only  taxiwars.html as it is (say, one downloaded from the game after Claude's edits), only split
const fs = require('fs'), path = require('path'), acorn = require('acorn');
const HTML = path.join(__dirname, '..', '..', 'taxiwars.html'), DIST = path.join(__dirname, 'dist');
const PARTS = ['p0-head.js', 'p1-source.js', 'p2-world.js', 'p3-claude.js', 'p4-ui.js'].map(f => path.join(__dirname, 'editor', f));
const SPLIT_ONLY = process.argv.includes('--split-only');
const fail = m => { console.error('BUILD FAILED: ' + m); process.exit(1); };

let h = fs.readFileSync(HTML, 'utf8');
const BEG = '<!--CLAUDE-EDITOR-BEGIN-->', END = '<!--CLAUDE-EDITOR-END-->';
if (!SPLIT_ONLY) {
  // 1. the editor, one classic script; it lives inside an inline script element, so no comment-open or script tags in its text
  const ed = PARTS.map(f => fs.readFileSync(f, 'utf8')).join('');
  try { acorn.parse(ed, { ecmaVersion: 'latest', sourceType: 'script' }); } catch (e) { fail('editor does not parse: ' + e.message + ' at line ' + (e.loc && e.loc.line)); }
  const bad = ed.match(/<\/script|<!--|<script/i); if (bad) fail(`editor contains "${bad[0]}" at offset ${bad.index}`);
  // 2. put it into taxiwars.html, just before the loader module (replacing an earlier copy)
  const block = `${BEG}\n<script type="text/x-claude-editor" id="twEditor">${ed}</script>\n${END}\n`;
  if (h.includes(BEG)) { const a = h.indexOf(BEG), b = h.indexOf(END) + END.length + 1; h = h.slice(0, a) + block + h.slice(b); }
  else { const at = h.indexOf('<script type="module">'); if (at < 0) fail('no loader module'); h = h.slice(0, at) + block + h.slice(at); }
  fs.writeFileSync(HTML, h);
}

// 3. the artifact's files
const PRE = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
const MID = '</head>\n<body>', TAIL = '</body>\n</html>\n';
if (!h.startsWith(PRE)) fail('unexpected start of taxiwars.html');
if (!h.endsWith(TAIL)) fail('unexpected end of taxiwars.html');
const hm = h.indexOf(MID); if (hm < 0) fail('no </head><body>');
const head = h.slice(PRE.length, hm);
let body = h.slice(hm + MID.length, h.length - TAIL.length);
const cutOut = (open, close, repl) => { const a = body.indexOf(open); if (a < 0) fail('missing ' + open); const b = body.indexOf(close, a + open.length); if (b < 0) fail('unclosed ' + open);
  const inner = body.slice(a + open.length, b); body = body.slice(0, a) + repl + body.slice(b + close.length); if (body.indexOf(open) >= 0) fail('twice: ' + open); return inner; };
const data = cutOut('<!--GAME-DATA-BEGIN-->\n<script>', '</script>\n<!--GAME-DATA-END-->', '<!--GAME-DATA-BEGIN-->\n<script src="data.js"></script>\n<!--GAME-DATA-END-->');
const game = cutOut('<script type="text/x-taxiwars" id="twGame">', '</script>', '<!--TW-GAME-->');
const edit = cutOut('<script type="text/x-claude-editor" id="twEditor">', '</script>', '<!--TW-EDITOR-->');
const index = '<!--TW-PAGE-BEGIN-->' + head + '<!--TW-HEAD-END-->' + body + '<!--TW-PAGE-END-->\n';
if (!/<title>[^<]+<\/title>/.test(index.slice(0, 8000))) fail('no <title> in the first 8 KB');
fs.mkdirSync(DIST, { recursive: true });
for (const [f, t] of [['index.html', index], ['data.js', data], ['game.js', game], ['editor.js', edit]]) fs.writeFileSync(path.join(DIST, f), t);

// 4. the round trip, as the editor does it (from the page the artifact serves: its skeleton around index.html)
const served = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{}</style></head><body>' + index + '</body></html>';
const T = { begin: '<!--TW-PAGE-BEGIN-->', end: '<!--TW-PAGE-END-->', head: '<!--TW-HEAD-END-->', game: '<!--TW-GAME-->', editor: '<!--TW-EDITOR-->', open: '<script', close: '</script>' };
const a = served.indexOf(T.begin), b = served.lastIndexOf(T.end), sb = served.slice(a + T.begin.length, b), cut = sb.indexOf(T.head);
const rest = sb.slice(cut + T.head.length).replace(`${T.open} src="data.js">${T.close}`, () => `${T.open}>${data}${T.close}`).replace(T.game, () => `${T.open} type="text/x-taxiwars" id="twGame">${game}${T.close}`)
  .replace(T.editor, () => `${T.open} type="text/x-claude-editor" id="twEditor">${edit}${T.close}`);
const back = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${sb.slice(0, cut)}</head>\n<body>${rest}</body>\n</html>\n`;
if (back !== h) { let i = 0; while (i < back.length && back[i] === h[i]) i++; fail('round trip differs at ' + i + ': ' + JSON.stringify(back.slice(i - 40, i + 40)) + ' vs ' + JSON.stringify(h.slice(i - 40, i + 40))); }
const kb = s => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log(`taxiwars.html ${kb(h)} | dist: index.html ${kb(index)}, data.js ${kb(data)}, game.js ${kb(game)}, editor.js ${kb(edit)} | round trip OK`);
