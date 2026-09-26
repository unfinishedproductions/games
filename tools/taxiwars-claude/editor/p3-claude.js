
// ================= ASKING CLAUDE =================
// One request = the standing instructions (a leading user turn: there is no system prompt on claude.ai), the recent conversation,
// and the new message with the game's context, the code that built what was tagged, the screenshot and any photos. Claude works
// through the page tools below, a few rounds per request; a longer job ends with a NEXT: line and the Continue button.
const INSTRUCTIONS=`You are Claude, working live inside Taxi Wars, a 3D three.js game of Chicago on October 16, 1928 (Yellow Cab vs Checker, fares, races, horses and wagons, the "L", the river, Grant Park). The player talks to you from a prompt bar in the running game, usually standing where they want something changed. You read and edit the game's own source with the page tools; your edits go live in the running game without a reload and are saved into the game.

HOW THE GAME IS BUILT
- One classic script (the game source, about 4,900 lines) in sections headed // ================= NAME ================= and // ---------- part ----------. The code is dense: several statements per line, short lowercase comments in the author's voice. Match that style and don't reformat code you aren't changing.
- Metres; +x east, +z south, y up. Roadways are y=0, sidewalks CURB (0.16). Streets are in the NS and EW tables (State St x=110, Madison St z=-30); districtAt(x,z) and streetNameAt(x,z) name places; groundAt(x,z,y) is the ground height (terrainH holds the special cases).
- The world is built once at load by builders that init() runs in source scopes: srcScope(buildL), srcScope(genCity,cells) (each building is srcRun({label:'Building',...},genBuilding,...)), srcScope(buildLandmarks) with parts such as srcMark('Tribune Tower (1925)'). Static geometry goes through box(), quad(), addGeo(), cyl() and the like into per-material chunk buckets that finalizeBuckets() bakes and the game streams by distance; buildGroup(fn) makes movable objects from the same helpers; colliders are boxCol / circCol.
- Every frame, frame() runs the simulation and the update functions (updateSky, updateLTrains, updateTraffic, pedsUpdate...), then renderFrame().
- Globals: scene, camera, renderer, PLAYER (h, car, mount), CAM, AER (aerial view), EDCAM (free camera), SKY (t = hour of day), MATS (materials by key), VEHICLES, PEDS, MOUNTS, LTRAINS, TRAMS, BOATS, SRC (source scopes).

HOW EDITS GO LIVE
- edit_code applies exact replacements and at once swaps changed top-level functions into the running game (per-frame code changes immediately), patches changed class methods, re-assigns changed top-level let values and adds new declarations.
- Load-time code needs one more step: after changing a world builder, call rebuild on the smallest scope that shows the change (one building or one landmark part, not the whole city). Top-level const values, data tables and top-level statements are read once at load: change them, then call restart_world (or update the live objects with run_js as well).
- If the running game throws new errors after an edit, the edit is rolled back and you get the errors.
- Never put a // comment in the middle of a line with code after it: everything after // on that line becomes comment. That bug broke this game before. End the line after the comment, or use /* */.

HOW YOU WORK HERE
- The newest message has <game_context>: time, camera, the player, the centre of the screen, what the player tagged (@[Name] in their text is a numbered tag, circled with its number on the screenshot), what is in view, who is near, recent errors, and the code that built the tagged things. Start from it.
- You get only a few tool rounds per request. Make independent calls in the same round (several reads or searches at once). Read the exact lines before editing: old_string must match exactly and be unique; never copy read_code's line-number prefix.
- You can't see new screenshots while you work: use describe_view after you move the camera or rebuild.
- If the job needs more rounds than you have, finish a coherent piece, then end your answer with one line starting "NEXT:" saying what is left; the player can press Continue, which also sends you a fresh screenshot. Do the same when you want to look at a visible change.
- For a general request (every lamp, all the water, the sky), change the system that makes all of them, not one of them.
- Old photographs: reproduce the viewpoint with set_camera (a photo from a phone may come with an estimated position and heading), compare the pictures, then change proportions, heights, colours and details so the game matches; say what you matched and what you couldn't.
- Big changes (a new district, a bigger map) are fine: plan them, keep the game loading, and restart_world when the data tables change.
- Leave the camera where the player had it unless the task needs another view; give it back with set_camera {"mode":"player"} when you are done.
- Write briefly and plainly: the player is in the middle of the game. Say what you changed and where. Ask only when you can't tell what they want.
- run_js runs in the page without network or storage; never try to reach credentials.`;
const RUN={busy:false,ctl:null,log:[],edited:false,restart:null,shrink:1,noImages:false};
// every tool call shows in the conversation while it runs; the ones that change things take turns
function tool(name,description,properties,required,fn,opts={}){
  return{name,description,inputSchema:{type:'object',properties,...(required&&required.length?{required}:{})},
    async execute(input,ctx){const it=UI.toolStart(name,input);RUN.log.push(it);
      try{if(ctx&&ctx.signal&&ctx.signal.aborted)throw new Error('stopped');const r=await(opts.mutates?locked(()=>fn(input||{},ctx)):fn(input||{},ctx));
        const s=typeof r==='string'?r:JSON.stringify(r);UI.toolEnd(it,true,s);return s.length>30000?s.slice(0,30000)+'\n…(cut at 30 KB)':s;}
      catch(e){const msg=(e&&e.message)||String(e);UI.toolEnd(it,false,msg);throw new Error(msg);}}};}
