
// ================= WHAT IS WHERE =================
// The source scopes (see SOURCE SCOPES in the game): each builder and its parts, each building, with the vertex ranges it wrote,
// its box, colliders and scene objects. A tap maps back to the innermost scope that wrote the triangle under it.
const FRIENDLY={buildGround:'Streets & ground',genCity:'City blocks',buildLandmarks:'Landmarks',buildBridges:'Bridges',buildL:'The “L” (elevated railway)',buildFurniture:'Street furniture',
 buildParkTrees:'Park trees',buildWater:'Water',buildFountain:'Buckingham Fountain',buildProps:'Street props',buildFruitSystem:'Fruit',buildStalls:'Market stalls',buildClutter:'Street clutter',
 spawnSpecials:'Special characters',buildWorld2:'Outer districts',buildRiverZone:'River corridor',riverEdges:'River walls & edges',buildShore:'Lakefront',buildYardExtras:'Rail yard',
 buildPeristyle:'Peristyle',buildStacks:'Smokestacks',buildNavyPier:'Navy Pier',spawnFishermen:'Fishermen',buildTrams:'Streetcars',buildLTrains:'“L” trains',buildBoats:'River boats',
 buildSailboats:'Sailboats',buildTrenchTrain:'Freight train'};
const STYLES={redBrick:'red brick',buff:'buff brick',brownstone:'brownstone',romanesque:'Romanesque',industrial:'industrial',hotel:'hotel',fields:'department-store',granite:'granite'};
const isBuilding=s=>!!(s.info&&s.info.label==='Building');
function scopeName(s){if(isBuilding(s))return`${s.info.floors}-storey ${STYLES[s.info.style]||s.info.style} building`;return s.mark?s.name:(FRIENDLY[s.name]||s.name);}
function scopeChain(s){const a=[];for(let t=s;t;t=t.parent)a.unshift(t.mark?`“${t.name}”`:isBuilding(t)?'genBuilding':t.name);return a.join(' › ');}
function allScopes(){const out=[],walk=a=>{for(const s of a){if(s.dead)continue;out.push(s);walk(s.kids);}};walk(SRC.roots);return out;}
function findScope(q){q=String(q==null?'':q).trim();if(!q)return null;if(/^#?\d+$/.test(q)){const s=SRC.byId.get(+q.replace('#',''));return s&&!s.dead?s:null;}
  const lc=q.toLowerCase(),m=allScopes().filter(s=>s.name.toLowerCase()===lc||scopeName(s).toLowerCase()===lc);if(m.length===1)return m[0];
  if(m.length>1)throw new Error(`${m.length} scopes are called "${q}"; pass one id instead: ${m.slice(0,10).map(s=>'#'+s.id).join(', ')}${m.length>10?' …':''} (tagged things and find_assets show ids).`);return null;}
function placeName(x,z){let s='';try{const r=streetNameAt(x,z),a=r[0],b=r[1];if(a&&b)s=r[2]<16?`on ${a.n} at ${b.n}`:`near ${a.n} & ${b.n}`;else if(a)s=`near ${a.n}`;}catch(e){}
  let d='';try{d=districtAt(x,z);}catch(e){}return[s,d].filter(Boolean).join(', ');}
const P3=v=>`(${r1(v.x)}, ${r1(v.y)}, ${r1(v.z)})`;
const boxText=b=>b?`x ${r1(b.min.x)}..${r1(b.max.x)}, y ${r1(b.min.y)}..${r1(b.max.y)}, z ${r1(b.min.z)}..${r1(b.max.z)}`:'no box';
// the lines of code that built a scope: a part's srcMark(...) up to the next part, a builder or genBuilding's function
async function scopeCode(s){const ix=await srcIndex(),L=srcLines();
  if(s.mark){const q=`srcMark('${s.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')`;const i=L.findIndex(l=>l.includes(q));
    if(i>=0){const d=declAt(ix,i+1),end=d?d.endLine:Math.min(L.length,i+40);let e=end;for(let k=i+1;k<end;k++)if(L[k].includes('srcMark(')){e=k;break;}return{line:i+1,endLine:e,label:`the part “${s.name}” in ${d&&d.name?d.name:'its builder'}`};}
    const p=s.parent&&s.parent.fn&&ix.byName.get(s.parent.fn);
    if(p)for(let k=p.line-1;k<p.endLine;k++)if(/srcMark\(\s*[^'"\s]/.test(L[k]))return{line:k+1,endLine:Math.min(p.endLine,k+14),label:`the loop in ${p.name} that builds each part like “${s.name}”`};}
  if(s.fn){const d=ix.byName.get(s.fn);if(d)return{line:d.line,endLine:d.endLine,label:isBuilding(s)?`${d.name}, the generator this building came from (floors ${s.info.floors}, style ${s.info.style})`:`${d.kind} ${d.name}`};}
  return null;}

// ================= LIVE THINGS =================
function entityOf(root){const P=PLAYER;
  if(P.h&&root===P.h.group)return{kind:'player',name:'You (the player)',pos:P.h.pos,code:'class Human, PLAYER'};
  for(const v of VEHICLES)if(v.root===root)return{kind:v.mode==='tram'?'streetcar':'vehicle',name:(v===P.car?'Your ':'')+((v.md&&v.md.name)||v.kind),pos:v.pos,code:v.wagon?'buildWagon, class Vehicle':'the car models (CITY AUTOMOBILES), class Vehicle'};
  for(const p of PEDS)if(p.h&&p.h.group===root)return{kind:'person',name:(PEOPLE_KIND_NAMES[p.kind]||p.kind||'Person'),pos:p.h.pos,code:'makeNPC, class Human, PEDESTRIANS'};
  for(const m of MOUNTS)if(m.h&&m.h.group===root)return{kind:'horse',name:m.name||'Horse',pos:{x:m.x,y:0,z:m.z},code:'class Mount, SADDLE HORSES'};
  for(const T of LTRAINS)if(T.cars.includes(root))return{kind:'train',name:'“L” train car',pos:root.position,code:'buildLCar, buildLTrains, updateLTrains'};
  for(const b of BOATS)if(b.g===root)return{kind:'boat',name:`River boat${b.kind?' ('+b.kind+')':''}`,pos:root.position,code:'buildBoats, updateBoats'};
  for(const b of SAILBOATS)if(b.g===root)return{kind:'boat',name:'Sailboat',pos:root.position,code:'buildSailboats'};
  return null;}

// ================= PICKING =================
// Only meshes whose bounding spheres the ray enters are tested, nearest first, and the search stops once a hit is closer than the
// next sphere: a tap costs a handful of meshes, not the city.
const SKIP=new Set(),_ray=new THREE.Raycaster(),_ndc=new THREE.Vector2(),_sph=new THREE.Sphere(),_pv=new THREE.Vector3();
function pickable(o){if(!o.isMesh||SKIP.has(o)||(typeof skyMesh!=='undefined'&&o===skyMesh))return false;const m=Array.isArray(o.material)?o.material[0]:o.material;return!!m&&m.visible!==false&&m.blending!==THREE.AdditiveBlending;}
function sphereEntry(r,s){const oc=_pv.subVectors(s.center,r.origin),t=oc.dot(r.direction),d2=oc.lengthSq()-t*t,r2=s.radius*s.radius;if(d2>r2)return null;const th=Math.sqrt(r2-d2);return t+th<0?null:Math.max(0,t-th);}
function pickAt(cx,cy){const rc=canvasEl.getBoundingClientRect();_ndc.set((cx-rc.left)/rc.width*2-1,-(cy-rc.top)/rc.height*2+1);camera.updateMatrixWorld();_ray.setFromCamera(_ndc,camera);_ray.far=camera.far;
  const cands=[];scene.traverseVisible(o=>{if(!pickable(o)||!o.geometry)return;let s;
    if(o.isInstancedMesh||o.isBatchedMesh){if(!o.boundingSphere)o.computeBoundingSphere();s=o.boundingSphere;}else{if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();s=o.geometry.boundingSphere;}
    if(!s)return;_sph.copy(s).applyMatrix4(o.matrixWorld);const d=sphereEntry(_ray.ray,_sph);if(d!==null&&d<_ray.far)cands.push({o,d});});
  cands.sort((a,b)=>a.d-b.d);let best=null;const hits=[];
  for(const c of cands){if(best&&c.d>best.distance)break;hits.length=0;try{c.o.raycast(_ray,hits);}catch(e){continue;}for(const h of hits)if(!best||h.distance<best.distance)best=h;}
  return best;}
// mesh -> the vertex ranges scopes wrote into it (rebuilt when scopes change: a live rebuild makes new meshes)
let TRI=null;
function triIndex(){if(TRI&&TRI.seq===SRC.seq)return TRI;const by=new Map();
  for(const s of SRC.byId.values()){if(s.dead)continue;for(const r of s.ranges){const m=r.g.mesh;if(!m)continue;let a=by.get(m);if(!a)by.set(m,a=[]);a.push({v0:r.v0,n:r.n,s});}}
  for(const a of by.values())a.sort((x,y)=>x.v0-y.v0||y.n-x.n);return(TRI={by,seq:SRC.seq});}
function scopeOfTriangle(m,face){const a=triIndex().by.get(m);if(!a||face==null)return null;const ix=m.geometry.index,v=ix?ix.getX(face*3):face*3;let best=null;
  for(const r of a){if(r.v0>v)break;if(v<r.v0+r.n&&(!best||r.n<best.n))best=r;}return best?best.s:null;}
function groundName(s,p){let t='';try{t=surfType(p.x,p.z);}catch(e){}let st='';try{const r=streetNameAt(p.x,p.z);st=r[0]?r[0].n:'';}catch(e){}
  return({road:`${st||'Street'} roadway`,block:`Sidewalk${st?' on '+st:''}`,park:'Grant Park lawn',river:'Chicago River',lake:'Lake Michigan',bridge:`${st||'River'} bridge deck`,trench:'Illinois Central cut',rail:'Rail yard'})[t]||scopeName(s);}
// what a tap hit: a live thing, a scope's geometry, a scope's scene object, or else a mesh by name
function assetOfHit(h){const o=h.object,p=h.point.clone();let root=o;while(root.parent&&root.parent!==scene)root=root.parent;
  const ent=entityOf(root);if(ent)return{key:'e:'+root.uuid,kind:ent.kind,name:ent.name,point:p,root,ent};
  const s=scopeOfTriangle(o,h.faceIndex);
  if(s)return{key:'s:'+s.id,kind:'scope',name:(s.name==='buildGround'||s.name==='buildWater')?groundName(s,p):isBuilding(s)?`${scopeName(s)} ${placeName(p.x,p.z).split(',')[0]}`.trim():scopeName(s),point:p,scope:s,mesh:o,mk:o.name};
  for(let t=o;t&&t!==scene;t=t.parent){const s2=SRC.obj.get(t);if(!s2)continue;const one=h.instanceId!==undefined?h.instanceId:h.batchId;
    const nm=s2.name==='buildParkTrees'?'Park tree':scopeName(s2)+(o.name&&!/^Rebuilt/.test(o.name)?` · ${o.name}`:'');
    return{key:'s:'+s2.id+(one!==undefined?':'+o.uuid+':'+one:''),kind:'scope',name:nm,point:p,scope:s2,mesh:o,one,oneBatched:h.batchId!==undefined};}
  return{key:'o:'+o.uuid+(h.instanceId!==undefined?':'+h.instanceId:''),kind:'object',name:(o.name||o.type)+(placeName(p.x,p.z)?' '+placeName(p.x,p.z).split(',')[0]:''),point:p,mesh:o,one:h.instanceId};}

// ================= HIGHLIGHTS =================
// A tagged thing glows: city geometry gets a copy of its own triangles and edges in amber, a live thing a box that follows it.
const HL={group:null,items:new Map(),t:0};
const HMAT=new THREE.MeshBasicMaterial({color:0xffb938,transparent:true,opacity:.3,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,fog:false,toneMapped:false});
const HLINE=new THREE.LineBasicMaterial({color:0xffe0a0,transparent:true,opacity:.95,depthWrite:false,fog:false,toneMapped:false});
function hlGroup(){if(!HL.group){HL.group=new THREE.Group();HL.group.name='Claude editor highlights';SKIP.add(HL.group);}if(HL.group.parent!==scene)scene.add(HL.group);return HL.group;}
// the triangles a scope wrote (its ranges hold its parts' too), world space, at most maxTris
function rangesGeometry(s,maxTris){const pos=[];let tris=0;
  for(const r of s.ranges){const m=r.g.mesh;if(!m||!m.geometry.index)continue;const ia=m.geometry.index.array,pa=m.geometry.attributes.position.array;
    for(let i=r.i0,e=r.i0+r.ni;i+2<e;i+=3){if(++tris>maxTris)break;for(let k=0;k<3;k++){const v=ia[i+k]*3;pos.push(pa[v],pa[v+1],pa[v+2]);}}if(tris>maxTris)break;}
  if(!pos.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));return g;}
function oneBox(a){const b=new THREE.Box3(),m=a.mesh;
  if(a.one!==undefined&&m&&m.isInstancedMesh){if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const mm=new THREE.Matrix4();m.getMatrixAt(a.one,mm);b.copy(m.geometry.boundingBox).applyMatrix4(mm).applyMatrix4(m.matrixWorld);return b;}
  if(a.one!==undefined&&m&&m.isBatchedMesh){try{const gid=m.getGeometryIdAt(a.one),mm=new THREE.Matrix4();m.getBoundingBoxAt(gid,b);m.getMatrixAt(a.one,mm);b.applyMatrix4(mm).applyMatrix4(m.matrixWorld);return b;}catch(e){}}
  if(a.root)return b.setFromObject(a.root);if(a.scope&&a.scope.box)return b.copy(a.scope.box);if(m)return b.setFromObject(m);return b.setFromCenterAndSize(a.point,new THREE.Vector3(2,2,2));}
function highlight(a){if(HL.items.has(a.key))return;const g=new THREE.Group();let follow=null;
  if(a.scope&&a.one===undefined&&a.scope.ranges.length){const geo=rangesGeometry(a.scope,150000);if(geo){g.add(new THREE.Mesh(geo,HMAT));g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),HLINE));}}
  if(!g.children.length){const b=oneBox(a),h=new THREE.Box3Helper(b,0xffc452);h.material=HLINE;g.add(h);if(a.root)follow=()=>{b.setFromObject(a.root);};}
  g.traverse(o=>{o.renderOrder=999;o.frustumCulled=false;SKIP.add(o);});hlGroup().add(g);HL.items.set(a.key,{g,follow});}
function unhighlight(key){const it=HL.items.get(key);if(!it)return;it.g.removeFromParent();it.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});HL.items.delete(key);}
// a short flash on what a rebuild made, so you see where the change landed
function flashScope(s){const a={key:'flash:'+s.id+':'+Date.now(),scope:s,point:s.box?s.box.getCenter(new THREE.Vector3()):new THREE.Vector3()};highlight(a);setTimeout(()=>unhighlight(a.key),2600);}
FRAME_HOOKS.push(dt=>{if(!HL.items.size)return;HL.t+=dt;HMAT.opacity=.2+.12*(1+Math.sin(HL.t*4))/2;for(const it of HL.items.values())if(it.follow)it.follow();});

