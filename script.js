(() => {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1024px)');
  const ASSETS = Object.freeze([
    'photos/photo-01.jpeg','photos/photo-02.jpeg','photos/photo-03.jpeg',
    'photos/photo-04.jpeg','photos/photo-05.jpeg','photos/photo-06.jpeg',
    'photos/photo-07.jpeg','photos/photo-08.jpeg','photos/photo-09.jpeg',
    'photos/photo-10.jpeg','photos/photo-11.jpeg','photos/photo-12.jpeg',
    'photos/photo-13.jpeg','photos/photo-14.jpeg','photos/photo-15.jpeg',
    'photos/photo-16.jpeg','photos/photo-17.jpeg','photos/photo-18.jpeg',
    'photos/photo-19.jpeg'
  ]);
  const scenes = [...document.querySelectorAll('main > .scene')];
  const sequences = [...document.querySelectorAll('.sequence')];
  const timers = new Set();
  let replaying = false;
  let scrollPending = false;
  let framePending = false;
  let geometry = [];
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id); return id;
  };
  const cancel = id => { clearTimeout(id); timers.delete(id); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
  root.classList.add('enhanced');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo({ top: 0, behavior: 'instant' });
  const reveals = [...document.querySelectorAll('.reveal')];
  const revealObserver = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting && !replaying) {
      e.target.classList.add('seen'); revealObserver.unobserve(e.target);
    }
  }, { threshold: .2 });
  reveals.forEach(el => revealObserver.observe(el));
  const timedStates = new Map();
  const showAll = el => el.querySelectorAll('[data-at]').forEach(x => x.classList.add('shown'));
  const timedObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const el = e.target;
      const state = timedStates.get(el);
      if (replaying) return;
      if (e.isIntersecting) {
        if (state.played || reduced.matches) { showAll(el); return; }
        state.played = true;
        el.querySelectorAll('[data-at]').forEach(child => {
          const delay = Number(child.dataset.at);
          if (!delay) child.classList.add('shown');
          else state.ids.push(later(() => child.classList.add('shown'), delay));
        });
      } else if (state.played) {
        state.ids.forEach(cancel); state.ids = []; showAll(el);
      }
    });
  }, { threshold: .2 });
  document.querySelectorAll('.timed').forEach(el => {
    timedStates.set(el, { played: false, ids: [] }); timedObserver.observe(el);
  });
  const progress = document.querySelector('.chapter-progress');
  function configure() {
    root.classList.toggle('cinematic', desktop.matches && !reduced.matches);
    if (reduced.matches) {
      reveals.forEach(x => x.classList.add('seen'));
      timedStates.forEach((s, el) => { s.ids.forEach(cancel); s.ids = []; showAll(el); });
      clearMemory();
    }
    measure(); resizeStars(); update();
  }
  function measure() {
    geometry = sequences.map(el => ({ el, top: el.getBoundingClientRect().top + scrollY,
      height: el.offsetHeight, view: el.querySelector('.sequence-stage').offsetHeight,
      steps: [...el.querySelectorAll('.step')] }));
    const frame = document.querySelector('.mirror-picture');
    const img = frame.querySelector('img');
    const w = frame.clientWidth, h = frame.clientHeight;
    const ratio = img.naturalWidth / img.naturalHeight || 4 / 3;
    frame.style.setProperty('--frame-w', Math.min(w, h * ratio) + 'px');
    frame.style.setProperty('--frame-h', Math.min(h, w / ratio) + 'px');
  }
  const palettes = [[227,236,219],[220,232,220],[240,232,207],[239,221,225]];
  function update() {
    scrollPending = false;
    if (replaying && scrollY < 2) finishReplay();
    let quiet = false;
    if (root.classList.contains('cinematic')) geometry.forEach(g => {
      const p = clamp((scrollY - g.top) / Math.max(1, g.height - g.view));
      const boundaries = g.el.id === 'scene-03' ? [0,.24,.49,.73,1] : [0,.25,.5,.75,1];
      g.steps.forEach((step,i) => {
        const fade = .025;
        const incoming = i ? clamp((p - boundaries[i] + fade) / (2 * fade)) : 1;
        const outgoing = i < 3 ? 1 - clamp((p - boundaries[i+1] + fade) / (2 * fade)) : 1;
        const opacity = Math.min(incoming, outgoing);
        step.style.opacity = String(opacity);
        step.classList.toggle('active', opacity >= .5);
        step.inert = opacity < .5;
        step.setAttribute('aria-hidden', opacity < .5 ? 'true' : 'false');
      });
      if (g.el.id === 'scene-04') {
        const t = p * 3, i = Math.min(2, Math.floor(t)), f = t - i;
        const color = palettes[i].map((c,j) => Math.round(c+(palettes[i+1][j]-c)*f));
        g.el.style.setProperty('--color-bg', `rgb(${color.join(',')})`);
        g.el.querySelector('.color-note').style.opacity = String(clamp((p - .725) / .05));
      } else if (p >= .705 && scrollY < g.top + g.height) quiet = true;
    });
    else sequences.forEach(el => {
      el.querySelectorAll('.step').forEach(step => {
        step.style.removeProperty('opacity'); step.inert = false; step.removeAttribute('aria-hidden');
      });
      const note = el.querySelector('.color-note');
      if (note) note.style.removeProperty('opacity');
    });
    let active = -1;
    scenes.forEach((el, i) => { const r=el.getBoundingClientRect(); if (r.top <= innerHeight*.5 && r.bottom > innerHeight*.5) active=i; });
    document.querySelector('.ending').classList.toggle('in-view', active === 10);
    if (active !== 10 && !eggCard.hidden) closeEgg(false);
    progress.style.display = desktop.matches && active >= 1 && active <= 7 && !quiet ? 'block' : 'none';
    progress.style.setProperty('--position', `${Math.max(0, active-1)/6*76}px`);
  }
  function queueUpdate() { if (!scrollPending) { scrollPending = true; requestAnimationFrame(update); } }
  addEventListener('scroll', queueUpdate, { passive: true });
  function queueMeasure() {
    if (!framePending) { framePending=true; requestAnimationFrame(() => { framePending=false; measure(); resizeStars(); update(); }); }
  }
  addEventListener('resize', queueMeasure, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(queueMeasure).observe(document.body);
  document.querySelector('.mirror-picture img').addEventListener('load', queueMeasure);
  // Decode neighboring scenes without waiting for all photographs before opening.
  const prepareObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('img').forEach(img => {
        img.loading='eager'; if (img.decode) img.decode().catch(() => {});
      });
      prepareObserver.unobserve(e.target);
    });
  }, { rootMargin: '100% 0px' });
  scenes.forEach(s => prepareObserver.observe(s));
  const stars = [...document.querySelectorAll('.stars')].map((canvas, sceneIndex) => {
    const ctx = canvas.getContext('2d');
    let seed = 314159 + sceneIndex * 113;
    const random = () => { seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
    return { canvas,ctx,visible:false,w:0,h:0,points:Array.from({length:Number(canvas.dataset.count)}, () => ({
      x:random(),y:random(),r:.5+random(),a:.15+random()*.35,phase:random()*Math.PI*2,period:4+random()*5
    })) };
  });
  let starFrame = 0;
  function resizeStars() {
    const dpr=Math.min(devicePixelRatio || 1,2);
    stars.forEach(s => {
      s.w=s.canvas.clientWidth; s.h=s.canvas.clientHeight;
      s.canvas.width=Math.round(s.w*dpr); s.canvas.height=Math.round(s.h*dpr);
      if (s.ctx) s.ctx.setTransform(dpr,0,0,dpr,0,0);
    }); drawStars(performance.now());
  }
  function drawStars(time) {
    stars.forEach(s => {
      if (!s.ctx || (!s.visible && !reduced.matches)) return;
      s.ctx.clearRect(0,0,s.w,s.h);
      s.points.forEach(p => {
        const breath=reduced.matches ? .75 : .7+.3*Math.sin(time*.001/p.period*Math.PI*2+p.phase);
        s.ctx.fillStyle=`rgba(238,243,250,${p.a*breath})`;
        s.ctx.beginPath(); s.ctx.arc(p.x*s.w,p.y*s.h,p.r,0,Math.PI*2); s.ctx.fill();
      });
    });
  }
  function starTick(t) {
    starFrame=0; drawStars(t);
    if (!document.hidden && !reduced.matches && stars.some(s=>s.visible)) starFrame=requestAnimationFrame(starTick);
  }
  function startStars() {
    if (document.hidden || reduced.matches) { drawStars(performance.now()); return; }
    if (!starFrame && stars.some(s=>s.visible)) starFrame=requestAnimationFrame(starTick);
  }
  const starObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { const s=stars.find(s=>s.canvas===e.target);s.visible=e.isIntersecting; }); startStars();
  }); stars.forEach(s=>starObserver.observe(s.canvas));
  const memoryScene=document.querySelector('.memory-scene');
  const memoryLayer=document.querySelector('.memory-layer');
  const finalPhoto=document.querySelector('.closing-photo');
  let memoryVisible=false, finalVisible=false, memoryTimer=0, memoryIndex=0, lastMemory=0, distance=0, previousPointer=null;
  function clearMemory() { if(memoryTimer) cancel(memoryTimer); memoryTimer=0; memoryLayer.replaceChildren(); previousPointer=null; distance=0; }
  function memoryAllowed() { return memoryVisible && !finalVisible && !document.hidden && !reduced.matches && !replaying; }
  function nextMemory() {
    if (!memoryAllowed()) return;
    const now=performance.now(); if(now-lastMemory<900) return;
    const max=desktop.matches?2:1;
    if(memoryLayer.childElementCount>=max) return;
    lastMemory=now;
    const img=document.createElement('img');img.src=ASSETS[memoryIndex++%19];img.alt='';img.className='memory-photo';
    const locations=[{left:'1%',top:'8%'},{right:'1%',top:'38%'},{left:'1%',bottom:'8%'},{right:'1%',bottom:'6%'},{left:'42%',top:'0%'}];
    Object.assign(img.style, locations[(memoryIndex-1)%locations.length]);
    // Every slot lies outside the central 20–80% text area.
    memoryLayer.append(img);img.addEventListener('animationend',()=>img.remove(),{once:true});
  }
  function scheduleMemory() {
    if (memoryTimer || !memoryAllowed()) return;
    memoryTimer=later(()=>{memoryTimer=0;nextMemory();scheduleMemory();},2400);
  }
  const memoryObserver=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.target===memoryScene)memoryVisible=e.isIntersecting;else finalVisible=e.isIntersecting;});
    if(memoryAllowed())scheduleMemory();else clearMemory();
  });memoryObserver.observe(memoryScene);memoryObserver.observe(finalPhoto);
  memoryScene.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'||!memoryAllowed())return;
    if(previousPointer)distance+=Math.hypot(e.clientX-previousPointer.x,e.clientY-previousPointer.y);
    previousPointer={x:e.clientX,y:e.clientY};
    if(distance>=100 && performance.now()-lastMemory>=900){nextMemory();distance=0;}
  },{passive:true});
  document.querySelectorAll('[data-play]').forEach(card=>{
    const play=()=>{if(reduced.matches||!card.classList.contains('seen'))return;const cls=card.dataset.play==='wobble'?'wobbling':'hopping';if(card.classList.contains(cls))return;card.classList.add(cls);card.addEventListener('animationend',()=>card.classList.remove(cls),{once:true});};
    card.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')play();});
    card.addEventListener('click',play);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();play();}});
  });
  const eggButton=document.querySelector('.egg-star');
  const eggCard=document.querySelector('.egg-card');
  const eggClose=document.querySelector('.egg-close');
  function closeEgg(focus=true){eggCard.hidden=true;eggButton.setAttribute('aria-expanded','false');if(focus)eggButton.focus({preventScroll:true});}
  eggButton.addEventListener('click',()=>{const opening=eggCard.hidden;eggCard.hidden=!opening;eggButton.setAttribute('aria-expanded',String(opening));if(opening)eggClose.focus({preventScroll:true});});
  eggClose.addEventListener('click',()=>closeEgg());
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!eggCard.hidden)closeEgg();});
  document.querySelector('.begin').addEventListener('click',e=>{
    e.preventDefault();const go=()=>document.querySelector('#scene-02').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});
    if(reduced.matches){go();return;}
    const star=document.querySelector('.departing-star');star.classList.remove('launch');void star.offsetWidth;star.classList.add('launch');later(go,700);
  });
  function finishReplay(){
    replaying=false;
    timedStates.forEach((state,el)=>{state.played=false;state.ids=[];el.querySelectorAll('[data-at]').forEach(c=>c.classList.remove('shown'));timedObserver.unobserve(el);timedObserver.observe(el);});
    reveals.forEach(el=>{el.classList.remove('seen');revealObserver.observe(el);});
    scheduleMemory();startStars();
  }
  document.querySelector('.replay').addEventListener('click',()=>{
    clearTimers();clearMemory();closeEgg(false);replaying=true;memoryIndex=0;lastMemory=0;
    document.querySelector('.departing-star').classList.remove('launch');
    document.querySelectorAll('.wobbling,.hopping').forEach(el=>el.classList.remove('wobbling','hopping'));
    window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'});
    const h=document.querySelector('.opening h1');h.setAttribute('tabindex','-1');h.focus({preventScroll:true});
    queueUpdate();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){if(starFrame)cancelAnimationFrame(starFrame);starFrame=0;clearMemory();}
    else {startStars();scheduleMemory();}
  });
  document.querySelectorAll('img').forEach(img=>{
    function failed(){
      if(img.classList.contains('night-backdrop')||!img.alt){img.hidden=true;return;}
      const msg=document.createElement('span');msg.className='image-error';msg.textContent='这张照片暂时没有加载出来';msg.setAttribute('role','img');msg.setAttribute('aria-label',img.alt+'：这张照片暂时没有加载出来');img.replaceWith(msg);
    }
    img.addEventListener('error',failed,{once:true});
    if(img.complete&&!img.naturalWidth)failed();
  });
  reduced.addEventListener('change',configure);desktop.addEventListener('change',configure);
  configure();
})();
