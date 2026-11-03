'use strict';
// Scenes, part 3: the dark set. static, bloodwords, scratch, counter, surveillance, stalker, heartbeat, eyewall.

const _measureCtx = document.createElement('canvas').getContext('2d');

// Bundled imagery that ships with the show (in img/). Preloaded once; a scene/scare
// checks .ready before drawing so a slow load never throws.
const IMAGES = {};
function loadImages(names) {
  for (const n of names) {
    const key = n.replace(/\.[a-z]+$/i, '');   // 'skull-mirror.jpg' -> 'skull-mirror'
    if (IMAGES[key]) continue;
    const img = new Image(); img.ready = false;
    img.onload = () => { img.ready = true; };
    img.src = 'img/' + n;
    IMAGES[key] = img;
  }
}
loadImages(['skull-mirror.jpg', 'pumpkin-orange.jpg', 'pumpkin-green.jpg']);

// Draw an image to cover the screen (like CSS background-size: cover), centred.
function drawCover(ctx, img, W, H, alpha = 1) {
  if (!img || !img.ready) return false;
  const s = Math.max(W / img.width, H / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.restore();
  return true;
}

// Hooded silhouette. groundY is where the feet are, h the height.
// A hooded, cloaked figure silhouette (modelled on the reaper photo): pointed hood,
// sloped shoulders, a cloak flaring to the ground, ragged hanging sleeves. Renders as a
// crisp black shape at any size. `eyes` > 0 paints faint glowing eyes inside the hood.
function drawFigure(ctx, x, groundY, h, color = '#060406', eyes = 0) {
  const y = (f) => groundY - h * f;    // height fraction -> y
  const w = (f) => h * f;              // width as a height fraction
  ctx.save();
  ctx.fillStyle = color;
  // --- cloak body: shoulders out to a wide flared hem ---
  ctx.beginPath();
  ctx.moveTo(x - w(0.08), y(0.82));                                    // left shoulder top
  ctx.quadraticCurveTo(x - w(0.17), y(0.78), x - w(0.155), y(0.52));    // shoulder -> upper arm
  ctx.quadraticCurveTo(x - w(0.165), y(0.26), x - w(0.21), y(0.0));     // taper to hem (left)
  ctx.quadraticCurveTo(x, y(0.03), x + w(0.21), y(0.0));               // ragged hem across
  ctx.quadraticCurveTo(x + w(0.165), y(0.26), x + w(0.155), y(0.52));   // hem up (right)
  ctx.quadraticCurveTo(x + w(0.17), y(0.78), x + w(0.08), y(0.82));     // -> right shoulder
  ctx.quadraticCurveTo(x, y(0.80), x - w(0.08), y(0.82));              // close across chest
  ctx.closePath(); ctx.fill();
  // --- hood + head: neck narrows, hood rises to a soft point ---
  ctx.beginPath();
  ctx.moveTo(x - w(0.065), y(0.82));
  ctx.quadraticCurveTo(x - w(0.085), y(0.87), x - w(0.07), y(0.905));   // left of neck
  ctx.quadraticCurveTo(x - w(0.10), y(0.965), x - w(0.025), y(1.01));   // hood left up to peak
  ctx.quadraticCurveTo(x, y(1.035), x + w(0.04), y(1.00));             // sharper peak, leans slightly
  ctx.quadraticCurveTo(x + w(0.095), y(0.96), x + w(0.07), y(0.905));   // hood right down
  ctx.quadraticCurveTo(x + w(0.085), y(0.87), x + w(0.065), y(0.82));   // right of neck
  ctx.closePath(); ctx.fill();
  // --- hollow of the hood (darker void where a face would be) ---
  ctx.fillStyle = 'rgba(0,0,0,0.92)';
  ctx.beginPath(); ctx.ellipse(x, y(0.915), w(0.04), h * 0.055, 0, 0, TAU); ctx.fill();
  // --- ragged sleeve tips hanging from the arms ---
  ctx.fillStyle = color;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * w(0.15), y(0.54));
    ctx.lineTo(x + s * w(0.185), y(0.40));
    ctx.lineTo(x + s * w(0.155), y(0.37));
    ctx.lineTo(x + s * w(0.175), y(0.31));
    ctx.lineTo(x + s * w(0.115), y(0.42));
    ctx.closePath(); ctx.fill();
  }
  if (eyes > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = eyes;
    for (const s of [-1, 1]) {
      drawGlow(ctx, x + s * w(0.016), y(0.925), h * 0.016, [255, 70, 0], 1, 0.3);
      ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.arc(x + s * w(0.016), y(0.925), h * 0.005, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

// Self-copy slices of the frame: cheap "tearing" effect.
function tearFrame(ctx, show, n, amt) {
  const { W, H } = show; const sc = show.scale;
  for (let i = 0; i < n; i++) { const sy = rand(0, H), sh = rand(6, H * 0.1); ctx.drawImage(ctx.canvas, 0, sy * sc, ctx.canvas.width, sh * sc, rand(-amt, amt), sy, W, sh); }
}

// ---------------------------------------------------------------- static
class StaticScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0;
    this.timer = rand(1.5, 3); this.face = null; this.text = null; this.textT = 0; this.black = 0;
    this.variant = pick(['scream', 'ghoul', 'skull']);
  }
  update(dt, t) {
    this.timer -= dt;
    if (this.timer <= 0) {
      const r = Math.random();
      if (r < 0.4) { this.face = { x: rand(0.3, 0.7), y: rand(0.35, 0.6), s: rand(0.25, 0.45), a: 0, life: rand(1.5, 3.5) }; this.variant = pick(['scream', 'ghoul', 'skull']); this.timer = this.face.life + rand(1, 2.5); }
      else if (r < 0.62) { this.text = pick(['NO SIGNAL', 'SIGNAL LOST', 'CH 13', 'WE SEE YOU', 'PLEASE STAND BY', 'DO NOT ADJUST YOUR SET', 'IT IS IN THE ROOM']); this.textT = rand(1.2, 2.5); this.timer = this.textT + rand(1, 2.5); }
      else if (r < 0.8) { this.black = rand(0.3, 0.9); this.timer = this.black + rand(1.5, 3); }
      else this.timer = rand(1.5, 3);
    }
    if (this.face) { this.face.life -= dt; this.face.a = this.face.life > 0.5 ? Math.min(1, this.face.a + dt * 1.5) : Math.max(0, this.face.a - dt * 3); if (this.face.life <= 0) this.face = null; }
    if (this.textT > 0) { this.textT -= dt; if (this.textT <= 0) this.text = null; }
    if (this.black > 0) this.black -= dt;
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#000');
    if (this.black > 0) { drawStatic(ctx, W, H, 0.08, 4); return; }
    if (this.face) { ctx.save(); ctx.globalAlpha = this.face.a * 0.8; ctx.translate(rand(-3, 3), rand(-3, 3)); drawScareFace(ctx, W * this.face.x, H * this.face.y, H * this.face.s, this.variant, t); ctx.restore(); }
    drawStatic(ctx, W, H, this.face ? 0.5 + 0.15 * Math.random() : 0.85 + 0.15 * Math.random(), 3);
    const by = (((t * 0.18) % 1.2) - 0.1) * H;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, by, W, H * 0.06);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, by + H * 0.06, W, 4);
    if (Math.random() < 0.25) tearFrame(ctx, this.show, 1, 50);
    if (this.text) { ctx.font = `bold ${H * 0.085}px "Courier New", monospace`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.6 + 0.4 * Math.random(); ctx.fillText(this.text, W / 2 + rand(-2, 2), H * 0.5); ctx.globalAlpha = 1; }
    vignette(ctx, W, H, 0.5);
  }
}

