(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

/* ================= shared state ================= */
const S={
  trim:'thrust', launching:false, tl:0, v:0, prevV:0, t60:null,
  rocket:false, track:false, hover:0, trackT:0,
  n2:100, refilling:false, emptyToasted:false,
  rollT:1, wantRoll:false, spinT:1,
  sound:false, pose:0, mx:0, my:0, scrollP:0
};

/* ================= toast ================= */
let toastTimer;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);}

/* ================= preloader ================= */
(function(){
  const bar=$('#bootbar i'),pct=$('#bootpct'),boot=$('#boot');
  const done=()=>{boot.classList.add('done');document.body.classList.add('ready');
    setTimeout(()=>boot.remove(),800);};
  if(reduce){done();return;}
  let p=0;const iv=setInterval(()=>{p=Math.min(100,p+4+Math.random()*9);
    bar.style.width=p+'%';pct.textContent='N₂ '+Math.round(p)+'%';
    if(p>=100){clearInterval(iv);pct.textContent='GO FOR LAUNCH';setTimeout(done,320);}},60);
})();

/* ================= scroll / cursor / magnet ================= */
addEventListener('scroll',()=>{
  const h=document.documentElement.scrollHeight-innerHeight;
  S.scrollP=h>0?scrollY/h:0;$('#bar').style.width=(S.scrollP*100)+'%';
  const mid=innerHeight/2;
  $$('[data-pose]').forEach(s=>{const r=s.getBoundingClientRect();
    if(r.top<mid&&r.bottom>mid)S.pose=+s.dataset.pose;});
},{passive:true});

const cur=$('#cur');
addEventListener('mousemove',e=>{
  S.mx=e.clientX/innerWidth*2-1;S.my=e.clientY/innerHeight*2-1;
  cur.style.opacity=1;cur.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;});
if(matchMedia('(hover:none)').matches)cur.remove();
$$('a,button,input').forEach(el=>{
  el.addEventListener('mouseenter',()=>cur.classList.add('big'));
  el.addEventListener('mouseleave',()=>cur.classList.remove('big'));});
