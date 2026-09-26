
// ================= THE PROMPT BAR =================
// A bar at the top of the game (below the menu and fare buttons on a phone). Clicking into it puts the game in editor mode: a tap
// on the view tags what is there, a drag still looks around, keys go to the text; × (or Esc) gives the game back. The
// conversation folds out under the bar.
const CSS=`
#twe{position:absolute;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(660px,calc(100vw - 170px));z-index:35;display:none;flex-direction:column;gap:6px;
 font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#f1e7cf;pointer-events:none}
#twe.on{display:flex}#twe>*{pointer-events:auto}
@media (max-width:720px){#twe{top:calc(68px + env(safe-area-inset-top,0px));width:calc(100vw - 24px)}}
.twe-bar{display:flex;align-items:flex-end;gap:6px;background:rgba(21,17,12,.9);border:1px solid rgba(201,161,74,.6);border-radius:14px;padding:6px;box-shadow:0 6px 24px rgba(0,0,0,.45);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
body.twe-edit .twe-bar{border-color:#e9c46a;box-shadow:0 0 0 2px rgba(233,196,106,.35),0 6px 24px rgba(0,0,0,.5)}
.twe-in{flex:1;min-width:0;resize:none;border:0;outline:0;background:transparent;color:#f4ecd6;font:16px/1.35 system-ui,-apple-system,sans-serif;padding:7px 4px;max-height:132px}
.twe-in::placeholder{color:#a8997a}
.twe-b{flex:none;height:36px;min-width:36px;border-radius:10px;border:1px solid rgba(201,161,74,.45);background:rgba(40,33,24,.92);color:#f1e7cf;display:grid;place-items:center;cursor:pointer;padding:0 8px;touch-action:manipulation;font:13px system-ui,sans-serif}
.twe-b:hover,.twe-b:focus-visible{border-color:#e0bd66;outline:none}.twe-b svg{width:18px;height:18px;display:block}
.twe-go{background:#e9d9ab;color:#1b1712;border-color:#e9d9ab}.twe-go.stop{background:#e2583b;border-color:#e2583b;color:#fff}
.twe-x{display:none}body.twe-edit .twe-x{display:grid}
.twe-who{font:13px Limelight,Georgia,serif;letter-spacing:.06em;display:flex;align-items:center;gap:7px}
.twe-dot{width:8px;height:8px;border-radius:50%;background:#7d705a}.twe-dot.ok{background:#8fce72}.twe-dot.busy{background:#e9c46a;animation:twePulse 1s ease-in-out infinite}.twe-dot.err{background:#e2583b}
@keyframes twePulse{50%{opacity:.35}}
.twe-chips{display:flex;flex-wrap:wrap;gap:6px}.twe-chips:empty{display:none}
.twe-chip{display:flex;align-items:center;gap:6px;background:rgba(21,17,12,.9);border:1px solid rgba(233,196,106,.55);border-radius:16px;padding:3px 4px 3px 3px;font-size:12.5px;max-width:100%}
.twe-chip b{display:grid;place-items:center;min-width:20px;height:20px;border-radius:10px;background:#e9c46a;color:#1b1712;font-size:11.5px;padding:0 4px}
.twe-chip img{width:34px;height:26px;object-fit:cover;border-radius:6px}.twe-chip span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}
.twe-chip button{border:0;background:transparent;color:#d6c396;cursor:pointer;font-size:12px;line-height:1;padding:3px 6px;border-radius:8px}.twe-chip button:hover{background:rgba(255,255,255,.08)}
.twe-refbar{display:none;align-items:center;gap:8px;background:rgba(21,17,12,.9);border:1px solid rgba(201,161,74,.4);border-radius:12px;padding:5px 10px;font-size:12px}
.twe-refbar.on{display:flex}.twe-refbar input{flex:1;min-width:60px;accent-color:#c9a14a}
.twe-panel{background:rgba(21,17,12,.92);border:1px solid rgba(201,161,74,.4);border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.5);display:none;flex-direction:column;max-height:min(46vh,500px)}
#twe.open .twe-panel{display:flex}
.twe-log{overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain;min-height:0}
.twe-u{align-self:flex-end;max-width:88%;background:rgba(233,217,171,.14);border:1px solid rgba(233,217,171,.25);border-radius:12px 12px 4px 12px;padding:7px 10px;white-space:pre-wrap;overflow-wrap:anywhere}
.twe-u img{display:inline-block;height:44px;border-radius:6px;margin:4px 4px 0 0;vertical-align:middle}
.twe-a{overflow-wrap:anywhere}.twe-a p{margin:.15em 0 .5em}.twe-a ul,.twe-a ol{margin:.15em 0 .5em;padding-left:1.3em}.twe-a a{color:#e9c46a}
.twe-a code{font:12.5px ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(255,255,255,.08);padding:1px 4px;border-radius:4px}
.twe-a pre{overflow:auto;background:rgba(0,0,0,.35);padding:8px;border-radius:8px;font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre}
.twe-a.wait{color:#bba982;font-style:italic}
.twe-t{font-size:12px;color:#bba982}.twe-t summary{cursor:pointer;list-style:none}.twe-t summary::-webkit-details-marker{display:none}
.twe-t pre{white-space:pre-wrap;max-height:200px;overflow:auto;font:11.5px ui-monospace,Menlo,monospace;color:#d8ccb0;background:rgba(0,0,0,.3);padding:6px;border-radius:6px;margin:4px 0 0}
.twe-t.bad{color:#e8927b}.twe-n{font-size:12.5px;color:#e9c46a}.twe-e{font-size:12.5px;color:#f0a58f}
.twe-foot{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 8px;border-top:1px solid rgba(201,161,74,.25);font-size:12px;color:#bba982}
.twe-foot .twe-st{flex:1;min-width:120px}
.twe-foot button{font:12px system-ui,sans-serif;border:1px solid rgba(201,161,74,.45);background:rgba(40,33,24,.92);color:#f1e7cf;border-radius:8px;padding:5px 9px;cursor:pointer}
.twe-foot button:disabled{opacity:.4;cursor:default}.twe-foot button.hot{background:#e9d9ab;color:#1b1712;border-color:#e9d9ab}
.twe-pick{position:absolute;inset:0;z-index:30;display:none;cursor:crosshair;touch-action:none}body.twe-edit .twe-pick{display:block}
body.twe-edit #game::after{content:'';position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 2px rgba(233,196,106,.55);z-index:31}
.twe-ref{position:absolute;inset:0;z-index:25;pointer-events:none;display:none}.twe-ref.on{display:block}.twe-ref img{width:100%;height:100%;object-fit:contain}
body.twe-on #street{top:calc(96px + env(safe-area-inset-top,0px))}body.twe-on #toast{top:calc(122px + env(safe-area-inset-top,0px))}
@media (max-width:720px){body.twe-on #street{top:calc(140px + env(safe-area-inset-top,0px))}body.twe-on #toast{top:calc(172px + env(safe-area-inset-top,0px))}}
#devPanel .twe-p{text-align:left;color:#e6dcc2}#devPanel .twe-p .note{color:#bba982;font-size:.78rem;text-align:left;margin:.4rem 0}#devPanel .twe-p ul{margin:.3rem 0 .6rem;padding-left:1.1rem;color:#d6c396;font-size:.8rem}
#devPanel .twe-p .ok{color:#8fce72}#devPanel .twe-p .bad{color:#f0a58f}
@media (prefers-reduced-motion:reduce){.twe-dot.busy{animation:none}}`;
const ICON={pic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="12" cy="12" r="3.4"/><path d="M8 5l1.5-2h5L16 5"/></svg>',
 send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>',
 stop:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>',
 x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'};
const MODE={on:false};const TAGS=[],PHOTOS=[];let tagSeq=0;
const UI={ready:false,root:null,input:null,log:null,st:null,dot:null,go:null,chips:null,refbar:null,ref:null,next:null,cur:null,
  busy(on){if(!this.ready)return;this.go.innerHTML=on?ICON.stop:ICON.send;this.go.classList.toggle('stop',on);this.go.title=on?'Stop':'Send (Enter)';this.dot.className='twe-dot '+(on?'busy':(CAP.sample?'ok':''));if(on)this.status('');this.refreshFoot();},
  status(t){if(this.ready)this.st.textContent=t||'';},
  notice(t,bad){addEntry({t:bad?'e':'n',text:t});},
  streamText(text){const c=this.cur;if(!c)return;c.text=text;if(c.raf)return;c.raf=requestAnimationFrame(()=>{c.raf=0;c.el.classList.remove('wait');c.el.innerHTML=md(c.text);scrollDown();});},
  toolStart(name,input){const it={t:'tool',name,args:toolArgs(name,input||{}),ok:null,brief:'',detail:''};if(this.cur&&!this.cur.text)this.cur.el.textContent='Working…';addEntry(it,true);return it;},
  toolEnd(it,ok,text){it.ok=ok;it.brief=clip(String(text).split('\n').find(l=>l.trim())||'',110);it.detail=clip(String(text),4000);renderTool(it);},
  refreshEdits(){this.refreshFoot();if(DEVUI.tab==='claude'&&STATE.paused)try{buildDev();}catch(e){}},
  refreshFoot(){if(!this.ready)return;const f=this.foot;f.undo.disabled=RUN.busy||!SRCM.undo.length;f.save.style.display=unsaved()&&!RUN.busy?'':'none';f.cam.style.display=EDCAM.on?'':'none';
    f.next.style.display=this.next&&!RUN.busy?'':'none';f.clear.disabled=RUN.busy;}};
function toolArgs(n,o){switch(n){case'read_code':return o.name||o.section||`${o.start_line||1}-${o.end_line||''}`;case'search_code':return JSON.stringify(o.query||'');case'edit_code':return o.summary||`${(o.edits||[]).length} change(s)`;
  case'rebuild':return String(o.scope||'');case'run_js':return clip(String(o.code||'').replace(/\s+/g,' '),60);case'set_camera':return(o.mode||'free')+(o.x!=null?` (${r1(+o.x)}, ${r1(+o.y||0)}, ${r1(+o.z||0)})`:'');
  case'find_assets':return o.query?JSON.stringify(o.query):o.near?`near (${r1(+o.near.x)}, ${r1(+o.near.z)})`:'';case'restart_world':return clip(String(o.reason||''),60);default:return'';}}
const TOOL_WORDS={read_code:'Read',search_code:'Searched',edit_code:'Edited',rebuild:'Rebuilt',run_js:'Ran',set_camera:'Moved the camera',describe_view:'Looked at the view',find_assets:'Looked up',restart_world:'Restart after this answer',code_map:'Read the code map'};
// a small, safe Markdown: the text is escaped first; fences, `code`, **bold**, *italic*, lists, headings and http(s) links
function md(src){const blocks=[];let s=esc(src).replace(/```[\w-]*\n([\s\S]*?)(```|$)/g,(m,c)=>{blocks.push(`<pre>${c}</pre>`);return`\u0001${blocks.length-1}\u0001`;});
  const inl=t=>t.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g,'$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  let out='',list=null;for(const ln of s.split('\n')){const b=ln.match(/^\s*[-*•]\s+(.*)/),n=ln.match(/^\s*\d+[.)]\s+(.*)/),h=ln.match(/^\s*#{1,4}\s+(.*)/);
    if(b||n){const tg=b?'ul':'ol';if(list!==tg){if(list)out+=`</${list}>`;out+=`<${tg}>`;list=tg;}out+=`<li>${inl((b||n)[1])}</li>`;continue;}
    if(list){out+=`</${list}>`;list=null;}const tr=ln.trim();if(/^\u0001\d+\u0001$/.test(tr)){out+=tr;continue;}if(h){out+=`<p><b>${inl(h[1])}</b></p>`;continue;}if(tr)out+=`<p>${inl(ln)}</p>`;}
  if(list)out+=`</${list}>`;return out.replace(/\u0001(\d+)\u0001/g,(m,i)=>blocks[+i]);}
