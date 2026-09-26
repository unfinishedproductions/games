
// ================= THE GAME'S SOURCE =================
// The text Claude reads and edits is the game script as it runs now (TW_SRC.text: the artifact's game.js or the page's own
// script, or the edited copy the loader ran from this browser). Line numbers are its lines, the same numbers taxiwars-game.js
// shows in error stacks.
const TWS=window.TW_SRC||{base:'',shipped:'',text:'',edited:false,skipped:null,saved:null};
const SRCM={text:TWS.text,base:TWS.base,ver:0,pubVer:0,sha:null,undo:[],redo:[],log:(TWS.edited&&TWS.saved&&TWS.saved.log)||[],_l:null,_lv:-1,_ix:null,_ixv:-1,_sec:null,_secv:-1};
if(TWS.edited)SRCM.pubVer=-1;// the text running is a local copy the artifact doesn't have yet
function srcLines(){if(SRCM._lv!==SRCM.ver){SRCM._l=SRCM.text.split('\n');SRCM._lv=SRCM.ver;}return SRCM._l;}
function lineOf(text,pos){let n=1;for(let i=text.indexOf('\n');i>=0&&i<pos;i=text.indexOf('\n',i+1))n++;return n;}
// top-level declarations: functions, classes, and each name a let / const / var statement declares; anything else is a 'stmt'
function patternNames(p){if(!p)return[];switch(p.type){case'Identifier':return[p.name];case'ObjectPattern':return p.properties.flatMap(q=>patternNames(q.type==='RestElement'?q.argument:q.value));
  case'ArrayPattern':return p.elements.flatMap(patternNames);case'RestElement':return patternNames(p.argument);case'AssignmentPattern':return patternNames(p.left);default:return[];}}
function indexProgram(ast){const decls=[],byName=new Map();
  for(const n of ast.body){const L={line:n.loc.start.line,endLine:n.loc.end.line};
    if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration'){const d={kind:n.type==='ClassDeclaration'?'class':'function',name:n.id.name,start:n.start,end:n.end,...L,node:n};decls.push(d);byName.set(d.name,d);}
    else if(n.type==='VariableDeclaration'){for(const v of n.declarations)for(const nm of patternNames(v.id)){const d={kind:n.kind,name:nm,start:n.start,end:n.end,dStart:v.start,dEnd:v.end,init:v.init?[v.init.start,v.init.end]:null,simple:v.id.type==='Identifier',...L,node:n};decls.push(d);byName.set(nm,d);}}
    else decls.push({kind:'stmt',name:null,start:n.start,end:n.end,...L,node:n});}
  return{decls,byName};}
const ACORN_URL='https://cdn.jsdelivr.net/npm/acorn@8.18.0/dist/acorn.mjs';let ACORN=null;
async function acorn(){if(ACORN)return ACORN;try{ACORN=await import(ACORN_URL);}catch(e){throw new Error('Could not load the code parser (acorn) from cdn.jsdelivr.net: '+e.message);}return ACORN;}
const parseSrc=async(text,comments)=>(await acorn()).parse(text,{ecmaVersion:'latest',sourceType:'script',locations:true,onComment:comments});
async function srcIndex(){if(SRCM._ixv===SRCM.ver)return SRCM._ix;SRCM._ix=indexProgram(await parseSrc(SRCM.text));SRCM._ixv=SRCM.ver;return SRCM._ix;}
// the top-level declaration a line belongs to
function declAt(ix,line){let lo=0,hi=ix.decls.length-1,best=null;while(lo<=hi){const m=(lo+hi)>>1,d=ix.decls[m];if(d.line<=line){best=d;lo=m+1;}else hi=m-1;}return best&&line<=best.endLine?best:null;}
// section headers: // ======= TITLE ======= (major) and // ------- title ------- (minor), each running to the next header of its rank or above
function srcSections(){if(SRCM._secv===SRCM.ver)return SRCM._sec;const L=srcLines(),out=[];
  for(let i=0;i<L.length;i++){const a=L[i].match(/^\s*\/\/ ?={3,} ?(.+?) ?={3,}\s*$/);if(a){out.push({major:true,title:a[1].trim(),line:i+1});continue;}
    const b=L[i].match(/^\s*\/\/ ?-{4,} ?(.+?) ?-{4,}\s*$/);if(b)out.push({major:false,title:b[1].trim(),line:i+1});}
  for(let i=0;i<out.length;i++){let e=L.length;for(let j=i+1;j<out.length;j++)if(out[j].major||!out[i].major){e=out[j].line-1;break;}out[i].end=e;}
  SRCM._sec=out;SRCM._secv=SRCM.ver;return out;}