// ================= CAMERA =================
function camPose(){const c=camera,dir=c.getWorldDirection(new THREE.Vector3());
  return{x:r1(c.position.x),y:r1(c.position.y),z:r1(c.position.z),heading:Math.round(headingOf(dir.x,dir.z)),pitch:Math.round(deg(Math.asin(Math.max(-1,Math.min(1,dir.y))))),fov:Math.round(c.fov),
    mode:EDCAM.on?'free camera':AER.on?'aerial view':PLAYER.car?'driving':PLAYER.mount?'riding':'on foot'};}
const poseText=p=>`${p.mode}; camera at (${p.x}, ${p.y}, ${p.z}) looking ${compass(p.heading)} (heading ${p.heading}°, pitch ${p.pitch}°), field of view ${p.fov}°`;
async function setCamera(o){const mode=o.mode||'free';
  if(mode==='player'){edCamOff();if(AER.on)toggleAerial();await frames(4);return camPose();}
  if(mode==='aerial'){edCamOff();if(!AER.on)toggleAerial();if(o.x!=null)AER.x=+o.x;if(o.z!=null)AER.z=+o.z;if(o.y!=null)AER.h=clamp(+o.y,30,1100);
    if(o.heading_deg!=null)AER.yaw=-rad(+o.heading_deg);if(o.pitch_deg!=null)AER.pitch=clamp(-rad(+o.pitch_deg),.28,1.5);await frames(4);return camPose();}
  const p=camPose();let x=o.x!=null?+o.x:p.x,y=o.y!=null?+o.y:p.y,z=o.z!=null?+o.z:p.z,h=o.heading_deg!=null?+o.heading_deg:p.heading,pt=o.pitch_deg!=null?+o.pitch_deg:p.pitch;
  if(o.look_at&&typeof o.look_at==='object'){const dx=+o.look_at.x-x,dz=+o.look_at.z-z,dy=(+o.look_at.y||0)-y;h=headingOf(dx,dz);pt=deg(Math.atan2(dy,Math.hypot(dx,dz)));}
  if(![x,y,z,h,pt].every(Number.isFinite))throw new Error('x, y, z, heading_deg and pitch_deg must be numbers');
  edCamOn(x,y,z,-rad(h),rad(pt),o.fov_deg!=null?+o.fov_deg:(EDCAM.on?EDCAM.fov:62));await frames(2);try{updateStreaming(camera,0,true);}catch(e){}await frames(3);return camPose();}

