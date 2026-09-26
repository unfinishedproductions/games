'use strict';
// ================= CLAUDE EDITOR (menu > Developer > Claude) =================
// Talk to Claude from inside the game while you play, on your own Claude account: the game runs as an artifact on claude.ai, and
// the page's Claude access (the `sample` capability) spends the viewer's plan, not API credits; the first request asks you to
// Allow it. Click the prompt bar and the game is yours to point at: a tap on anything in the view tags it in the prompt (and
// lights it up); × gives the game back. Every prompt carries a screenshot, the camera, where you are, what is tagged and on
// screen, and the code that built it. Claude reads and edits the game's own source through page tools: the functions it changes
// are swapped into the running game and the parts of the city it rebuilds come back in place, with no reload. Edits are saved
// into the artifact (a new game.js; this view keeps running) and kept in this browser too.
// Runs as a classic script after the game's (see loadEditor), so it sees the game's globals; everything here stays inside this
// function except window.TWE.
(()=>{
if(window.TWE)return;
// ================= BASICS =================
const LS={get(k,d=''){try{const v=localStorage.getItem(k);return v===null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
const $e=(tag,cls,parent,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;if(parent)parent.appendChild(e);return e;};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const frames=n=>new Promise(r=>{let k=0;const f=()=>{if(++k>=n)r();else requestAnimationFrame(f);};requestAnimationFrame(f);});
const r1=v=>Math.round(v*10)/10,deg=r=>r*180/Math.PI,rad=d=>d*Math.PI/180;
const compass=h=>['N','NE','E','SE','S','SW','W','NW'][Math.round((((h%360)+360)%360)/45)%8];
const clip=(s,n)=>s.length>n?s.slice(0,n)+'…':s;
const uniq=a=>[...new Set(a)];
const bytes=s=>new TextEncoder().encode(s).length;
// heading in the game: 0 = north (-z), 90 = east (+x); a view yaw (the camera looks along -sin yaw, -cos yaw) is minus the heading
const headingOf=(dx,dz)=>((deg(Math.atan2(dx,-dz))%360)+360)%360;
// a mutex for the tools that change things: Claude may call several tools in one round and they run at once
let lockQ=Promise.resolve();
const locked=fn=>{const p=lockQ.then(fn,fn);lockQ=p.catch(()=>{});return p;};

// ================= CLAUDE ON CLAUDE.AI =================
// window.claude exists only inside a claude.ai viewer. `sample` asks Claude as the viewer (their plan pays; the first call asks
// them to Allow), `artifact` saves new files into this artifact, `downloads` offers a file to save. Each resolves null where it
// cannot run, so every feature is built to be absent.
const TIERS={quick:'Quick',default:'Balanced',complex:'Most capable'};
const CFG={tier:TIERS[LS.get('twe.tier')]?LS.get('twe.tier'):'default'};
const CAP={ready:null,sample:null,artifact:null,downloads:null,limits:null,onClaude:!!(window.claude&&typeof window.claude.use==='function')};
function caps(){if(CAP.ready)return CAP.ready;
  CAP.ready=(async()=>{if(!CAP.onClaude)return CAP;const use=n=>window.claude.use(n).catch(()=>null);
    [CAP.sample,CAP.artifact,CAP.downloads]=await Promise.all([use('sample'),use('artifact'),use('downloads')]);
    if(CAP.sample){try{CAP.limits=await CAP.sample.limits();}catch(e){CAP.limits=null;}}
    return CAP;})();
  return CAP.ready;}
// what to tell the player for each way a request can fail (codes from the sample capability; never retried by the page)
const SAMPLE_ERR={
 not_granted:'Claude isn’t allowed on this page. Reload the game and choose Allow when claude.ai asks.',
 sampling_disabled:'Claude isn’t available for this account or organization.',
 not_declared:'This copy of the game can’t use Claude.',capability_disabled:'Claude isn’t available in this view.',capability_removed:'Claude isn’t available in this version of the Claude app.',
 session_expired:'Your claude.ai session has expired. Sign in again, then reload the game.',
 rate_limited:'You’ve reached your Claude usage limit for now, or too many requests are running. Try again in a little while.',
 prompt_too_large:'That was more than Claude can read in one request. Remove a tag or a photo, or ask about a smaller part, and send again.',
 images_unavailable:'This view can’t send pictures to Claude, so the next requests go without the screenshot.',
 tools_unavailable:'This view can’t let Claude run the game’s tools, so Claude can answer but not edit.',
 image_rejected:'One of the photos couldn’t be used. Try a different file.',
 refused:'Claude declined that request. Ask for it in a different way.',
 empty_completion:'Claude didn’t write an answer. Try asking for less at a time.',
 upstream_error:'The connection to Claude broke off. Send again to retry.',
 invalid_request:'The game sent Claude a request it couldn’t read (a bug in the editor).',transform_error:'The game couldn’t prepare the request (a bug in the editor).',queue_overflow:'Too many requests at once.'};
const errCopy=e=>(e&&SAMPLE_ERR[e.code])||SAMPLE_ERR.upstream_error;

// ================= RUNTIME ERRORS =================
// every error the page throws, with its stack mapped back to lines of the game source (taxiwars-game.js is the game script, a
// twe-patch-N.js is a function Claude swapped in: FILES knows the game line each one starts at)
const FILES=new Map();let fileSeq=0;
const ERR={list:[]};
function mapFrame(file,line){if(/taxiwars-game\.js$/.test(file))return{line};const f=FILES.get(file.replace(/^.*\//,''));return f&&f.line0?{line:f.line0+line-2,patch:f.label}:null;}
function mapStack(stack){if(!stack)return[];const out=[];
  for(const ln of String(stack).split('\n')){const m=ln.match(/(?:at\s+(?:async\s+)?([^\s(]+)\s+\()?(?:([^\s@(]+)@)?(?:[^()\s]*\/)?([\w.-]+\.js):(\d+):\d+\)?/);if(!m)continue;
    const fn=m[1]||m[2]||'(anonymous)',at=mapFrame(m[3],+m[4]);if(at)out.push(`${fn} (game line ${at.line}${at.patch?', live edit':''})`);else if(/taxiwars|twe-/.test(m[3]))out.push(`${fn} (${m[3]}:${m[4]})`);if(out.length>=5)break;}
  return out;}
function pushErr(err,where){const msg=String(err&&err.message!==undefined?err.message:err);const key=msg.slice(0,240),now=Date.now(),last=ERR.list[ERR.list.length-1];
  if(last&&last.key===key){last.n++;last.t=now;return;}ERR.list.push({key,msg:clip(msg,400),stack:mapStack(err&&err.stack),where:where||'',t:now,t0:now,n:1});if(ERR.list.length>60)ERR.list.shift();}
addEventListener('error',e=>pushErr(e.error||e.message,e.filename?e.filename.replace(/^.*\//,'')+':'+e.lineno:''));
addEventListener('unhandledrejection',e=>pushErr(e.reason,'promise'));
const errText=e=>`${e.msg}${e.n>1?` (×${e.n})`:''}${e.stack.length?' — at '+e.stack.join(' ← '):''}`;

// ================= RUNNING NEW CODE =================
// A patch is a classic script run in the page's global scope, so it sees and rebinds the game's top-level names (a function
// declaration replaces the global function; `name=(value)` reassigns a top-level let). Inline first, as the loader ran the game
// (TW_RUN.mode); where the page's security policy refuses inline scripts, a blob: script. Each gets a sourceURL, so errors in it
// map back to game lines (FILES). Patches are strict code, like the game; line 2 of a patch is game line line0.
async function runScript(code,label,line0){const file=label+'.js';FILES.set(file,{label,line0});const ran='__twe_ran_'+(++fileSeq);
  const body=`'use strict';window.${ran}=1;\n${code}\n//# sourceURL=${file}`;let err=null;const onErr=e=>{if(!err)err=e.error||new Error(e.message);};
  addEventListener('error',onErr);
  try{if((window.TW_RUN&&window.TW_RUN.mode)!=='blob'){const r=document.createElement('script');r.textContent=body;document.head.appendChild(r);r.remove();}
    if(!window[ran]){const url=URL.createObjectURL(new Blob([body],{type:'text/javascript'}));FILES.set(url.replace(/^.*\//,''),{label,line0});
      await new Promise(res=>{const r=document.createElement('script');r.src=url;r.onload=r.onerror=()=>{r.remove();URL.revokeObjectURL(url);res();};document.head.appendChild(r);});}}
  finally{removeEventListener('error',onErr);}
  if(!err&&!window[ran])err=new Error('The page would not run the new code (its security policy blocked it).');
  delete window[ran];return err;}
