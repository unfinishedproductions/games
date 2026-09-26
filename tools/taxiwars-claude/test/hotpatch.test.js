// Test 1: the editor's live-edit engine (p0 + p1) in a vm realm that behaves like a page: classic scripts share one global scope,
// a script that throws fires a window 'error' event, a "frame loop" keeps calling the game's per-frame function.
const vm = require('vm'), fs = require('fs'), path = require('path'), acorn = require('acorn'), assert = require('assert');
const P = f => fs.readFileSync(path.join(__dirname, '..', 'editor', f), 'utf8');
let src = P('p0-head.js') + P('p1-source.js');
src = src.replace('let ACORN=null;', 'let ACORN=globalThis.__acornLib;');
assert(src.includes('let ACORN=globalThis.__acornLib;'), 'acorn hook');
src += `\nconst UI={ready:false,refreshEdits(){}};\nwindow.__T={editCode,hotApply,SRCM,stepHistory,ERR,readCode,searchCode,codeMap,srcIndex,runScript,saveLocal};\n})();`;

const FIXTURE = `
'use strict';
// ================= CORE =================
function add(a,b){return a+b;}
let SPEED=5;
const LIMIT=10;
// ---------- cars ----------
class Car{constructor(){this.v=1;}go(){return 'go'+this.v;}}
const car=new Car();
function tick(){return SPEED*2;}
// ================= SCOPES =================
const SRC={byId:new Map([[1,{fn:'buildThing',dead:false}]])};
function buildThing(){return 'built';}
`;
const listeners = {};
const ctx = { console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, TextEncoder, performance, URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} }, Blob: class {} };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.addEventListener = (t, f) => (listeners[t] = listeners[t] || []).push(f);
ctx.removeEventListener = (t, f) => { const a = listeners[t] || []; const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); };
const fire = (t, e) => { for (const f of (listeners[t] || []).slice()) f(e); };
const run = (code) => { const m = code.match(/\/\/# sourceURL=(\S+)\s*$/); try { vm.runInContext(code, ctx, { filename: m ? m[1] : 'inline.js' }); } catch (e) { fire('error', { error: e, message: e.message, filename: m ? m[1] : '' }); } };
const el = () => ({ dataset: {}, textContent: '', remove() {} });
ctx.document = { createElement: el, head: { appendChild(e) { if (e.textContent) run(e.textContent); } }, body: { appendChild(e) { if (e.textContent) run(e.textContent); } } };
const db = new Map(); ctx.TW_DB = { get: async k => db.get(k), set: async (k, v) => { db.set(k, v); }, del: async k => { db.delete(k); } };
ctx.TW_SRC = { base: 'b0', shipped: FIXTURE, text: FIXTURE, edited: false, skipped: null, saved: null };
ctx.TW_HASH = s => 'h' + s.length;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.__acornLib = acorn;
vm.createContext(ctx);
run(FIXTURE + '\n//# sourceURL=taxiwars-game.js');
run(src);
const T = ctx.__T, G = c => vm.runInContext(c, ctx);
// the game's frame loop: calls tick() every 16 ms; an exception is a window error, as in the browser
const loop = setInterval(() => { try { G('tick()'); } catch (e) { fire('error', { error: e, message: e.message }); } }, 16);

(async () => {
  let r;
  // 1. a function body changes: swapped live
  r = await T.editCode({ edits: [{ old_string: 'return a+b;', new_string: 'return a+b+100;' }], summary: 'add more' });
  assert.strictEqual(G('add(1,2)'), 103); assert(/swapped function add/.test(r.text), r.text);
  // 2. a let initializer: re-assigned
  r = await T.editCode({ edits: [{ old_string: 'let SPEED=5;', new_string: 'let SPEED=7;' }], summary: 'speed' });
  assert.strictEqual(G('SPEED'), 7); assert.strictEqual(G('tick()'), 14); assert(/re-assigned SPEED/.test(r.text));
  // 3. a const: not live, reported
  r = await T.editCode({ edits: [{ old_string: 'const LIMIT=10;', new_string: 'const LIMIT=20;' }], summary: 'limit' });
  assert.strictEqual(G('LIMIT'), 10); assert(/const LIMIT \(line \d+\) changed: it is read at load/.test(r.text), r.text);
  // 4. a class method: patched on the live class; the existing instance picks it up and keeps its identity
  r = await T.editCode({ edits: [{ old_string: "go(){return 'go'+this.v;}", new_string: "go(){return 'GO'+this.v;}" }], summary: 'shout' });
  assert.strictEqual(G('car.go()'), 'GO1'); assert.strictEqual(G('car instanceof Car'), true); assert(/patched class Car/.test(r.text));
  // 5. constructor change: methods live, a note says the constructor waits for a restart
  r = await T.editCode({ edits: [{ old_string: 'constructor(){this.v=1;}', new_string: 'constructor(){this.v=2;}' }], summary: 'ctor' });
  assert(/constructor or fields changed/.test(r.text), r.text);
  // 6. a syntax error: refused, nothing changes
  const before = T.SRCM.text;
  await assert.rejects(T.editCode({ edits: [{ old_string: 'return SPEED*2;', new_string: 'return SPEED*2;;}}' }], summary: 'broken' }), /does not parse/);
  assert.strictEqual(T.SRCM.text, before);
  // 7. not found / twice
  await assert.rejects(T.editCode({ edits: [{ old_string: 'nope nope', new_string: 'x' }], summary: 'x' }), /not found/);
  await assert.rejects(T.editCode({ edits: [{ old_string: '// ====', new_string: '// ===' }], summary: 'x' }), /more than once/);
  await assert.rejects(T.editCode({ edits: [{ old_string: '  12| function add', new_string: 'x' }], summary: 'x' }), /line-number prefix/);
  // 8. per-frame code that starts throwing: rolled back, the game runs the old code again, source unchanged
  const t0 = T.SRCM.text;
  await assert.rejects(T.editCode({ edits: [{ old_string: 'function tick(){return SPEED*2;}', new_string: 'function tick(){return SPEED.nope.x;}' }], summary: 'boom' }), /rolled back[\s\S]*reading 'x'[\s\S]*at tick \(game line \d+, live edit\)/);
  assert.strictEqual(G('tick()'), 14); assert.strictEqual(T.SRCM.text, t0);
  // 9. a new declaration: added
  r = await T.editCode({ edits: [{ old_string: "function buildThing(){return 'built';}", new_string: "function buildThing(){return 'built2';}\nfunction extra(){return 42;}\nconst EXTRA_T=[1,2];" }], summary: 'extra' });
  assert.strictEqual(G('extra()'), 42); assert.strictEqual(G('EXTRA_T.length'), 2); assert(/buildThing is a world builder: call rebuild/.test(r.text), r.text); assert(/added extra/.test(r.text));
  // 10. the swallowed-comment warning
  r = await T.editCode({ edits: [{ old_string: 'let SPEED=7;', new_string: 'let SPEED=7;// faster now SPEED=9;tick();' }], summary: 'comment' });
  assert(/seems to contain code/.test(r.text), r.text);
  // 11. undo: back to the previous text and behaviour
  const h = await T.stepHistory(true); assert(h && h.summary === 'comment');
  // 12. read / search / map
  const rc = await T.readCode({ name: 'add' }); assert(/function add, lines \d+-\d+/.test(rc) && /return a\+b\+100/.test(rc), rc);
  const rs = await T.readCode({ section: 'scopes' }); assert(/section SCOPES/.test(rs), rs);
  const sc = await T.searchCode({ query: 'SPEED' }); assert(/\[tick\]/.test(sc), sc);
  const cm = await T.codeMap(); assert(/L\d+-\d+ CORE: add\(\), SPEED, LIMIT/.test(cm) && /· cars: class Car/.test(cm), cm);
  // 13. errors map to game lines
  const e = T.ERR.list.find(x => /reading 'x'/.test(x.msg)); assert(e && e.stack.some(s => /game line \d+, live edit/.test(s)), JSON.stringify(e && e.stack));
  // 14. the local copy is kept
  await T.saveLocal(); const rec = db.get('source'); assert(rec && rec.text === T.SRCM.text && rec.bases.includes('b0') && rec.log.length >= 5, JSON.stringify(rec && rec.log));
  clearInterval(loop); console.log('test1 hot-patch engine: all 14 checks passed');
})().catch(e => { clearInterval(loop); console.error('TEST1 FAILED:', e); process.exit(1); });