// ---------------------------------------------------------------- bloodwords
class BloodWordsScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0.1;
    const stock = ['HELP ME', 'GET OUT', 'LIAR', 'MINE', 'RUN', 'NOT ALONE', 'BEHIND YOU', 'LET US IN', 'TOO LATE', 'STAY'];
    const src = (window.messageWall ? window.messageWall.liveMessages() : CONFIG.MESSAGES);
    const posted = src.filter(m => m.length <= 12 && !stock.includes(m));
    this.words = shuffle(stock.concat(posted));
    // Short lines about the playing song belong here too: this is the scene people notice
    // most, so the wall should be talking about the music in it rather than only elsewhere.
    const mw = window.messageWall;
    if (mw && mw.musicPool && mw.musicPool.length) {
      const short = mw.musicPool.filter(m => m.length <= 22 && !m.endsWith('?'));
      // put a couple near the end of the stack so they come up early
      for (const m of shuffle(short.slice()).slice(0, 2)) this.words.push(m);
    }
    this.drips = []; this.state = 'gap'; this.timer = 1.0; this.alpha = 1;
  }
  start(word) {
    const { W, H } = this; const g = _measureCtx;
    this.word = word; this.n = 0;
    this.fs = fitFontSize(g, word, FONT_DRIP, W * 0.86, H * 0.28);
    g.font = `${this.fs}px ${FONT_DRIP}`;
    const total = g.measureText(word).width; const x0 = (W - total) / 2;
    this.pos = word.split('').map((ch, i) => ({ ch, x: x0 + g.measureText(word.slice(0, i)).width, w: g.measureText(ch).width }));
    this.y = H * 0.5; this.drips = []; this.alpha = 1;
  }
  update(dt, t) {
    this.timer -= dt;
    if (this.state === 'gap' && this.timer <= 0) { if (!this.words.length) this.words = shuffle(['HELP ME', 'GET OUT', 'RUN', 'MINE']); const w = this.words.pop(); if (window.messageWall) window.messageWall.markShown(w); this.start(w); this.state = 'write'; this.timer = 0.2; }
    else if (this.state === 'write' && this.timer <= 0) {
      if (this.n < this.pos.length) {
        const p = this.pos[this.n++];
        if (p.ch !== ' ') for (let i = 0, k = randInt(1, 3); i < k; i++) this.drips.push({ x: p.x + rand(p.w * 0.15, p.w * 0.85), y: this.y + rand(this.fs * 0.15, this.fs * 0.42), l: 0, max: rand(this.H * 0.08, this.H * 0.4), v: rand(50, 140), w: rand(3, 9) * this.fs / 200 });
        this.timer = p.ch === ' ' ? 0.15 : rand(0.3, 0.55);
      } else { this.state = 'hold'; this.timer = rand(3, 4.5); }
    }
    else if (this.state === 'hold' && this.timer <= 0) { this.state = 'fade'; this.timer = 1.2; }
    else if (this.state === 'fade') { this.alpha = Math.max(0, this.timer / 1.2); if (this.timer <= 0) { this.state = 'gap'; this.timer = rand(0.8, 1.5); this.drips = []; this.word = null; } }
    for (const d of this.drips) { if (d.l < d.max) { d.l = Math.min(d.max, d.l + d.v * dt); d.v = Math.max(8, d.v - 40 * dt); } }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#0b0608');
    if (!this.word) { vignette(ctx, W, H, 0.8); return; }
    ctx.save(); ctx.globalAlpha = this.alpha;
    drawGlow(ctx, W / 2, this.y, W * 0.35, [110, 0, 0], 0.35, 0.1);
    ctx.lineCap = 'round';
    for (const d of this.drips) { ctx.strokeStyle = '#8c0000'; ctx.lineWidth = d.w; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + Math.sin(d.l * 0.05) * 2, d.y + d.l); ctx.stroke(); ctx.fillStyle = '#a30000'; ctx.beginPath(); ctx.arc(d.x + Math.sin(d.l * 0.05) * 2, d.y + d.l, d.w * 0.8, 0, TAU); ctx.fill(); }
    ctx.font = `${this.fs}px ${FONT_DRIP}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (let i = 0; i < this.n; i++) { const p = this.pos[i]; const fresh = i === this.n - 1 && this.state === 'write'; ctx.fillStyle = fresh ? '#d01010' : '#9a0404'; ctx.fillText(p.ch, p.x, this.y); }
    ctx.restore();
    vignette(ctx, W, H, 0.8);
  }
}

// ------------------------------------------------- song announcement (blood soaked)
// Used when the music changes: black screen, the line fades up already soaked in blood,
// then blood runs from the letters. Unlike BloodWordsScene nothing is written out letter
// by letter, so a full sentence can land at once.
class BloodAnnounceScene extends Scene {
  constructor(show, text) {
    super(show); this.fog = 0.1; this.duration = 16;
    const { W, H } = this;
    this.text = (text || '').toUpperCase();
    this.lines = this.wrap(this.text, W, H);
    this.drips = [];
    this.seeded = false;
  }
  // Split into at most 3 lines that fit the screen width in the dripping face.
  wrap(text, W, H) {
    const g = _measureCtx;
    const words = text.split(' ');
    const maxLines = 3;
    let best = null;
    for (let n = 1; n <= maxLines; n++) {
      const per = Math.ceil(words.length / n);
      const rows = [];
      for (let i = 0; i < words.length; i += per) rows.push(words.slice(i, i + per).join(' '));
      if (rows.length > n) continue;
      const size = Math.min(
        H * 0.72 / rows.length,
        ...rows.map(r => fitFontSize(g, r, FONT_DRIP, W * 0.86, H * 0.26))
      );
      if (!best || size > best.size) best = { rows, size };
    }
    return best || { rows: [text], size: H * 0.12 };
  }
  // Once the text is up, start blood running from under the letters.
  seedDrips() {
    const { W, H } = this;
    const g = _measureCtx; const fs = this.lines.size;
    g.font = `${fs}px ${FONT_DRIP}`;
    const rows = this.lines.rows;
    const totalH = rows.length * fs * 1.08;
    rows.forEach((row, ri) => {
      const w = g.measureText(row).width;
      const x0 = (W - w) / 2;
      const y = H / 2 - totalH / 2 + fs * 0.54 + ri * fs * 1.08;
      // one drip every few characters, positioned along the row
      const n = Math.max(3, Math.round(row.replace(/ /g, '').length * 0.6));
      for (let i = 0; i < n; i++) {
        const x = x0 + rand(0.02, 0.98) * w;
        this.drips.push({
          x, y: y + fs * rand(0.18, 0.42), l: 0,
          max: rand(H * 0.06, H * 0.45), v: rand(25, 90),
          w: rand(3, 9) * fs / 200,
          // each drip waits its turn, so the sentence sits clean for a moment and the
          // blood then begins to run, a few streaks at a time
          wait: rand(1.2, 7),
        });
      }
    });
    this.seeded = true;
  }
  update(dt, t) {
    // fade in over 2s, hold, fade out at the end
    this.alpha = clamp01(t / 2) * clamp01((this.duration - t) / 2);
    if (!this.seeded && t > 2.0) this.seedDrips();
    for (const d of this.drips) {
      if (d.wait > 0) { d.wait -= dt; continue; }     // not started running yet
      if (d.l < d.max) { d.l = Math.min(d.max, d.l + d.v * dt); d.v = Math.max(6, d.v - 30 * dt); }
    }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#070406');
    ctx.save();
    ctx.globalAlpha = this.alpha;
    drawGlow(ctx, W / 2, H / 2, W * 0.42, [120, 0, 0], 0.3, 0.1);
    // drips run from under the letters, drawn behind the text
    ctx.lineCap = 'round';
    for (const d of this.drips) {
      if (d.wait > 0 || d.l <= 0) continue;          // hasn't started running
      const x2 = d.x + Math.sin(d.l * 0.05) * 2;
      // the trail tapers as it runs, with a heavier bead at the leading edge
      ctx.strokeStyle = '#8c0000'; ctx.lineWidth = d.w;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(x2, d.y + d.l); ctx.stroke();
      ctx.fillStyle = '#a30000';
      ctx.beginPath(); ctx.arc(x2, d.y + d.l, d.w * 0.9, 0, TAU); ctx.fill();
    }
    // the sentence itself, wet and dark red
    const fs = this.lines.size, rows = this.lines.rows;
    const totalH = rows.length * fs * 1.08;
    ctx.font = `${fs}px ${FONT_DRIP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    rows.forEach((row, ri) => {
      const y = H / 2 - totalH / 2 + fs * 0.54 + ri * fs * 1.08;
      ctx.fillStyle = '#5e0202';
      ctx.fillText(row, W / 2 + 2, y + 2);          // darker underlayer for depth
      ctx.fillStyle = '#a80707';
      ctx.fillText(row, W / 2, y);
    });
    ctx.restore();
    vignette(ctx, W, H, 0.85);
  }
}