function scrollDown(){const l=UI.log;if(l&&l.scrollHeight-l.scrollTop-l.clientHeight<160)l.scrollTop=l.scrollHeight;}
function renderTool(it){if(!it.el)return;it.el.className='twe-t'+(it.ok===false?' bad':'');const s=it.el.querySelector('summary');
  s.textContent=`${it.ok===null?'…':it.ok?'✓':'✗'} ${TOOL_WORDS[it.name]||it.name}${it.args?' '+it.args:''}${it.ok===false?': '+it.brief:''}`;it.el.querySelector('pre').textContent=it.detail||'';}
function renderEntry(e){let el;
  if(e.t==='u'){el=$e('div','twe-u',UI.log,e.text);for(const p of e.pics||[]){const i=$e('img','',el);i.src=p;i.alt='photo';}}
  else if(e.t==='a'){el=$e('div','twe-a',UI.log);el.innerHTML=md(e.text||'');}
  else if(e.t==='tool'){el=$e('details','twe-t',UI.log);$e('summary','',el);$e('pre','',el);e.el=el;renderTool(e);}
  else el=$e('div',e.t==='e'?'twe-e':'twe-n',UI.log,e.text);
  return el;}
function addEntry(e,live){CHAT.entries.push(e);if(UI.ready){renderEntry(e);UI.root.classList.add('open');scrollDown();}if(!live)saveChat();return e;}
// the entries array keeps plain data for saving; drop the elements before it goes to IndexedDB
const plainEntries=()=>CHAT.entries.map(({el,...r})=>r);