const TOOLS=[
 tool('read_code','Read the game source with line numbers. Give name (a top-level function, class or variable, e.g. "buildL"), or section (a section title, e.g. "THE \\"L\\" TRAINS"), or start_line and end_line. Returns at most about 24 KB; a cut-off result says where to go on. Read before you edit: edit_code needs the exact text.',
  {name:{type:'string'},section:{type:'string'},start_line:{type:'integer'},end_line:{type:'integer'}},[],o=>readCode(o)),
 tool('search_code','Find lines of the game source containing query (plain text, or a regular expression with regex:true). Returns line numbers, the top-level function each line is in, and the matching text. Use it to find where something is made or used.',
  {query:{type:'string'},regex:{type:'boolean'},case_sensitive:{type:'boolean'},max_results:{type:'integer'}},['query'],o=>searchCode(o)),
 tool('edit_code','Change the game source: each edit replaces old_string (exact text that occurs once) with new_string, in order. The result must parse. Changed functions go live at once; the result says what else a change needs (rebuild or restart_world). summary is a few words for the player\'s edit history.',
  {edits:{type:'array',items:{type:'object',properties:{old_string:{type:'string'},new_string:{type:'string'}},required:['old_string','new_string']}},summary:{type:'string'}},['edits','summary'],
  async o=>{const r=await editCode(o);RUN.edited=true;UI.refreshEdits();return r.text;},{mutates:true}),
 tool('rebuild','Rebuild one part of the world with the current code, so a builder edit shows: the scope\'s old geometry, colliders and scene objects go and its builder runs again from the same random seed. scope is an id like "#123" (from game_context, describe_view or find_assets) or a builder name like "buildL". before_js / after_js run around it (for example to empty an array the builder fills). Rebuild the smallest scope that covers the change.',
  {scope:{type:'string'},before_js:{type:'string'},after_js:{type:'string'}},['scope'],o=>rebuildScope(o),{mutates:true}),
 tool('run_js','Run JavaScript in the game page as the body of an async function: await works, and a returned value comes back to you. Every game global is in reach. For looking at live state, and for live changes edit_code can\'t apply (updating existing objects after a data change). Changes made this way are not saved: put lasting changes in the source with edit_code. No network or storage.',
  {code:{type:'string'}},['code'],o=>runJS(String(o.code||'')),{mutates:true}),
 tool('set_camera','Move the game camera. mode "free" (the default) puts a free camera at x, y, z looking along heading_deg (0 = north = -z, 90 = east = +x) and pitch_deg (up is positive), or at look_at {x,y,z}; fov_deg is the vertical field of view. mode "aerial" flies over the city (y = altitude). mode "player" gives the view back to the player. Returns the new pose; call describe_view to learn what is in view.',
  {mode:{type:'string',enum:['free','aerial','player']},x:{type:'number'},y:{type:'number'},z:{type:'number'},heading_deg:{type:'number'},pitch_deg:{type:'number'},fov_deg:{type:'number'},
   look_at:{type:'object',properties:{x:{type:'number'},y:{type:'number'},z:{type:'number'}}}},[],async o=>'Camera now: '+poseText(await setCamera(o))+'.',{mutates:true}),
 tool('describe_view','Describe what the camera sees now: its pose, the thing at the centre of the screen, the biggest things in view with their scope ids and boxes, people and vehicles near the camera, and from the air the ground area in view. Use it after moving the camera or rebuilding: you can\'t see new screenshots.',
  {},[],()=>describeView()),
 tool('find_assets','Find parts of the world by name (query, e.g. "Tribune", "station", "bridge", "building") and/or near a point (near {x, z, radius}). Returns scope ids, names, the builder that made each, its box and code lines, and the people and vehicles near the point.',
  {query:{type:'string'},near:{type:'object',properties:{x:{type:'number'},z:{type:'number'},radius:{type:'number'}}},limit:{type:'integer'}},[],o=>findAssets(o)),
 tool('restart_world','Reload the game with the edited source, for changes read once at load (top-level constants, data tables, new world systems). It happens when your answer ends, and the player is put back where they were. Tell the player in your answer.',
  {reason:{type:'string'}},[],o=>{RUN.restart=String(o.reason||'restart');return'The world restarts with the edited code when this answer ends (about 10-20 seconds of loading); the player is put back where they are.';}),
 tool('code_map','List the source\'s sections with their line ranges and the top-level functions, classes and tables in each.',{},[],()=>codeMap())];