// ---------------------------------------------------------------- scratch
class ScratchScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0.15;
    this.phrases = shuffle(['LET ME OUT', 'HELP', 'I CAN SEE YOU', 'IT HURTS', 'NOT DEAD', 'STILL HERE', 'DAY 13', 'DONT SLEEP', 'THEY LIED', 'BEHIND THE WALL']);
    this.marks = []; this.cur = null; this.timer = 0.8; this.dust = [];
    // where each phrase goes: the first one big in the middle, the rest around it
    this.slots = [[0.5, 0.42, 0.8, 0.2]].concat(shuffle([[0.24, 0.15, 0.38, 0.1], [0.76, 0.17, 0.38, 0.1], [0.22, 0.72, 0.36, 0.09], [0.78, 0.7, 0.36, 0.09], [0.5, 0.88, 0.5, 0.08], [0.5, 0.64, 0.4, 0.08]]));
  }
  begin() {
    const { W, H } = this; const g = _measureCtx;
    const txt = this.phrases.pop() || pick(['HELP', 'OUT', 'NO']);
    const slot = this.slots.shift(); if (!slot) return;
    const fs = fitFontSize(g, txt, FONT_EATER, W * slot[2], H * slot[3]);
    const m = { txt, fs, x: W * slot[0] + rand(-W * 0.02, W * 0.02), y: H * slot[1], rot: rand(-0.1, 0.1), shown: 0, age: 0 };
    this.marks.push(m); this.cur = m; this.timer = 0.3;
  }
  update(dt, t) {
    this.timer -= dt;
    for (const m of this.marks) m.age += dt;
    if (this.cur) {
      if (this.timer <= 0) {
        if (this.cur.shown < this.cur.txt.length) {
          this.cur.shown++; this.timer = rand(0.18, 0.4);
          for (let i = 0; i < 6; i++) this.dust.push({ x: this.cur.x + rand(-this.cur.fs, this.cur.fs), y: this.cur.y, vy: rand(30, 120), vx: rand(-10, 10), a: 1 });
        } else { this.cur = null; this.timer = rand(1.5, 3); }
      }
    } else if (this.timer <= 0 && this.marks.length < 7) this.begin();
    for (const d of this.dust) { d.y += d.vy * dt; d.x += d.vx * dt; d.a -= dt * 1.2; }
    this.dust = this.dust.filter(d => d.a > 0);
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#101012');
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(60,58,64,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const m of this.marks) {
      const txt = m.txt.slice(0, m.shown); if (!txt) continue;
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
      ctx.font = `${m.fs}px ${FONT_EATER}`;
      const fresh = m === this.cur || m.age < 1.5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = m.fs * 0.06; ctx.strokeText(txt, m.fs * 0.02, m.fs * 0.02);
      ctx.fillStyle = fresh ? '#e8e2d8' : '#9e968c'; ctx.fillText(txt, 0, 0);
      ctx.strokeStyle = fresh ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2; ctx.strokeText(txt, rand(-0.6, 0.6), rand(-0.6, 0.6));
      ctx.restore();
    }
    ctx.fillStyle = '#cfc8bd';
    for (const d of this.dust) { ctx.globalAlpha = d.a * 0.8; ctx.fillRect(d.x, d.y, 2, 2); }
    ctx.globalAlpha = 1;
    // tally marks in the corner
    ctx.strokeStyle = 'rgba(220,214,200,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const groups = Math.min(6, Math.floor(t / 4)); const tx = W * 0.08, ty = H * 0.86, s = H * 0.05;
    for (let gI = 0; gI < groups; gI++) { const gx = tx + gI * s * 1.6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(gx + i * s * 0.25, ty); ctx.lineTo(gx + i * s * 0.25 + rand(-1, 1), ty + s); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(gx - s * 0.1, ty + s * 0.85); ctx.lineTo(gx + s * 0.95, ty + s * 0.15); ctx.stroke(); }
    vignette(ctx, W, H, 0.75);
  }
}