// ================= WHAT IS ON SCREEN =================
function screenArea(b,tmp){let x0=1,x1=-1,y0=1,y1=-1,n=0;for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const v=tmp.set(x,y,z).project(camera);
    if(v.z<-1||v.z>1)continue;n++;x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);}
  if(!n)return 0;x0=Math.max(-1,x0);x1=Math.min(1,x1);y0=Math.max(-1,y0);y1=Math.min(1,y1);return Math.max(0,x1-x0)*Math.max(0,y1-y0)/4;}
// the parts of the world that fill the view: parts, buildings, and builders that have no parts, biggest first
function visibleScopes(n){camera.updateMatrixWorld();const fr=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)),tmp=new THREE.Vector3(),out=[];
  for(const s of allScopes()){if(!s.box||(s.kids.length&&!s.mark&&!isBuilding(s)))continue;if(!fr.intersectsBox(s.box))continue;const a=screenArea(s.box,tmp);if(a>=.004)out.push({s,a});}
  out.sort((a,b)=>b.a-a.a);return out.slice(0,n);}
function nearbyThings(x,z,r){const out=[],add=(kind,name,p)=>{const d=Math.hypot(p.x-x,p.z-z);if(d<r)out.push({kind,name,d,p});};
  for(const v of VEHICLES)if(!v.dead&&v!==PLAYER.car)add(v.mode==='tram'?'streetcar':'vehicle',(v.md&&v.md.name)||v.kind,v.pos);
  for(const p of PEDS)if(p.h&&p.h.group.visible)add('person',PEOPLE_KIND_NAMES[p.kind]||p.kind,p.h.pos);
  for(const m of MOUNTS)if(!m.dead)add('horse',m.name,{x:m.x,z:m.z});
  out.sort((a,b)=>a.d-b.d);return out;}
