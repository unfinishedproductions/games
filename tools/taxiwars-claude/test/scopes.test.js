// Test 2: the game's own SOURCE SCOPES, geometry buckets, colliders and srcRebuild, taken from taxiwars.html's game script and run
// with the real three.js on a tiny test city.
const vm = require('vm'), fs = require('fs'), path = require('path'), acorn = require('acorn'), assert = require('assert');
const THREE = require('three');
const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'taxiwars.html'), 'utf8');
const open = '<script type="text/x-taxiwars" id="twGame">', a = html.indexOf(open) + open.length, game = html.slice(a, html.indexOf('</script>', a));
const ast = acorn.parse(game, { ecmaVersion: 'latest' });
const WANT = new Set(['TAU', 'mulberry32', 'rand', 'rnd', 'hash2', 'C', 'V3', '_v1', 'SRC', 'srcBegin', 'srcTouch', 'srcEnd', 'srcClose', 'srcScope', 'srcRun', 'srcMark', 'srcHide', 'srcRebuild',
  'CHUNK', 'BKOV', 'BKREMAP', 'colStamp', 'bucket', 'trackBegin', 'trackEnd', 'pieceShow', 'pushV', 'WHITE', 'quad', 'BOXF', '_nm', 'boxM', '_bm', 'box', 'addGeo', 'GCACHE', 'G', 'cyl',
  'geoFromBucket', 'buildGroup', 'finalizeBuckets', 'STREAM', 'DETAIL_D', 'COLS', 'addCol', 'removeCol', 'boxCol', 'circCol', 'queryCols', '_qc']);
const names = n => n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name) : n.id ? [n.id.name] : [];
let code = "'use strict';\n";
for (const n of ast.body) if (names(n).some(x => WANT.has(x))) code += game.slice(n.start, n.end) + '\n';
for (const w of WANT) assert(new RegExp(`\\b${w}\\b`).test(code), 'missing ' + w);
code += `const scene=new THREE.Scene();const MATS=new Proxy({},{get:(t,k)=>typeof k==='string'?(t[k]||(t[k]=new THREE.MeshStandardMaterial({name:k}))):undefined});
const MCFG=new Proxy({},{get:()=>({cast:true,recv:true})});
// the test city: a street of buildings, each with a roof part and a collider; the facade takes random bricks (to test the seed replay)
function buildHouse(x,h){box('brick',x,0,0,4,h,4,WHITE);for(let i=0;i<3;i++)box('trim',x+rnd(-1,1),rnd(0,h),2.05,.3,.3,.1,WHITE);boxCol(x-2,-2,x+2,2,h,-1,'bldg');srcMark('Roof');box('roof',x,h,0,4.4,.5,4.4,WHITE);scene.add(new THREE.Object3D());}
function buildStreet(){for(let i=0;i<3;i++)srcRun({label:'Building',floors:i+2,style:'buff'},buildHouse,i*10,6+i*3);}
`;
const ctx = { THREE, console, Math, Map, Set, WeakMap, Proxy, Promise, Float32Array, Uint16Array, Uint32Array };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(code, ctx, { filename: 'taxiwars-game.js' });
const G = c => vm.runInContext(c, ctx);

