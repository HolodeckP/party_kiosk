'use strict';
// Scene manager, transitions, fog overlay, jump-scare scheduling and adaptive quality.

class Scene {
  constructor(show) { this.show = show; this.W = show.W; this.H = show.H; this.fog = 0.5; this.duration = null; }
  update(dt, t) {}
  draw(ctx, t) {}
}

class Fog {
  constructor(show) {
    this.show = show; this.blobs = [];
    const n = 26;
    for (let i = 0; i < n; i++) this.blobs.push(this.spawn(true));
  }
  spawn(anywhere) {
    const { W, H } = this.show;
    return { x: anywhere ? rand(-W * 0.2, W * 1.2) : (Math.random() < 0.5 ? -W * 0.25 : W * 1.25), y: rand(H * 0.3, H * 1.05), r: rand(W * 0.12, W * 0.3), vx: rand(8, 30) * (Math.random() < 0.5 ? -1 : 1), a: rand(0.15, 0.35), seed: rand(100) };
  }
  update(dt) {
    const { W } = this.show;
    for (const b of this.blobs) {
      b.x += b.vx * dt; b.y += noise(b.seed + this.show.time * 0.1) * 4 * dt;
      if ((b.vx > 0 && b.x > W * 1.3) || (b.vx < 0 && b.x < -W * 0.3)) Object.assign(b, this.spawn(false), { vx: b.vx });
    }
  }
  draw(ctx, strength) {
    for (const b of this.blobs) drawGlow(ctx, b.x, b.y, b.r, [150, 150, 175], b.a * strength, 0.1);
  }
}