function sectionAt(line){let s=null,maj=null;for(const x of srcSections()){if(x.line>line)break;if(x.major)maj=x;if(line<=x.end)s=x;}return{section:s,major:maj};}
async function codeMap(){const ix=await srcIndex(),secs=srcSections(),L=srcLines(),out=[];
  const names=(a,b)=>uniq(ix.decls.filter(d=>d.line>=a&&d.line<=b&&(d.kind==='function'||d.kind==='class'||/^[A-Z][A-Z0-9_]{2,}$/.test(d.name||''))).map(d=>d.kind==='function'?d.name+'()':d.kind==='class'?'class '+d.name:d.name));
  if(secs.length&&secs[0].line>1){const n=names(1,secs[0].line-1);if(n.length)out.push(`L1-${secs[0].line-1} (top): ${n.join(', ')}`);}
  for(const s of secs){const n=names(s.line,s.end);out.push(`${s.major?'':'  '}L${s.line}-${s.end} ${s.major?s.title:'· '+s.title}${n.length?': '+n.join(', '):''}`);}
  return`The game source: ${L.length} lines${SRCM.log.length?`, with ${SRCM.log.length} live edit${SRCM.log.length>1?'s':''}`:''}. Sections (line ranges) and their top-level declarations:\n`+out.join('\n');}
// read_code: by name, by section, or by lines; a tool result must stay under 32 KB, so it is cut at ~24 KB with a note
async function readCode(o){const L=srcLines(),ix=await srcIndex();let a,b,what;
  if(o.name){const name=String(o.name),d=ix.byName.get(name);
    if(d){a=d.line;b=d.endLine;what=`${d.kind} ${d.name}`;}
    else{const re=new RegExp(`(?:function\\s*\\*?\\s*|\\b(?:const|let|var)\\s+|[{,;]\\s*)${name.replace(/[^\w$]/g,'').replace(/\$/g,'\\$')}\\s*(?:=|\\()`);const i=L.findIndex(l=>re.test(l));
      if(i<0)return`"${name}" is not a top-level name, and no definition of it was found. Try search_code.`;const d2=declAt(ix,i+1);a=i+1;b=d2?d2.endLine:Math.min(L.length,i+40);what=`${name} (defined on line ${i+1}${d2&&d2.name?', inside '+d2.name:''})`;}}
  else if(o.section){const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),q=norm(o.section),s=srcSections().find(x=>norm(x.title).includes(q));
    if(!s)return`No section matches "${o.section}". Call code_map for the list.`;a=s.line;b=s.end;what=`section ${s.title}`;}
  else{a=Math.max(1,Number(o.start_line)|0||1);b=Math.min(L.length,Number(o.end_line)|0||a+120);what='lines';}
  if(b<a)return'end_line is before start_line.';
  let out='',n=a,size=0;for(;n<=b;n++){const ln=`${String(n).padStart(5)}| ${L[n-1]}\n`;if(size+ln.length>24000&&n>a)break;out+=ln.length>24000?ln.slice(0,24000)+'…[line cut]\n':ln;size+=ln.length;}
  return`${what}, lines ${a}-${n-1} of ${L.length}${n<=b?` (cut off: read from start_line ${n} to go on)`:''}:\n${out}`;}