// ---------------------------------------------------------------- counter
class CounterScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 26;
    this.n = randInt(14, 40); this.base = this.n; this.label = 'GUESTS'; this.timer = 1.5; this.glitch = 0; this.missing = 0; this.phase = 0; this.flash = 0;
  }
  update(dt, t) {
    this.timer -= dt; this.glitch = Math.max(0, this.glitch - dt); this.flash = Math.max(0, this.flash - dt);
    if (this.timer <= 0) {
      this.phase++;
      if (t < 9) { this.n += pick([1, 1, -1]); this.timer = rand(0.9, 1.6); }
      else if (t < 17) { this.n += pick([1, -1, -1, -2]); if (Math.random() < 0.4) { this.label = this.label === 'GUESTS' ? 'ALIVE' : 'GUESTS'; this.glitch = 0.35; } this.missing = Math.max(this.missing, this.base - this.n); this.timer = rand(0.5, 1.1); }
      else { this.n -= randInt(1, 3); this.missing += randInt(1, 2); this.glitch = 0.5; this.timer = rand(0.3, 0.7); if (this.n < 1) { this.n = 0; this.timer = 99; this.flash = 0.2; } }
    }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#000');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const jit = this.glitch > 0 ? 8 : 0;
    ctx.font = `bold ${H * 0.2}px "Courier New", monospace`;
    const txt = `${this.label}: ${String(this.n).padStart(2, '0')}`;
    if (this.glitch > 0) { ctx.fillStyle = 'rgba(255,0,0,0.5)'; ctx.fillText(txt, W / 2 - 10 + rand(-jit, jit), H * 0.42); ctx.fillStyle = 'rgba(0,120,255,0.5)'; ctx.fillText(txt, W / 2 + 10 + rand(-jit, jit), H * 0.42); }
    ctx.fillStyle = this.label === 'ALIVE' ? '#d01818' : '#d8d8e0'; ctx.fillText(txt, W / 2 + rand(-jit, jit), H * 0.42 + rand(-jit, jit) * 0.3);
    if (this.missing > 0) { ctx.font = `bold ${H * 0.1}px "Courier New", monospace`; ctx.fillStyle = '#a00'; ctx.fillText(`ASSIMILATED: ${String(this.missing).padStart(2, '0')}`, W / 2, H * 0.66); }
    if (t > 19) { ctx.font = `${H * 0.09}px ${FONT_CREEPY}`; ctx.fillStyle = '#e01010'; ctx.globalAlpha = clamp01((t - 19) / 1.5) * (0.7 + 0.3 * noise(t * 8)); ctx.fillText('COUNT THE GUESTS AGAIN', W / 2, H * 0.86); ctx.globalAlpha = 1; }
    if (this.glitch > 0) { tearFrame(ctx, this.show, 4, 40); drawStatic(ctx, W, H, 0.12, 3); }
    if (this.flash > 0) fillScreen(ctx, W, H, '#fff', this.flash / 0.2);
    // blinking cursor
    if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#d8d8e0'; ctx.fillRect(W * 0.5 + ctx.measureText(txt).width * 0.5 + 10, H * 0.42 - H * 0.08, H * 0.02, H * 0.16); }
  }
}