function aerialFootprint(){const pts=[];for(const [sx,sy] of[[-1,-1],[1,-1],[1,1],[-1,1]]){_ray.setFromCamera(_ndc.set(sx,sy),camera);const r=_ray.ray;if(r.direction.y>=-.01)continue;const t=-r.origin.y/r.direction.y;pts.push({x:r.origin.x+r.direction.x*t,z:r.origin.z+r.direction.z*t});}
  if(!pts.length)return'';const x0=Math.min(...pts.map(p=>p.x)),x1=Math.max(...pts.map(p=>p.x)),z0=Math.min(...pts.map(p=>p.z)),z1=Math.max(...pts.map(p=>p.z));
  const ds=new Set();for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){try{ds.add(districtAt(lerp(x0,x1,i/4),lerp(z0,z1,j/4)));}catch(e){}}
  const ns=NS.filter(s=>s.x>=x0&&s.x<=x1).map(s=>s.n),ew=EW.filter(s=>s.z>=z0&&s.z<=z1).map(s=>s.n);
  return`The ground in view spans about x ${Math.round(x0)}..${Math.round(x1)}, z ${Math.round(z0)}..${Math.round(z1)} (${[...ds].join(', ')}); streets in view: ${uniq([...ns,...ew]).join(', ')||'none'}. Playable map: x ${MAP.x0}..${MAP.x1}, z ${MAP.z0}..${MAP.z1}; generated: x ${VIS.x0}..${VIS.x1}, z ${VIS.z0}..${VIS.z1}.`;}
