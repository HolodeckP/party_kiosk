'use strict';
// Scenes, part 2: wisps, hands, messages, skulls, ouija, clock, vortex, candles

class WispScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0.9;
    this.horizon = H * 0.66;
    const cols = [[120, 255, 220], [120, 255, 120], [255, 170, 60], [160, 200, 255]];
    this.wisps = Array.from({ length: 12 }, () => ({ x: rand(W), y: rand(H * 0.1, this.horizon), s: rand(100), c: pick(cols), r: rand(14, 34), trail: [] }));
    this.reeds = Array.from({ length: 40 }, () => ({ x: rand(W), h: rand(H * 0.05, H * 0.16), bend: rand(-0.3, 0.3), s: rand(100) }));
    this.skull = { x: rand(W * 0.2, W * 0.8), vx: rand(-12, 12), r: H * 0.06 };
  }
  update(dt, t) {
    const { W, H } = this;
    for (const w of this.wisps) {
      w.x += noise(t * 0.35 + w.s) * 60 * dt; w.y += noise(t * 0.3 + w.s + 40) * 40 * dt;
      w.x = (w.x + W) % W; w.y = clamp(w.y, H * 0.05, this.horizon - 10);
      w.trail.unshift([w.x, w.y]); if (w.trail.length > 14) w.trail.pop();
    }
    this.skull.x += this.skull.vx * dt; if (this.skull.x < W * 0.1 || this.skull.x > W * 0.9) this.skull.vx *= -1;
  }
  draw(ctx, t) {
    const { W, H } = this; const hz = this.horizon;
    skyGradient(ctx, W, H, '#02140d', '#031f12', 0.66);
    const g = ctx.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#02160c'); g.addColorStop(1, '#000'); ctx.fillStyle = g; ctx.fillRect(0, hz, W, H - hz);
    // reflections
    ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip();
    for (const w of this.wisps) { const ry = hz + (hz - w.y) * 0.5; drawGlow(ctx, w.x + Math.sin(t * 3 + ry) * 4, ry, w.r * 2.5, w.c, 0.25); }
    ctx.restore();
    // skull half submerged
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hz + 2); ctx.clip();
    drawSkull(ctx, this.skull.x, hz + this.skull.r * 0.35 + Math.sin(t) * 4, this.skull.r, 0.8 + 0.2 * Math.sin(t * 3), Math.sin(t * 0.5) * 0.15);
    ctx.restore();
    drawGlow(ctx, this.skull.x, hz, this.skull.r * 2, [80, 255, 120], 0.3, 0.1);
    // water lines
    ctx.strokeStyle = 'rgba(120,200,160,0.12)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) { const y = hz + 10 + i * (H - hz) / 12; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.01 + t * 1.5 + i) * 3); ctx.stroke(); }
    // reeds
    ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
    for (const r of this.reeds) { ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r.x, hz + 8); ctx.quadraticCurveTo(r.x + r.bend * r.h + Math.sin(t + r.s) * 6, hz - r.h * 0.6, r.x + r.bend * r.h * 2 + Math.sin(t + r.s) * 10, hz - r.h); ctx.stroke(); }
    // wisps
    for (const w of this.wisps) {
      for (let i = w.trail.length - 1; i > 0; i--) { const k = 1 - i / w.trail.length; drawGlow(ctx, w.trail[i][0], w.trail[i][1], w.r * (0.4 + k * 0.6), w.c, 0.18 * k, 0.4); }
      const pulse = 0.8 + 0.2 * Math.sin(t * 4 + w.s);
      drawGlow(ctx, w.x, w.y, w.r * 3.5 * pulse, w.c, 0.55, 0.12);
      drawGlow(ctx, w.x, w.y, w.r * 0.9, [255, 255, 255], 0.9, 0.5);
    }
  }
}

