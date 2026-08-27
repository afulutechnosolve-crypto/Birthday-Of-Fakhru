/* ============================================================
   CHAPTER 31 — engine
   Vanilla JS. No build step. Designed for GitHub Pages.
   ============================================================ */

(() => {
"use strict";

/* ---------------------------------------------------------
   0. DATA — exactly what was provided. Nothing invented.
--------------------------------------------------------- */
const FAMILY = {
  center: { name:"FAKHRUDHEEN NAVAS MP", role:"" },
  parents: [
    { name:"ABDUL KHADHER MP", role:"Father" },
    { name:"NAFEESA KUTTY",    role:"Mother" }
  ],
  wife: { name:"FAIQA", role:"Wife" },
  brothers: [
    { name:"MUHAMMED AFLAH MP", role:"Brother", tag:"ME" },
    { name:"MUHAMMAD NABEEL MP", role:"Brother" }
  ],
  sister: { name:"SWALIHA MP", role:"Sister" },
  sisterHusband: { name:"AHAMMED KUTTY TM", role:"Husband" },
  sisterKids: [
    { name:"ZAHIYYA YASAMEEN TM", role:"" },
    { name:"WAHEEJA TM", role:"" },
    { name:"NAJDA FATHIMA TM", role:"" }
  ]
};

const PHOTO_COUNT = 31;

/* Entrance animation classes, hand-ordered so nothing repeats back-to-back */
const ENTRANCES = [
  "en-zoom","en-flyin","en-slide-l","en-blur","en-flip","en-dark","en-slide-r",
  "en-tilt","en-unfold","en-scan","en-zoom","en-flyin","en-dark","en-slide-l",
  "en-blur","en-tilt","en-flip","en-scan","en-slide-r","en-unfold","en-zoom",
  "en-dark","en-flyin","en-slide-l","en-blur","en-scan","en-flip","en-tilt",
  "en-slide-r","en-unfold","en-zoom"
];

/* ---------------------------------------------------------
   1. UTIL
--------------------------------------------------------- */
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a + (b-a)*t;

function pad2(n){ return n < 10 ? "0"+n : ""+n; }

/* ---------------------------------------------------------
   2. AUDIO — generated ambient + fx, no external files.
      Respects autoplay rules: context only starts after
      the first user gesture (the START button).
--------------------------------------------------------- */
const Sound = (() => {
  let ctx = null, master = null, ambientGain = null, ambientNodes = [];
  let muted = false, started = false;

  function init(){
    if (started) return;
    started = true;
    try{
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(ctx.destination);
      startAmbient();
    }catch(e){ /* audio unavailable — fail silently */ }
  }

  function startAmbient(){
    if (!ctx) return;
    const freqs = [55, 110, 164.81];
    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(master);
    freqs.forEach((f,i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.18;
      osc.connect(g); g.connect(ambientGain);
      osc.start();
      ambientNodes.push(osc);
    });
    const now = ctx.currentTime;
    ambientGain.gain.linearRampToValueAtTime(0.12, now + 3);
  }

  function blip({freq=440, dur=0.35, type="sine", vol=0.3, glide=0}={}){
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(1,freq+glide), t0+dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0+0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0+dur+0.05);
  }

  const fx = {
    activate:   () => blip({freq:180, dur:0.5, type:"sine", vol:0.25, glide:120}),
    whoosh:     () => blip({freq:90,  dur:0.9, type:"sawtooth", vol:0.12, glide:-40}),
    impact:     () => blip({freq:60,  dur:0.8, type:"triangle", vol:0.4, glide:-20}),
    soft:       () => blip({freq:520, dur:0.6, type:"sine", vol:0.12}),
    mystery:    () => blip({freq:300, dur:0.7, type:"sine", vol:0.15, glide:-80}),
    tick:       () => blip({freq:700, dur:0.15,type:"sine", vol:0.2}),
    burst:      () => blip({freq:80,  dur:1.1, type:"sawtooth", vol:0.45, glide:600}),
    photo:      () => blip({freq:900, dur:0.18,type:"sine", vol:0.08}),
    enter:      () => {
      blip({freq:120, dur:0.85, type:"sine", vol:0.16, glide:360});
      setTimeout(() => blip({freq:480, dur:0.7, type:"triangle", vol:0.1, glide:180}), 180);
    },
    climax:     () => blip({freq:220, dur:1.6, type:"sine", vol:0.3, glide:220}),
  };

  function toggleMute(){
    muted = !muted;
    if (master) master.gain.linearRampToValueAtTime(muted?0:0.55, ctx.currentTime+0.3);
    return muted;
  }

  return { init, fx, toggleMute, isMuted:() => muted };
})();

/* ---------------------------------------------------------
   3. AMBIENT BACKGROUND — soft drifting particles/stars
      behind every scene (id="bg-canvas")
--------------------------------------------------------- */
const BgField = (() => {
  const canvas = $("#bg-canvas");
  const ctx = canvas.getContext("2d");
  let w,h,dpr, particles = [];

  function resize(){
    dpr = Math.min(window.devicePixelRatio||1, 2);
    w = canvas.width = innerWidth*dpr;
    h = canvas.height = innerHeight*dpr;
    canvas.style.width = innerWidth+"px";
    canvas.style.height = innerHeight+"px";
  }

  function seed(){
    const count = Math.round((innerWidth*innerHeight)/9000);
    particles = Array.from({length:count}, () => ({
      x: Math.random()*w, y: Math.random()*h,
      r: (Math.random()*1.4+0.3)*dpr,
      vy: (Math.random()*0.08+0.02)*dpr,
      a: Math.random()*0.6+0.15,
      tw: Math.random()*Math.PI*2
    }));
  }

  let mx = 0.5, my = 0.5;
  window.addEventListener("pointermove", e => {
    mx = e.clientX/innerWidth; my = e.clientY/innerHeight;
  }, {passive:true});

  function loop(){
    ctx.clearRect(0,0,w,h);
    const dx = (mx-0.5)*10*dpr, dy = (my-0.5)*10*dpr;
    for (const p of particles){
      p.tw += 0.02;
      p.y -= p.vy;
      if (p.y < -10) p.y = h+10;
      const alpha = p.a * (0.6+0.4*Math.sin(p.tw));
      ctx.beginPath();
      ctx.fillStyle = `rgba(232,201,135,${alpha})`;
      ctx.arc(p.x+dx, p.y+dy, p.r, 0, Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(loop);
  }

  function init(){
    resize(); seed();
    window.addEventListener("resize", () => { resize(); seed(); });
    loop();
  }

  return { init };
})();

/* ---------------------------------------------------------
   4. BOOT SEQUENCE
--------------------------------------------------------- */
function runBoot(){
  const linesEl = $("#boot-lines");
  const cta = $("#boot-cta");
  const messages = ["INITIALIZING...", "PREPARING SOMETHING SPECIAL..."];
  let i = 0;

  function typeLine(text, done){
    linesEl.innerHTML = "";
    let chars = 0;
    const span = document.createElement("span");
    linesEl.appendChild(span);
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    linesEl.appendChild(cursor);
    const iv = setInterval(() => {
      chars++;
      span.textContent = text.slice(0,chars);
      if (chars >= text.length){
        clearInterval(iv);
        setTimeout(done, 650);
      }
    }, 38);
  }

  function next(){
    if (i < messages.length){
      typeLine(messages[i], () => { i++; next(); });
    } else {
      linesEl.innerHTML = "";
      cta.hidden = false;
    }
  }
  setTimeout(next, 900);
}

/* ---------------------------------------------------------
   5. SCENE ORDER + REVEAL / BACK NAVIGATION
--------------------------------------------------------- */
const SCENE_ORDER = ["boot","warp","name","family","gift","countdown","memintro","photos","collage","final"];
let visitedStack = [];
const backBtn = $("#back-btn");
const soundBtn = $("#sound-btn");

function sceneEl(id){ return document.getElementById("scene-"+id); }

function revealAllScenes(){
  SCENE_ORDER.forEach(id => { const el = sceneEl(id); if (el) el.hidden = false; });
}

function scrollToScene(id, behavior="smooth"){
  const el = sceneEl(id);
  if (!el) return;
  activateScene(id);
  el.scrollIntoView({ behavior, block:"start" });
}

$$('[data-next-scene]').forEach(button => {
  button.addEventListener("click", () => scrollToScene(button.dataset.nextScene));
});

$("#final-restart").addEventListener("click", () => window.location.reload());

function goBack(){
  if (visitedStack.length > 1){
    visitedStack.pop();
    const prev = visitedStack[visitedStack.length-1];
    scrollToScene(prev);
  }
}
backBtn.addEventListener("click", goBack);

soundBtn.addEventListener("click", () => {
  const muted = Sound.toggleMute();
  soundBtn.classList.toggle("muted", muted);
});

let giftOpened = false;
$("#gift-box").addEventListener("click", () => {
  if (giftOpened) return;
  giftOpened = true;
  $("#gift-box").classList.add("opening");
  Sound.fx.burst();
  setTimeout(() => {
    $("#gift-box").hidden = true;
    $("#gift-next").hidden = false;
  }, 700);
});

/* ---------------------------------------------------------
   6. PER-SCENE ACTIVATION (fires once, first time visible)
--------------------------------------------------------- */
const activated = new Set();

function activateScene(id){
  if (activated.has(id)) return;
  activated.add(id);
  visitedStack.push(id);
  const scene = sceneEl(id);
  if (scene){
    scene.classList.remove("world-enter");
    requestAnimationFrame(() => scene.classList.add("world-enter"));
  }
  if (id !== "boot"){
    backBtn.hidden = false;
    soundBtn.hidden = false;
    Sound.fx.enter();
  }

  switch(id){
    case "warp": runWarp(); break;
    case "name": runName(); break;
    case "family": Constellation.activate(); break;
    case "gift": Sound.fx.mystery(); break;
    case "countdown": runCountdown(); break;
    case "memintro": runMemIntro(); break;
    case "photos": PhotoJourney.activate(); break;
    case "collage": Collage.activate(); break;
    case "final": runFinal(); break;
  }
}

function runWarp(){
  Sound.fx.whoosh();
  const num = $("#chapter-number"), label = $("#chapter-label"), begins = $("#chapter-begins");
  num.classList.add("show");
  setTimeout(() => { Sound.fx.impact(); label.classList.add("show"); }, 900);
  setTimeout(() => begins.classList.add("show"), 1700);
}

function runName(){
  const lines = $$(".name-line");
  const reveal = $(".name-reveal");
  let delay = 300;
  lines.forEach((l,idx) => {
    setTimeout(() => l.classList.add("show"), delay);
    delay += 1900;
  });
  setTimeout(() => { reveal.classList.add("show"); Sound.fx.soft(); }, delay + 200);
}

function runCountdown(){
  const el = $("#countdown-num");
  const seq = ["3","2","1"];
  let i = 0;
  function tick(){
    el.textContent = seq[i];
    el.className = "countdown-num tick";
    Sound.fx.tick();
    i++;
    if (i < seq.length){
      setTimeout(tick, 1000);
    } else {
      setTimeout(() => {
        el.textContent = "OPEN";
        el.className = "countdown-num burst";
        Sound.fx.burst();
        setTimeout(() => $("#countdown-next").hidden = false, 750);
      }, 1000);
    }
  }
  setTimeout(tick, 400);
}

function runMemIntro(){
  const lines = $$(".mem-intro-line");
  let delay = 200;
  lines.forEach(l => {
    setTimeout(() => l.classList.add("show"), delay);
    delay += 1900;
  });
}

function runFinal(){
  Sound.fx.climax();
  HeartField.activate();
  const l1 = $("#final-line-1"), l2 = $("#final-line-2"), l3 = $("#final-with-love");
  setTimeout(() => l1.classList.add("show"), 600);
  setTimeout(() => l2.classList.add("show"), 2200);
  setTimeout(() => l3.classList.add("show"), 3600);
}

/* ---------------------------------------------------------
   7. START BUTTON
--------------------------------------------------------- */
$("#start-btn").addEventListener("click", (e) => {
  Sound.init();
  Sound.fx.activate();
  const btn = e.currentTarget;
  btn.classList.add("launching");
  document.body.style.overflow = "";
  setTimeout(() => {
    revealAllScenes();
    document.documentElement.style.overflow = "auto";
    activateScene("boot");
    scrollToScene("warp", "smooth");
  }, 750);
});

/* lock scroll until launch */
document.documentElement.style.overflow = "hidden";

/* ---------------------------------------------------------
   8. INTERSECTION OBSERVER — trigger scene activation
--------------------------------------------------------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting){
      const id = entry.target.dataset.scene;
      activateScene(id);
    }
  });
}, { threshold: 0.35 });

/* Content-heavy scenes activate as soon as their first edge enters view. */
const ioEarly = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) activateScene(entry.target.dataset.scene);
  });
}, { threshold: 0.01 });