// ---------------------------------------------------------------- surveillance
class SurveillanceScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 22;
    this.cam = randInt(1, 9); this.cut = 0; this.lost = false; this.sec0 = randInt(0, 40);
    this.scan = document.createElement('canvas'); this.scan.width = 4; this.scan.height = 4;
    const g = this.scan.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, 4, 2);
    this.pattern = null;
  }
  update(dt, t) {
    this.cut = Math.max(0, this.cut - dt);
    if (!this.cutA && t > 9.5) { this.cutA = true; this.cut = 0.3; }
    if (!this.cutB && t > 14.5) { this.cutB = true; this.cut = 0.3; }
    if (!this.lost && t > 17.5) { this.lost = true; this.cut = 0.4; }
  }
  corridor(ctx, t) {
    const { W, H } = this; const vx = W * 0.5, vy = H * 0.46;
    fillScreen(ctx, W, H, '#0c1410');
    // floor and ceiling
    ctx.fillStyle = '#17241c'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(vx + W * 0.05, vy + H * 0.04); ctx.lineTo(vx - W * 0.05, vy + H * 0.04); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a110d'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(vx + W * 0.05, vy - H * 0.05); ctx.lineTo(vx - W * 0.05, vy - H * 0.05); ctx.closePath(); ctx.fill();
    // perspective lines and doors
    ctx.strokeStyle = 'rgba(120,160,130,0.25)'; ctx.lineWidth = 2;
    for (let i = 1; i <= 6; i++) {
      const k = 1 - Math.pow(0.68, i); const y1 = lerp(H, vy + H * 0.04, k), y0 = lerp(0, vy - H * 0.05, k);
      const xl = lerp(0, vx - W * 0.05, k), xr = lerp(W, vx + W * 0.05, k);
      ctx.beginPath(); ctx.moveTo(xl, y0); ctx.lineTo(xl, y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(xr, y0); ctx.lineTo(xr, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xl, y1); ctx.lineTo(xr, y1); ctx.stroke();
      // doorway on the left wall
      const dh = (y1 - y0) * 0.6; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(xl + (W * 0.02) * (1 - k), y1 - dh, W * 0.03 * (1 - k) + 2, dh);
    }
    // end of corridor glow
    drawGlow(ctx, vx, vy, W * 0.12, [120, 170, 130], 0.25, 0.3);
  }
  figureAt(ctx, stage, t) {
    const { W, H } = this; const vx = W * 0.5, vy = H * 0.46;
    if (stage === 1) drawFigure(ctx, vx + W * 0.01, vy + H * 0.04, H * 0.12);
    else if (stage === 2) drawFigure(ctx, W * 0.46, H * 0.78, H * 0.52);
    else { ctx.save(); ctx.translate(rand(-2, 2), rand(-2, 2)); drawFigure(ctx, W * 0.5, H * 1.25, H * 1.6); ctx.restore(); }
  }
  draw(ctx, t) {
    const { W, H } = this;
    if (this.lost) { fillScreen(ctx, W, H, '#000'); drawStatic(ctx, W, H, 0.9, 3); ctx.font = `bold ${H * 0.09}px "Courier New", monospace`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.5 + 0.5 * Math.random(); ctx.fillText('SIGNAL LOST', W / 2, H / 2); ctx.globalAlpha = 1; return; }
    this.corridor(ctx, t);
    const stage = t < 5 ? 0 : t < 9.5 ? 1 : t < 14.5 ? 2 : 3;
    if (stage === 1 && noise(t * 1.3, 4) > -0.6) this.figureAt(ctx, 1, t);
    if (stage >= 2) this.figureAt(ctx, stage, t);
    if (stage === 3 && t > 16.5) { ctx.save(); ctx.globalAlpha = 0.8; drawScareFace(ctx, W * 0.5, H * 0.45, H * 0.3, 'ghoul', t); ctx.restore(); }
    // camera look: grain, scanlines, green tint, vignette, timestamp
    drawStatic(ctx, W, H, 0.14, 2);
    if (!this.pattern) this.pattern = ctx.createPattern(this.scan, 'repeat');
    ctx.fillStyle = this.pattern; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(40,120,60,0.12)'; ctx.fillRect(0, 0, W, H);
    vignette(ctx, W, H, 0.6);
    const sec = (this.sec0 + Math.floor(t)) % 60, min = 59 - Math.floor((this.sec0 + t) / 60);
    ctx.font = `bold ${H * 0.045}px "Courier New", monospace`; ctx.fillStyle = '#cfe8d0'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`CAM 0${this.cam}   10-31  23:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`, W * 0.03, H * 0.03);
    ctx.textAlign = 'right'; ctx.fillText('REC', W * 0.97, H * 0.03);
    if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.arc(W * 0.97 - ctx.measureText('REC').width - H * 0.03, H * 0.055, H * 0.012, 0, TAU); ctx.fill(); }
    if (this.cut > 0) { drawStatic(ctx, W, H, 0.9, 3); tearFrame(ctx, this.show, 3, 60); }
  }
}