class HandsScene extends Scene {
  constructor(show) { super(show); this.fog = 0.35; this.hands = []; this.scratches = []; this.nextHand = 0.5; }
  update(dt, t) {
    const { W, H } = this;
    this.nextHand -= dt;
    if (this.nextHand <= 0 && this.hands.length < 9) {
      const edge = pick([0, 0, 0, 1, 2, 3]);
      this.hands.push({ edge, pos: rand(0.08, 0.92), s: rand(H * 0.05, H * 0.11), k: 0, phase: 'in', speed: rand(0.2, 0.45), hold: rand(2, 5), reach: rand(0.3, 0.55), seed: rand(100), scratched: false });
      this.nextHand = rand(1.2, 3);
    }
    for (const h of this.hands) {
      if (h.phase === 'in') { h.k = Math.min(1, h.k + dt * h.speed); if (h.k >= 1) { h.phase = 'hold'; } }
      else if (h.phase === 'hold') {
        h.hold -= dt;
        if (!h.scratched && Math.random() < dt * 0.6) { h.scratched = true; const p = this.handPos(h); for (let i = 0; i < 3; i++) this.scratches.push({ x: p.tipX + i * h.s * 0.2 - h.s * 0.2, y: p.tipY, len: h.s * rand(1.2, 2.2), a: 1, dir: p.dir }); }
        if (h.hold <= 0) h.phase = 'out';
      } else { h.k -= dt * h.speed * 1.5; }
    }
    this.hands = this.hands.filter(h => h.k > 0);
    for (const s of this.scratches) s.a -= dt * 0.4;
    this.scratches = this.scratches.filter(s => s.a > 0);
  }
  handPos(h) {
    const { W, H } = this; const e = easeOut(h.k);
    const off = h.s * 1.1 + e * h.reach * (h.edge === 1 || h.edge === 2 ? W : H) - h.s * 1.1;
    switch (h.edge) {
      case 0: return { x: h.pos * W, y: H - off + h.s * 1.1, a: 0, dir: 0, tipX: h.pos * W, tipY: H - off };
      case 1: return { x: off - h.s * 1.1, y: h.pos * H, a: Math.PI / 2, dir: 1, tipX: off, tipY: h.pos * H };
      case 2: return { x: W - off + h.s * 1.1, y: h.pos * H, a: -Math.PI / 2, dir: 2, tipX: W - off, tipY: h.pos * H };
      default: return { x: h.pos * W, y: off - h.s * 1.1, a: Math.PI, dir: 3, tipX: h.pos * W, tipY: off };
    }
  }
  draw(ctx, t) {
    const { W, H } = this;
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, '#343a52'); g.addColorStop(1, '#0a0a12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.lineCap = 'round';
    for (const s of this.scratches) {
      ctx.strokeStyle = `rgba(235,235,250,${s.a * 0.8})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s.x, s.y);
      if (s.dir === 0) ctx.lineTo(s.x + 6, s.y + s.len); else if (s.dir === 3) ctx.lineTo(s.x + 6, s.y - s.len); else if (s.dir === 1) ctx.lineTo(s.x - s.len, s.y + 6); else ctx.lineTo(s.x + s.len, s.y + 6);
      ctx.stroke();
    }
    for (const h of this.hands) { const p = this.handPos(h); drawHand(ctx, p.x, p.y, h.s, p.a + Math.sin(t + h.seed) * 0.06, t * 1.3 + h.seed, '#07070c', 3.5); }
  }
}

class MessageScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0.1;
    this.queue = shuffle(CONFIG.MESSAGES.slice());
    this.state = 'gap'; this.timer = 0.8; this.canvas = null; this.red = false;
  }
  renderText(msg) {
    const { W, H } = this; const oc = document.createElement('canvas'); oc.width = W; oc.height = H;
    const g = oc.getContext('2d');
    const words = msg.split(' '); const lines = [];
    let line = '';
    g.font = `100px ${FONT_CREEPY}`;
    const maxW = W * 0.9;
    for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width * (H * 0.22 / 100) > maxW && line) { lines.push(line); line = w; } else line = test; }
    lines.push(line);
    let size = H * (lines.length > 1 ? 0.2 : 0.26);
    for (const l of lines) size = Math.min(size, fitFontSize(g, l, FONT_CREEPY, maxW, size));
    g.font = `${size}px ${FONT_CREEPY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = this.red ? '#e01010' : '#ececf4';
    lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
    return oc;
  }
  update(dt, t) {
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.state === 'gap') {
      this.state = 'static'; this.timer = rand(0.25, 0.45); this.red = Math.random() < 0.4;
      const live = (window.messageWall ? window.messageWall.liveMessages() : CONFIG.MESSAGES);
      // A line about the song currently playing jumps the queue, and comes up in red.
      const music = window.messageWall ? window.messageWall.takeMusicLine() : null;
      let msg;
      if (music) { msg = music; this.red = true; }
      else {
        if (!this.queue.length) this.queue = shuffle(live.slice());
        msg = this.queue.pop();
        if (!msg || !live.includes(msg)) msg = pick(live);
      }
      this.current = msg; this.canvas = this.renderText(msg);
    }
    else if (this.state === 'static') { this.state = 'show'; this.timer = rand(3.2, 5); this.showT = 0; }
    else if (this.state === 'show') { this.state = 'off'; this.timer = 0.25; }
    else { this.state = 'gap'; this.timer = rand(1.2, 2.5); }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#000');
    if (this.state === 'static' || this.state === 'off') { drawStatic(ctx, W, H, this.state === 'off' ? 0.5 : 0.9, 3); return; }
    if (this.state !== 'show' || !this.canvas) return;
    const flick = 0.7 + 0.3 * Math.max(0, noise(t * 9, 3)); const glitchy = Math.random() < 0.18;
    ctx.save(); ctx.globalAlpha = flick;
    if (glitchy) {
      ctx.globalAlpha = 0.6; ctx.drawImage(this.canvas, rand(-10, 10) - 6, rand(-4, 4), W, H);
      ctx.globalAlpha = 0.4; ctx.drawImage(this.canvas, rand(-10, 10) + 6, rand(-4, 4), W, H);
      const slices = randInt(3, 7);
      for (let i = 0; i < slices; i++) { const sy = rand(H * 0.25, H * 0.75), sh = rand(6, 40), dx = rand(-W * 0.04, W * 0.04); ctx.globalAlpha = 1; ctx.drawImage(this.canvas, 0, sy, W, sh, dx, sy, W, sh); }
      ctx.globalAlpha = 0.7;
    }
    ctx.drawImage(this.canvas, 0, 0, W, H);
    ctx.restore();
    if (glitchy) drawStatic(ctx, W, H, 0.12, 3);
  }
}

// A pit of skulls surfacing out of blackness. No warm red glow, no embers: cold bone
// in near-dark, drifting up slowly, some lunging toward the viewer, faint dust in the air.
class SkullScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0.15;
    this.skulls = []; for (let i = 0; i < 6; i++) this.skulls.push(this.newSkull(true));
    this.dust = Array.from({ length: 36 }, () => ({ x: rand(W), y: rand(H), v: rand(4, 14), s: rand(100), r: rand(1, 2.5) }));
    this.nextLunge = rand(4, 9);
  }
  newSkull(any) {
    const { W, H } = this; const r = rand(H * 0.06, H * 0.17);
    let x = rand(r, W - r), y = rand(r, H - r);
    for (let tries = 0; tries < 20; tries++) {
      x = rand(r, W - r); y = rand(r, H - r);
      if (!(this.skulls || []).some(o => o.t < o.life && Math.hypot(o.x - x, o.y - y) < (o.r + r) * 1.15)) break;
    }
    // lunge: a skull that rushes bigger and closer, then fades. eyes stay dark until close.
    return { x, y, r, r0: r, rot: rand(-0.25, 0.25), vr: rand(-0.08, 0.08),
      t: any ? rand(0, 7) : 0, life: rand(9, 15), seed: rand(100), vy: rand(-6, 6),
      lunge: false };
  }
  startLunge() {
    const { W, H } = this; const s = pick(this.skulls);
    s.lunge = true; s.t = 0; s.life = 2.0; s.x = rand(W * 0.35, W * 0.65); s.y = rand(H * 0.42, H * 0.58);
    s.r0 = H * 0.08; s.rtarget = H * 0.66; s.rot = rand(-0.12, 0.12); s.vr = rand(-0.03, 0.03); s.seed = rand(100);
  }
  update(dt, t) {
    this.nextLunge -= dt;
    if (this.nextLunge <= 0) { this.startLunge(); this.nextLunge = rand(5, 11); }
    for (const s of this.skulls) {
      s.t += dt; s.rot += s.vr * dt;
      if (s.lunge) { s.r = lerp(s.r0, s.rtarget, easeOut(clamp01(s.t / 0.45))); }   // fast rush in, decelerating
      else { s.y += s.vy * dt; }
      if (s.t > s.life) Object.assign(s, this.newSkull(false));
    }
    for (const d of this.dust) { d.y -= d.v * dt; d.x += noise(t + d.s) * 10 * dt; if (d.y < -6) { d.y = this.H + 6; d.x = rand(this.W); } }
  }
  draw(ctx, t) {
    const { W, H } = this;
    // near-black cold wash, a faint grey pool of light low-centre so skulls rise out of dark
    fillScreen(ctx, W, H, '#040406');
    const g = ctx.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, Math.max(W, H) * 0.65);
    g.addColorStop(0, 'rgba(26,28,34,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // faint drifting dust (cold grey, not embers)
    ctx.fillStyle = 'rgba(150,155,165,0.12)';
    for (const d of this.dust) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); }
    // skulls: cold bone, darkened, eyes stay black except a lunge flickers to dim at the end
    for (const s of this.skulls) {
      const a = s.lunge ? clamp01(s.t / 0.25) * clamp01((s.life - s.t) / 0.6)
                        : Math.min(1, s.t / 2.5, (s.life - s.t) / 2.5);
      if (a <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a * (s.lunge ? 1 : 0.9);
      const eye = s.lunge && s.t > 0.9 ? 0.35 : 0;   // only a lunging skull's eyes glow, faint and cold
      drawSkull(ctx, s.x, s.y, s.r, 0, s.rot);
      // cold grey-blue tint over the warm bone, and shadow to sink it into the dark
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = '#6a7080'; ctx.beginPath(); ctx.ellipse(s.x, s.y - s.r * 0.15, s.r * 0.95, s.r * 1.05, 0, 0, TAU); ctx.fill();
      ctx.restore();
      if (eye > 0) { ctx.save(); ctx.globalAlpha = a; drawGlow(ctx, s.x - s.r * 0.36, s.y - s.r * 0.1, s.r * 0.26, [180, 200, 220], eye, 0.4); drawGlow(ctx, s.x + s.r * 0.36, s.y - s.r * 0.1, s.r * 0.26, [180, 200, 220], eye, 0.4); ctx.restore(); }
    }
    vignette(ctx, W, H, 0.75);
  }
}

class OuijaScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0.15;
    this.m = Math.min(W, H) * 0.06;
    this.letters = {};
    const bw = W - 2 * this.m, bh = H - 2 * this.m, cx = W / 2;
    const arc = (chars, cy, rx, ry, a0, a1) => { chars.split('').forEach((ch, i) => { const a = lerp(a0, a1, i / (chars.length - 1)); this.letters[ch] = { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }; }); };
    arc('ABCDEFGHIJKLM', H * 0.78, bw * 0.44, bh * 0.52, Math.PI * 1.08, Math.PI * 1.92);
    arc('NOPQRSTUVWXYZ', H * 0.78, bw * 0.33, bh * 0.34, Math.PI * 1.16, Math.PI * 1.84);
    '1234567890'.split('').forEach((ch, i) => { this.letters[ch] = { x: cx + (i - 4.5) * bw * 0.07, y: H * 0.735 }; });
    this.letters['YES'] = { x: this.m + bw * 0.14, y: this.m + bh * 0.17 };
    this.letters['NO'] = { x: W - this.m - bw * 0.14, y: this.m + bh * 0.17 };
    this.letters['GOODBYE'] = { x: cx, y: H - this.m - bh * 0.1 };
    this.fontSize = Math.min(bw * 0.045, bh * 0.09);
    this.words = shuffle(CONFIG.OUIJA_WORDS.slice());
    this.plan = { x: cx, y: H * 0.5, fx: cx, fy: H * 0.5, tx: cx, ty: H * 0.5, t: 1, dur: 1.2 };
    this.spelled = ''; this.target = null; this.wait = 1.5; this.seq = []; this.spelledAlpha = 1;
    this.candles = [[this.m * 0.5, this.m * 0.5], [W - this.m * 0.5, this.m * 0.5], [this.m * 0.5, H - this.m * 0.5], [W - this.m * 0.5, H - this.m * 0.5]];
  }
  // Next thing to point at. Messages posted from phones (CONFIG.OUIJA_QUEUE) come before the stock words.
  nextTarget() {
    if (!this.seq.length) {
      if (this.spelled && !this.saidBye) { this.seq = ['GOODBYE']; this.saidBye = true; }
      else if (CONFIG.OUIJA_QA && CONFIG.OUIJA_QA.length) {
        // A guest asked the board a question from their phone: show the question and
        // spell the answer. A plain YES or NO points at the board's own YES/NO instead.
        if (this.posted) { window.dispatchEvent(new CustomEvent('ouija-done', { detail: this.posted })); this.posted = null; }
        const qa = CONFIG.OUIJA_QA.shift();
        this.question = qa.q;
        const bare = String(qa.a || 'ASK AGAIN').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/ +/g, ' ').trim();
        if (bare === 'YES' || bare === 'NO') { this.seq = [bare]; this.fast = false; }
        else {
          const n = bare.replace(/[^A-Z0-9]/g, '').length;
          this.fast = n > 10;
          this.seq = bare.split('');
        }
        const need = this.show.sceneTime + 3 + this.seq.length * (this.fast ? 0.95 : 1.6) + 8;
        if (this.show.sceneDuration < need) this.show.sceneDuration = Math.min(need, 120);
        this.spelled = ''; this.saidBye = false; this.spelledAlpha = 1; this.spelledPosted = true;
      }
      else {
        if (this.posted) { window.dispatchEvent(new CustomEvent('ouija-done', { detail: this.posted })); this.posted = null; }
        let word;
        if (CONFIG.OUIJA_QUEUE && CONFIG.OUIJA_QUEUE.length) {
          word = CONFIG.OUIJA_QUEUE.shift(); this.posted = word;
          const n = word.replace(/[^A-Z0-9]/gi, '').length;
          this.fast = n > 10;
          // keep the scene alive long enough to finish spelling it
          const need = this.show.sceneTime + 3 + n * (this.fast ? 0.95 : 1.6) + 8;
          if (this.show.sceneDuration < need) this.show.sceneDuration = Math.min(need, 120);
        } else {
          if (!this.words.length) this.words = shuffle(CONFIG.OUIJA_WORDS.slice());
          word = this.words.pop(); this.fast = false;
          // a posted message just finished and nothing else is waiting: wrap the scene up soon
          if (this.spelledPosted) { this.spelledPosted = false; this.show.sceneDuration = Math.min(this.show.sceneDuration, this.show.sceneTime + 6); }
        }
        this.seq = word.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/ +/g, ' ').trim().split('');
        this.spelled = ''; this.saidBye = false; this.spelledAlpha = 1;
        if (this.posted) this.spelledPosted = true;
      }
    }
    const key = this.seq.shift();
    if (key === ' ') { this.spelled += ' '; this.target = null; this.wait = 0.35; this.plan.t = 1; return; }
    const p = this.letters[key]; if (!p) return;
    const pl = this.plan; pl.fx = pl.x; pl.fy = pl.y; pl.tx = p.x + rand(-6, 6); pl.ty = p.y + rand(-6, 6); pl.t = 0;
    pl.dur = this.fast ? clamp(Math.hypot(pl.tx - pl.fx, pl.ty - pl.fy) / 1100, 0.3, 0.9) : clamp(Math.hypot(pl.tx - pl.fx, pl.ty - pl.fy) / 500, 0.7, 2.2);
    this.target = key;
  }
  update(dt, t) {
    const pl = this.plan;
    if (pl.t < 1) { pl.t = Math.min(1, pl.t + dt / pl.dur); const k = easeInOut(pl.t); pl.x = lerp(pl.fx, pl.tx, k); pl.y = lerp(pl.fy, pl.ty, k); if (pl.t >= 1) { this.wait = this.target === 'GOODBYE' ? 2.5 : (this.fast ? 0.45 : 0.9); this.landed = 0.01; } }
    else {
      if (this.landed) { this.landed += dt; if (this.landed > 0.3 && this.target && this.target !== 'GOODBYE' && !this.added) { this.spelled += this.target; this.added = true; } }
      if (this.target === 'GOODBYE' && this.wait < 1.5) this.spelledAlpha = Math.max(0, this.spelledAlpha - dt);
      this.wait -= dt; if (this.wait <= 0) { this.added = false; this.landed = 0; this.nextTarget(); }
    }
    pl.x += Math.sin(t * 7) * 0.4; pl.y += Math.cos(t * 6) * 0.4;
  }
  draw(ctx, t) {
    const { W, H } = this; const m = this.m;
    fillScreen(ctx, W, H, '#0a0603');
    for (const c of this.candles) drawGlow(ctx, c[0], c[1], W * 0.25, [255, 150, 60], 0.35 + 0.08 * noise(t * 4, c[0]), 0.1);
    // board
    ctx.fillStyle = '#c9a265'; ctx.beginPath(); ctx.roundRect(m, m, W - 2 * m, H - 2 * m, m * 0.4); ctx.fill();
    ctx.strokeStyle = '#5c3b17'; ctx.lineWidth = m * 0.18; ctx.beginPath(); ctx.roundRect(m * 1.3, m * 1.3, W - 2.6 * m, H - 2.6 * m, m * 0.3); ctx.stroke();
    const wood = ctx.createLinearGradient(0, 0, W, H); wood.addColorStop(0, 'rgba(0,0,0,0)'); wood.addColorStop(0.5, 'rgba(80,40,0,0.15)'); wood.addColorStop(1, 'rgba(0,0,0,0.1)'); ctx.fillStyle = wood; ctx.fillRect(m, m, W - 2 * m, H - 2 * m);
    // sun and moon decorations
    ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 3; ctx.fillStyle = '#3b2412';
    const sx = m + (W - 2 * m) * 0.3, sy = m * 2.3; ctx.beginPath(); ctx.arc(sx, sy, m * 0.55, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * m * 0.7, sy + Math.sin(a) * m * 0.7); ctx.lineTo(sx + Math.cos(a) * m * 0.95, sy + Math.sin(a) * m * 0.95); ctx.stroke(); }
    const mx = W - m - (W - 2 * m) * 0.3, my = sy; ctx.beginPath(); ctx.arc(mx, my, m * 0.6, 0.6, TAU - 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(mx + m * 0.35, my, m * 0.5, Math.PI * 0.75, Math.PI * 1.25, true); ctx.stroke();
    // letters
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [k, p] of Object.entries(this.letters)) {
      const big = k.length > 1; const hot = this.target === k && this.plan.t >= 1;
      ctx.font = `${big ? 'bold ' : ''}${this.fontSize * (big ? 0.85 : 1) * (hot ? 1.25 : 1)}px ${FONT_SERIF}`;
      if (hot) { drawGlow(ctx, p.x, p.y, this.fontSize * 1.6, [255, 60, 20], 0.7, 0.3); ctx.fillStyle = '#7a0a0a'; } else ctx.fillStyle = '#2d1a0a';
      ctx.fillText(k === 'GOODBYE' ? 'GOOD BYE' : k, p.x, p.y);
    }
    // planchette
    const pl = this.plan; const ps = this.fontSize * 1.9;
    ctx.save(); ctx.translate(pl.x, pl.y); ctx.rotate(Math.sin(t * 0.8) * 0.1);
    ctx.beginPath(); ctx.moveTo(0, -ps * 1.1); ctx.quadraticCurveTo(ps * 1.1, -ps * 0.4, ps * 0.9, ps * 0.5); ctx.quadraticCurveTo(ps * 0.4, ps * 1.05, 0, ps * 0.9); ctx.quadraticCurveTo(-ps * 0.4, ps * 1.05, -ps * 0.9, ps * 0.5); ctx.quadraticCurveTo(-ps * 1.1, -ps * 0.4, 0, -ps * 1.1); ctx.closePath();
    ctx.arc(0, 0, ps * 0.42, 0, TAU, true);
    ctx.fillStyle = 'rgba(55,28,10,0.82)'; ctx.fill('evenodd'); ctx.strokeStyle = '#1e0f05'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, ps * 0.42, 0, TAU); ctx.stroke();
    ctx.restore();
    // candles
    for (const c of this.candles) { const f = 0.8 + 0.2 * noise(t * 6, c[1]); drawGlow(ctx, c[0], c[1] - 10, 26 * f, [255, 220, 120], 0.9, 0.5); ctx.fillStyle = '#efe2c0'; ctx.fillRect(c[0] - 9, c[1], 18, m * 0.45); }
    // the asked question, small above the answer, while a Q&A is being spelled
    if (this.question) {
      ctx.save(); ctx.globalAlpha = this.spelledAlpha;
      let qf = this.fontSize * 0.75;
      const qt = 'THEY ASK: ' + this.question;
      qf = Math.min(qf, fitFontSize(ctx, qt, FONT_SERIF, W * 0.72, qf));
      ctx.font = `italic ${qf}px ${FONT_SERIF}`; ctx.fillStyle = '#3b2412';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(qt, W / 2, H * 0.165);
      ctx.restore();
    }
    // spelled word(s); long posted messages wrap onto two lines
    if (this.spelled.trim()) {
      const txt = this.spelled.trim(); let lines = [txt];
      if (txt.length > 22) { const cut = txt.lastIndexOf(' ', Math.ceil(txt.length / 2) + 4); if (cut > 0) lines = [txt.slice(0, cut), txt.slice(cut + 1)]; }
      let fs = this.fontSize * 1.3;
      ctx.font = `${fs}px ${FONT_CREEPY}`;
      for (const l of lines) fs = Math.min(fs, fitFontSize(ctx, l, FONT_CREEPY, W * 0.78, fs));
      const y0 = H * 0.27 - (lines.length - 1) * fs * 0.5;
      ctx.save(); ctx.globalAlpha = this.spelledAlpha; ctx.font = `${fs}px ${FONT_CREEPY}`; ctx.fillStyle = '#8a0c0c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      drawGlow(ctx, W / 2, y0 + (lines.length - 1) * fs * 0.5, W * 0.22, [255, 40, 10], 0.25, 0.1);
      lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * fs * 0.95));
      ctx.restore();
    }
  }
}

class ClockScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0.35; this.duration = 34;
    this.R = Math.min(W, H) * 0.4; this.cx = W / 2; this.cy = H / 2;
    // Strike a different hour each time, not always midnight. The caption comes from the
    // LLM pool when one is available (see CONFIG.CLOCK_LINES), otherwise from the stock list.
    this.strikeHour = randInt(1, 12);
    this.caption = (window.messageWall && window.messageWall.takeClockLine)
      ? window.messageWall.takeClockLine(this.strikeHour)
      : null;
    if (!this.caption) {
      const hourWord = ['TWELVE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX',
                        'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN'][this.strikeHour % 12];
      this.caption = pick([
        this.strikeHour === 12 ? 'MIDNIGHT' : hourWord + " O'CLOCK",
        'THE HOUR HAS COME', 'TOO LATE NOW', 'TIME IS UP',
        'IT IS ALREADY INSIDE', 'NO ONE LEAVES', 'YOUR HOUR',
      ]);
    }
    // Start just before the strike so the hands race to it.
    this.targetMinutes = this.strikeHour * 60;
    this.minutes = this.targetMinutes - 9; this.seconds = 0;
    this.struck = false; this.shake = 0; this.rings = []; this.cracks = [];
    this.drips = Array.from({ length: 12 }, (_, i) => ({ a: i * TAU / 12 - Math.PI / 2, l: 0, max: rand(this.R * 0.3, this.R * 0.9), v: rand(20, 60) }));
  }
  update(dt, t) {
    if (t < 6) { this.seconds += dt; }
    else if (!this.struck) {
      const k = clamp01((t - 6) / 7); const speed = lerp(1, 400, easeIn(k));
      this.seconds += dt * speed;
      if (this.minutes + this.seconds / 60 >= this.targetMinutes) { this.minutes = this.targetMinutes; this.seconds = 0; this.struck = true; this.strikeT = t; this.shake = 1; this.rings = [0, -0.4, -0.8]; this.cracks = this.makeCracks(); }
    } else {
      this.shake = Math.max(0, this.shake - dt * 0.6);
      this.rings = this.rings.map(r => r + dt * 0.8).filter(r => r < 1.6);
      if (t > this.strikeT + 1.5) this.seconds -= dt * 900; // hands spin backwards
      if (t > this.strikeT + 4) for (const d of this.drips) d.l = Math.min(d.max, d.l + d.v * dt);
    }
    while (this.seconds >= 60) { this.seconds -= 60; this.minutes++; }
  }
  makeCracks() {
    const out = [];
    for (let i = 0; i < 7; i++) { const a = rand(TAU); const pts = [[0, 0]]; let r = 0, aa = a; while (r < this.R * rand(0.6, 1)) { r += rand(this.R * 0.05, this.R * 0.15); aa += rand(-0.5, 0.5); pts.push([Math.cos(aa) * r, Math.sin(aa) * r]); } out.push(pts); }
    return out;
  }
  draw(ctx, t) {
    const { W, H } = this; const R = this.R;
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, '#22172c'); g.addColorStop(1, '#000'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(this.cx + (this.shake ? rand(-25, 25) * this.shake : 0), this.cy + (this.shake ? rand(-25, 25) * this.shake : 0));
    for (const r of this.rings) if (r > 0) { ctx.strokeStyle = `rgba(255,255,255,${(1 - r / 1.6) * 0.6})`; ctx.lineWidth = 14 * (1 - r / 1.6); ctx.beginPath(); ctx.arc(0, 0, R * (1 + r * 1.2), 0, TAU); ctx.stroke(); }
    drawGlow(ctx, 0, 0, R * 1.5, [255, 240, 200], 0.2, 0.3);
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(0, 0, R * 1.08, 0, TAU); ctx.fill();
    ctx.fillStyle = '#efe6d0'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a10'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${R * 0.15}px ${FONT_SERIF}`;
    const roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    roman.forEach((n, i) => { const a = i * TAU / 12 - Math.PI / 2; ctx.fillText(n, Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); });
    for (let i = 0; i < 60; i++) { const a = i * TAU / 60; ctx.lineWidth = i % 5 ? 2 : 5; ctx.strokeStyle = '#2a1a10'; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); ctx.lineTo(Math.cos(a) * R * (i % 5 ? 0.96 : 0.97), Math.sin(a) * R * (i % 5 ? 0.96 : 0.97)); ctx.stroke(); }
    // blood drips from numerals
    if (this.struck) { ctx.strokeStyle = '#9b0000'; ctx.lineCap = 'round'; ctx.lineWidth = R * 0.03; for (const d of this.drips) { if (d.l <= 0) continue; const x = Math.cos(d.a) * R * 0.8, y = Math.sin(d.a) * R * 0.8 + R * 0.08; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + d.l); ctx.stroke(); ctx.fillStyle = '#9b0000'; ctx.beginPath(); ctx.arc(x, y + d.l, R * 0.022, 0, TAU); ctx.fill(); } }
    // hands
    const total = this.minutes + this.seconds / 60; const ha = (total / 60) % 12 * TAU / 12 - Math.PI / 2, ma = (total % 60) * TAU / 60 - Math.PI / 2, sa = (this.seconds % 60) * TAU / 60 - Math.PI / 2;
    ctx.strokeStyle = '#1a0f08'; ctx.lineCap = 'round';
    ctx.lineWidth = R * 0.06; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ha) * R * 0.5, Math.sin(ha) * R * 0.5); ctx.stroke();
    ctx.lineWidth = R * 0.04; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ma) * R * 0.75, Math.sin(ma) * R * 0.75); ctx.stroke();
    ctx.strokeStyle = '#b00000'; ctx.lineWidth = R * 0.015; ctx.beginPath(); ctx.moveTo(-Math.cos(sa) * R * 0.15, -Math.sin(sa) * R * 0.15); ctx.lineTo(Math.cos(sa) * R * 0.85, Math.sin(sa) * R * 0.85); ctx.stroke();
    ctx.fillStyle = '#1a0f08'; ctx.beginPath(); ctx.arc(0, 0, R * 0.05, 0, TAU); ctx.fill();
    // cracks
    if (this.cracks.length) { ctx.strokeStyle = '#0c0806'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; for (const c of this.cracks) { ctx.beginPath(); ctx.moveTo(0, 0); for (const p of c) ctx.lineTo(p[0], p[1]); ctx.stroke(); } }
    ctx.restore();
    if (this.struck) {
      const k = t - this.strikeT;
      if (k < 0.4 && CONFIG.FLASHES) fillScreen(ctx, W, H, '#fff', 1 - k / 0.4);
      if (k > 0.8) {
        const a = Math.min(1, (k - 0.8) / 1.5) * (0.75 + 0.25 * Math.sin(t * 6));
        const size = fitFontSize(ctx, this.caption, FONT_CREEPY, W * 0.9, H * 0.3);
        ctx.save(); ctx.globalAlpha = a; ctx.font = `${size}px ${FONT_CREEPY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        drawGlow(ctx, W / 2, H / 2, W * 0.4, [200, 0, 0], 0.6, 0.1);
        ctx.fillStyle = '#c00000'; ctx.fillText(this.caption, W / 2 + rand(-3, 3), H / 2 + rand(-3, 3));
        ctx.restore();
      }
    }
  }
}

class VortexScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0;
    this.maxR = Math.hypot(W, H) / 2; this.cols = ['#7a1fe0', '#2fe36b', '#ff6a00'];
    this.objs = Array.from({ length: 7 }, () => this.newObj(true));
  }
  newObj(any) { return { a: rand(TAU), r: any ? rand(0.2, 1) : 1, s: rand(0.04, 0.08), type: pick(['skull', 'skull', 'pumpkin', 'bat']), face: { eyes: randInt(0, 3), mouth: randInt(0, 3) } }; }
  update(dt, t) {
    for (const o of this.objs) { o.r -= dt * 0.11; o.a += dt * (0.6 + (1 - o.r) * 2.5); if (o.r < 0.03) Object.assign(o, this.newObj(false)); }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#000');
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.lineCap = 'butt';
    const step = this.maxR / 46;
    for (let i = 1; i <= 46; i++) {
      const r = i * step; ctx.lineWidth = step * 0.72; ctx.strokeStyle = this.cols[i % 3];
      ctx.setLineDash([r * 1.1, r * 1.1]); ctx.lineDashOffset = -(t * 160 + r * 2.6 + i * 10);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    }
    ctx.setLineDash([]);
    drawGlow(ctx, 0, 0, this.maxR * 0.35, [0, 0, 0], 1, 0.6);
    drawGlow(ctx, 0, 0, this.maxR * 0.12 * (1 + 0.1 * Math.sin(t * 5)), [220, 120, 255], 0.9, 0.3);
    for (const o of this.objs) {
      const x = Math.cos(o.a) * o.r * this.maxR * 0.85, y = Math.sin(o.a) * o.r * this.maxR * 0.85; const s = o.s * Math.min(W, H) * (0.4 + o.r);
      ctx.save(); ctx.globalAlpha = clamp01(o.r * 4);
      if (o.type === 'skull') drawSkull(ctx, x, y, s, 0.8, o.a + Math.PI / 2);
      else if (o.type === 'pumpkin') { ctx.translate(x, y); ctx.rotate(o.a + Math.PI / 2); drawPumpkin(ctx, 0, 0, s, o.face, 1); }
      else drawBat(ctx, x, y, s * 1.4, Math.sin(t * 14), '#000');
      ctx.restore();
    }
    ctx.restore();
  }
}

class CandleScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0.3;
    this.shelf = H * 0.72;
    const n = 6; this.candles = Array.from({ length: n }, (_, i) => ({ x: W * (i + 0.5 + rand(-0.2, 0.2)) / n, h: rand(H * 0.12, H * 0.3), w: rand(W * 0.02, W * 0.035), lit: 1, seed: rand(100), smoke: [], drips: Array.from({ length: 4 }, () => ({ side: Math.random() < 0.5 ? -1 : 1, y: rand(0.05, 0.6), l: rand(0.05, 0.25) })) }));
    this.nextBlow = rand(5, 9); this.figure = null; this.nextFigure = rand(8, 14);
  }
  update(dt, t) {
    const { W } = this;
    this.nextBlow -= dt;
    if (this.nextBlow <= 0) { const c = pick(this.candles.filter(c => c.lit >= 1)); if (c) { c.lit = 0.99; c.relight = rand(3, 6); for (let i = 0; i < 10; i++) c.smoke.push({ x: c.x, y: this.shelf - c.h - 10, r: 8, a: 0.6, vx: rand(-10, 10), vy: rand(-50, -90), d: i * 0.15 }); } this.nextBlow = rand(6, 11); }
    for (const c of this.candles) {
      if (c.lit < 1 && c.lit > 0) c.lit = Math.max(0, c.lit - dt * 4);
      if (c.lit <= 0) { c.relight -= dt; if (c.relight <= 0) c.lit = 1; }
      for (const s of c.smoke) { if (s.d > 0) { s.d -= dt; continue; } s.x += s.vx * dt; s.y += s.vy * dt; s.r += 20 * dt; s.a -= 0.25 * dt; }
      c.smoke = c.smoke.filter(s => s.a > 0);
    }
    this.nextFigure -= dt;
    if (this.nextFigure <= 0 && !this.figure) { const dir = Math.random() < 0.5 ? 1 : -1; this.figure = { t: 0, dur: rand(5, 8), dir }; this.nextFigure = rand(12, 20); }
    if (this.figure) { this.figure.t += dt; if (this.figure.t > this.figure.dur) this.figure = null; }
  }
  draw(ctx, t) {
    const { W, H } = this; const sh = this.shelf;
    skyGradient(ctx, W, H, '#060302', '#1a0e06');
    for (const c of this.candles) if (c.lit > 0) drawGlow(ctx, c.x, sh - c.h, W * 0.3, [255, 150, 60], 0.35 * c.lit * (0.85 + 0.15 * noise(t * 5, c.seed)), 0.08);
    if (this.figure) {
      const f = this.figure; const k = f.t / f.dur; const x = lerp(f.dir > 0 ? -W * 0.1 : W * 1.1, f.dir > 0 ? W * 1.1 : -W * 0.1, k);
      const fh = H * 0.6; ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.beginPath(); ctx.arc(x, sh - fh, fh * 0.1, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - fh * 0.14, sh - fh * 0.82); ctx.lineTo(x + fh * 0.14, sh - fh * 0.82); ctx.lineTo(x + fh * 0.22, sh + 10); ctx.lineTo(x - fh * 0.22, sh + 10); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#120a05'; ctx.fillRect(0, sh, W, H - sh);
    ctx.fillStyle = '#2a1a0c'; ctx.fillRect(0, sh, W, H * 0.03);
    for (const c of this.candles) {
      const top = sh - c.h;
      ctx.fillStyle = '#efe2c2'; ctx.beginPath(); ctx.roundRect(c.x - c.w / 2, top, c.w, c.h, [c.w * 0.25, c.w * 0.25, 0, 0]); ctx.fill();
      ctx.fillStyle = '#d9c9a2';
      for (const d of c.drips) { ctx.beginPath(); ctx.ellipse(c.x + d.side * c.w * 0.45, top + c.h * d.y, c.w * 0.14, c.h * d.l, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#111'; ctx.fillRect(c.x - 2, top - c.w * 0.3, 4, c.w * 0.3);
      if (c.lit > 0) {
        const fl = c.w * 1.6 * c.lit * (0.85 + 0.15 * noise(t * 7, c.seed)); const sway = noise(t * 3, c.seed + 9) * c.w * 0.3;
        drawGlow(ctx, c.x, top - fl * 0.5, fl * 2.2, [255, 200, 100], 0.85, 0.3);
        ctx.fillStyle = '#ff9a1a'; ctx.beginPath(); ctx.moveTo(c.x - fl * 0.35, top - c.w * 0.3); ctx.quadraticCurveTo(c.x - fl * 0.4 + sway, top - fl * 0.9, c.x + sway * 1.5, top - fl * 1.6); ctx.quadraticCurveTo(c.x + fl * 0.4 + sway, top - fl * 0.9, c.x + fl * 0.35, top - c.w * 0.3); ctx.fill();
        ctx.fillStyle = '#fff4c0'; ctx.beginPath(); ctx.moveTo(c.x - fl * 0.18, top - c.w * 0.3); ctx.quadraticCurveTo(c.x - fl * 0.2 + sway * 0.5, top - fl * 0.6, c.x + sway * 0.8, top - fl * 1.0); ctx.quadraticCurveTo(c.x + fl * 0.2 + sway * 0.5, top - fl * 0.6, c.x + fl * 0.18, top - c.w * 0.3); ctx.fill();
      }
      for (const s of c.smoke) if (s.d <= 0) drawGlow(ctx, s.x, s.y, s.r, [150, 150, 160], s.a, 0.2);
    }
  }
}

function registerScenes(show) {
  show.register('graveyard', s => new GraveyardScene(s));
  show.register('eyes', s => new EyesScene(s));
  show.register('batmoon', s => new BatMoonScene(s));
  show.register('pumpkins', s => new PumpkinScene(s));
  show.register('ghosts', s => new GhostScene(s));
  show.register('spiders', s => new SpiderScene(s));
  show.register('blood', s => new BloodScene(s));
  show.register('house', s => new HouseScene(s));
  show.register('wisps', s => new WispScene(s));
  show.register('hands', s => new HandsScene(s));
  show.register('messages', s => new MessageScene(s));
  show.register('skulls', s => new SkullScene(s));
  show.register('ouija', s => new OuijaScene(s));
  show.register('clock', s => new ClockScene(s));
  show.register('vortex', s => new VortexScene(s));
  show.register('candles', s => new CandleScene(s));
}
