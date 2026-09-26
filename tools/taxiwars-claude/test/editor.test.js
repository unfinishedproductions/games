// Test 3: the whole Claude editor (dist/editor.js) in a jsdom page, over a small game made of the real game's source-scope and bucket
// code, with a scripted stand-in for claude.ai's `sample` capability that works the page tools the way Claude would.
const fs = require('fs'), path = require('path'), acorn = require('acorn'), assert = require('assert'), { JSDOM } = require('jsdom'), THREE = require('three');
const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'taxiwars.html'), 'utf8');
const open = '<script type="text/x-taxiwars" id="twGame">', a0 = html.indexOf(open) + open.length, game = html.slice(a0, html.indexOf('</script>', a0));
const ast = acorn.parse(game, { ecmaVersion: 'latest' });
const WANT = new Set(['TAU', 'mulberry32', 'rand', 'rnd', 'hash2', 'C', 'V3', '_v1', 'SRC', 'srcBegin', 'srcTouch', 'srcEnd', 'srcClose', 'srcScope', 'srcRun', 'srcMark', 'srcHide', 'srcRebuild',
  'CHUNK', 'BKOV', 'BKREMAP', 'colStamp', 'bucket', 'trackBegin', 'trackEnd', 'pieceShow', 'pushV', 'WHITE', 'quad', 'BOXF', '_nm', 'boxM', '_bm', 'box', 'addGeo', 'GCACHE', 'G', 'cyl',
  'geoFromBucket', 'buildGroup', 'finalizeBuckets', 'STREAM', 'DETAIL_D', 'COLS', 'addCol', 'removeCol', 'boxCol', 'circCol', 'queryCols', '_qc']);