$$('.mag').forEach(b=>{
  b.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect();
    b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.18}px,${(e.clientY-r.top-r.height/2)*.28}px)`;});
  b.addEventListener('mouseleave',()=>b.style.transform='');});

const rio=new IntersectionObserver(es=>es.forEach(en=>{
  if(en.isIntersecting){en.target.classList.add('in');rio.unobserve(en.target);}}),{threshold:.2});
$$('.copy').forEach(el=>rio.observe(el));
const cio=new IntersectionObserver(es=>es.forEach(en=>{
  if(!en.isIntersecting)return;cio.unobserve(en.target);
  const el=en.target,v=+el.dataset.v,d=+(el.dataset.d||0),t0=performance.now(),dur=reduce?200:1500;
  (function f(t){const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);
    el.firstChild.nodeValue=(v*e).toFixed(d);if(k<1)requestAnimationFrame(f);})(t0);
}),{threshold:.6});
$$('[data-v]').forEach(el=>cio.observe(el));

$('#form').addEventListener('submit',e=>{e.preventDefault();
  $('#msg').textContent='You’re on the (pretend) countdown, '+$('#email').value+'. Real reservations live at tesla.com/roadster.';
  e.target.reset();});

/* ================= drive modes ================= */
function setTrim(t,quiet){
  S.trim=t;
  $$('.card').forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.trim===t)));
  $('#hudTrim').textContent=t.toUpperCase();
  if(!quiet)toast(t==='rocket'?'Rocket trim engaged — invite-only in real life.':
    t==='thrust'?'Thrust trim — four rear nozzles armed.':'Performance trim — motors only, no thrusters.');
  if(t==='performance'&&S.rocket){S.rocket=false;syncButtons();}
}
$$('.card').forEach(c=>c.addEventListener('click',()=>setTrim(c.dataset.trim)));

function toggleLaunch(){
  S.launching=!S.launching;
  if(S.launching){S.tl=0;S.t60=null;S.emptyToasted=false;
    toast(S.trim==='performance'?'Motor launch — no thrusters on Performance.':'Thrust launch — hold on.');
    burst(.5,900,.1);}
  syncButtons();
}
function toggleTrack(){S.track=!S.track;
  toast(S.track?'Track mode: fans on, ride height dropped, 2 g suction.':'Track mode off.');syncButtons();}
function toggleRocket(){
  if(!S.rocket&&S.trim!=='rocket')setTrim('rocket',true);
  if(!S.rocket&&S.n2<8){toast('N₂ too low — press N to refill.');return;}
  S.rocket=!S.rocket;
  toast(S.rocket?'Rocket engaged. Ten nozzles. It flies.':'Descending.');
  burst(.6,600,.12);syncButtons();
}
function doRoll(){
  if(S.trim!=='rocket'){setTrim('rocket',true);}
  if(!S.rocket){S.rocket=true;syncButtons();}
  if(S.n2<12){toast('Not enough N₂ for a roll — refill first.');return;}
  S.wantRoll=true;toast('Barrel roll queued…');
}
function refill(){if(S.refilling)return;S.refilling=true;S.emptyToasted=false;
  toast('Refilling N₂… (real refill: 2–6 hours. Demo: instant.)');hiss();}
function spin(){if(S.spinT>=1)S.spinT=0;}
function syncButtons(){
  $('#dLaunch').setAttribute('aria-pressed',String(S.launching));
  $('#dTrack').setAttribute('aria-pressed',String(S.track));
  $('#dRocket').setAttribute('aria-pressed',String(S.rocket));
  $('#dSound').setAttribute('aria-pressed',String(S.sound));
  $('#dStudio').setAttribute('aria-pressed',String(studio.on));
  $('#launch').textContent=S.launching?'Cut thrust':'Ignite Thrust';
  $('#launch2').textContent=S.launching?'Cut thrust':'Run it';
  $('#rocketBtn').textContent=S.rocket?'Descend':'Engage Rocket';
}
$('#launch').onclick=toggleLaunch;$('#launch2').onclick=toggleLaunch;$('#dLaunch').onclick=toggleLaunch;
$('#dTrack').onclick=toggleTrack;
$('#dRocket').onclick=toggleRocket;$('#rocketBtn').onclick=toggleRocket;
$('#dRoll').onclick=doRoll;$('#rollBtn').onclick=doRoll;
$('#dRefill').onclick=refill;$('#refillBtn').onclick=refill;
$('#dSpin').onclick=spin;$('#spinBtn').onclick=spin;
$('#dSound').onclick=toggleSound;
$('#dStudio').onclick=toggleStudio;$('#studioBtn').onclick=toggleStudio;$('#studioBtn2').onclick=toggleStudio;

/* collapsible dock (ported) */
function toggleDock(){
  const hidden=document.body.classList.toggle('dockhide');
  $('#dockToggle').textContent=hidden?'CONTROLS (H)':'HIDE (H)';
}
$('#dockToggle').onclick=toggleDock;

addEventListener('keydown',e=>{
  if(e.repeat||e.metaKey||e.ctrlKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  const k=e.key.toLowerCase();
  if(k==='l')toggleLaunch();else if(k==='t')toggleTrack();else if(k==='x')toggleRocket();
  else if(k==='b')doRoll();else if(k==='n')refill();else if(k==='s')toggleSound();
  else if(k==='0')spin();else if(k==='c')toggleStudio();else if(k==='h')toggleDock();
  else if(k==='escape'){if($('#inspector').classList.contains('show'))hideInspector();
    else if(studio.on)toggleStudio();}
  else if(k>='1'&&k<='5'){const sw=$$('.sw')[+k-1];if(sw)sw.click();}
});

/* ================= sound ================= */
let AC=null,master,whine,whineGain,wind,windGain;
function toggleSound(){
  S.sound=!S.sound;
  if(S.sound&&!AC){try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain();master.gain.value=.6;master.connect(AC.destination);
    whine=AC.createOscillator();whine.type='sawtooth';whine.frequency.value=70;
    const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;
    whineGain=AC.createGain();whineGain.gain.value=0;
    whine.connect(lp);lp.connect(whineGain);whineGain.connect(master);whine.start();
    const buf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    wind=AC.createBufferSource();wind.buffer=buf;wind.loop=true;
    const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=800;bp.Q.value=.6;
    windGain=AC.createGain();windGain.gain.value=0;
    wind.connect(bp);bp.connect(windGain);windGain.connect(master);wind.start();
  }catch(err){S.sound=false;}}
  if(AC&&AC.state==='suspended')AC.resume();
  if(AC)master.gain.linearRampToValueAtTime(S.sound?.6:0,AC.currentTime+.2);
  toast(S.sound?'Sound on — synth motor + thrusters.':'Sound off.');syncButtons();
}
function burst(dur,freq,g){if(!AC||!S.sound)return;
  const b=AC.createBuffer(1,AC.sampleRate*dur,AC.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=AC.createBufferSource();s.buffer=b;
  const f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;
  const gn=AC.createGain();gn.gain.value=g;s.connect(f);f.connect(gn);gn.connect(master);s.start();}
function hiss(){burst(1.1,3200,.08);}

/* ================= finishes ================= */
let paintHook=null;
$$('.sw').forEach(b=>b.addEventListener('click',()=>{
  $$('.sw').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');
  $('#cname').innerHTML=b.dataset.n+(b.dataset.official?' <small>OFFICIAL</small>':' <small>FAN FINISH</small>');
  document.documentElement.style.setProperty('--accent',b.dataset.a);
  if(paintHook)paintHook(b.dataset.c,b.dataset.a);
}));

/* ================= 3D guard ================= */
if(!window.THREE){document.body.classList.add('no3d');return;}
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:$('#scene'),antialias:true,alpha:true});}
catch(err){document.body.classList.add('no3d');return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x070b14,.016);
const cam=new THREE.PerspectiveCamera(45,1,.1,260);cam.position.set(0,.75,8);
let mobile=innerWidth<761;

/* studio environment reflections */
(function(){
  const env=new THREE.Scene();env.background=new THREE.Color(0x05070c);
  const P=(w,h,c,x,y,z)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
    new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m);};
  P(24,10,0xffffff,0,9,0);P(10,6,0x8a5a18,8,3,6);P(10,6,0x1c3a5e,-9,4,-4);P(12,3,0x5a1414,-6,2,-8);P(30,30,0x0a0e16,0,-6,0);
  const pg=new THREE.PMREMGenerator(renderer);
  scene.environment=pg.fromScene(env,.05).texture;pg.dispose();
})();

scene.add(new THREE.AmbientLight(0x8fa8d0,.45));
const sun=new THREE.DirectionalLight(0xffffff,1.05);sun.position.set(5,8,6);scene.add(sun);
const rim=new THREE.DirectionalLight(0xf5b942,.7);rim.position.set(-6,3,-5);scene.add(rim);

function glowTex(){const c=document.createElement('canvas');c.width=c.height=128;
  const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.4,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=r;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const GT=glowTex();
function shadowTex(){const c=document.createElement('canvas');c.width=c.height=128;
  const g=c.getContext('2d'),r=g.createRadialGradient(64,64,8,64,64,64);
  r.addColorStop(0,'rgba(0,0,0,.85)');r.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=r;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}

/* ================= STUDIO: parts data ================= */
const PARTS={
  body:{title:'Ano White Monocoque',spec:'Mg · Ti · Carbon Fiber',
    desc:'Aerospace-inspired Ano White paint with UV and cryogenic protection, borrowed from rocket pre-launch and recovery tech. Target curb weight: under 1,700 kg (3,700 lb).'},
  canopy:{title:'Gold Visor Canopy',spec:'Tinted Glass · Titanium Accents',
    desc:'The glass mimics the copper-gold coating that gives spacesuit visors their radiance. Subtle titanium accents trace the body’s most unique features.'},
  cockpit:{title:'Yoke & Ultrawhite Cabin',spec:'Steer-by-Wire · 3 Displays',
    desc:'Ultra-white interior with gray microsuede bolsters. A steer-by-wire yoke, a center touchscreen, and two smaller forward displays for critical driving info.'},
  battery:{title:'800–1,000 V Structural Pack',spec:'500+ kW · 10–80% ≈ 10 min',
    desc:'Bespoke cells developed for this car. Claimed range: 310–320 mi (500–510 km). Pack capacity has not been disclosed — the 2017 “200 kWh” figure is history.'},
  wheels:{title:'Thin-Spoke Wheels · Dual Motors',spec:'1,341 hp · RWD Torque Vectoring',
    desc:'Super-light wheels with thin structural spokes. One motor per rear wheel enables precise torque vectoring — no front motors, unlike the 2017 tri-motor plan.'},
  thrusters:{title:'SpaceX Cold-Gas Thrusters',spec:'10 Nozzles · N₂ @ 10,000 psi',
    desc:'Thrust trim: 4 rear nozzles, 200 L COPV tank, ~5 s per fill, 0–60 mph in 0.81 s (Tesla-measured). Rocket adds 6 perimeter nozzles — invite-only, not street legal.'},
  fan:{title:'Multi-Mode Suction System',spec:'2 g Downforce · Holds Inverted',
    desc:'Powered fans pull air from beneath the car — enough suction to hold it upside down, even stationary. Track mode lowers the car and transforms the suspension.'},
  aero:{title:'Hidden Aero & Light Blades',spec:'Full-Length Taillight · Flush Surfaces',
    desc:'Hidden headlights, a full-length taillight, and flush-mounted aerodynamics conceal the true form. Active wings switch between high-downforce and low-drag modes.'}
};
const interactables=[];
function tag(obj,id,root){
  obj.traverse(c=>{if(c.isMesh&&!c.userData.partId){
    c.userData.partId=id;c.userData.partRoot=root||obj;interactables.push(c);}});
}

/* ================= the car (grouped for explode) ================= */
const car=new THREE.Group();car.rotation.order='YXZ';scene.add(car);
const gBody=new THREE.Group(),gGlass=new THREE.Group(),gInterior=new THREE.Group(),
      gWheels=new THREE.Group(),gThrusters=new THREE.Group(),gFan=new THREE.Group(),gAero=new THREE.Group();
car.add(gBody,gGlass,gInterior,gWheels,gThrusters,gFan);gBody.add(gAero);

const bodyMat=new THREE.MeshPhysicalMaterial({color:0xe8eaec,metalness:.7,roughness:.28,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.1});
const glassMat=new THREE.MeshPhysicalMaterial({color:0x2a1f08,metalness:1,roughness:.06,transparent:true,opacity:.85,clearcoat:1,envMapIntensity:1.6});
const darkMat=new THREE.MeshStandardMaterial({color:0x0d0f13,metalness:.6,roughness:.5});
const tiMat=new THREE.MeshStandardMaterial({color:0xb9bdc6,metalness:.95,roughness:.32,envMapIntensity:1.2});
const whiteMat=new THREE.MeshStandardMaterial({color:0xe6e7e9,roughness:.7});
const emit=(c,i)=>new THREE.MeshStandardMaterial({color:0x111111,emissive:c,emissiveIntensity:i});

function extrude(pts,depth,bt,bs,mat){
  const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++){const p=pts[i];
    if(p.length===4)s.quadraticCurveTo(p[0],p[1],p[2],p[3]);else s.lineTo(p[0],p[1]);}
  s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:bt,bevelSize:bs,bevelSegments:5,curveSegments:24});
  g.translate(0,0,-depth/2);
  return new THREE.Mesh(g,mat);
}
gBody.add(extrude([[-2.12,.22],[1.98,.22],[2.3,.24,2.34,.4],[2.28,.52,1.86,.56],[1.05,.64,.45,.7],
  [-.7,.77,-1.55,.77],[-1.98,.77,-2.16,.66],[-2.3,.55,-2.26,.38]],1.44,.22,.16,bodyMat));
gGlass.add(extrude([[.55,.68],[.1,1.02,-.4,1.08],[-.75,1.1,-1.05,1.04],[-1.45,.95,-1.7,.72]],.98,.13,.09,glassMat));

/* interior */
const floor=new THREE.Mesh(new THREE.BoxGeometry(1.7,.05,1.05),darkMat);floor.position.set(-.4,.62,0);gInterior.add(floor);
const dash=new THREE.Mesh(new THREE.BoxGeometry(.3,.08,1),whiteMat);dash.position.set(.32,.74,0);gInterior.add(dash);
const scr=new THREE.Mesh(new THREE.BoxGeometry(.02,.13,.3),emit(0xcfe0ff,.9));scr.position.set(.3,.84,0);gInterior.add(scr);
[-1,1].forEach(s=>{const d=new THREE.Mesh(new THREE.BoxGeometry(.02,.06,.12),emit(0xf5b942,.7));
  d.position.set(.42,.87,s*.22);gInterior.add(d);});
const yoke=new THREE.Mesh(new THREE.TorusGeometry(.11,.02,8,24,Math.PI*1.3),darkMat);
yoke.rotation.set(0,Math.PI/2,0);yoke.rotation.z=Math.PI*.85;yoke.position.set(.26,.85,.3);gInterior.add(yoke);
[-1,1].forEach(s=>{
  const base=new THREE.Mesh(new THREE.BoxGeometry(.45,.09,.4),whiteMat);base.position.set(-.25,.68,s*.3);gInterior.add(base);
  const back=new THREE.Mesh(new THREE.BoxGeometry(.12,.34,.42),whiteMat);back.position.set(-.46,.86,s*.3);back.rotation.z=.18;gInterior.add(back);
  const hr=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.24),whiteMat);hr.position.set(-.52,1.04,s*.3);gInterior.add(hr);});
tag(floor,'battery',floor);tag(gInterior,'cockpit',gInterior);
tag(gGlass,'canopy',gGlass);

/* aero details */
const headMat=emit(0xffffff,2.2),tailMat=emit(0xff1a1a,2.6);
const head=new THREE.Mesh(new THREE.BoxGeometry(.02,.028,1.3),headMat);head.position.set(2.44,.42,0);gAero.add(head);
const tail=new THREE.Mesh(new THREE.BoxGeometry(.02,.035,1.62),tailMat);tail.position.set(-2.42,.6,0);gAero.add(tail);
const tailGlow=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.55),
  new THREE.MeshBasicMaterial({map:GT,color:0xff2020,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
tailGlow.rotation.y=-Math.PI/2;tailGlow.position.set(-2.5,.6,0);gAero.add(tailGlow);
const splitter=new THREE.Mesh(new THREE.BoxGeometry(.5,.05,1.7),darkMat);splitter.position.set(2.25,.12,0);gAero.add(splitter);
const diff=new THREE.Mesh(new THREE.BoxGeometry(.4,.12,1.6),darkMat);diff.position.set(-2.2,.16,0);gAero.add(diff);
for(let i=0;i<5;i++){const f=new THREE.Mesh(new THREE.BoxGeometry(.35,.14,.03),darkMat);f.position.set(-2.2,.14,-.6+i*.3);gAero.add(f);}
tag(gAero,'aero',gAero);

/* body details */
[-1,1].forEach(s=>{
  const skirt=new THREE.Mesh(new THREE.BoxGeometry(2.6,.09,.06),darkMat);skirt.position.set(0,.14,s*.9);gBody.add(skirt);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(2.6,.02,.02),tiMat);strip.position.set(0,.19,s*.93);gBody.add(strip);
  const stalk=new THREE.Mesh(new THREE.BoxGeometry(.04,.03,.12),darkMat);stalk.position.set(.55,.8,s*.95);gBody.add(stalk);
  const pod=new THREE.Mesh(new THREE.BoxGeometry(.09,.045,.05),bodyMat);pod.position.set(.55,.83,s*1.01);gBody.add(pod);});
const badge=new THREE.Mesh(new THREE.CircleGeometry(.04,20),new THREE.MeshStandardMaterial({color:0xc9a24b,metalness:1,roughness:.3}));
badge.rotation.y=Math.PI/2;badge.position.set(2.465,.47,0);gBody.add(badge);
(function(){const c=document.createElement('canvas');c.width=160;c.height=48;const g=c.getContext('2d');
  g.fillStyle='#0d1016';g.fillRect(0,0,160,48);g.strokeStyle='#c9a24b';g.strokeRect(3,3,154,42);
  g.fillStyle='#e8eaec';g.font='700 26px monospace';g.textAlign='center';g.fillText('RDSTR·26',80,33);
  const p=new THREE.Mesh(new THREE.PlaneGeometry(.36,.11),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));
  p.rotation.y=-Math.PI/2;p.position.set(-2.455,.36,0);gBody.add(p);})();

/* wheels + arches */
const wheels=[];
[[1.48,1],[1.48,-1],[-1.48,1],[-1.48,-1]].forEach(([x,s])=>{
  const rear=x<0,sc=rear?1.1:1;
  const arch=new THREE.Mesh(new THREE.CircleGeometry(.44*sc,24,0,Math.PI),new THREE.MeshBasicMaterial({color:0x05070c}));
  arch.position.set(x,.34,s*.936);if(s<0)arch.rotation.y=Math.PI;gBody.add(arch);
  const flare=new THREE.Mesh(new THREE.TorusGeometry(.45*sc,.05,8,24,Math.PI),bodyMat);
  flare.position.set(x,.34,s*.94);if(s<0)flare.rotation.y=Math.PI;gBody.add(flare);
  const w=new THREE.Group();w.position.set(x,.34,s*.84);if(s<0)w.rotation.y=Math.PI;
  w.userData.side=s;w.userData.base=w.position.clone();gWheels.add(w);wheels.push(w);
  w.add(new THREE.Mesh(new THREE.TorusGeometry(.25,.09,14,32),new THREE.MeshStandardMaterial({color:0x0c0d10,roughness:.95})));
  const rimC=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.14,24),darkMat);rimC.rotation.x=Math.PI/2;w.add(rimC);
  for(let k=0;k<7;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.022,.3,.03),tiMat);
    sp.rotation.z=k*Math.PI*2/7;sp.position.z=.075;w.add(sp);}
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.17,12),tiMat);hub.rotation.x=Math.PI/2;w.add(hub);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.02,20),tiMat);disc.rotation.x=Math.PI/2;disc.position.z=.03;w.add(disc);
  const cal=new THREE.Mesh(new THREE.BoxGeometry(.06,.11,.05),new THREE.MeshStandardMaterial({color:0xc9a24b,metalness:.6,roughness:.4}));
  cal.position.set(.13,.04,.05);w.add(cal);
  const blur=new THREE.Mesh(new THREE.CircleGeometry(.32,28),
    new THREE.MeshBasicMaterial({color:0xaeb6c4,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  blur.position.z=.09;w.add(blur);w.userData.blur=blur;
  tag(w,'wheels',w);
});
tag(gBody,'body',gBody); /* after aero/wheels tagging; skips already-tagged */

/* thrusters */
const plumes=[],nozzles=[];
function nozzle(x,y,z,rotZ,rotX,len,r){
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.z=rotZ;g.rotation.x=rotX||0;gThrusters.add(g);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.55,.015,8,16),tiMat);ring.rotation.x=Math.PI/2;g.add(ring);
  const geo=new THREE.ConeGeometry(r,len,12,1,true);geo.translate(0,-len/2,0);
  const p=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xcfe6ff,transparent:true,opacity:0,
    blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  g.add(p);
  const base=new THREE.Vector3(x,y,z),dir=new THREE.Vector3(x,0,z).normalize();
  plumes.push({g,p,baseZ:rotZ,rear:rotZ<-1});
  nozzles.push({g,base,dir});
  tag(ring,'thrusters',g);
  return g;
}
[-.52,-.28,.28,.52].forEach(z=>nozzle(-2.38,.32,z,-Math.PI/2,0,.95,.09));
[-.5,.5].forEach(z=>nozzle(2.36,.26,z,Math.PI/4,0,.6,.07));
[[.9,.95],[.9,-.95],[-.9,.95],[-.9,-.95]].forEach(([x,z])=>nozzle(x,.2,z,0,z>0?-.2:.2,.65,.07));

/* suction fan housing (inspectable) */
const vent=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.06,32),darkMat);vent.position.set(0,.09,0);gFan.add(vent);
const ventRing=new THREE.Mesh(new THREE.TorusGeometry(.5,.02,8,40),tiMat);ventRing.rotation.x=Math.PI/2;ventRing.position.y=.065;gFan.add(ventRing);
tag(gFan,'fan',gFan);

/* fan glow, beams, spots (not inspectable) */
const fanRing=new THREE.Mesh(new THREE.TorusGeometry(.95,.03,8,48),
  new THREE.MeshBasicMaterial({color:0xf5b942,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
fanRing.rotation.x=Math.PI/2;fanRing.position.y=.06;car.add(fanRing);
const fanDisc=new THREE.Mesh(new THREE.CircleGeometry(1.15,40),
  new THREE.MeshBasicMaterial({map:GT,color:0xf5b942,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
fanDisc.rotation.x=-Math.PI/2;fanDisc.position.y=.05;car.add(fanDisc);
[-1,1].forEach(s=>{
  const geo=new THREE.ConeGeometry(1.2,8,16,1,true);geo.translate(0,-4,0);
  const beam=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xdfeaff,transparent:true,opacity:.045,
    blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beam.rotation.z=Math.PI/2;beam.position.set(2.4,.42,s*.5);gBody.add(beam);
  const spot=new THREE.SpotLight(0xcfe8ff,1.1,30,.5,.5,1.4);spot.position.set(2.3,.5,s*.55);
  const tgt=new THREE.Object3D();tgt.position.set(14,-.6,s*1.4);gBody.add(tgt);spot.target=tgt;gBody.add(spot);});

/* ground contact */
const blob=new THREE.Mesh(new THREE.PlaneGeometry(5,2.4),
  new THREE.MeshBasicMaterial({map:shadowTex(),transparent:true,opacity:.75,depthWrite:false}));
blob.rotation.x=-Math.PI/2;car.add(blob);
const pad=new THREE.Mesh(new THREE.PlaneGeometry(5.6,2.9),
  new THREE.MeshBasicMaterial({map:GT,color:0xf5b942,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));
pad.rotation.x=-Math.PI/2;car.add(pad);
const under=new THREE.PointLight(0xf5b942,1.1,7);under.position.set(0,-.3,0);car.add(under);

/* ================= STUDIO: airflow streamlines (ported) ================= */
const airflowGroup=new THREE.Group();airflowGroup.visible=false;car.add(airflowGroup);
const flowCurves=[-.9,-.45,0,.45,.9].map(z=>new THREE.CatmullRomCurve3([
  new THREE.Vector3(4.7,.4,z),
  new THREE.Vector3(.3,Math.abs(z)<.5?1.35:.95,z*.85),
  new THREE.Vector3(-4.9,.5,z*1.15)]));
const FLOWN=90;
const flowParticles=new THREE.InstancedMesh(
  new THREE.BoxGeometry(.2,.016,.016),
  new THREE.MeshBasicMaterial({color:0x7dd3fc,transparent:true,opacity:.85,depthWrite:false}),FLOWN);
flowParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
airflowGroup.add(flowParticles);
const flowDummy=new THREE.Object3D(),_pt=new THREE.Vector3(),_tan=new THREE.Vector3(),_xAxis=new THREE.Vector3(1,0,0);

/* ================= world ================= */
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({color:0x060a12,roughness:1}));
ground.rotation.x=-Math.PI/2;scene.add(ground);
const road=new THREE.Mesh(new THREE.PlaneGeometry(150,8.4),new THREE.MeshStandardMaterial({color:0x0b1120,roughness:.95}));
road.rotation.x=-Math.PI/2;road.position.y=.008;scene.add(road);
const grid=new THREE.GridHelper(300,90,0x2a3550,0x141d33);grid.position.y=.02;
grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
[-3.6,3.6].forEach(z=>{const e=new THREE.Mesh(new THREE.BoxGeometry(150,.02,.06),
  new THREE.MeshBasicMaterial({color:0x6a7688}));e.position.set(0,.02,z);scene.add(e);});
const dashMat=new THREE.MeshBasicMaterial({color:0xf5b942});
const dashes=[];for(let i=0;i<26;i++){const d=new THREE.Mesh(new THREE.BoxGeometry(1.6,.02,.12),dashMat);
  d.position.set(-71.5+i*5.5,.03,0);scene.add(d);dashes.push(d);}
const posts=[];
for(let i=0;i<9;i++)[-5.2,5.2].forEach(z=>{
  const g=new THREE.Group();g.position.set(-72+i*16,0,z);scene.add(g);posts.push(g);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,3.4,8),darkMat);pole.position.y=1.7;g.add(pole);
  const arm=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.7),darkMat);arm.position.set(0,3.35,z>0?-.35:.35);g.add(arm);
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(.16,.06,.3),emit(0xffd9a0,1.6));lamp.position.set(0,3.32,z>0?-.65:.65);g.add(lamp);
  const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:0xffd9a0,transparent:true,opacity:.35,depthWrite:false}));
  gl.scale.set(1.4,1.4,1);gl.position.copy(lamp.position);g.add(gl);});
function winTex(){const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');
  g.fillStyle='#0a0f18';g.fillRect(0,0,64,128);
  for(let y=6;y<122;y+=10)for(let x=5;x<58;x+=10)if(Math.random()<.32){
    g.fillStyle=Math.random()<.5?'rgba(255,205,130,.9)':'rgba(150,215,255,.8)';g.fillRect(x,y,5,6);}
  return new THREE.CanvasTexture(c);}
const winTexs=[winTex(),winTex(),winTex()];
const city=[];
for(let i=0;i<(mobile?44:64);i++){
  const w=1+Math.random()*2.2,h=2+Math.random()*11,d=1+Math.random()*2.2;
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
    new THREE.MeshStandardMaterial({color:0x0e1524,roughness:.85,emissive:0xffffff,emissiveMap:winTexs[i%3],emissiveIntensity:.5}));
  m.position.set(-62+Math.random()*124,h/2,-18-Math.random()*44);scene.add(m);city.push(m);
}
(function(){
  const n=700,pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=100+Math.random()*40,y=8+Math.random()*90;
    pos[i*3]=Math.cos(a)*r;pos[i*3+1]=y;pos[i*3+2]=Math.sin(a)*r;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const stars=new THREE.Points(g,new THREE.PointsMaterial({color:0xbfd6ff,size:.9,transparent:true,opacity:.8,fog:false}));
  scene.add(stars);scene.userData.stars=stars;
  const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:0xdfe8ff,transparent:true,opacity:.5,fog:false,depthWrite:false}));
  moon.scale.set(30,30,1);moon.position.set(-48,34,-110);scene.add(moon);
  const core=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:0xffffff,transparent:true,opacity:.9,fog:false,depthWrite:false}));
  core.scale.set(7,7,1);core.position.copy(moon.position);scene.add(core);
})();
const N=mobile?100:150,sp=new Float32Array(N*6),meta=[];
for(let i=0;i<N;i++)meta.push({x:-24+Math.random()*48,y:.2+Math.random()*7,z:-8+Math.random()*11,l:.3+Math.random()*.6});
const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
const streakMat=new THREE.LineBasicMaterial({color:0xdfe9ff,transparent:true,opacity:0,fog:false});
scene.add(new THREE.LineSegments(sg,streakMat));

/* ================= poses & studio camera ================= */
const POSES=[
  {x:2.35,y:0,z:0,ry:-.62,s:1,cy:.75,ly:.45},
  {x:-2.5,y:0,z:-.3,ry:-.12,s:1,cy:.6,ly:.4},
  {x:2.45,y:0,z:-.4,ry:2.55,s:1,cy:.9,ly:.5},
  {x:-2.3,y:0,z:0,ry:-.85,s:1,cy:1.4,ly:.8},
  {x:0,y:0,z:-4.5,ry:-.5,s:.85,cy:1.6,ly:.6},
  {x:2.3,y:0,z:.5,ry:-.75,s:1.05,cy:.7,ly:.45},
  {x:3.2,y:0,z:-7,ry:-.4,s:.8,cy:1.8,ly:.5},
  {x:0,y:0,z:-2.2,ry:-.55,s:.95,cy:1.1,ly:.5}
];
const STUDIO_POSE={x:0,y:0,z:0,ry:-.55,s:1,cy:1.4,ly:.65};
function getPose(i){const d=POSES[i]||POSES[0];
  return mobile?{x:0,y:0,z:-3.2,ry:d.ry,s:.6,cy:1.5,ly:.9}:d;}
const cur3=Object.assign({},getPose(0));

const PRESETS={
  hero:{pos:[5.3,2.3,5.5],target:[0,.65,0]},
  profile:{pos:[.2,1.5,7.6],target:[0,.65,0]},
  top:{pos:[0,9,.8],target:[0,.4,0]},
  canopy:{pos:[2.1,2.4,2.7],target:[.1,.95,0]}
};
const studio={on:false,orbit:!reduce,airflow:true,explode:0,explodeCur:0,
  camT:false,camPos:new THREE.Vector3(),camTarget:new THREE.Vector3(),savedScroll:0};
let controls=null,camReturn=0;
const lookCur=new THREE.Vector3(0,.45,0);
if(typeof THREE.OrbitControls==='function'){
  controls=new THREE.OrbitControls(cam,renderer.domElement);
  controls.enableDamping=true;controls.enablePan=false;
  controls.minDistance=3;controls.maxDistance=14;
  controls.maxPolarAngle=Math.PI*.49;
  controls.autoRotateSpeed=.65;
  controls.target.set(0,.65,0);
  controls.enabled=false;
  controls.addEventListener('start',()=>{studio.camT=false;});
}
function setPreset(name){
  const p=PRESETS[name];if(!p)return;
  studio.camPos.set(p.pos[0],p.pos[1],p.pos[2]);
  studio.camTarget.set(p.target[0],p.target[1],p.target[2]);
  studio.camT=true;
  $$('.preset').forEach(b=>b.classList.toggle('on',b.dataset.preset===name));
  if(!controls){cam.position.copy(studio.camPos);lookCur.copy(studio.camTarget);cam.lookAt(lookCur);studio.camT=false;}
}
$$('.preset').forEach(b=>b.addEventListener('click',()=>setPreset(b.dataset.preset)));

function toggleStudio(){
  studio.on=!studio.on;
  if(studio.on){
    studio.savedScroll=scrollY;
    document.documentElement.style.overflow='hidden';
    document.body.classList.add('studio');
    if(controls){controls.enabled=true;setPreset('hero');}
    else{cam.position.set(5.3,2.3,5.5);lookCur.set(0,.65,0);cam.lookAt(lookCur);}
    toast('3D Studio — drag to orbit, click parts, slide to explode. C to exit.');
  }else{
    document.documentElement.style.overflow='';
    document.body.classList.remove('studio');
    window.scrollTo(0,studio.savedScroll);
    if(controls){controls.enabled=false;lookCur.copy(controls.target);}
    camReturn=1;
    studio.explode=0;$('#explode').value=0;$('#explodePct').textContent='0%';
    hideInspector();
    toast('Back to the cinematic scroll.');
  }
  syncButtons();
}
$('#explode').addEventListener('input',e=>{
  studio.explode=parseFloat(e.target.value);
  $('#explodePct').textContent=Math.round(studio.explode*100)+'%';
});
$('#chipAirflow').onclick=e=>{studio.airflow=!studio.airflow;
  e.currentTarget.classList.toggle('on',studio.airflow);
  e.currentTarget.setAttribute('aria-pressed',String(studio.airflow));};
$('#chipOrbit').onclick=e=>{studio.orbit=!studio.orbit;
  e.currentTarget.classList.toggle('on',studio.orbit);
  e.currentTarget.setAttribute('aria-pressed',String(studio.orbit));};
$('#chipReset').onclick=()=>{
  studio.explode=0;$('#explode').value=0;$('#explodePct').textContent='0%';
  studio.airflow=true;$('#chipAirflow').classList.add('on');
  studio.orbit=!reduce;$('#chipOrbit').classList.toggle('on',studio.orbit);
  setPreset('hero');hideInspector();
};
if(reduce)$('#chipOrbit').classList.remove('on');

/* ================= STUDIO: click-to-inspect ================= */
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let selHelper=null,downX=0,downY=0;
function hideInspector(){
  $('#inspector').classList.remove('show');
  if(selHelper){scene.remove(selHelper);selHelper.geometry.dispose();selHelper.material.dispose();selHelper=null;}
}
$('#insClose').onclick=hideInspector;
renderer.domElement.addEventListener('pointerdown',e=>{downX=e.clientX;downY=e.clientY;});
renderer.domElement.addEventListener('click',e=>{
  if(!studio.on)return;
  if(Math.hypot(e.clientX-downX,e.clientY-downY)>6)return; /* it was a drag */
  const r=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-r.left)/r.width)*2-1;
  pointer.y=-((e.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(pointer,cam);
  const hits=raycaster.intersectObjects(interactables,false);
  if(!hits.length){hideInspector();return;}
  const mesh=hits[0].object,info=PARTS[mesh.userData.partId];
  if(!info)return;
  $('#insTitle').textContent=info.title;
  $('#insSpec').textContent=info.spec;
  $('#insDesc').textContent=info.desc;
  $('#inspector').classList.add('show');
  if(selHelper){scene.remove(selHelper);selHelper.geometry.dispose();selHelper.material.dispose();}
  selHelper=new THREE.BoxHelper(mesh.userData.partRoot,0xf5b942);
  selHelper.material.transparent=true;selHelper.material.opacity=.7;
  scene.add(selHelper);
});

/* paint hook */
paintHook=(c,a)=>{bodyMat.color.set(c);
  const g=new THREE.Color(a);under.color.copy(g);pad.material.color.copy(g);
  fanRing.material.color.copy(g);fanDisc.material.color.copy(g);dashMat.color.copy(g);rim.color.copy(g);
  if(selHelper)selHelper.material.color.copy(g);};

/* ---------- physics profile ---------- */
const KNOTS=[[0,0],[.81,97],[4,225],[10,315],[22,372]];
function profile(t){
  if(t<=0)return 0;
  for(let i=1;i<KNOTS.length;i++){if(t<=KNOTS[i][0]){
    const [t0,v0]=KNOTS[i-1],[t1,v1]=KNOTS[i];return v0+(v1-v0)*(t-t0)/(t1-t0);}}
  return KNOTS[KNOTS.length-1][1];
}

function resize(){mobile=innerWidth<761;renderer.setSize(innerWidth,innerHeight,false);
  cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();}
addEventListener('resize',resize);resize();

/* ================= main loop ================= */
const clock=new THREE.Clock();
let smx=0,smy=0,gS=0,hudAcc=0;
const hudKmh=$('#hudKmh'),hudMph=$('#hudMph'),hudMode=$('#hudMode'),hudN2=$('#hudN2'),
  hudN2pct=$('#hudN2pct'),hudT60=$('#hudT60'),gaugeFill=$('#gaugeFill'),gaugePct=$('#gaugePct'),
  stripFill=$('#stripFill'),stripT60=$('#stripT60');
const desiredPos=new THREE.Vector3(),desiredLook=new THREE.Vector3();

function tick(){
  requestAnimationFrame(tick);
  const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
  smx+=(S.mx-smx)*Math.min(1,dt*4);smy+=(S.my-smy)*Math.min(1,dt*4);

  /* N2 */
  const thrustPhase=S.launching&&S.trim!=='performance'&&S.tl<5&&S.n2>0;
  if(thrustPhase)S.n2=Math.max(0,S.n2-20*dt);
  const hovering=S.rocket&&S.n2>0;
  if(hovering)S.n2=Math.max(0,S.n2-12*dt);
  if(S.refilling){S.n2=Math.min(100,S.n2+55*dt);if(S.n2>=100){S.refilling=false;toast('N₂ at 100%. Go for launch.');}}
  if(S.n2<=0&&!S.emptyToasted&&(S.launching||S.rocket)){S.emptyToasted=true;
    toast('N₂ empty — thrusters offline. Press N to refill.');}

  /* speed */
  S.prevV=S.v;
  if(S.launching){S.tl+=dt;
    const ts=S.trim==='performance'?2.2:1;
    let target=profile(S.tl/ts);
    if(S.trim!=='performance'&&S.tl>=5)target=Math.min(target,245+Math.max(0,S.tl-5)*10);
    S.v+=(target-S.v)*Math.min(1,dt*10);
    if(S.t60===null&&S.prevV<96.56&&S.v>=96.56){S.t60=S.tl;
      toast('0–60 mph · '+S.t60.toFixed(2)+' s (simulated)');}
  }else{S.v+=(0-S.v)*Math.min(1,dt*1.4);if(S.v<.5)S.v=0;}
  const vN=clamp(S.v/372,0,1);
  const g=(S.v-S.prevV)/3.6/Math.max(dt,.001)/9.81;gS+=(g-gS)*Math.min(1,dt*6);

  S.hover+=((hovering?1:0)-S.hover)*Math.min(1,dt*2);
  S.trackT+=((S.track?1:0)-S.trackT)*Math.min(1,dt*3);

  /* barrel roll */
  if(S.wantRoll&&S.hover>.7&&S.n2>=12&&S.rollT>=1){S.wantRoll=false;S.rollT=0;S.n2-=12;burst(.9,500,.14);}
  if(S.rollT<1)S.rollT=Math.min(1,S.rollT+dt/1.5);
  const rollAng=S.rollT<1?easeIO(S.rollT)*Math.PI*2:0;
  const hop=S.rollT<1?Math.sin(Math.PI*S.rollT)*.55:0;

  /* 360 spin */
  let spinAng=0;
  if(S.spinT<1){S.spinT=Math.min(1,S.spinT+dt/2.2);spinAng=easeIO(S.spinT)*Math.PI*2;if(S.spinT>=1)spinAng=0;}

  /* pose (studio = center stage) */
  const tp=studio.on?STUDIO_POSE:getPose(S.pose),k=Math.min(1,dt*(reduce?30:2.4));
  for(const key in tp)cur3[key]+=(tp[key]-cur3[key])*k;
  const bob=reduce?0:Math.sin(t*1.5)*.012*(1-S.hover);
  const hoverY=S.hover*(.95+(reduce?0:Math.sin(t*1.3)*.08));
  car.position.set(cur3.x,cur3.y+bob+hoverY+hop-S.trackT*.07,cur3.z);
  car.scale.setScalar(cur3.s);
  const tilt=studio.on?0:smx*.3;
  const lean=studio.on?0:smx*.1*S.trackT, wander=reduce?0:Math.sin(t*.9)*.03*S.hover;
  const squat=clamp(gS*.012,0,.05)+(reduce?0:Math.sin(t*.7)*.025*S.hover);
  car.rotation.set(rollAng+wander+lean, cur3.ry+tilt+spinAng, squat);

  /* STUDIO: exploded view */
  studio.explodeCur+=((studio.on?studio.explode:0)-studio.explodeCur)*Math.min(1,dt*5.5);
  const ex=studio.explodeCur;
  gGlass.position.y=ex*1.15;
  gInterior.position.y=ex*.5;
  gBody.position.y=ex*.12;
  gFan.position.y=-ex*.55;
  wheels.forEach(w=>{const b=w.userData.base;
    w.position.set(b.x,b.y-ex*.28,b.z+w.userData.side*ex*.55);});
  nozzles.forEach(n=>{n.g.position.copy(n.base).addScaledVector(n.dir,ex*.7);
    n.g.position.y=n.base.y+ex*.08;});
  if(selHelper)selHelper.update();

  /* ground contact */
  blob.position.y=-car.position.y+.045;pad.position.y=-car.position.y+.05;
  blob.material.opacity=.75*(1-S.hover*.55);
  pad.material.opacity=.22+S.trackT*.3+S.hover*.15+(thrustPhase?.2:0);
  under.intensity=1+S.trackT*1.5+S.hover*1.2+(thrustPhase?1.5:0);
  fanRing.material.opacity=S.trackT*.7;fanDisc.material.opacity=S.trackT*.3;
  fanRing.rotation.z+=dt*(2+S.trackT*18);

  /* wheels */
  const rate=Math.min(40,S.v/3.6/.34);
  wheels.forEach(w=>{w.rotation.z-=rate*dt*w.userData.side;
    w.userData.blur.material.opacity=clamp((rate-8)/40,0,.45);});

  /* plumes */
  plumes.forEach(pl=>{
    const rearOn=pl.rear&&(thrustPhase||hovering);
    const sideOn=!pl.rear&&hovering;
    const on=rearOn||sideOn;
    const target=pl.rear?(hovering?-Math.PI/4:-Math.PI/2):pl.baseZ;
    pl.g.rotation.z+=(target-pl.g.rotation.z)*Math.min(1,dt*4);
    const flick=on?(.35+Math.random()*.3)*(S.rollT<1?1.4:1):0;
    pl.p.material.opacity+=(flick-pl.p.material.opacity)*Math.min(1,dt*12);
    pl.p.scale.y=on?(.7+Math.random()*.6):1;
    const sx=on?(.85+Math.random()*.3):1;pl.p.scale.x=sx;pl.p.scale.z=sx;});
  tailMat.emissiveIntensity=2.6+(S.launching?0:2)*(vN>.02?1:0);

  /* world motion */
  const dx=S.v/3.6*dt*1.15;
  dashes.forEach(d=>{d.position.x-=dx;if(d.position.x<-71.5)d.position.x+=143;});
  posts.forEach(p=>{p.position.x-=dx;if(p.position.x<-72)p.position.x+=144;});
  city.forEach(b=>{b.position.x-=dx*.28;if(b.position.x<-62)b.position.x+=124;});
  streakMat.opacity=.05+vN*.5;
  for(let i=0;i<N;i++){const m=meta[i];m.x-=dx*1.6+dt*.5;if(m.x<-24)m.x=24;
    const len=m.l*(1+vN*9),j=i*6;
    sp[j]=m.x;sp[j+1]=m.y;sp[j+2]=m.z;sp[j+3]=m.x+len;sp[j+4]=m.y;sp[j+5]=m.z;}
  sg.attributes.position.needsUpdate=true;
  if(!reduce)scene.userData.stars.rotation.y+=dt*.004;

  /* STUDIO: airflow particles */
  airflowGroup.visible=studio.on&&studio.airflow;
  if(airflowGroup.visible){
    for(let i=0;i<FLOWN;i++){
      const curve=flowCurves[i%flowCurves.length];
      const ft=((i/FLOWN)+t*(.22+vN*.5+S.hover*.15))%1;
      curve.getPointAt(ft,_pt);curve.getTangentAt(ft,_tan);
      flowDummy.position.copy(_pt);
      flowDummy.quaternion.setFromUnitVectors(_xAxis,_tan);
      flowDummy.updateMatrix();
      flowParticles.setMatrixAt(i,flowDummy.matrix);}
    flowParticles.instanceMatrix.needsUpdate=true;
  }

  /* camera */
  const shake=reduce?0:vN*.03;
  if(studio.on&&controls){
    if(studio.camT){
      const kc=1-Math.exp(-5*dt);
      cam.position.lerp(studio.camPos,kc);
      controls.target.lerp(studio.camTarget,kc);
      if(cam.position.distanceTo(studio.camPos)<.05)studio.camT=false;
    }else{
      controls.target.y+=((.65+S.hover*.45)-controls.target.y)*Math.min(1,dt*2);
    }
    controls.autoRotate=studio.orbit&&!studio.camT;
    controls.update();
    lookCur.copy(controls.target);
  }else{
    desiredPos.set(smx*.45+(Math.random()-.5)*shake, cur3.cy-smy*.25+(Math.random()-.5)*shake, 8-vN*1.1);
    desiredLook.set(cur3.x*.3,cur3.ly,0);
    if(camReturn>0){
      const kr=1-Math.exp(-4*dt);
      cam.position.lerp(desiredPos,kr);lookCur.lerp(desiredLook,kr);
      camReturn=Math.max(0,camReturn-dt/1.1);
    }else{cam.position.copy(desiredPos);lookCur.copy(desiredLook);}
    cam.lookAt(lookCur);
  }
  cam.fov=45+vN*13+S.hover*3;cam.updateProjectionMatrix();

  /* HUD */
  hudAcc+=dt;
  if(hudAcc>.08){hudAcc=0;
    const mode=S.rollT<1?'BARREL ROLL':S.hover>.3?'ROCKET · HOVER':thrustPhase?'THRUST':
      (S.launching&&S.v>1)?'ELECTRIC':S.v>1?'REGEN':S.trackT>.5?'TRACK · 2G':'PARK';
    hudMode.textContent=mode;
    hudKmh.textContent=Math.round(S.v);
    hudMph.textContent=Math.round(S.v*.6214)+' mph · '+Math.max(0,gS).toFixed(1)+' g';
    const n2c=S.n2<10?'#ff4d4d':S.n2<30?'#ffb04d':'var(--accent)';
    hudN2.style.width=S.n2+'%';hudN2.style.background=n2c;hudN2pct.textContent=Math.round(S.n2);
    hudT60.textContent='0–60 · '+(S.t60!==null?S.t60.toFixed(2)+' s':'—');
    gaugeFill.style.width=S.n2+'%';gaugeFill.style.background=n2c;gaugePct.textContent=Math.round(S.n2)+'%';
    stripFill.style.width=clamp(S.v/97*100,0,100)+'%';
    stripT60.textContent=S.t60!==null?S.t60.toFixed(2)+' S':(S.launching?'RUNNING…':'ARMED');}

  if(AC&&S.sound){
    whine.frequency.value=70+vN*520;
    whineGain.gain.value=vN*.09;
    windGain.gain.value=vN*.06+(thrustPhase?.1:0)+S.hover*.07;}

  renderer.render(scene,cam);
}
setTrim('thrust',true);syncButtons();
tick();
})();