class Show {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.scale = CONFIG.RENDER_SCALE;
    this.factories = {}; this.scareFactories = {};
    this.scene = null; this.sceneName = ''; this.history = [];
    this.sceneTime = 0; this.sceneDuration = 60;
    this.transition = { state: 'in', t: 1, style: 'fade' };
    this.scare = null; this.micro = null; this.queuedScene = null; this.time = 0; this.last = performance.now();
    this.forcedScene = null; this.scareHook = null;
    this.frames = 0; this.fpsWindow = 0; this.fps = 60;
    this.resize();
    this.fog = new Fog(this);
    this.nextScareAt = CONFIG.FIRST_SCARE_MINUTES * 60 + rand(0, 60);
    this.nextMicroAt = 20 + rand(0, 25);
    window.addEventListener('resize', () => { this.resize(); this.fog = new Fog(this); if (this.sceneName) this.setScene(this.sceneName); });
  }
  register(name, factory) { this.factories[name] = factory; }
  registerScare(name, factory) { this.scareFactories[name] = factory; }
  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const rot = ((CONFIG.ROTATE % 360) + 360) % 360;
    const swap = rot === 90 || rot === 270;
    this.W = swap ? vh : vw; this.H = swap ? vw : vh;
    this.canvas.width = Math.round(this.W * this.scale); this.canvas.height = Math.round(this.H * this.scale);
    const st = this.canvas.style;
    st.width = this.W + 'px'; st.height = this.H + 'px';
    st.left = (vw - this.W) / 2 + 'px'; st.top = (vh - this.H) / 2 + 'px';
    st.transform = `rotate(${rot}deg) scaleX(${CONFIG.MIRROR ? -1 : 1})`;
    st.filter = `brightness(${CONFIG.BRIGHTNESS}) contrast(${CONFIG.CONTRAST})`;
  }
  enabledScenes() {
    const all = Object.keys(this.factories);
    if (!CONFIG.SCENES) return all;
    const chosen = all.filter(n => CONFIG.SCENES.includes(n));
    return chosen.length ? chosen : all;
  }
  pickScene() {
    if (this.forcedScene) return this.forcedScene;
    if (this.queuedScene && this.factories[this.queuedScene]) { const q = this.queuedScene; this.queuedScene = null; return q; }
    const names = this.enabledScenes();
    // Play every scene once before any of them repeats: keep a shuffled bag and draw from
    // it, refilling only when empty. A queued scene (the song announcement) bypasses this
    // entirely above, so it never eats a scene's turn.
    if (!this._bag || !this._bag.length || this._bagFor !== names.join('|')) {
      this._bagFor = names.join('|');
      this._bag = shuffle(names.slice());
      // don't let the refill immediately repeat the scene that just finished
      if (this._bag.length > 1 && this._bag[this._bag.length - 1] === this.sceneName) {
        this._bag.unshift(this._bag.pop());
      }
    }
    return this._bag.pop();
  }
  setScene(name, seed) {
    this.sceneName = name;
    // Mirrored mode: seeding before the scene is built makes every rand()/pick() inside it
    // match on both screens, so leader and follower render the same scene identically.
    if (CONFIG.MIRROR_MODE) {
      this.sceneSeed = seed !== undefined ? seed : ((Math.random() * 0x7fffffff) | 0);
      seedRandom(this.sceneSeed);
      if (CONFIG.MIRROR_MODE === 'leader') this.publishState();
    }
    this.scene = this.factories[name](this);
    this.sceneTime = 0;
    this.sceneDuration = this.scene.duration || rand(CONFIG.SCENE_SECONDS[0], CONFIG.SCENE_SECONDS[1]);
    // keep enough history for pickScene's long memory to actually work
    this.history.push(name); if (this.history.length > 40) this.history.shift();
  }
  // style: 'fade' (black fade), 'static' (burst of TV static), 'cut' (hard cut through black)
  nextScene(style) {
    if (this.transition.state !== 'run') return;
    if (!style) { const r = Math.random(); style = r < 0.5 ? 'fade' : r < 0.8 ? 'static' : 'cut'; }
    this.transition = { state: 'out', t: 0, style };
  }
  transitionLength(tr) { return tr.style === 'static' ? (tr.state === 'out' ? 0.3 : 0.2) : tr.style === 'cut' ? (tr.state === 'out' ? 0.15 : 0.05) : (CONFIG.FADE_SECONDS || 0.6); }
  // Make `name` the next scene. cutNow also ends the current scene straight away (through static).
  queueScene(name, cutNow) {
    if (!this.factories[name]) return;
    this.queuedScene = name;
    if (cutNow && this.sceneName !== name && !this.scare) this.nextScene('static');
  }
  startScare(name, seed) {
    const names = Object.keys(this.scareFactories);
    if (!names.length) return;
    if (!name) {
      // Guest photos are full members of the cycle, not a cap or a special case: each photo
      // waiting to be shown is one more entry in the bag, so it takes its turn alongside the
      // drawn scares. Every entry plays once before any repeats.
      // A photo in its fresh window (just uploaded) gets every other scare slot before
      // the bag is even consulted; afterwards it lives in the bag like everything else.
      if (this.freshPhotoHook) {
        const fs = this.freshPhotoHook();
        if (fs) {
          this.scare = fs; this.scareName = 'photo'; this.lastScare = '\u0000fresh';
          this.logScare('photo');
          if (CONFIG.MIRROR_MODE === 'leader') this.publishState();
          return;
        }
      }
      const photoSlots = (this.photoCount ? this.photoCount() : 0);
      const pool = names.concat(Array.from({ length: photoSlots }, (_, i) => '\u0000photo' + i));
      // Weighted scares get extra turns per cycle (Paul: borg was never on long enough to catch).
      for (const [nm, w] of Object.entries(CONFIG.SCARE_WEIGHTS || {})) {
        if (this.scareFactories[nm]) for (let i = 1; i < w; i++) pool.push(nm);
      }
      if (!this._scareBag || !this._scareBag.length || this._scareBagFor !== pool.join('|')) {
        this._scareBagFor = pool.join('|');
        this._scareBag = shuffle(pool.slice());
        if (this._scareBag.length > 1 && this._scareBag[this._scareBag.length - 1] === this.lastScare) {
          this._scareBag.unshift(this._scareBag.pop());
        }
        // Weighted entries appear more than once; keep identical neighbours apart so the
        // same scare can't play twice in a row inside one cycle.
        for (let i = this._scareBag.length - 2; i >= 0; i--) {
          if (this._scareBag[i] === this._scareBag[i + 1]) {
            const dup = this._scareBag.splice(i, 1)[0];
            this._scareBag.splice(Math.max(0, i - 2), 0, dup);
          }
        }
      }
      name = this._scareBag.pop();
      if (name.charCodeAt(0) === 0 && this.scareHook) {       // this turn belongs to a photo
        const s = this.scareHook();
        if (s) { this.scare = s; this.scareName = 'photo'; this.lastScare = name; this.logScare('photo');
                 if (CONFIG.MIRROR_MODE === 'leader') this.publishState(); return; }
        name = pick(names);                                    // no photo available after all
      }
    }
    this.lastScare = name; this.scareName = name;
    this.logScare(name);
    if (CONFIG.MIRROR_MODE) {
      this.scareSeed = seed !== undefined ? seed : ((Math.random() * 0x7fffffff) | 0);
      seedRandom(this.scareSeed);
    }
    this.scare = this.scareFactories[name](this);
    // publish AFTER this.scare exists, or the state would report no scare running
    if (CONFIG.MIRROR_MODE === 'leader') this.publishState();
  }
  // Durable record of which scares have actually fired, so "has X ever played?" is answerable
  // from the Pi instead of inferred. Survives reboots; capped so it can't grow without bound.
  logScare(name) {
    try {
      const k = 'hw-scare-log';
      const log = JSON.parse(localStorage.getItem(k) || '{}');
      const e = log[name] || { n: 0, first: 0, last: 0 };
      e.n++; e.last = Date.now(); if (!e.first) e.first = e.last;
      log[name] = e;
      localStorage.setItem(k, JSON.stringify(log));
    } catch (e) {}
  }
  scareLog() { try { return JSON.parse(localStorage.getItem('hw-scare-log') || '{}'); } catch (e) { return {}; } }
  // Leader: tell the server what we're showing, so follower screens can match it.
  publishState() {
    if (CONFIG.MIRROR_MODE !== 'leader') return;
    const body = JSON.stringify({
      scene: this.sceneName, sceneSeed: this.sceneSeed,
      scare: this.scare && !this.scare.done ? this.scareName : null, scareSeed: this.scareSeed,
      n: (this._stateN = (this._stateN || 0) + 1)
    });
    try { fetch('/api/state', { method: 'POST', body, cache: 'no-store', keepalive: true }).catch(() => {}); } catch (e) {}
  }
  // Follower: adopt the leader's scene/scare (and its seeds) when they change.
  applyState(s) {
    if (!s || CONFIG.MIRROR_MODE !== 'follower') return;
    if (s.scene && s.scene !== this.sceneName && this.factories[s.scene]) {
      this.setScene(s.scene, s.sceneSeed);
      this.sceneTime = 0; this.transition = { state: 'in', t: 0, style: 'static' };
    }
    const liveScare = this.scare && !this.scare.done ? this.scareName : null;
    if (s.scare && s.scare !== liveScare && this.scareFactories[s.scare]) this.startScare(s.scare, s.scareSeed);
    else if (!s.scare && liveScare) this.scare = null;
  }
  scheduleScare() { this.nextScareAt = this.time + rand(CONFIG.SCARE_MINUTES[0], CONFIG.SCARE_MINUTES[1]) * 60; }
  start() {
    this.setScene(this.pickScene());
    this.transition = { state: 'in', t: 0 };
    const loop = (now) => { this.frame(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  frame(now) {
    let dt = (now - this.last) / 1000; this.last = now;
    if (dt > 0.1) dt = 0.1;
    this.time += dt;
    this.monitor(dt);
    try { this.update(dt); this.draw(); }
    catch (e) {
      // A bug in one scene must not freeze the wall for the whole party: log it and move on.
      console.error('scene error in ' + this.sceneName, e);
      this.errors = (this.errors || 0) + 1; this.scare = null;
      if (this.transition.state !== 'out') this.transition = { state: 'out', t: 0.9 };
    }
  }
  monitor(dt) {
    if (!CONFIG.AUTO_QUALITY) return;
    this.frames++; this.fpsWindow += dt;
    if (this.fpsWindow >= 6) {
      this.fps = this.frames / this.fpsWindow; this.frames = 0; this.fpsWindow = 0;
      if (this.time > 12 && this.fps < 22 && this.scale > 0.5) {
        this.scale = Math.max(0.5, this.scale - 0.15);
        console.log('Low frame rate (' + this.fps.toFixed(1) + ' fps); render scale now ' + this.scale.toFixed(2));
        this.resize();
      }
    }
  }
  update(dt) {
    const tr = this.transition;
    if (tr.state === 'out') { tr.t += dt / this.transitionLength(tr); if (tr.t >= 1) { this.setScene(this.pickScene()); this.transition = { state: 'in', t: 0, style: tr.style }; } }
    else if (tr.state === 'in') { tr.t += dt / this.transitionLength(tr); if (tr.t >= 1) tr.state = 'run'; }
    // A follower never advances scenes or fires scares on its own: applyState() drives it.
    else if (this.sceneTime > this.sceneDuration && !this.scare && CONFIG.MIRROR_MODE !== 'follower') this.nextScene();
    this.sceneTime += dt;
    this.scene.update(dt, this.sceneTime);
    if (CONFIG.FOG) this.fog.update(dt);
    if (this.scare) {
      this.micro = null;
      this.scare.update(dt);
      if (this.scare.done) {
        this.scare = null; this.scheduleScare(); this.nextMicroAt = this.time + rand(CONFIG.MICRO_SECONDS[0], CONFIG.MICRO_SECONDS[1]) * 0.6;
        if (CONFIG.MIRROR_MODE === 'leader') this.publishState();
        if (this.queuedScene && this.queuedScene !== this.sceneName) this.nextScene('static');   // a message arrived during the scare
      }
    } else if (CONFIG.SCARES && CONFIG.MIRROR_MODE !== 'follower' && this.time > this.nextScareAt && tr.state === 'run' && this.sceneTime > 5 && this.sceneTime < this.sceneDuration - 4) {
      this.startScare();
    }
    if (this.micro) {
      this.micro.update(dt);
      if (this.micro.done) { this.micro = null; this.nextMicroAt = this.time + rand(CONFIG.MICRO_SECONDS[0], CONFIG.MICRO_SECONDS[1]); }
    } else if (CONFIG.MICRO_SCARES && !this.scare && tr.state === 'run' && this.time > this.nextMicroAt && this.time < this.nextScareAt - 8 && this.sceneTime > 3 && typeof makeMicroScare === 'function') {
      this.micro = makeMicroScare(this);
    }
  }
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.globalAlpha = 1;
    this.scene.draw(ctx, this.sceneTime);
    if (CONFIG.FOG && this.scene.fog > 0) this.fog.draw(ctx, this.scene.fog);
    const tr = this.transition;
    if (tr.state !== 'run') {
      if (tr.style === 'static') drawStatic(ctx, this.W, this.H, tr.state === 'out' ? clamp01(tr.t * 3) : 1, 3);
      else if (tr.style === 'cut') fillScreen(ctx, this.W, this.H, '#000', 1);
      else fillScreen(ctx, this.W, this.H, '#000', tr.state === 'out' ? smooth(tr.t) : 1 - smooth(tr.t));
    }
    if (this.micro && !this.scare) { ctx.save(); ctx.globalAlpha = 1; this.micro.draw(ctx); ctx.restore(); }
    if (this.scare) {
      ctx.globalAlpha = 1; this.scare.draw(ctx);
      // every big scare opens with a strobe hit so it reads as an event even in a lit room
      if (this.scare.t < 0.09) fillScreen(ctx, this.W, this.H, CONFIG.FLASHES ? '#ffffff' : '#601010', 1 - this.scare.t / 0.09);
    }
    ctx.globalAlpha = 1;
  }
}