const names = n => n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name) : n.id ? [n.id.name] : [];
let core = '';for (const n of ast.body) if (names(n).some(x => WANT.has(x))) core += game.slice(n.start, n.end) + '\n';
// the fixture game: the real scope/bucket code, a street of houses, and stand-ins for the globals the editor reads
const FIX = `'use strict';
// ================= CORE =================
${core}
// ================= WORLD =================
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(62,1024/768,.25,900),renderer={shadowMap:{needsUpdate:false}},canvasEl=document.getElementById('view');
const MATS=new Proxy({},{get:(t,k)=>typeof k==='string'?(t[k]||(t[k]=new THREE.MeshStandardMaterial({name:k}))):undefined}),MCFG=new Proxy({},{get:()=>({cast:true,recv:true})});
// ---------- houses ----------
function buildHouse(x,h){box('brick',x,0,0,8,h,8,WHITE);boxCol(x-4,-4,x+4,4,h,-1,'bldg');srcMark('Roof');box('roof',x,h,0,8.8,.6,8.8,WHITE);}
function buildStreet(){for(let i=0;i<3;i++)srcRun({label:'Building',floors:i+2,style:'buff'},buildHouse,i*20,8+i*4);}
// ================= STAND-INS =================
const FRAME_HOOKS=[],SKY={t:16.5,night:0},STATE={started:true,paused:false,touch:false},GAR={on:false},KEYS={},TOUCH={x:0,y:0,active:false},DEVUI={tab:'spawn'};
let MOUSE_DX=0,MOUSE_DY=0,envTimer=0,CITY_READY=true,skyMesh=null;
const PLAYER={h:{pos:new THREE.Vector3(20,0,40),group:new THREE.Group(),yaw:0,place(){}},car:null,mount:null};
const CAM={},AER={on:false,x:0,z:0,h:200,yaw:0,pitch:.9},EDCAM={on:false,pos:new THREE.Vector3(),yaw:0,pitch:0,fov:62};
const VEHICLES=[],PEDS=[],MOUNTS=[],LTRAINS=[],BOATS=[],SAILBOATS=[],PEOPLE_KIND_NAMES={},NS=[{n:'State St',x:20}],EW=[{n:'Madison St',z:30}],MAP={x0:-100,x1:100,z0:-100,z1:100},VIS={x0:-200,x1:200,z0:-200,z1:200};
function streetNameAt(x,z){return[NS[0],EW[0],Math.abs(x-20),Math.abs(z-30)];}
function districtAt(){return'The Loop';}function surfType(){return'block';}function groundAt(){return 0;}function isWater(){return false;}
function renderFrame(){}function updateStreaming(){}function toggleAerial(){AER.on=!AER.on;}function setPause(p){STATE.paused=p;}function buildDev(){}
function leaveGarage(){}function putPlayerInHeroCab(){}function exitVehicle(){}
function edCamOn(x,y,z,yaw,pitch,fov){EDCAM.on=true;EDCAM.pos.set(x,y,z);EDCAM.yaw=yaw;EDCAM.pitch=pitch;EDCAM.fov=fov;camera.position.set(x,y,z);const cp=Math.cos(pitch);camera.lookAt(x-Math.sin(yaw)*cp,y+Math.sin(pitch),z-Math.cos(yaw)*cp);camera.fov=fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
function edCamOff(){EDCAM.on=false;}
// the loop: FRAME_HOOKS after each frame, like the game's frame()
setInterval(()=>{for(const f of FRAME_HOOKS)f(.016);},16);
`;
const dom = new JSDOM(`<!doctype html><html><head></head><body><div id="game" style="position:relative"><canvas id="view"></canvas><div id="street"></div><div id="toast"></div></div><div id="devPanel"></div><div id="mapView" style="display:none"></div></body></html>`,
  { url: 'https://artifact.test/', runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window, doc = w.document;
w.THREE = THREE; w.TextEncoder = require('util').TextEncoder; if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true });
w.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1024, height: 768, right: 1024, bottom: 768 });
const errors = [];w.addEventListener('error', e => errors.push(e.message));w.addEventListener('unhandledrejection', e => { errors.push('rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); });
const inject = code => { const s = doc.createElement('script'); s.textContent = code; doc.body.appendChild(s); };
// the loader's part: the source it ran, its store and hash
const db = new Map();w.TW_DB = { get: async k => db.get(k), set: async (k, v) => { db.set(k, v); }, del: async k => { db.delete(k); } };
w.TW_HASH = s => 'h' + s.length + ':' + s.slice(0, 20).length;w.TW_SRC = { base: w.TW_HASH(FIX), shipped: FIX, text: FIX, edited: false, skipped: null, saved: null };w.TW_RUN = { mode: 'inline' };
inject(FIX + '\n//# sourceURL=taxiwars-game.js');
const G = c => w.eval(c);
G('srcScope(buildStreet);for(const m of finalizeBuckets(scene))scene.add(m);camera.position.set(20,10,60);camera.lookAt(20,6,0);camera.updateMatrixWorld();');
// claude.ai's capabilities, scripted: Claude reads the builder, makes the houses taller, rebuilds the middle one, looks, answers
const calls = [], published = [];let script = null;
const sample = async (input, opts) => { calls.push({ input, opts });
  if (typeof input !== 'string') {
    assert(Array.isArray(input) && input[0].role === 'user' && input[input.length - 1].role === 'user', 'turns start and end with user');
    const total = input.reduce((n, t) => n + Buffer.byteLength(t.content), 0); assert(total <= 65536, 'input over 64 KiB: ' + total);
    for (const t of input) assert(typeof t.content === 'string' && t.content.trim(), 'non-empty string turns'); }
  assert(!('cache' in opts) || opts.cache === false || !opts.tools, 'no cache with tools');
  try { return await script(input, opts); } catch (e) { if (e instanceof Error) console.error("SCRIPT ERROR:", e.message); throw e; } };
sample.limits = async () => ({ maxPromptBytes: 65536, tools: { maxCount: 12 } });
const tool = (opts, name) => opts.tools.find(t => t.name === name);
const run = async (opts, name, input) => { try { return { ok: true, out: await tool(opts, name).execute(input, { signal: new w.AbortController().signal }) }; } catch (e) { return { ok: false, out: 'Error: ' + e.message }; } };
w.claude = { use: async n => n === 'sample' ? sample : n === 'artifact' ? { publish: async f => { published.push(f); return { version: 'v' + published.length, shas: { 'game.js': 'sha' + published.length } }; } } : n === 'downloads' ? { save: async () => ({ status: 'saved' }) } : null };
inject(fs.readFileSync(path.join(__dirname, '..', 'dist', 'editor.js'), 'utf8').replace('ACORN=await import(ACORN_URL)', 'ACORN=window.__acornLib') + '\n//# sourceURL=taxiwars-claude-editor.js');
w.__acornLib = acorn;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (f, ms = 8000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) throw new Error('timed out waiting'); await sleep(20); } };

(async () => {
  assert(w.TWE && typeof w.TWE.panel === 'function', 'window.TWE');
  await until(() => doc.querySelector('#twe.on'));// the bar shows while playing on claude.ai
  const input = doc.querySelector('.twe-in'), pick = doc.querySelector('.twe-pick'), go = doc.querySelector('.twe-go');
  // editor mode: focusing the bar; a tap on the middle house tags it and lights it up
  input.dispatchEvent(new w.FocusEvent('focus'));assert(doc.body.classList.contains('twe-edit'));
  const tap = (x, y) => { for (const t of ['pointerdown', 'pointerup']) pick.dispatchEvent(new w.MouseEvent(t, { clientX: x, clientY: y, bubbles: true })); };
  w.PointerEvent || (w.PointerEvent = w.MouseEvent);
  tap(512, 330);
  await until(() => doc.querySelector('.twe-chip'));
  assert(/@\[3-storey buff brick building[^\]]*\]/.test(input.value), 'tag inserted: ' + input.value);
  assert(G('scene.children.some(c=>c.name==="Claude editor highlights"&&c.children.length===1)'), 'highlight group');
  // keys typed into the bar don't reach the game; / focuses the bar from the game
  let gameKeys = 0;w.addEventListener('keydown', () => gameKeys++);input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true }));assert.strictEqual(gameKeys, 0, 'keys stay in the bar');
  // --- the scripted answer ---
  script = async (input, opts) => {
    const last = input[input.length - 1].content;
    assert(input[0].content.startsWith('You are Claude, working live inside Taxi Wars'), 'instructions first');
    assert(/<game_context>[\s\S]*Tagged by the player:[\s\S]*tag 1: 3-storey buff brick building/.test(last), 'context with the tag');
    assert(/Code for tag 1[\s\S]*genBuilding|Code for tag 1[\s\S]*function buildHouse|Code for tag 1[\s\S]*buildHouse/.test(last), 'code for the tag: ' + last.slice(last.indexOf('<code>'), last.indexOf('<code>') + 300));
    assert(/<code_map>[\s\S]*CORE[\s\S]*<\/code_map>/.test(last), 'code map on the first message');
    assert(/The player says: @\[3-storey[^\]]*\]\s+make it twice as tall/.test(last), "the prompt last");
    const ids = last.match(/scope #(\d+)/); assert(ids, 'scope id in context');
    let r = await run(opts, 'read_code', { name: 'buildHouse' }); assert(r.ok && /function buildHouse/.test(r.out), r.out);
    r = await run(opts, 'edit_code', { edits: [{ old_string: "box('brick',x,0,0,8,h,8,WHITE)", new_string: "box('brick',x,0,0,8,h*2,8,WHITE)" }, { old_string: "box('roof',x,h,0,8.8,.6,8.8,WHITE)", new_string: "box('roof',x,h*2,0,8.8,.6,8.8,WHITE)" }], summary: 'taller houses' });
    assert(r.ok && /swapped function buildHouse/.test(r.out) && /world builder: call rebuild/.test(r.out), r.out);
    r = await run(opts, 'edit_code', { edits: [{ old_string: 'no such text', new_string: 'x' }], summary: 'bad' }); assert(!r.ok && /not found/.test(r.out));
    r = await run(opts, 'rebuild', { scope: '#' + ids[1] }); assert(r.ok && /Rebuilt 3-storey buff brick building/.test(r.out) && /y 0\.\.24\.6/.test(r.out), r.out);
    r = await run(opts, 'describe_view', {}); assert(r.ok && /View: on foot/.test(r.out) && /Biggest things in view/.test(r.out), r.out);
    r = await run(opts, 'find_assets', { query: 'roof' }); assert(r.ok && /Roof/.test(r.out), r.out);
    r = await run(opts, 'run_js', { code: 'return SRC.roots.length+1' }); assert(r.ok && r.out.startsWith('2'), r.out);
    r = await run(opts, 'run_js', { code: 'return typeof localStorage+typeof fetch' }); assert(r.ok && /undefinedundefined/.test(r.out), 'no storage or network in run_js: ' + r.out);
    r = await run(opts, 'set_camera', { mode: 'free', x: 20, y: 30, z: 80, look_at: { x: 20, y: 0, z: 0 } }); assert(r.ok && /free camera/.test(r.out), r.out);
    r = await run(opts, 'set_camera', { mode: 'player' }); assert(r.ok);
    const text = 'I doubled the height of the houses and rebuilt the one you tagged.\n<img src=x onerror="window.pwned=1">\nNEXT: rebuild the other two houses';
    opts.onText({ text, delta: text });return { text, truncated: false, modelTierApplied: 'default' }; };
  input.value = input.value + ' make it twice as tall';
  go.click();
  try { await until(() => published.length === 1, 15000); } catch (e) { console.error('calls:', calls.length, '| log:', doc.querySelector('.twe-log').textContent.slice(0, 600), '| status:', doc.querySelector('.twe-st').textContent); throw e; }
  assert.strictEqual(calls.length, 1);
  assert(G('buildHouse.toString()').includes('h*2'), 'the running game has the new builder');
  assert.strictEqual(published[0]['game.js'].content, w.TW_SRC.text, 'saved into the artifact');assert(/h\*2/.test(published[0]['game.js'].content));
  await until(() => doc.querySelector('.twe-foot button.hot') && doc.querySelector('.twe-foot button.hot').style.display === '');// Continue
  const log = doc.querySelector('.twe-log');
  assert(/doubled the height/.test(log.textContent) && !log.querySelector('.twe-a img') && !w.pwned, 'answer shown, HTML in it inert');
  const tools = [...log.querySelectorAll('.twe-t summary')].map(s => s.textContent);
  assert(tools.some(t => /^✓ Edited taller houses/.test(t)) && tools.some(t => /^✗ Edited bad: /.test(t)) && tools.some(t => /^✓ Rebuilt #\d+/.test(t)), tools.join(' | '));
  assert(!doc.querySelector('.twe-chip'), 'tags cleared after sending');
  assert(db.get('source') && db.get('source').text === w.TW_SRC.text && db.get('source').log.length === 1, 'kept in this browser');
  assert(db.get('chat') && db.get('chat').turns.length === 2, 'conversation kept');
  // --- Continue: the second request carries the tool log, the history, and no code map ---
  script = async (input, opts) => { const last = input[input.length - 1].content;
    assert(/Tools your last answer ran:[\s\S]*edit_code taller houses: ok/.test(last), 'tool log');assert(!/<code_map>/.test(last), 'map sent once');
    assert(input.some(t => t.role === 'assistant' && /doubled the height/.test(t.content)), 'history');assert(/The player says: Continue: rebuild the other two houses/.test(last));
    throw { code: 'rate_limited', message: 'slow down' }; };
  doc.querySelector('.twe-foot button.hot').click();
  await until(() => /usage limit/.test(doc.querySelector('.twe-log').textContent));
  // --- the Developer page's Claude tab: log in (a quick call), model choice ---
  script = async (input, opts) => { assert.strictEqual(input, 'Reply with exactly one word: Connected');assert.strictEqual(opts.modelTier, 'quick');return { text: 'Connected', truncated: false, modelTierApplied: 'quick' }; };
  const P = doc.getElementById('devPanel');w.TWE.panel(P);const login = [...P.querySelectorAll('button')].find(b => /Log in with Claude/.test(b.textContent));assert(login, 'login button');
  login.click();await sleep(50);G('DEVUI.tab="claude"');
  // (the game re-renders the tab through buildDev; here, render it again by hand)
  P.textContent = '';w.TWE.panel(P);assert(/Connected to your Claude account/.test(P.textContent), P.textContent.slice(0, 200));
  assert(/1 live edit — saved into the artifact/.test(P.textContent), P.textContent);
  // × leaves editor mode
  doc.querySelector('.twe-x').click();assert(!doc.body.classList.contains('twe-edit'));
  const jsErr = errors.filter(m => !/Not implemented|getContext/.test(m));assert.deepStrictEqual(jsErr, [], 'page errors: ' + jsErr.join(' | '));
  console.log('test3 editor in a page: all checks passed');process.exit(0);
})().catch(e => { console.error('TEST3 FAILED:', e);console.error('page errors:', errors.slice(0, 5));process.exit(1); });