function clockText(t){const h=Math.floor(t),m=Math.floor((t-h)*60);return`${((h+11)%12)+1}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
function scopeLine(s,extra){return`#${s.id} ${scopeName(s)} — ${scopeChain(s)}; ${boxText(s.box)}${extra?'; '+extra:''}`;}
// describe_view (and the context of every prompt): the camera, the centre of the screen, the biggest things in view, who is near
function describeView(){const pose=camPose(),out=[`View: ${poseText(pose)}.`];
  const h=pickAt(innerWidth/2,innerHeight/2);if(h){const a=assetOfHit(h);out.push(`Centre of the screen: ${a.name}${a.scope?` (scope #${a.scope.id})`:''} at ${P3(a.point)}, ${r1(h.distance)} m away, ${placeName(a.point.x,a.point.z)}.`);}
  else out.push('Centre of the screen: sky.');
  const vis=visibleScopes(14);if(vis.length)out.push('Biggest things in view:\n'+vis.map(v=>'- '+scopeLine(v.s,`${Math.round(v.a*100)}% of the view`)).join('\n'));
  const c=camera.position,near=nearbyThings(c.x,c.z,60);if(near.length){const cnt={};for(const t of near)cnt[t.kind]=(cnt[t.kind]||0)+1;
    out.push(`Near the camera (60 m): ${Object.entries(cnt).map(([k,n])=>n+' '+k+(n>1?'s':'')).join(', ')}; closest: ${near.slice(0,5).map(t=>`${t.name} ${Math.round(t.d)} m`).join(', ')}.`);}
  if(AER.on||camera.position.y>60)out.push(aerialFootprint());
  return out.join('\n');}

// ================= SCREENSHOTS =================
// read the canvas right after the game draws a frame (FRAME_HOOKS: the frame is still in the drawing buffer); when the loop is
// not drawing (menu open) draw one here. Tagged things get their numbers drawn on.
function grab(maxDim,tags){const src=canvasEl,s=Math.min(1,maxDim/Math.max(src.width,src.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(src.width*s));c.height=Math.max(1,Math.round(src.height*s));
  const g=c.getContext('2d');g.drawImage(src,0,0,c.width,c.height);
  for(const t of tags||[]){const v=t.point.clone().project(camera);if(v.z<-1||v.z>1)continue;const x=(v.x+1)/2*c.width,y=(1-v.y)/2*c.height,r=Math.max(11,c.width/70);
    g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle='rgba(20,16,10,.85)';g.fill();g.lineWidth=2.5;g.strokeStyle='#ffc452';g.stroke();
    g.fillStyle='#ffe7ae';g.font=`bold ${Math.round(r*1.1)}px system-ui,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(String(t.n),x,y+1);}
  return c;}
function captureView(maxDim=1280,tags){return new Promise(res=>{let done=false;
  const take=()=>{if(done)return;done=true;const i=FRAME_HOOKS.indexOf(hook);if(i>=0)FRAME_HOOKS.splice(i,1);let c;try{c=grab(maxDim,tags);}catch(e){res(null);return;}c.toBlob(b=>res(b),'image/jpeg',.85);};
  const hook=()=>take();FRAME_HOOKS.push(hook);
  setTimeout(()=>{if(done)return;try{renderFrame(scene,camera,0,SKY.night||0);}catch(e){}take();},700);});}

// ================= PHOTOS: WHERE AND WHICH WAY =================
// The claude.ai frame refuses location and the compass, so a photo taken on the street carries its own: the phone's EXIF GPS
// position, compass direction and 35 mm focal length, when it kept them. GEO maps latitude/longitude onto the game's grid through
// the real positions of the streets the game lays out evenly (piecewise linear between them).
function exifOf(buf){try{const d=new DataView(buf);if(d.byteLength<12||d.getUint16(0)!==0xFFD8)return null;let o=2;
  while(o+4<d.byteLength){const m=d.getUint16(o);if((m&0xFF00)!==0xFF00)break;const len=d.getUint16(o+2);if(m===0xFFE1&&d.getUint32(o+4)===0x45786966)return tiff(d,o+10);if(m===0xFFDA)break;o+=2+len;}}catch(e){}return null;}
function tiff(d,t){const le=d.getUint16(t)===0x4949,u16=p=>d.getUint16(p,le),u32=p=>d.getUint32(p,le);
  const ifd=p=>{const n=u16(p),tags={};for(let i=0;i<n;i++){const e=p+2+i*12;tags[u16(e)]={type:u16(e+2),cnt:u32(e+4),vo:e+8};}return tags;};
  const at=e=>((({1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8})[e.type]||1)*e.cnt>4?t+u32(e.vo):e.vo);
  const num=(e,i=0)=>{if(!e)return null;const p=at(e);switch(e.type){case 3:return u16(p+2*i);case 4:return u32(p+4*i);case 5:return u32(p+8*i)/(u32(p+8*i+4)||1);case 10:return d.getInt32(p+8*i,le)/(d.getInt32(p+8*i+4,le)||1);case 1:case 7:return d.getUint8(p+i);default:return null;}};
  const str=e=>{if(!e)return null;const p=at(e);let s='';for(let i=0;i<e.cnt;i++){const c=d.getUint8(p+i);if(!c)break;s+=String.fromCharCode(c);}return s;};
  const T=ifd(t+u32(t+4)),out={};if(T[0x0112])out.orientation=num(T[0x0112]);
  if(T[0x8769]){const E=ifd(t+num(T[0x8769]));if(E[0xA405])out.focal35=num(E[0xA405]);if(E[0x9003])out.date=str(E[0x9003]);}
  if(T[0x8825]){const g=ifd(t+num(T[0x8825])),dms=e=>e?num(e,0)+num(e,1)/60+num(e,2)/3600:null,la=dms(g[2]),lo=dms(g[4]);
    if(la!=null&&lo!=null&&(la||lo)){out.lat=(str(g[1])==='S'?-1:1)*la;out.lon=(str(g[3])==='W'?-1:1)*lo;}if(g[0x11]){out.heading=num(g[0x11]);out.headingRef=str(g[0x10])||'T';}}
  return out;}
const GEO={lon:[[-87.6354,-440],[-87.6339,-330],[-87.6323,-220],[-87.6309,-110],[-87.6294,0],[-87.6278,110],[-87.6261,210],[-87.6245,310],[-87.6175,615],[-87.6150,692]],
 lat:[[41.8917,-860],[41.8907,-740],[41.8898,-660],[41.8890,-575],[41.8869,-420],[41.8857,-330],[41.8845,-230],[41.8832,-130],[41.8820,-30],[41.8806,70],[41.8794,170],[41.8781,270],[41.8768,370],[41.8756,470]]};
function pl(pts,v){const a=pts.slice().sort((p,q)=>p[0]-q[0]);let i=0;while(i<a.length-2&&v>a[i+1][0])i++;const [x0,y0]=a[i],[x1,y1]=a[i+1];return y0+(y1-y0)*(v-x0)/(x1-x0);}
function geoToGame(lat,lon){return{x:pl(GEO.lon,lon),z:pl(GEO.lat,lat)};}
// where the game camera should stand to see what the photo saw: eye height, the photo's heading (Chicago's compass declination is
// about 3.5° west), the vertical field of view from the 35 mm focal length and the picture's shape
function photoPose(ex,w,h){if(!ex||ex.lat==null)return null;const g=geoToGame(ex.lat,ex.lon),inside=g.x>VIS.x0&&g.x<VIS.x1&&g.z>VIS.z0&&g.z<VIS.z1;
  let head=ex.heading!=null?ex.heading-(ex.headingRef==='M'?3.5:0):null;if(head!=null)head=((head%360)+360)%360;
  const tall=h>w,fov=ex.focal35?deg(2*Math.atan((tall?18:12)/ex.focal35)):null;// (w, h: the picture as decoded, already upright)
  let y=1.6;try{y=groundAt(g.x,g.z)+1.6;}catch(e){}
  return{x:r1(g.x),y:r1(y),z:r1(g.z),heading:head!=null?Math.round(head):null,fov:fov?Math.round(fov):null,inside,place:inside?placeName(g.x,g.z):'outside the game map'};}