// ================= EDITOR MODE, TAGS AND PHOTOS =================
function enterEditor(){if(MODE.on)return;MODE.on=true;document.body.classList.add('twe-edit');for(const k in KEYS)KEYS[k]=false;TOUCH.x=TOUCH.y=0;TOUCH.active=false;UI.root.classList.add('open');}
function exitEditor(){if(!MODE.on)return;MODE.on=false;document.body.classList.remove('twe-edit');UI.input.blur();try{canvasEl.focus();}catch(e){}}
function insertAtCaret(t){const i=UI.input,a=i.selectionStart??i.value.length,b=i.selectionEnd??i.value.length,pre=i.value.slice(0,a);
  const txt=(pre&&!/\s$/.test(pre)?' ':'')+t;i.value=pre+txt+i.value.slice(b);const p=a+txt.length;try{i.setSelectionRange(p,p);}catch(e){}autosize();}
function tagAt(x,y){let h=null;try{h=pickAt(x,y);}catch(e){console.warn('pick',e);}if(!h){UI.status('Nothing there to tag (that is sky).');return;}
  const a=assetOfHit(h);let t=TAGS.find(t=>t.a.key===a.key);
  if(!t){let label=a.name.replace(/[[\]]/g,'').trim()||'thing';if(TAGS.some(q=>q.label===label))label+=' '+(tagSeq+1);t={n:++tagSeq,a,label};TAGS.push(t);highlight(a);}
  insertAtCaret(`@[${t.label}] `);renderChips();UI.status(`Tagged ${t.label}${a.scope?` (scope #${a.scope.id})`:''}.`);if(!STATE.touch)UI.input.focus();}
function dropTag(t){const i=TAGS.indexOf(t);if(i<0)return;TAGS.splice(i,1);unhighlight(t.a.key);UI.input.value=UI.input.value.split(`@[${t.label}]`).join('').replace(/ {2,}/g,' ');autosize();renderChips();}
function clearTags(){for(const t of TAGS)unhighlight(t.a.key);TAGS.length=0;tagSeq=0;renderChips();}
async function addPhotos(files){for(const f of files){if(!/^image\//.test(f.type))continue;let ex=null,bmp=null;try{ex=exifOf(await f.arrayBuffer());}catch(e){}try{bmp=await createImageBitmap(f);}catch(e){}
  if(!bmp){UI.notice(`Couldn’t open ${f.name||'that photo'}.`,true);continue;}
  // Claude gets at most ~1.2 MP anyway: send a 2000 px JPEG (the location, heading and lens were read from the original above)
  const k=Math.min(1,2000/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.88)),t=document.createElement('canvas'),tk=96/Math.max(c.width,c.height);t.width=Math.max(1,Math.round(c.width*tk));t.height=Math.max(1,Math.round(c.height*tk));t.getContext('2d').drawImage(c,0,0,t.width,t.height);
  const pose=photoPose(ex,bmp.width,bmp.height),p={name:f.name||'photo',blob,url:URL.createObjectURL(blob),thumb:t.toDataURL('image/jpeg',.7),ex,pose,meta:photoMeta(ex,pose)};
  PHOTOS.push(p);showRef(p);if(pose&&pose.inside&&pose.heading!=null)UI.status(`This photo has a location and heading: “Go there” lines the camera up with it.`);}
  renderChips();}
function photoMeta(ex,pose){if(!ex||(ex.lat==null&&ex.heading==null&&!ex.focal35))return'no location data in the file (an old photograph, or a phone that left it out)';
  const a=[];if(ex.date)a.push('taken '+ex.date);if(ex.lat!=null)a.push(`GPS ${ex.lat.toFixed(5)}, ${ex.lon.toFixed(5)} → game (${pose.x}, ${pose.z}), ${pose.place}`);
  if(pose&&pose.heading!=null)a.push(`facing ${pose.heading}° (${compass(pose.heading)})`);if(pose&&pose.fov)a.push(`vertical field of view about ${pose.fov}°`);
  if(pose&&pose.inside)a.push(`estimated camera pose: x ${pose.x}, y ${pose.y}, z ${pose.z}${pose.heading!=null?', heading '+pose.heading:''}${pose.fov?', fov '+pose.fov:''}`);return a.join('; ');}
function dropPhoto(p){const i=PHOTOS.indexOf(p);if(i<0)return;PHOTOS.splice(i,1);if(UI.refP===p)showRef(PHOTOS[PHOTOS.length-1]||null);URL.revokeObjectURL(p.url);renderChips();}
// the photo over the game, see-through, to line the view up with it (on the player camera or the free camera)
function showRef(p){UI.refP=p||null;UI.ref.classList.toggle('on',!!p);UI.refbar.classList.toggle('on',!!p);if(p){UI.refImg.src=p.url;UI.refbar.go.style.display=p.pose&&p.pose.inside?'':'none';}}
async function goToPhoto(p){if(!p||!p.pose)return;const o=p.pose;await setCamera({mode:'free',x:o.x,y:o.y,z:o.z,heading_deg:o.heading!=null?o.heading:camPose().heading,pitch_deg:0,fov_deg:o.fov||62});UI.refreshFoot();
  UI.status('Free camera at the photo’s spot: drag to turn, WASD / stick to move, ▲▼ to climb, until the view matches.');}
function renderChips(){const c=UI.chips;c.textContent='';
  for(const t of TAGS){const ch=$e('div','twe-chip',c);$e('b','',ch,String(t.n));$e('span','',ch,t.label).title=t.a.scope?`scope #${t.a.scope.id}: ${scopeChain(t.a.scope)}`:t.a.name;const x=$e('button','',ch,'✕');x.title='Remove the tag';x.onclick=()=>dropTag(t);}
  for(const p of PHOTOS){const ch=$e('div','twe-chip',c);const i=$e('img','',ch);i.src=p.thumb;i.alt='';$e('span','',ch,p.name).title=p.meta;
    const v=$e('button','',ch,UI.refP===p?'Hide':'Show');v.title='Show the photo over the game';v.onclick=()=>{showRef(UI.refP===p?null:p);renderChips();};const x=$e('button','',ch,'✕');x.title='Remove the photo';x.onclick=()=>dropPhoto(p);}}
function autosize(){const i=UI.input;i.style.height='auto';i.style.height=Math.min(132,i.scrollHeight)+'px';}

// ================= SENDING =================
async function onSend(){if(RUN.busy){if(RUN.ctl)RUN.ctl.abort();return;}const text=UI.input.value.trim();if(!text&&!PHOTOS.length)return;
  await caps();if(!CAP.sample){UI.notice(CAP.onClaude?'Claude isn’t available in this view.':'Claude works when this game is opened on claude.ai.',true);return;}
  const tags=TAGS.filter(t=>text.includes(`@[${t.label}]`)),photos=PHOTOS.slice();
  addEntry({t:'u',text:text||'(photo)',pics:photos.map(p=>p.thumb)});UI.input.value='';autosize();
  await turn(text||'Here is a photo.',{tags,photos});
  // the tags are spent; the photo shown over the game stays in play (it goes with the next message too) until you remove it
  clearTags();const keep=UI.refP;for(const p of photos)if(p!==keep)URL.revokeObjectURL(p.url);PHOTOS.length=0;if(keep)PHOTOS.push(keep);renderChips();}
async function turn(prompt,o){UI.next=null;const e={t:'a',text:''};CHAT.entries.push(e);const cur={el:renderEntry(e),text:''};cur.el.classList.add('wait');cur.el.textContent='Thinking…';UI.cur=cur;UI.root.classList.add('open');scrollDown();
  const r=await askClaude(prompt,o);UI.cur=null;e.text=r.text||'';cur.el.classList.remove('wait');
  if(e.text)cur.el.innerHTML=md(e.text);else{cur.el.remove();CHAT.entries.splice(CHAT.entries.indexOf(e),1);}
  if(r.err&&r.err.code!=='cancelled')UI.notice(errCopy(r.err),true);else if(r.err)UI.notice('Stopped.');
  if(r.res&&r.res.truncated)UI.notice('The answer was cut short. Ask for less at a time, or press Continue.');
  UI.next=r.next;const saved=await afterAnswer();if(saved&&!saved.ok)UI.notice(saved.why,true);
  UI.refreshFoot();saveChat();scrollDown();}

// ================= CONNECTING (the Developer page's Claude tab) =================
const CONN={state:'unknown',tier:null,why:''};
async function connect(){CONN.state='asking';CONN.why='';try{buildDev();}catch(e){}await caps();
  if(!CAP.sample){CONN.state='off';CONN.why=CAP.onClaude?'Claude isn’t available in this view.':'Open the game on claude.ai to use Claude.';}
  else{try{const r=await CAP.sample('Reply with exactly one word: Connected',{modelTier:'quick'});CONN.state='ok';CONN.tier=r.modelTierApplied;}catch(e){CONN.state='bad';CONN.why=errCopy(e);}}
  if(UI.ready)UI.dot.className='twe-dot '+(CONN.state==='ok'?'ok':CONN.state==='bad'?'err':'');try{buildDev();}catch(e){}}
function panel(P){const W=$e('div','twe-p',P),p=(t,c)=>$e('p',c||'note',W,t);
  $e('h3','',W,'Claude');
  if(!CAP.onClaude){p('Claude works inside the game when it is opened on claude.ai: there it uses your own Claude account and subscription, not API credits.');
    if(window.TW_ARTIFACT_URL){const a=$e('a','',p(''));a.href=window.TW_ARTIFACT_URL;a.target='_blank';a.rel='noopener';a.textContent='Open Taxi Wars on claude.ai';a.style.color='#e9c46a';}return;}
  p(CONN.state==='ok'?`Connected to your Claude account${CONN.tier?` (answered by the ${TIERS[CONN.tier]||CONN.tier} model)`:''}. Requests use your plan’s usage.`:
    CONN.state==='asking'?'Asking claude.ai…':CONN.state==='bad'||CONN.state==='off'?CONN.why:'Uses your Claude account on claude.ai. The first request asks you to Allow it; after that, requests come out of your plan’s usage.',CONN.state==='ok'?'ok':CONN.state==='bad'?'bad':'note');
  const b=$e('div','btns',W);const li=$e('button','',b,CONN.state==='ok'?'Connected ✓':'Log in with Claude');li.onclick=()=>connect();li.disabled=CONN.state==='asking';
  $e('button','',b,'Open the prompt bar').onclick=()=>{setPause(false);setTimeout(()=>{syncVisible();UI.input.focus();},60);};
  const r=$e('div','row',W);$e('label','',r,'Model');const sel=$e('select','',r);for(const [k,v] of Object.entries(TIERS))$e('option','',sel,v).value=k;sel.value=CFG.tier;sel.onchange=()=>{CFG.tier=sel.value;LS.set('twe.tier',sel.value);};$e('span','v',r,'');
  p('Balanced suits most edits; Most capable thinks longer for big changes; Quick is for small tweaks. Your plan may answer with a nearby model.');
  $e('h3','',W,'Live edits');
  if(TWS.skipped==='crashed')p('The saved edits in this browser didn’t start last time, so the game runs the artifact’s own code. Undo or fix them with Claude, or discard them below.','bad');
  if(TWS.skipped==='stale')p('This browser has Claude edits made on an older version of the game; the newer version runs instead. Download them below if you want them.','bad');
  if(TWS.skipped==='safe')p('Safe mode: the saved edits in this browser are not running.','bad');
  p(SRCM.log.length?`${SRCM.log.length} live edit${SRCM.log.length>1?'s':''} — ${unsaved()?'not saved into the artifact yet':'saved into the artifact'}.`:'No live edits yet.');
  if(SRCM.log.length){const ul=$e('ul','',W);for(const e of SRCM.log.slice(-6).reverse())$e('li','',ul,e.summary);}
  const b2=$e('div','btns',W);const sv=$e('button','',b2,'Save into the artifact');sv.disabled=!unsaved();sv.onclick=async()=>{sv.disabled=true;const r2=await publishSource();p(r2.why,r2.ok?'ok':'bad');UI.refreshFoot();};
  const un=$e('button','',b2,'Undo last edit');un.disabled=!SRCM.undo.length||RUN.busy;un.onclick=()=>undoEdit();
  $e('button','',b2,'Download taxiwars.html').onclick=()=>downloadGame();
  if(TWS.skipped&&TWS.saved){$e('button','',b2,'Discard the old edits').onclick=async()=>{await discardEdits();TWS.skipped=null;buildDev();};}
  $e('h3','',W,'How to use it');
  const ul=$e('ul','',W);for(const t of['Click the bar at the top of the game (or press /). Tap anything in the view to tag it; drag to look around; × or Esc gives the game back.','Each message sends Claude a screenshot, where you are, what you tagged and the code that built it.',
    'Add a photo (an old photograph, or one you take on the spot) to see it over the game and ask Claude to match it. Photos with a location come with “Go there”.','Edits appear in the running game at once and are saved into the artifact after each answer. Undo takes the last one back.'])$e('li','',ul,t);
  for(const t of['keydown','keyup','keypress'])W.addEventListener(t,e=>e.stopPropagation());}
async function undoEdit(){if(RUN.busy)return;try{const h=await stepHistory(true);if(h){UI.notice(`Undid: ${h.summary}. Rebuild what it built (ask Claude) to see the old version where it was a builder.`);RUN.edited=true;const s=await publishSource();if(!s.ok)UI.notice(s.why,true);}}
  catch(e){UI.notice('Could not undo: '+e.message,true);}UI.refreshEdits();}
// the repo's single-file taxiwars.html, put back together from this artifact's files and the running source. (The markup is spelled
// with \x3C for "<": this code also sits inside an inline script element of that page, which a literal comment-open or script tag
// would end or derail.)
const LT='\x3C',TAG={begin:LT+'!--TW-PAGE-BEGIN-->',end:LT+'!--TW-PAGE-END-->',head:LT+'!--TW-HEAD-END-->',game:LT+'!--TW-GAME-->',editor:LT+'!--TW-EDITOR-->',open:LT+'script',close:LT+'/script>'};
async function singleFileHTML(){const get=async p=>{const r=await fetch(p,{cache:'no-cache'});if(!r.ok)throw new Error(`${p} (${r.status})`);return r.text();};
  const page=await get(location.href.split('#')[0]),a=page.indexOf(TAG.begin),b=page.lastIndexOf(TAG.end);if(a<0||b<a)throw new Error('the page markers are missing');
  const body=page.slice(a+TAG.begin.length,b),cut=body.indexOf(TAG.head);if(cut<0)throw new Error('the head marker is missing');
  const data=await get('data.js'),ed=await get('editor.js'),T=TAG;
  const rest=body.slice(cut+T.head.length).replace(`${T.open} src="data.js">${T.close}`,()=>`${T.open}>${data}${T.close}`).replace(T.game,()=>`${T.open} type="text/x-taxiwars" id="twGame">${SRCM.text}${T.close}`)
    .replace(T.editor,()=>`${T.open} type="text/x-claude-editor" id="twEditor">${ed}${T.close}`);
  return`${LT}!DOCTYPE html>\n${LT}html lang="en">\n${LT}head>\n${LT}meta charset="utf-8">\n${LT}meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${body.slice(0,cut)}${LT}/head>\n${LT}body>${rest}${LT}/body>\n${LT}/html>\n`;}
async function downloadGame(){await caps();if(!CAP.downloads){UI.notice('Saving files isn’t available in this view.',true);return;}let html;
  try{html=await singleFileHTML();}catch(e){UI.notice('Couldn’t put taxiwars.html together: '+e.message,true);return;}
  try{await CAP.downloads.save({filename:'taxiwars.html',data:new Blob([html],{type:'text/html'})});UI.notice('Saved taxiwars.html.');}
  catch(e){if(!e||e.code!=='declined')UI.notice('The file wasn’t saved: '+((e&&(e.message||e.code))||e),true);}}

// ================= BUILDING THE UI =================
function buildUI(){const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);const game=document.getElementById('game');
  const root=$e('div','',game);root.id='twe';UI.root=root;const bar=$e('div','twe-bar',root);
  const who=$e('button','twe-b twe-who',bar);UI.dot=$e('span','twe-dot',who);$e('span','',who,'Claude');who.title='Show or hide the conversation';who.onclick=()=>root.classList.toggle('open');
  const inp=$e('textarea','twe-in',bar);inp.rows=1;inp.placeholder='Ask Claude to change anything… tap the game to tag things';inp.setAttribute('aria-label','Message to Claude');UI.input=inp;
  const file=$e('input','',root);file.type='file';file.accept='image/*';file.multiple=true;file.hidden=true;file.onchange=()=>{addPhotos([...file.files]);file.value='';};
  const pic=$e('button','twe-b',bar);pic.innerHTML=ICON.pic;pic.title='Add a photo (a historical picture, or one you take here)';pic.onclick=()=>{enterEditor();file.click();};
  const go=$e('button','twe-b twe-go',bar);go.innerHTML=ICON.send;go.title='Send (Enter)';go.onclick=()=>onSend();UI.go=go;
  const x=$e('button','twe-b twe-x',bar);x.innerHTML=ICON.x;x.title='Back to the game (Esc)';x.onclick=()=>exitEditor();
  UI.chips=$e('div','twe-chips',root);
  const rb=$e('div','twe-refbar',root);UI.refbar=rb;$e('span','',rb,'Photo over the game');const op=$e('input','',rb);op.type='range';op.min='0';op.max='100';op.value='50';op.setAttribute('aria-label','Photo opacity');
  rb.go=$e('button','twe-b',rb,'Go there');rb.go.onclick=()=>goToPhoto(UI.refP);const hide=$e('button','twe-b',rb,'Hide');hide.onclick=()=>{showRef(null);renderChips();};
  const ref=$e('div','twe-ref',game);UI.ref=ref;UI.refImg=$e('img','',ref);UI.refImg.alt='';op.oninput=()=>{UI.refImg.style.opacity=String(op.value/100);};UI.refImg.style.opacity='.5';
  const pan=$e('div','twe-panel',root);UI.log=$e('div','twe-log',pan);const foot=$e('div','twe-foot',pan);UI.st=$e('span','twe-st',foot);UI.foot={};
  const fb=(k,t,fn,cls)=>{const b=$e('button',cls||'',foot,t);b.onclick=fn;UI.foot[k]=b;return b;};
  fb('next','Continue',()=>{if(RUN.busy)return;const n=UI.next;UI.next=null;addEntry({t:'u',text:'Continue'});turn(`Continue: ${n}`,{shown:'Continue',photos:PHOTOS.slice()});},'hot');
  fb('save','Save',async()=>{const r=await publishSource();UI.status(r.why);UI.refreshFoot();});
  fb('cam','Back to player',async()=>{await setCamera({mode:'player'});showRef(null);renderChips();UI.refreshFoot();});
  fb('undo','Undo edit',()=>undoEdit());
  fb('clear','New chat',()=>{if(RUN.busy)return;CHAT.turns=[];CHAT.entries=[];CHAT.lastTools='';CHAT.mapSent=false;UI.log.textContent='';UI.next=null;saveChat();UI.refreshFoot();});
  const pick=$e('div','twe-pick',game);let down=null;
  pick.addEventListener('pointerdown',e=>{down={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,t:performance.now(),moved:false};try{pick.setPointerCapture(e.pointerId);}catch(err){}});
  pick.addEventListener('pointermove',e=>{if(!down||e.pointerId!==down.id)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)down.moved=true;
    if(down.moved&&e.pointerType!=='mouse'){MOUSE_DX+=(e.clientX-down.lx)*2.2;MOUSE_DY+=(e.clientY-down.ly)*2.2;}down.lx=e.clientX;down.ly=e.clientY;});
  const up=e=>{if(!down||e.pointerId!==down.id)return;const d=down;down=null;if(e.type==='pointerup'&&!d.moved&&performance.now()-d.t<700)tagAt(e.clientX,e.clientY);};
  pick.addEventListener('pointerup',up);pick.addEventListener('pointercancel',up);pick.addEventListener('contextmenu',e=>e.preventDefault());
  inp.addEventListener('focus',()=>enterEditor());inp.addEventListener('input',autosize);
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();onSend();}else if(e.key==='Escape'){e.preventDefault();exitEditor();}});
  for(const t of['keydown','keyup','keypress'])root.addEventListener(t,e=>e.stopPropagation());
  // while you write, the game hears no keys (they would drive the car); / opens the bar from the game
  addEventListener('keydown',e=>{if(STATE.paused||!root.classList.contains('on')||root.contains(e.target))return;
    if(MODE.on){if(e.key==='Escape'){e.preventDefault();exitEditor();}e.stopImmediatePropagation();return;}
    if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();e.stopImmediatePropagation();inp.focus();}},true);
  addEventListener('keyup',e=>{if(MODE.on&&!STATE.paused&&!root.contains(e.target))e.stopImmediatePropagation();},true);
  UI.ready=true;for(const e of CHAT.entries)renderEntry(e);UI.refreshFoot();}
// the bar shows while you are out in the city (not in the garage, the menu or the map)
function syncVisible(){if(!UI.ready)return;const map=document.getElementById('mapView');
  const on=CAP.onClaude&&STATE.started&&!GAR.on&&!STATE.paused&&!(map&&map.style.display==='block');UI.root.classList.toggle('on',on);document.body.classList.toggle('twe-on',on);
  if(!on&&MODE.on)exitEditor();UI.refreshFoot();}

// ================= START =================
window.TWE={panel,open(){syncVisible();UI.input.focus();},version:1};
(async()=>{await loadChat();buildUI();setInterval(syncVisible,300);syncVisible();
  if(TWS.skipped==='crashed')UI.notice('The Claude edits saved in this browser didn’t start last time, so the original code is running. Ask Claude to fix them, or discard them in Developer › Claude.',true);
  caps().then(()=>{UI.dot.className='twe-dot '+(CAP.sample?'ok':'');});resume();})();
})();