async function searchCode(o){const L=srcLines(),ix=await srcIndex(),max=Math.min(80,Math.max(1,Number(o.max_results)|0||30)),q=String(o.query||'');if(!q)throw new Error('query is empty');let re;
  try{re=new RegExp(o.regex?q:q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),o.case_sensitive?'':'i');}catch(e){throw new Error('Bad regular expression: '+e.message);}
  const out=[];let total=0,size=0;
  for(let i=0;i<L.length;i++){const m=re.exec(L[i]);if(!m)continue;total++;if(out.length>=max||size>12000)continue;const line=L[i];let snip=line;
    if(line.length>240){const a=Math.max(0,m.index-100),b=Math.min(line.length,m.index+m[0].length+100);snip=(a>0?'…':'')+line.slice(a,b)+(b<line.length?'…':'');}
    const d=declAt(ix,i+1),row=`${i+1}${d&&d.name?` [${d.name}]`:''}: ${snip}`;out.push(row);size+=row.length;}
  return out.length?out.join('\n')+(total>out.length?`\n(${total-out.length} more matches not shown)`:''):`No matches for ${o.regex?'/'+q+'/':'"'+q+'"'}.`;}

// ================= LIVE EDITS =================
// a changed class keeps its identity (instances, instanceof): its new methods, accessors and statics are copied onto the live class
function classPatch(d,text){const n=d.node,body='class'+text.slice(n.id.end,n.end);
  return`{const N=(${body}),O=${d.name};for(const k of Reflect.ownKeys(N.prototype))if(k!=='constructor')Object.defineProperty(O.prototype,k,Object.getOwnPropertyDescriptor(N.prototype,k));`+
    `for(const k of Reflect.ownKeys(N))if(!['length','name','prototype'].includes(k))Object.defineProperty(O,k,Object.getOwnPropertyDescriptor(N,k));}`;}