// ---------------------------------------------------------------- stalker
class StalkerScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0.2; this.duration = 24;
    const { W, H } = this;
    this.flashes = [2.5, 6, 9.5, 12.5, 15, 17.5, 19.5, 21];
    this.fx = rand(0.35, 0.65);
    this.bolts = this.flashes.map(() => makeBolt(rand(W * 0.1, W * 0.9), 0, rand(W * 0.2, W * 0.8), H * 0.55));
    this.eyes = 0;
  }
  update(dt, t) {}
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#000');
    // ground line barely visible
    ctx.fillStyle = '#070709'; ctx.fillRect(0, H * 0.82, W, H * 0.18);
    let lit = 0, idx = -1;
    for (let i = 0; i < this.flashes.length; i++) { const k = t - this.flashes[i]; if (k >= 0 && k < 0.5) { lit = Math.max(lit, 1 - k / 0.5); idx = i; } }
    if (lit > 0) {
      fillScreen(ctx, W, H, CONFIG.FLASHES ? '#cfd8ff' : '#262c48', lit * 0.9);
      drawBolt(ctx, this.bolts[idx], lit, 3);
      ctx.save(); ctx.globalAlpha = Math.min(1, lit * 1.5);
      const h = H * lerp(0.2, 1.15, idx / (this.flashes.length - 1));
      const x = W * lerp(this.fx, 0.5, idx / (this.flashes.length - 1));
      if (idx === this.flashes.length - 1) { ctx.translate(rand(-10, 10), rand(-10, 10)); drawScareFace(ctx, W / 2, H * 0.5, H * 0.45, 'scream', t); }
      else drawFigure(ctx, x, H * 0.82 + h * 0.05, h);
      ctx.restore();
    } else if (idx === -1 && t > 10) {
      // between flashes: two faint eyes where the figure stands
      const i = this.flashes.findIndex(f => f > t); const h = H * lerp(0.2, 1.15, Math.max(0, i - 1) / (this.flashes.length - 1));
      const x = W * lerp(this.fx, 0.5, Math.max(0, i - 1) / (this.flashes.length - 1));
      const a = 0.25 + 0.2 * noise(t * 3, 9);
      ctx.globalAlpha = a; drawEye(ctx, x - h * 0.03, H * 0.82 - h * 0.86, h * 0.03, 1, [255, 230, 120]); drawEye(ctx, x + h * 0.03, H * 0.82 - h * 0.86, h * 0.03, 1, [255, 230, 120]); ctx.globalAlpha = 1;
    }
    if (t > 21.6) fillScreen(ctx, W, H, '#000', clamp01((t - 21.6) / 0.4));
  }
}