const TALL_SCENES = new Set(["family","photos"]);
SCENE_ORDER.forEach(id => {
  const el = sceneEl(id);
  if (!el) return;
  (TALL_SCENES.has(id) ? ioEarly : io).observe(el);
});

/* ---------------------------------------------------------
   9. FAMILY LIST
--------------------------------------------------------- */
const Constellation = (() => {
  const list = $("#family-list");
  const MEMBERS = [
    { name:FAMILY.parents[0].name, role:FAMILY.parents[0].role },
    { name:FAMILY.parents[1].name, role:FAMILY.parents[1].role },
    { name:FAMILY.wife.name, role:FAMILY.wife.role },
    { name:FAMILY.brothers[0].name, role:"Brother · ME" },
    { name:FAMILY.brothers[1].name, role:FAMILY.brothers[1].role },
    { name:FAMILY.sister.name, role:FAMILY.sister.role },
    { name:FAMILY.sisterHusband.name, role:FAMILY.sisterHusband.role },
    ...FAMILY.sisterKids.map(k => ({name:k.name, role:"Family"}))
  ];
  let active = false;
  function build(){
    list.innerHTML = "";
    MEMBERS.forEach((member, index) => {
      const row = document.createElement("div"); row.className = "family-member revealed";
      row.innerHTML = `<span class="family-index">${pad2(index+1)}</span><span class="family-member-copy"><strong>${member.name}</strong><small>${member.role}</small></span><span class="family-dot"></span>`;
      list.appendChild(row);
    });
  }
  function activate(){
    if (active) return;
    active = true;
    build();
  }
  return { activate };
})();