const ctorText=(n,text)=>n.body.body.filter(m=>m.kind==='constructor'||m.type==='PropertyDefinition').map(m=>text.slice(m.start,m.end)).join('\n');
// errors seen in the last half minute don't count against a patch
const recentKeys=()=>{const t=Date.now()-30000;return new Set(ERR.list.filter(e=>e.t>t).map(e=>e.key));};
async function watchNewErrors(before,ms){const t0=Date.now();await sleep(ms);return ERR.list.filter(e=>e.t0>=t0-5&&!before.has(e.key));}
// Compare the running source with the new one, declaration by declaration, and apply what can go live. Returns a report; on
// errors it has already put the running game back on the old code.
async function hotApply(oldText,newText,newAst){const oldIx=await srcIndex(),newIx=indexProgram(newAst);
  const P=[],rep={swapped:[],classes:[],assigned:[],added:[],builders:[],loadOnly:[],needsRestart:[],removed:[],notes:[],newIx};const seen=new Set();
  for(const d of newIx.decls){if(!d.name)continue;const o=oldIx.byName.get(d.name);
    if(!o){if(seen.has(d.start))continue;seen.add(d.start);P.push({kind:'add',code:newText.slice(d.start,d.end),line:d.line,name:d.kind==='function'||d.kind==='class'?d.name:newIx.decls.filter(x=>x.start===d.start).map(x=>x.name).join(', ')});continue;}
    const isVar=d.kind==='let'||d.kind==='var'||d.kind==='const';
    const nt=isVar?newText.slice(d.dStart,d.dEnd):newText.slice(d.start,d.end),ot=o.dStart!==undefined?oldText.slice(o.dStart,o.dEnd):oldText.slice(o.start,o.end);if(nt===ot)continue;
    if(d.kind==='function'&&o.kind==='function')P.push({kind:'function',code:nt,name:d.name,line:d.line,old:ot,oldLine:o.line});
    else if(d.kind==='class'&&o.kind==='class'){P.push({kind:'class',code:classPatch(d,newText),name:d.name,line:d.line,old:classPatch(o,oldText),oldLine:o.line});
      if(ctorText(d.node,newText)!==ctorText(o.node,oldText))rep.notes.push(`class ${d.name}: its constructor or fields changed, which reaches only objects made after restart_world (its methods are live now)`);}
    else if((d.kind==='let'||d.kind==='var')&&o.kind===d.kind&&d.simple){const ni=d.init?newText.slice(d.init[0],d.init[1]):'undefined',oi=o.init?oldText.slice(o.init[0],o.init[1]):'undefined';
      if(ni!==oi)P.push({kind:'assign',code:`${d.name}=(${ni});`,name:d.name,line:d.line,old:`${d.name}=(${oi});`});}
    else rep.needsRestart.push(`${d.kind} ${d.name} (line ${d.line})`);}
  for(const o of oldIx.decls)if(o.name&&!newIx.byName.has(o.name))rep.removed.push(o.name);
  const stmts=new Map();for(const o of oldIx.decls)if(o.kind==='stmt'){const t=oldText.slice(o.start,o.end);stmts.set(t,(stmts.get(t)||0)+1);}
  for(const d of newIx.decls)if(d.kind==='stmt'){const t=newText.slice(d.start,d.end),c=stmts.get(t)||0;if(c>0)stmts.set(t,c-1);else rep.needsRestart.push(`the top-level statement on line ${d.line} (${clip(t.replace(/\s+/g,' '),70)})`);}
  // apply: additions first (changed code may use them), then functions, classes, assignments; stop at the first that fails
  const order={add:0,function:1,class:2,assign:3};P.sort((a,b)=>order[a.kind]-order[b.kind]);
  const before=recentKeys(),done=[];let fail=null;
  for(const p of P){const err=await runScript(p.code,'twe-patch-'+(fileSeq+1),p.line);if(err){fail={p,err};break;}done.push(p);}
  const undoLive=async()=>{for(const p of done.slice().reverse())if(p.old)await runScript(p.old,'twe-undo-'+(fileSeq+1),p.oldLine||p.line);};
  if(fail){await undoLive();return{rolledBack:true,errors:[`${fail.p.kind} ${fail.p.name} (line ${fail.p.line}) threw while it was applied: ${fail.err.message}`]};}
  // the running game then gets a moment: new errors (per-frame code throwing, say) put it back on the old code
  if(done.some(p=>p.kind!=='add')){const errs=await watchNewErrors(before,650);if(errs.length){await undoLive();return{rolledBack:true,errors:errs.map(errText)};}}
  const builders=new Set();for(const s of SRC.byId.values())if(!s.dead&&s.fn)builders.add(s.fn);
  for(const p of done){const tag=`${p.name} (line ${p.line})`;
    if(p.kind==='function'){rep.swapped.push(tag);if(builders.has(p.name))rep.builders.push(p.name);else if(/^(build|make|gen|init|setup|spawn|bake)[A-Z]/.test(p.name))rep.loadOnly.push(p.name);}
    else if(p.kind==='class')rep.classes.push(tag);else if(p.kind==='assign')rep.assigned.push(tag);else rep.added.push(tag);}
  return rep;}
function reportText(rep,warn){const out=[],li=(h,a)=>{if(a.length)out.push(h+'\n'+a.map(x=>'- '+x).join('\n'));};
  li('Live in the running game now:',[...rep.swapped.map(x=>'swapped function '+x),...rep.classes.map(x=>'patched class '+x+' (methods)'),...rep.assigned.map(x=>'re-assigned '+x),...rep.added.map(x=>'added '+x)]);
  li('Not visible yet:',[...rep.builders.map(n=>`${n} is a world builder: call rebuild (scope "${n}", or a part or building it made) to see the change`),
    ...rep.loadOnly.map(n=>`${n} may run only at load: if so, re-run what it sets up with run_js (when that is safe) or restart_world`),
    ...rep.needsRestart.map(x=>`${x} changed: it is read at load, so it takes effect after restart_world (or apply the new value to live objects with run_js)`),...rep.notes]);
  if(rep.removed.length)out.push(`Removed from the source (still defined in this session until restart_world): ${rep.removed.join(', ')}`);
  if(warn&&warn.length)li('Warnings:',warn);
  return out.join('\n\n')||'The edit changed nothing that runs (comments or whitespace only).';}