// ---------------------------------------------------------------- heartbeat
class HeartbeatScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 30;
    const { W, H } = this;
    this.phase = 0; this.beat = 0; this.beats = 0; this.stopped = false; this.ecg = new Array(220).fill(0); this.ecgT = 0; this.spike = 0;
    this.veins = [];
    for (let i = 0; i < 9; i++) {
      const segs = [];
      const grow = (x, y, a, len, w, d) => { const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len; segs.push([x, y, nx, ny, w]); if (d <= 0 || len < 6) return; for (let k = 0, n = Math.random() < 0.7 ? 2 : 3; k < n; k++) grow(nx, ny, a + rand(-0.7, 0.7), len * rand(0.6, 0.8), w * 0.65, d - 1); };
      grow(W / 2, H / 2, i * TAU / 9 + rand(-0.3, 0.3), Math.min(W, H) * 0.16, 9, 6);
      this.veins.push(segs);
    }
  }
  bpm(t) { return t < 20 ? lerp(58, 175, easeIn(clamp01(t / 20))) : 0; }
  update(dt, t) {
    if (!this.stopped) {
      const b = this.bpm(t);
      if (b === 0) { this.stopped = true; this.stopT = t; }
      else { this.phase += dt * b / 60; if (this.phase >= 1) { this.phase -= 1; this.beat = 1; this.beats++; this.spike = 2; } }
    }
    this.beat = Math.max(0, this.beat - dt * 3.5);
    // Advance the ECG by a fixed number of samples per second, independent of frame rate,
    // so the trace sweeps smoothly even when the Pi renders at 25-30 fps.
    this.ecgT += dt;
    const SAMPLE = 0.02;
    let guard = 0;
    while (this.ecgT > SAMPLE && guard++ < 200) {
      this.ecgT -= SAMPLE; let v = 0;
      if (this.spike > 0) { v = this.spike === 2 ? -0.25 : (this.spike === 1 ? 1 : 0); this.spike--; }
      else if (!this.stopped) v = (Math.random() - 0.5) * 0.06;
      this.ecg.push(v); this.ecg.shift();
    }
    if (this.stopped && t > this.stopT + 6 && !this.final) { this.final = true; this.beat = 1.4; }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#050000');
    const glow = this.beat;
    // Cheap pulsing glow: one cached radial sprite stretched over the screen, scaled by the beat.
    // No per-frame gradient rebuild (that rebuild was the slow part of the old drawGlow call).
    if (!this._glow) this._glow = glowSprite([160, 0, 0], 0.05);
    const gr = Math.max(W, H) * (0.9 + 0.2 * glow);
    ctx.save(); ctx.globalAlpha = 0.25 + 0.6 * glow;
    ctx.drawImage(this._glow, W / 2 - gr, H / 2 - gr, gr * 2, gr * 2);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.25 + 0.6 * glow; ctx.translate(W / 2, H / 2); ctx.scale(1 + glow * 0.04, 1 + glow * 0.04); ctx.translate(-W / 2, -H / 2);
    for (const v of this.veins) drawTree(ctx, v, '#5a0000', 0);
    ctx.restore();
    // ECG trace. No shadowBlur (it is the single most expensive call on the Pi); a second
    // translucent wide stroke fakes the glow far more cheaply.
    const y0 = H * 0.84, amp = H * 0.12, step = W / (this.ecg.length - 1);
    const trace = () => { ctx.beginPath(); this.ecg.forEach((v, i) => { const x = i * step, y = y0 - v * amp; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); };
    if (!this.stopped) { ctx.strokeStyle = 'rgba(255,40,40,0.25)'; ctx.lineWidth = 9; trace(); }
    ctx.strokeStyle = this.stopped ? '#6a0000' : '#ff2a2a'; ctx.lineWidth = 3; trace();
    ctx.font = `bold ${H * 0.06}px "Courier New", monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = this.stopped ? '#6a0000' : '#ff3a3a';
    ctx.fillText(this.stopped ? '--- BPM' : `${Math.round(this.bpm(t))} BPM`, W * 0.03, H * 0.03);
    if (this.stopped && t > this.stopT + 1.5) { ctx.font = `${H * 0.11}px ${FONT_CREEPY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#7a0000'; ctx.globalAlpha = clamp01((t - this.stopT - 1.5) / 2) * (0.6 + 0.4 * noise(t * 2)); ctx.fillText(this.final ? 'IT IS STILL BEATING' : 'FLATLINE', W / 2, H * 0.5); ctx.globalAlpha = 1; }
    if (this.final && this.beat > 1) fillScreen(ctx, W, H, '#ff0000', (this.beat - 1) * 1.5);
  }
}

// ---------------------------------------------------------------- eyewall
class EyeWallScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0.25; this.duration = 24;
    const { W, H } = this;
    this.eyes = [];
    const n = 7;    // sparse: just a few pairs, well spaced, never overlapping
    for (let i = 0; i < n; i++) {
      const w = rand(W * 0.02, W * 0.04);
      const gap = w * 1.2;
      const halfW = gap / 2 + w;           // horizontal reach of a whole pair
      let placed = null;
      for (let tries = 0; tries < 40; tries++) {
        const x = rand(halfW + W * 0.02, W - halfW - W * 0.02);
        const y = rand(H * 0.08, H * 0.92);
        // reject if too close to an existing pair (keep clear air between faces)
        const clash = this.eyes.some(o => {
          const minDX = (halfW + o.gap / 2 + o.w) * 1.25;
          const minDY = (w + o.w) * 2.2;
          return Math.abs(o.x - x) < minDX && Math.abs(o.y - y) < minDY;
        });
        if (!clash) { placed = { x, y }; break; }
      }
      if (!placed) continue;   // couldn't fit without overlap: skip rather than crowd
      this.eyes.push({ x: placed.x, y: placed.y, w, gap, c: pick([[255, 190, 50], [255, 190, 50], [235, 150, 40], [255, 70, 30]]), seed: rand(100), open: 0, delay: rand(0.5, 8), look: [0, 0], max: rand(0.45, 0.75) });
    }
    this.stage = 0; this.big = 0;
  }
  update(dt, t) {
    const stare = t > 12 && t < 16.5; const shut = t >= 16.5;
    for (const e of this.eyes) {
      let target;
      if (shut) target = 0;
      else if (stare) target = Math.min(1, e.max + 0.3);
      else if (t < e.delay) target = 0;
      else target = noise(t * 0.7, e.seed) > -0.55 ? (noise(t * 9, e.seed + 50) > 0.8 ? 0 : e.max) : 0;   // random blinks
      e.open += (target - e.open) * Math.min(1, dt * (stare ? 14 : 8));
      const lx = stare ? clamp((this.W / 2 - e.x) / this.W * 2, -1, 1) : noise(t * 0.4, e.seed + 20);
      const ly = stare ? clamp((this.H / 2 - e.y) / this.H * 2, -1, 1) : noise(t * 0.35, e.seed + 30) * 0.5;
      e.look[0] += (lx - e.look[0]) * Math.min(1, dt * (stare ? 20 : 3)); e.look[1] += (ly - e.look[1]) * Math.min(1, dt * (stare ? 20 : 3));
    }
    if (t > 18.5) this.big = Math.min(1, this.big + dt * 3);
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#020203');
    ctx.globalAlpha = 0.8;
    for (const e of this.eyes) {
      if (e.open < 0.03) continue;
      drawEye(ctx, e.x - e.gap / 2, e.y, e.w, e.open, e.c, e.look[0], e.look[1], false);
      drawEye(ctx, e.x + e.gap / 2, e.y, e.w, e.open, e.c, e.look[0], e.look[1], false);
    }
    ctx.globalAlpha = 1;
    if (this.big > 0) {
      const w = W * 0.22; const op = this.big * (t > 22.5 ? Math.max(0, 1 - (t - 22.5) / 0.6) : 1);
      drawEye(ctx, W / 2 - w * 0.7, H * 0.45, w, op, [255, 60, 30], 0, 0, true); drawEye(ctx, W / 2 + w * 0.7, H * 0.45, w, op, [255, 60, 30], 0, 0, true);
    }
    vignette(ctx, W, H, 0.5);
  }
}