/* ---------------------------------------------------------
   10. PHOTO JOURNEY — visitor-controlled memories
--------------------------------------------------------- */
const PhotoJourney = (() => {
  const stage = $("#photo-stage");
  const counter = $("#mem-current");
  const prevButton = $("#mem-prev");
  const nextButton = $("#mem-next");
  const navToggle = $("#mem-nav-toggle");
  const navPanel = $("#mem-nav-panel");
  const navGrid = $("#mem-nav-grid");

  let imgA, imgB, activeIsA = true;
  let currentIndex = 1;
  let active = false;
  const cache = new Map();

  function srcFor(i){ return `images/${i}.webp`; }
  function fallbackFor(i){ return `images/${i}.jpg`; }

  function preload(i){
    if (i < 1 || i > PHOTO_COUNT || cache.has(i)) return;
    const im = new Image();
    im.onerror = function(){
      if (this.dataset.fallback !== "1"){
        this.dataset.fallback = "1";
        this.src = fallbackFor(i);
      }
    };
    im.src = srcFor(i);
    cache.set(i, im);
  }

  function buildStage(){
    imgA = document.createElement("img");
    imgB = document.createElement("img");
    [imgA, imgB].forEach(im => {
      im.className = "mem-photo";
      im.alt = "";
      im.loading = "eager";
      im.onerror = function(){ if (this.dataset.fallback !== "1"){ this.dataset.fallback="1"; this.src = this.src.replace(/\.webp$/, ".jpg"); } };
      stage.appendChild(im);
    });
  }

  function buildNav(){
    navGrid.innerHTML = "";
    for (let i=1;i<=PHOTO_COUNT;i++){
      const b = document.createElement("button");
      b.textContent = pad2(i);
      b.addEventListener("click", () => { showIndex(i); navPanel.hidden = true; });
      navGrid.appendChild(b);
    }
  }

  function showIndex(i){
    i = clamp(i, 1, PHOTO_COUNT);
    if (i === currentIndex && imgA?.src) return;
    currentIndex = i;
    counter.textContent = pad2(i);
    const nextImg = activeIsA ? imgB : imgA;
    const prevImg = activeIsA ? imgA : imgB;
    nextImg.src = srcFor(i);
    nextImg.className = "mem-photo active " + ENTRANCES[(i-1) % ENTRANCES.length];
    prevImg.className = "mem-photo"; // fully reset so its finished keyframe fill doesn't linger
    activeIsA = !activeIsA;
    Sound.fx.photo();
    preload(i+1); preload(i+2); preload(i-1);
    $$(".mem-nav-grid button", navPanel).forEach((b,bi) => b.classList.toggle("current", bi === i-1));
    prevButton.disabled = i === 1;
    nextButton.disabled = i === PHOTO_COUNT;
  }

  function activate(){
    if (active) return;
    active = true;
    buildStage();
    buildNav();
    for (let i=1; i<=PHOTO_COUNT; i++) preload(i);
    showIndex(1);
  }

  prevButton.addEventListener("click", () => showIndex(currentIndex - 1));
  nextButton.addEventListener("click", () => showIndex(currentIndex + 1));
  navToggle.addEventListener("click", () => { navPanel.hidden = !navPanel.hidden; });

  return { activate };
})();