(async () => {
  G('srcScope(buildStreet)'); G('finalizeBuckets(scene)');
  const SRC = G('SRC');
  assert.strictEqual(SRC.roots.length, 1); const street = SRC.roots[0]; assert.strictEqual(street.name, 'buildStreet');
  assert.strictEqual(street.kids.length, 3);
  const h2 = street.kids[1]; assert.strictEqual(h2.fn, 'buildHouse'); assert.strictEqual(JSON.stringify(h2.info), JSON.stringify({ label: 'Building', floors: 3, style: 'buff' }));
  assert.strictEqual(h2.kids.length, 1); assert.strictEqual(h2.kids[0].name, 'Roof'); assert(h2.kids[0].mark);
  assert.strictEqual(h2.cols.length, 1); assert.strictEqual(h2.objs.length, 0); assert.strictEqual(h2.kids[0].objs.length, 1);
  assert(Math.abs(h2.box.min.x - 7.8) < 1e-6 && Math.abs(h2.box.max.y - 9.5) < 1e-6, JSON.stringify(h2.box));
  assert(street.box.containsBox(h2.box));
  for (const r of h2.ranges) assert(r.g.mesh && r.g.mesh.isMesh, 'range has its baked mesh');
  // the roof part's ranges sit inside its building's ranges
  const roof = h2.kids[0], rr = roof.ranges[0], hr = h2.ranges.find(r => r.g === rr.g);
  assert(hr && rr.v0 >= hr.v0 && rr.v0 + rr.n <= hr.v0 + hr.n);
  // pick-style lookup: the innermost range holding a roof triangle is the roof
  const mesh = rr.g.mesh, face = rr.i0 / 3, v = mesh.geometry.index.getX(face * 3);
  const holders = [h2, roof].filter(s => s.ranges.some(r => r.g.mesh === mesh && v >= r.v0 && v < r.v0 + r.n));
  assert.deepStrictEqual(holders.map(s => s.name).sort(), ['Roof', 'buildHouse']);
  // determinism: rebuild building 2 with unchanged code: the same vertices come back (same seed)
  const posOf = (s) => { const out = []; for (const r of s.ranges) { if (s.kids.some(k => k.ranges.some(q => q.g === r.g))) {} const pa = r.g.mesh.geometry.attributes.position.array; out.push(...pa.slice(r.v0 * 3, (r.v0 + r.n) * 3)); } return out; };
  const old = posOf(h2).slice();
  const n1 = await G('srcRebuild')(h2);
  assert(h2.dead && !n1.dead && street.kids[1] === n1 && n1.parent === street, 'the new scope takes the old one\'s place');
  assert(n1.live && n1.live.parent === G('scene') && n1.live.children.length === 3, 'live meshes brick/trim/roof: ' + (n1.live && n1.live.children.map(m => m.name)));
  const again = posOf(n1); assert.strictEqual(again.length, old.length); for (let i = 0; i < old.length; i++) assert(Math.abs(again[i] - old[i]) < 1e-5, 'same geometry at ' + i);
  // the old vertices are collapsed in the chunk mesh; the old collider is gone and a new one is in
  const pa = hr.g.mesh.geometry.attributes.position.array, o = hr.v0 * 3; for (let i = 3; i < hr.n * 3; i += 3) assert(pa[o + i] === pa[o] && pa[o + i + 1] === pa[o + 1] && pa[o + i + 2] === pa[o + 2]);
  assert(h2.cols[0].dead && !n1.cols[0].dead); assert(!h2.kids[0].objs[0].parent, 'old scene object (claimed by the roof part) removed');
  // a live edit to the builder, then a rebuild of the same building: taller, and still the same bricks
  vm.runInContext("function buildHouse(x,h){box('brick',x,0,0,4,h*2,4,WHITE);for(let i=0;i<3;i++)box('trim',x+rnd(-1,1),rnd(0,h),2.05,.3,.3,.1,WHITE);boxCol(x-2,-2,x+2,2,h*2,-1,'bldg');srcMark('Roof');box('roof',x,h*2,0,4.4,.5,4.4,WHITE);scene.add(new THREE.Object3D());}", ctx);
  const n1live = n1.live; const n2 = await G('srcRebuild')(n1.kids[0]);// asking for the roof part rebuilds its building
  assert(n1.dead && street.kids[1] === n2 && Math.abs(n2.box.max.y - 18.5) < 1e-6, JSON.stringify(n2.box));
  assert(!n1live.parent && n1.live === null, 'previous live meshes removed'); assert.strictEqual(G('scene').children.filter(c => c.name && c.name.startsWith('Rebuilt')).length, 1);
  // buildGroup inside a rebuild keeps its own buckets (local space) and hands the world buckets back
  vm.runInContext("function buildHouse(x,h){box('brick',x,0,0,4,h,4,WHITE);const g=buildGroup(()=>{box('sign',0,0,0,1,1,.1,WHITE);});g.position.set(x,h,0);scene.add(g);box('roof',x,h,0,4.4,.5,4.4,WHITE);}", ctx);
  const n3 = await G('srcRebuild')(n2);
  assert(n3.live.children.some(m => m.name === 'roof') && !n3.live.children.some(m => m.name === 'sign'), 'sign stays in its own group');
  assert(n3.objs.some(o => o.isGroup && o.children.some(m => m.name === 'sign')), 'the group is one of the scope\'s scene objects');
  assert.strictEqual(G('BKOV'), null); assert.strictEqual(G('SRC.bk'), null); assert.strictEqual(G('SRC.stack.length'), 0);
  // a builder that throws: the error comes out, the world state is sane (no scope left open, buckets handed back)
  vm.runInContext("function buildHouse(){throw new Error('bad builder');}", ctx);
  await assert.rejects(G('srcRebuild')(n3), /bad builder/);
  assert.strictEqual(G('BKOV'), null); assert.strictEqual(G('SRC.stack.length'), 0);
  assert(!n3.dead && n3.failed && street.kids[1] === n3 && !n3.live, 'the failed scope stays in the tree, hidden, rebuildable');
  vm.runInContext("function buildHouse(x,h){box('brick',x,0,0,4,h,4,WHITE);}", ctx);
  const n4 = await G('srcRebuild')(n3); assert(street.kids[1] === n4 && n4.live && n3.dead, 'rebuilt after the fix');
  // the whole-street scope rebuilds too (a builder with parts and sub-builders), from its first seed
  vm.runInContext("function buildHouse(x,h){box('brick',x,0,0,4,h,4,WHITE);boxCol(x-2,-2,x+2,2,h,-1,'bldg');srcMark('Roof');box('roof',x,h,0,4.4,.5,4.4,WHITE);}", ctx);
  const s2 = await G('srcRebuild')(street); assert.strictEqual(s2.kids.length, 3); assert(s2.kids.every(k => k.kids.length === 1 && k.cols.length === 1));
  // pieces tracked inside a rebuilt scope never come back
  const piece = { g: { mesh: null }, v0: 0, n: 3, save: null, dead: true }; G('pieceShow')([piece], true);
  console.log('test2 source scopes & rebuild: all checks passed');
})().catch(e => { console.error('TEST2 FAILED:', e); process.exit(1); });