// ---------------------------------------------------------------- smoke skull (photo scene)
// The smoke-skull-in-a-mirror image, surfacing slowly out of black and sinking back.
class SmokeSkullScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 30;
    this.img = IMAGES['skull-mirror'];
    this.breath = rand(TAU);
  }
  update(dt, t) { this.breath += dt; }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#000');
    // fast fade in over 1.5s, hold clearly for most of the scene, fast fade out over the last 1.5s
    let a = clamp01(t / 1.5) * clamp01((this.duration - t) / 1.5);
    a = Math.min(1, a) * (0.92 + 0.06 * Math.sin(this.breath * 0.8));   // near-full, faint breathing
    if (!drawCover(ctx, this.img, W, H, a)) { drawStatic(ctx, W, H, 0.15, 3); return; }
    vignette(ctx, W, H, 0.85);
    // occasional interference flicker so it never looks like a still photo
    if (Math.random() < 0.05) drawStatic(ctx, W, H, 0.05, 3);
    if (t > 4 && t < this.duration - 3) {
      ctx.font = `${H * 0.055}px ${FONT_SERIF}`; ctx.fillStyle = '#c9c9d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = clamp01((t - 4) / 1.5) * clamp01((this.duration - 3 - t) / 1.5) * (0.4 + 0.25 * noise(t));
      ctx.fillText('WHO IS WATCHING YOU', W / 2, H * 0.9); ctx.globalAlpha = 1;
    }
  }
}

function registerScenes3(show) {
  show.register('static', s => new StaticScene(s));
  show.register('bloodwords', s => new BloodWordsScene(s));
  show.register('scratch', s => new ScratchScene(s));
  show.register('counter', s => new CounterScene(s));
  show.register('surveillance', s => new SurveillanceScene(s));
  show.register('stalker', s => new StalkerScene(s));
  show.register('heartbeat', s => new HeartbeatScene(s));
  show.register('eyewall', s => new EyeWallScene(s));
  show.register('smokeskull', s => new SmokeSkullScene(s));
  // Song-change announcement. The text is set by main.js just before it cuts here.
  show.register('announce', s => new BloodAnnounceScene(s, s.announceText || 'THE MUSIC CHANGED'));
}