/* ---------------------------------------------------------
   11. COLLAGE — all 31 memories return, then arrange into "31"
--------------------------------------------------------- */
const Collage = (() => {
  const canvas = $("#collage-canvas");
  const ctx = canvas.getContext("2d");
  let w,h,dpr, points=[], imgs=[], started=false, t=0, raf;

  function resize(){
    dpr = Math.min(window.devicePixelRatio||1, 2);
    canvas.width = innerWidth*dpr; canvas.height = innerHeight*dpr;
    w = canvas.width; h = canvas.height;
  }

  // sample target points for the glyph "31" from an offscreen text render
  function sampleTargets(count){
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const octx = off.getContext("2d");
    octx.fillStyle = "#fff";
    octx.font = `700 ${Math.min(w,h)*0.5}px Cinzel, serif`;
    octx.textAlign = "center"; octx.textBaseline = "middle";
    octx.fillText("31", w/2, h/2);
    const data = octx.getImageData(0,0,w,h).data;
    const candidates = [];
    const step = Math.max(2, Math.floor(Math.min(w,h)/220));
    for (let y=0;y<h;y+=step){
      for (let x=0;x<w;x+=step){
        const a = data[(y*w+x)*4+3];
        if (a > 128) candidates.push({x,y});
      }
    }
    // shuffle + pick `count`
    for (let i=candidates.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [candidates[i],candidates[j]] = [candidates[j],candidates[i]];
    }
    return candidates.slice(0, count);
  }

  function init(){
    resize();
    const targets = sampleTargets(PHOTO_COUNT);
    points = Array.from({length:PHOTO_COUNT}, (_,i) => {
      const angle = Math.random()*Math.PI*2;
      const dist = Math.max(w,h)*0.8;
      const target = targets[i] || {x:w/2,y:h/2};
      return {
        x: w/2+Math.cos(angle)*dist, y: h/2+Math.sin(angle)*dist,
        tx: target.x, ty: target.y,
        img: cachedImg(i+1),
        size: Math.min(w,h)*0.09
      };
    });
  }

  function cachedImg(i){
    const im = new Image();
    im.src = `images/${i}.webp`;
    im.onerror = function(){ this.src = `images/${i}.jpg`; };
    return im;
  }

  function draw(){
    ctx.clearRect(0,0,w,h);
    t += 0.015;
    const p = clamp(t, 0, 1);
    const ease = 1 - Math.pow(1-p, 3);
    points.forEach((pt,i) => {
      const x = lerp(pt.x, pt.tx, ease);
      const y = lerp(pt.y, pt.ty, ease);
      const s = pt.size * (0.5+0.5*ease);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(x,y);
      ctx.rotate((1-ease)*0.6*(i%2?1:-1));
      if (pt.img.complete && pt.img.naturalWidth){
        ctx.drawImage(pt.img, -s/2, -s/2, s, s);
      } else {
        ctx.fillStyle = "rgba(201,162,75,0.5)";
        ctx.fillRect(-s/2,-s/2,s,s);
      }
      ctx.restore();
    });
    if (p < 1) raf = requestAnimationFrame(draw);
  }

  function activate(){
    if (started) return;
    started = true;
    init();
    draw();
    window.addEventListener("resize", () => { resize(); });
  }

  return { activate };
})();