// the old bug in this file: a // comment written into the middle of a long line, commenting out the code after it
const CODEISH=/(;\s*[A-Za-z_$][\w$.]*\s*[(=[.])|(\bconst\s+[\w$]+\s*=)|(\blet\s+[\w$]+\s*=)|(\bfunction\s+[\w$]+\s*\()|(\bfor\s*\()|(\bif\s*\()|(=>\s*\{)|(\}\s*(const|let|function|for|if|return)\b)|(\breturn\s*[{(\w])/;
function swallowWarnings(comments,newText,a,b){const out=[];for(const c of comments){if(c.type!=='Line'||c.end<a||c.start>b)continue;if(CODEISH.test(c.value))out.push(`line ${lineOf(newText,c.start)}: this // comment seems to contain code (everything after // on a line is a comment): "//${clip(c.value,120)}"`);}return out;}
// edit_code: exact, unique replacements applied in order; the result must parse; then it goes live (or is rolled back) and is kept
async function editCode(o){const edits=o.edits;if(!Array.isArray(edits)||!edits.length)throw new Error('edits must be a non-empty list of {old_string, new_string}.');
  let text=SRCM.text;
  for(let k=0;k<edits.length;k++){const e=edits[k]||{},tag=edits.length>1?`edit ${k+1}: `:'';
    if(typeof e.old_string!=='string'||typeof e.new_string!=='string'||!e.old_string)throw new Error(tag+'old_string and new_string must be strings, old_string not empty.');
    if(e.old_string===e.new_string)throw new Error(tag+'old_string and new_string are the same.');
    const i=text.indexOf(e.old_string);
    if(i<0)throw new Error(`${tag}old_string was not found in the current source${k?' (after the edits before it)':''}.${/^\s*\d+\|/m.test(e.old_string)?' It starts with a line-number prefix from read_code; copy only the code.':' Re-read the lines with read_code and copy them exactly, whitespace included.'} Nothing was changed.`);
    const j=text.indexOf(e.old_string,i+1);if(j>=0)throw new Error(`${tag}old_string occurs more than once (lines ${lineOf(text,i)} and ${lineOf(text,j)}); include more of the surrounding code so it is unique. Nothing was changed.`);
    text=text.slice(0,i)+e.new_string+text.slice(i+e.old_string.length);}
  const comments=[];let ast;
  try{ast=await parseSrc(text,comments);}catch(err){if(!err.loc)throw err;const L=text.split('\n');throw new Error(`The edited source does not parse: ${err.message}\n${err.loc.line}| ${clip(L[err.loc.line-1]||'',300)}\nNothing was changed.`);}
  let a=0;const old=SRCM.text;while(a<old.length&&a<text.length&&old[a]===text[a])a++;let b1=old.length,b2=text.length;while(b1>a&&b2>a&&old[b1-1]===text[b2-1]){b1--;b2--;}
  const warn=swallowWarnings(comments,text,a,b2);
  const rep=await hotApply(old,text,ast);
  if(rep.rolledBack)throw new Error(`The edit was rolled back: the running game threw\n${rep.errors.map(x=>'- '+x).join('\n')}\nThe source is unchanged. Fix the cause and edit again.`);
  const summary=clip(String(o.summary||'edit'),120);commitSource(text,summary);SRCM._ix=rep.newIx;SRCM._ixv=SRCM.ver;
  return{text:reportText(rep,warn)+`\n\nKept as live edit #${SRCM.log.length} (${summary}).`,lines:[lineOf(text,a),lineOf(text,b2)],rebuild:rep.builders};}
function commitSource(text,summary){SRCM.undo.push({text:SRCM.text,summary});if(SRCM.undo.length>12)SRCM.undo.shift();SRCM.redo.length=0;SRCM.text=text;SRCM.ver++;SRCM.log.push({summary,t:Date.now()});
  TWS.text=text;saveLocal();if(UI.ready)UI.refreshEdits();}
// undo / redo a whole edit: the running game gets the old text the same way (functions swapped back; rebuilds are yours to redo)
async function stepHistory(back){const from=back?SRCM.undo:SRCM.redo,to=back?SRCM.redo:SRCM.undo;const h=from.pop();if(!h)return null;
  const rep=await hotApply(SRCM.text,h.text,await parseSrc(h.text));if(rep.rolledBack){from.push(h);throw new Error(rep.errors.join('\n'));}
  to.push({text:SRCM.text,summary:h.summary});SRCM.text=h.text;SRCM.ver++;SRCM._ix=rep.newIx;SRCM._ixv=SRCM.ver;TWS.text=h.text;
  if(back)SRCM.log.pop();else SRCM.log.push({summary:h.summary,t:Date.now()});saveLocal();return{summary:h.summary,rep};}

// ================= KEEPING EDITS =================
// In this browser at once (IndexedDB, keyed by the game.js the edits were made on: the loader runs the copy next time), and in the
// artifact itself after each answer that changed code (a new game.js; the files form keeps this view running).
// The local copy lists every game.js it may run on (bases): the one it was made on and each version this page saved since, so a
// reload runs it whichever of those versions the frame serves. A game.js from anywhere else (a new upload) outranks it.
let saveQ=Promise.resolve();
SRCM.bases=uniq([...((TWS.edited&&TWS.saved&&TWS.saved.bases)||[]),SRCM.base].filter(Boolean));
function saveLocal(){const rec=SRCM.text===TWS.shipped&&!SRCM.log.length?null:{bases:SRCM.bases.slice(-4),base:SRCM.base,text:SRCM.text,log:SRCM.log,t:Date.now()};
  saveQ=saveQ.then(()=>window.TW_DB?(rec?TW_DB.set('source',rec):TW_DB.del('source')):null).catch(e=>console.warn('Could not keep the edited source in this browser',e));return saveQ;}
async function discardEdits(){SRCM.log=[];SRCM.bases=[SRCM.base];if(window.TW_DB)await TW_DB.del('source').catch(()=>{});}
async function sha256(text){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');}
const unsaved=()=>SRCM.ver!==SRCM.pubVer&&SRCM.text!==TWS.shipped;
async function publishSource(){await caps();if(!CAP.artifact)return{ok:false,why:'This view can’t save into the artifact; the edits are kept in this browser.'};
  if(!unsaved())return{ok:true,why:'Nothing new to save.'};
  const text=SRCM.text,ver=SRCM.ver;if(SRCM.sha===null)SRCM.sha=await sha256(TWS.shipped);
  try{const r=await CAP.artifact.publish({'game.js':{content:text,contentType:'text/javascript',ifMatch:SRCM.sha}});
    SRCM.sha=(r.shas&&r.shas['game.js'])||await sha256(text);SRCM.pubVer=ver;
    // the artifact now ships this text: the local copy also answers to it, so a reload runs the edits whichever version it gets
    TWS.shipped=text;if(window.TW_HASH){SRCM.base=TW_HASH(text);SRCM.bases=uniq([...SRCM.bases,SRCM.base]);}TWS.base=SRCM.base;await saveLocal();return{ok:true,why:'Saved into the artifact.'};}
  catch(e){const why={not_writer:'You can view this artifact but not save it; the edits are kept in this browser.',not_granted:'Saving isn’t allowed in this view; the edits are kept in this browser.',
      conflict:'Someone saved a newer version first; the game is reloading to it.',capability_disabled:'Saving isn’t available here (a public link?); the edits are kept in this browser.',
      too_large:'The game is too large to save.',rate_limited:'Saving too often; it will try again after the next answer.'}[e&&e.code]||('Saving failed: '+((e&&e.message)||e));return{ok:false,why,code:e&&e.code};}}