async function rebuildScope(o){const s=findScope(o.scope);if(!s)throw new Error(`No live scope "${o.scope}". Use an id from game_context, describe_view or find_assets.`);let root=s;while(root&&!root.fn)root=root.parent;if(!root)throw new Error('That part has no builder of its own.');
  const out=[];if(o.before_js){const r=await runJS(String(o.before_js));out.push('before_js returned '+r);}
  const t0=performance.now();let n;
  try{n=await srcRebuild(root);}catch(e){const st=mapStack(e&&e.stack);throw new Error(`The rebuild failed: ${(e&&e.message)||e}${st.length?' — at '+st.join(' ← '):''}. #${root.id} stays hidden until it is rebuilt: fix the builder, then rebuild #${root.id} again.`);}
  TRI=null;flashScope(n);try{renderer.shadowMap.needsUpdate=true;}catch(e){}
  let verts=0;for(const r of n.ranges)verts+=r.n;const meshes=n.live?n.live.children.length:0;
  if(o.after_js){const r=await runJS(String(o.after_js));out.push('after_js returned '+r);}
  out.unshift(`Rebuilt ${scopeName(n)} as #${n.id}${root!==s?` (the builder of #${s.id})`:''} in ${Math.round(performance.now()-t0)} ms: ${verts} vertices in ${meshes} meshes, ${n.cols.length} colliders, ${n.objs.length} scene objects; ${boxText(n.box)}. It stays in its own meshes until the next reload bakes it into the city.`);
  return out.join('\n');}
async function findAssets(o){const q=String(o.query||'').toLowerCase(),near=o.near&&Number.isFinite(+o.near.x)&&Number.isFinite(+o.near.z)?{x:+o.near.x,z:+o.near.z,r:+o.near.radius||80}:null,lim=Math.min(40,Math.max(1,Number(o.limit)|0||20));
  const rows=[];for(const s of allScopes()){if(!s.box)continue;const nm=scopeName(s);if(q&&!nm.toLowerCase().includes(q)&&!s.name.toLowerCase().includes(q)&&!(q==='building'&&isBuilding(s)))continue;
    let d=0;if(near){const b=s.box,dx=Math.max(b.min.x-near.x,0,near.x-b.max.x),dz=Math.max(b.min.z-near.z,0,near.z-b.max.z);d=Math.hypot(dx,dz);if(d>near.r)continue;}rows.push({s,d});}
  if(!q&&!near)return'Give a query or a near point.';
  rows.sort((a,b)=>a.d-b.d||(a.s.kids.length?1:0)-(b.s.kids.length?1:0));const out=[];
  for(const {s,d} of rows.slice(0,lim)){const c=await scopeCode(s);out.push('- '+scopeLine(s,(near?`${Math.round(d)} m away; `:'')+(c?`code: lines ${c.line}-${c.endLine} (${c.label})`:'')));}
  if(near){const t=nearbyThings(near.x,near.z,near.r).slice(0,10);if(t.length)out.push('Near that point: '+t.map(x=>`${x.name} (${x.kind}) at (${r1(x.p.x)}, ${r1(x.p.z)})`).join('; '));}
  return(rows.length>lim?`${rows.length} matches, the first ${lim}:\n`:'')+(out.join('\n')||'Nothing found.');}
// run_js: an async function in the page's global scope; the network and storage names are shadowed by its parameters
function safe(v,depth=3,max=6000){const seen=new WeakSet(),rn=n=>Math.round(n*1000)/1000;
  const rec=(x,d)=>{if(x===null||x===undefined)return x;const t=typeof x;if(t==='number')return Number.isFinite(x)?rn(x):String(x);if(t==='string')return clip(x,1500);if(t==='boolean')return x;
    if(t==='bigint'||t==='symbol')return x.toString();if(t==='function')return`[function ${x.name||'anonymous'}]`;
    if(x.isVector3||x.isVector2)return x.toArray().map(rn);if(x.isColor)return'#'+x.getHexString();if(x.isEuler)return[x.x,x.y,x.z].map(rn);
    if(x.isObject3D)return{type:x.type,name:x.name,position:x.position.toArray().map(rn),children:x.children.length,visible:x.visible};
    if(x.isMaterial)return{type:x.type,name:x.name,color:x.color?'#'+x.color.getHexString():undefined};if(x.isBufferGeometry)return{type:x.type,vertices:x.attributes.position?x.attributes.position.count:0};
    if(ArrayBuffer.isView(x))return`[${x.constructor.name} length ${x.length}]`;if(x instanceof Map)return rec(Object.fromEntries([...x.entries()].slice(0,30)),d);if(x instanceof Set)return rec([...x].slice(0,30),d);
    if(seen.has(x))return'[circular]';seen.add(x);if(d<=0)return Array.isArray(x)?`[array of ${x.length}]`:'[object]';
    if(Array.isArray(x)){const a=x.slice(0,30).map(y=>rec(y,d-1));if(x.length>30)a.push(`… ${x.length-30} more`);return a;}
    const o={},ks=Object.keys(x);for(const k of ks.slice(0,40)){try{o[k]=rec(x[k],d-1);}catch(e){o[k]='[unreadable]';}}if(ks.length>40)o['…']=`${ks.length-40} more keys`;return o;};
  let s;try{s=JSON.stringify(rec(v,depth));}catch(e){s=String(v);}return s===undefined?'undefined':clip(s,max);}
async function runJS(code){const id='__twe_js_'+(++fileSeq),out=[],con={log:console.log,warn:console.warn,error:console.error,info:console.info};
  const fmt=a=>a.map(x=>typeof x==='string'?x:safe(x,2,600)).join(' ');
  console.log=console.info=(...a)=>{if(out.length<40)out.push(fmt(a));con.log(...a);};console.warn=(...a)=>{if(out.length<40)out.push('warn: '+fmt(a));con.warn(...a);};console.error=(...a)=>{if(out.length<40)out.push('error: '+fmt(a));con.error(...a);};
  try{const err=await runScript(`window.${id}=async function(fetch,XMLHttpRequest,WebSocket,EventSource,localStorage,sessionStorage,indexedDB){\n${code}\n};`,'twe-run-'+(fileSeq+1),0);
    if(err)throw err;const res=await window[id]();return safe(res)+(out.length?'\nconsole:\n'+out.join('\n'):'');}
  catch(e){const st=mapStack(e&&e.stack);throw new Error(`${(e&&e.message)||e}${st.length?' — at '+st.join(' ← '):''}${out.length?'\nconsole:\n'+out.join('\n'):''}`);}
  finally{delete window[id];Object.assign(console,con);}}

// ================= ONE REQUEST =================
const CHAT={turns:[],entries:[],lastTools:'',mapSent:false};
const MAXB=61000;// bytes, under the 64 KiB a request may carry
// the code that built what was tagged and what is at the centre of the screen, as many lines as the budget allows
async function excerpts(items,budget){const out=[],seen=new Set();let used=0;const L=srcLines();
  for(const [why,s] of items){if(!s||used>=budget)continue;const c=await scopeCode(s);if(!c)continue;const k=c.line+':'+c.endLine;if(seen.has(k))continue;seen.add(k);
    let text='';for(let i=c.line;i<=c.endLine;i++){const ln=`${String(i).padStart(5)}| ${L[i-1]}\n`;if(used+text.length+ln.length>budget){text+=`      … lines ${i}-${c.endLine} left out (read_code start_line ${i})\n`;break;}text+=ln;}
    const sec=sectionAt(c.line);used+=text.length;out.push(`${why}: ${c.label}${sec.major?`, section ${sec.major.title}${sec.section&&sec.section!==sec.major?' › '+sec.section.title:''}`:''}, lines ${c.line}-${c.endLine}\n${text}`);}
  return out.join('\n');}
async function buildMessage(prompt,tags,photos,shotOk){const P=PLAYER,f=P.car?P.car.pos:P.mount?{x:P.mount.x,y:0,z:P.mount.z}:P.h.pos,pose=camPose();
  const lines=[`Time in the game: ${clockText(SKY.t)}${SKY.night>.5?' (night)':''}.`,`Player: ${pose.mode==='driving'?'driving the '+((P.car.md&&P.car.md.name)||'car'):pose.mode==='riding'?'riding '+(P.mount.name||'a horse'):'on foot'} at (${r1(f.x)}, ${r1(f.y||0)}, ${r1(f.z)}), ${placeName(f.x,f.z)}.`,describeView()];
  if(tags.length)lines.push('Tagged by the player:\n'+tags.map(t=>{const a=t.a;return`- @[${t.label}] = tag ${t.n}: ${a.name} at ${P3(a.point)}${a.scope?`; scope #${a.scope.id}, ${scopeChain(a.scope)}; ${boxText(a.scope.box)}`:''}${a.ent?`; ${a.ent.kind}; code: ${a.ent.code}`:''}${a.mk?`; material ${a.mk}`:''}${a.one!==undefined?`; ${a.oneBatched?'batch':'instance'} ${a.one} of ${a.mesh.name||a.mesh.type}`:''}`;}).join('\n'));
  const errs=ERR.list.filter(e=>Date.now()-e.t<180000).slice(-5);if(errs.length)lines.push('Recent errors in the game:\n'+errs.map(e=>'- '+errText(e)).join('\n'));
  lines.push(`Source: ${srcLines().length} lines${SRCM.log.length?`, ${SRCM.log.length} live edits so far (latest: ${SRCM.log[SRCM.log.length-1].summary})`:''}.`);
  if(CHAT.lastTools)lines.push('Tools your last answer ran:\n'+CHAT.lastTools);
  let msg=`<game_context>\n${lines.join('\n')}\n</game_context>\n`;
  const imgs=[];if(shotOk)imgs.push('Image 1 is the game view right now'+(tags.length?', tags circled with their numbers':'')+'.');
  photos.forEach((p,i)=>imgs.push(`Image ${imgs.length+1} is the player's photo "${p.name}"${p.meta?': '+p.meta:''}.`));
  if(imgs.length)msg+=imgs.join('\n')+'\n';else if(!shotOk)msg+='(No screenshot: this view can\'t send pictures.)\n';
  const tail=`\nThe player says: ${prompt}`;
  let budget=Math.floor((MAXB-bytes(INSTRUCTIONS)-bytes(msg)-bytes(tail)-9000)*RUN.shrink);
  const items=[...tags.filter(t=>t.a.scope).map(t=>[`Code for tag ${t.n} (${t.a.name})`,t.a.scope])];const ch=pickAt(innerWidth/2,innerHeight/2);if(ch){const a=assetOfHit(ch);if(a.scope)items.push([`Code for the centre of the screen (${a.name})`,a.scope]);}
  const code=budget>2000?await excerpts(items,Math.min(28000,budget)):'';if(code){msg+=`<code>\n${code}</code>\n`;budget-=code.length;}
  if(!CHAT.mapSent&&budget>12000){const m=await codeMap();if(bytes(m)<budget-1000){msg+=`<code_map>\n${m}\n</code_map>\n`;CHAT.mapSent=true;}}
  return msg+tail;}
// the conversation that fits: the instructions always, then the most recent turns
function buildTurns(last){let used=bytes(INSTRUCTIONS)+bytes(last)+64;const hist=[];
  for(let i=CHAT.turns.length-1;i>=0;i--){const t=CHAT.turns[i],b=bytes(t.content)+16;if(used+b>MAXB)break;hist.unshift(t);used+=b;}
  return[{role:'user',content:INSTRUCTIONS},...hist,{role:'user',content:last}];}
async function askClaude(prompt,{tags=[],photos=[],shown}={}){await caps();if(!CAP.sample)throw{code:CAP.onClaude?'capability_disabled':'not_declared',message:'no sample capability'};
  RUN.busy=true;RUN.log=[];RUN.edited=false;RUN.restart=null;UI.busy(true);
  const L=CAP.limits||{},canImg=!!L.images&&!RUN.noImages,maxImg=canImg?Math.max(0,L.images.maxCount|0):0;
  const shot=maxImg?await captureView(1280,tags):null,pics=photos.slice(0,Math.max(0,maxImg-(shot?1:0)));
  const msg=await buildMessage(prompt,tags,pics,!!shot),turns=buildTurns(msg);
  const opts={signal:(RUN.ctl=new AbortController()).signal,modelTier:CFG.tier,onText:({text})=>UI.streamText(text)};
  if(L.tools)opts.tools=TOOLS.slice(0,Math.max(1,L.tools.maxCount|0));else opts.cache=false;
  const images=[...(shot?[shot]:[]),...pics.map(p=>p.blob)];if(images.length)opts.images=images;
  const where=placeName(camera.position.x,camera.position.z).split(',')[0];
  const userTurn=`[${clockText(SKY.t)}, ${where||'in the city'}${tags.length?'; tagged '+tags.map(t=>'@['+t.label+']').join(', '):''}${pics.length?`; ${pics.length} photo${pics.length>1?'s':''}`:''}] ${shown||prompt}`;
  let res=null,err=null;try{res=await CAP.sample(turns,opts);}catch(e){err=e;}
  RUN.busy=false;RUN.ctl=null;UI.busy(false);
  CHAT.lastTools=RUN.log.map(it=>`- ${it.name} ${it.args}: ${it.ok?'ok':'failed'}${it.brief?' ('+it.brief+')':''}`).join('\n');
  const text=res?res.text:(err&&err.text)||'';CHAT.turns.push({role:'user',content:userTurn});if(text.trim())CHAT.turns.push({role:'assistant',content:text});
  if(err&&err.code==='images_unavailable')RUN.noImages=true;if(err&&err.code==='prompt_too_large')RUN.shrink=Math.max(.25,RUN.shrink/2);else if(res)RUN.shrink=1;
  return{res,err,text,next:(text.match(/^\s*NEXT:\s*(.+)$/m)||[])[1]||null};}
// after an answer: save what changed into the artifact; restart the world if Claude asked for it
async function afterAnswer(){let saved=null;if(RUN.edited||unsaved()){UI.status('Saving the edited game…');saved=await publishSource();UI.status(saved.ok?'':saved.why);UI.refreshEdits();}
  if(RUN.restart){await restartWorld();}return saved;}
async function restartWorld(){const P=PLAYER,f=P.car?P.car.pos:P.h.pos;
  const st={t:Date.now(),x:f.x,z:f.z,yaw:P.car?P.car.yaw:P.h.yaw,inCar:!!P.car,sky:SKY.t,
    cam:EDCAM.on?{x:EDCAM.pos.x,y:EDCAM.pos.y,z:EDCAM.pos.z,yaw:EDCAM.yaw,pitch:EDCAM.pitch,fov:EDCAM.fov}:null,aer:AER.on?{x:AER.x,z:AER.z,h:AER.h,yaw:AER.yaw,pitch:AER.pitch}:null};
  try{sessionStorage.setItem('twe.resume',JSON.stringify(st));}catch(e){}await saveChat();await saveLocal();UI.status('Restarting the world with the edited code…');await sleep(300);location.reload();}
// back after a restart: straight into the city where the player was
async function resume(){let st=null;try{st=JSON.parse(sessionStorage.getItem('twe.resume')||'null');sessionStorage.removeItem('twe.resume');}catch(e){}
  if(!st||Date.now()-st.t>600000)return;await cityReady();try{if(GAR.on)leaveGarage('free');}catch(e){}await frames(3);
  try{if(st.inCar)putPlayerInHeroCab(st.x,st.z,st.yaw);else{if(PLAYER.car)exitVehicle();PLAYER.h.place(st.x,groundAt(st.x,st.z),st.z,st.yaw);}}catch(e){console.warn('Could not put the player back',e);}
  SKY.t=st.sky;envTimer=0;if(st.cam)edCamOn(st.cam.x,st.cam.y,st.cam.z,st.cam.yaw,st.cam.pitch,st.cam.fov);else if(st.aer){if(!AER.on)toggleAerial();Object.assign(AER,st.aer);}
  UI.notice('The world restarted with the edited code.');}
function cityReady(){return window.CITY_READY_P||(window.CITY_READY_P=new Promise(r=>{if(CITY_READY)r();else addEventListener('tw-city-ready',()=>r(),{once:true});}));}
// (the entries hold plain data; plainEntries drops the elements the conversation view hangs on them)
async function saveChat(){try{await TW_DB.set('chat',{turns:CHAT.turns.slice(-40),entries:plainEntries().slice(-150),lastTools:CHAT.lastTools,mapSent:CHAT.mapSent});}catch(e){}}
async function loadChat(){try{const c=await TW_DB.get('chat');if(c){CHAT.turns=c.turns||[];CHAT.entries=c.entries||[];CHAT.lastTools=c.lastTools||'';CHAT.mapSent=!!c.mapSent;}}catch(e){}}