/* ---------------------------------------------------------
   12. FINAL HEART FIELD
--------------------------------------------------------- */
const HeartField = (() => {
  const canvas = $("#heart-canvas");
  const ctx = canvas.getContext("2d");
  let w,h,dpr, pts=[], t=0, started=false;

  function resize(){
    dpr = Math.min(window.devicePixelRatio||1, 2);
    canvas.width = innerWidth*dpr; canvas.height = innerHeight*dpr;
    w = canvas.width; h = canvas.height;
  }

  function heartPoint(a, scale){
    const x = 16*Math.pow(Math.sin(a),3);
    const y = -(13*Math.cos(a) - 5*Math.cos(2*a) - 2*Math.cos(3*a) - Math.cos(4*a));
    return { x: w/2 + x*scale, y: h/2 + y*scale };
  }

  function init(){
    resize();
    const n = 260;
    pts = Array.from({length:n}, (_,i) => {
      const a = (i/n)*Math.PI*2;
      const jitterScale = (Math.min(w,h)/38) * (0.85+Math.random()*0.3);
      const p = heartPoint(a, Math.min(w,h)/38);
      return { ...p, delay: Math.random()*1.6, r:(Math.random()*1.6+1)*dpr };
    });
  }

  function draw(){
    ctx.clearRect(0,0,w,h);
    t += 0.016;
    pts.forEach(p => {
      const local = clamp((t-p.delay)/1.2, 0, 1);
      if (local<=0) return;
      const alpha = local * (0.6+0.4*Math.sin(t*2+p.x*0.01));
      ctx.beginPath();
      ctx.fillStyle = `rgba(140,44,61,${alpha*0.8})`;
      ctx.arc(p.x, p.y, p.r*(0.6+local*0.4), 0, Math.PI*2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  function activate(){
    if (started) return;
    started = true;
    init();
    draw();
    window.addEventListener("resize", init);
  }

  return { activate };
})();

/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */
BgField.init();
runBoot();

/* expose small pieces other IIFEs below need */
window.__ch31 = { $, $$, clamp, lerp, pad2, FAMILY, PHOTO_COUNT, ENTRANCES, Sound, sceneEl };

})();
