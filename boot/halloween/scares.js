'use strict';
// Jump scares. Each takes over drawing for a few seconds, then hands back to the scene.

class Scare {
  constructor(show, dur) { this.show = show; this.W = show.W; this.H = show.H; this.t = 0; this.dur = dur; this.done = false; }
  update(dt) { this.t += dt; if (this.t >= this.dur) this.done = true; }
  draw(ctx) {}
  // fade back to the scene over the last `len` seconds
  fadeOut(ctx, len = 0.6) { const k = (this.dur - this.t) / len; if (k < 1) fillScreen(ctx, this.W, this.H, '#000', clamp01(k)); else fillScreen(ctx, this.W, this.H, '#000', 1); }
  shake(ctx, amt) { ctx.translate(rand(-amt, amt), rand(-amt, amt)); }
}

class FaceScare extends Scare {
  constructor(show) { super(show, 2.7); this.variant = pick(['ghoul', 'skull', 'scream']); this.x = rand(0.4, 0.6); this.y = rand(0.42, 0.55); }
  draw(ctx) {
    const { W, H, t } = this;
    if (t < 0.1) { fillScreen(ctx, W, H, CONFIG.FLASHES ? '#fff' : '#000'); return; }
    if (t > 2.1) { this.fadeOut(ctx); }
    else {
      fillScreen(ctx, W, H, '#000');
      const k = clamp01((t - 0.1) / 0.5);
      fillScreen(ctx, W, H, '#5a0000', (1 - k) * 0.8);
      const s = lerp(H * 0.15, H * 0.42, easeOut(k)) * (1 + (t > 0.6 ? 0.02 * Math.sin(t * 40) : 0));
      ctx.save(); this.shake(ctx, 30 * (1 - k) + 4); drawScareFace(ctx, W * this.x, H * this.y, s, this.variant, t); ctx.restore();
      if (Math.random() < 0.25) drawStatic(ctx, W, H, 0.15, 3);
    }
  }
}

class EyesScare extends Scare {
  constructor(show) {
    super(show, 3.6); const { W, H } = this;
    this.eyes = Array.from({ length: 42 }, () => ({ x: rand(W * 0.05, W * 0.95), y: rand(H * 0.05, H * 0.95), w: rand(W * 0.02, W * 0.06), slit: Math.random() < 0.5 }));
  }
  draw(ctx) {
    const { W, H, t } = this;
    fillScreen(ctx, W, H, '#000');
    if (t < 0.5) return;
    if (t > 2.95) { this.fadeOut(ctx); return; }
    const open = clamp01((t - 0.5) / 0.08);
    const rush = t > 2.1 ? easeIn(clamp01((t - 2.1) / 0.6)) : 0;
    for (const e of this.eyes) {
      const x = lerp(e.x, W / 2 + (e.x - W / 2) * 3, rush), y = lerp(e.y, H / 2 + (e.y - H / 2) * 3, rush), w = e.w * (1 + rush * 6);
      const lookX = clamp((W / 2 - e.x) / W * 2, -1, 1), lookY = clamp((H / 2 - e.y) / H * 2, -1, 1);
      drawEye(ctx, x - w * 0.75, y, w, open, [255, 30, 20], lookX, lookY, e.slit); drawEye(ctx, x + w * 0.75, y, w, open, [255, 30, 20], lookX, lookY, e.slit);
    }
    if (t > 2.7 && t < 2.95 && CONFIG.FLASHES) fillScreen(ctx, W, H, '#fff', 1 - (t - 2.7) / 0.25);
  }
}

class HandScare extends Scare {
  constructor(show) {
    super(show, 3.2); const { W, H } = this;
    this.side = pick([0, 1, 2]); // 0 bottom, 1 left, 2 right
    this.s = H * 0.26; this.cracks = null;
  }
  pos() {
    const { W, H, t } = this; const k = easeOut(clamp01(t / 0.18)); const slide = t > 1.9 ? easeIn(clamp01((t - 1.9) / 0.8)) : 0;
    const s = this.s;
    if (this.side === 0) return { x: W * 0.5, y: lerp(H + s * 3, H * 0.75, k) + slide * H * 0.8, a: 0.1 };
    if (this.side === 1) return { x: lerp(-s * 3, W * 0.3, k) - slide * W * 0.5, y: H * 0.5 + slide * H * 0.5, a: Math.PI / 2 - 0.2 };
    return { x: lerp(W + s * 3, W * 0.7, k) + slide * W * 0.5, y: H * 0.5 + slide * H * 0.5, a: -Math.PI / 2 + 0.2 };
  }
  draw(ctx) {
    const { W, H, t } = this;
    if (t > 2.6) { this.fadeOut(ctx); return; }
    const k = clamp01(t / 0.18);
    fillScreen(ctx, W, H, '#dfe3ee'); vignette(ctx, W, H, 0.5);
    const p = this.pos();
    if (t >= 0.18 && !this.cracks) { this.cracks = []; for (let i = 0; i < 9; i++) this.cracks.push(makeBolt(p.x, p.y, p.x + Math.cos(i * TAU / 9) * rand(W * 0.25, W * 0.6), p.y + Math.sin(i * TAU / 9) * rand(H * 0.3, H * 0.7), 0.6)); }
    if (this.cracks) { ctx.save(); ctx.lineCap = 'round'; for (const b of this.cracks) for (const seg of b) { ctx.strokeStyle = 'rgba(20,20,40,0.85)'; ctx.lineWidth = 3 * seg.w; ctx.beginPath(); ctx.moveTo(seg.pts[0][0], seg.pts[0][1]); for (const q of seg.pts) ctx.lineTo(q[0], q[1]); ctx.stroke(); } ctx.restore(); }
    // smear
    if (t > 1.9) { ctx.fillStyle = 'rgba(40,40,60,0.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y - (p.y - this.pos0?.y || 0) / 2, this.s * 0.9, this.s * 1.4, 0, 0, TAU); ctx.fill(); }
    ctx.save(); if (t < 0.6) this.shake(ctx, 25 * (1 - clamp01((t - 0.18) / 0.4))); else this.shake(ctx, 2);
    drawHand(ctx, p.x, p.y, this.s, p.a, t * 2, '#0a0a12', 4);
    ctx.restore();
    if (t >= 0.18 && t < 0.3 && CONFIG.FLASHES) fillScreen(ctx, W, H, '#fff', 1 - (t - 0.18) / 0.12);
  }
}

class SpiderScare extends Scare {
  constructor(show) { super(show, 3.1); this.x = rand(0.35, 0.65); }
  draw(ctx) {
    const { W, H, t } = this;
    if (t > 2.5) { this.fadeOut(ctx); return; }
    const s = H * 0.24;
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, '#a9aec4'); g.addColorStop(1, '#2a2c3a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    let y;
    if (t < 0.45) y = lerp(-s * 2, H * 0.5, easeOutBack(clamp01(t / 0.45)));
    else if (t < 1.9) y = H * 0.5 + Math.sin(t * 6) * H * 0.02;
    else y = lerp(H * 0.5, -s * 2.5, easeIn(clamp01((t - 1.9) / 0.5)));
    const x = W * this.x + Math.sin(t * 3) * W * 0.01;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - s * 0.6); ctx.stroke();
    ctx.save(); this.shake(ctx, t < 0.6 ? 10 : 2); drawSpider(ctx, x, y, s, t * 2.5, '#06060a'); ctx.restore();
  }
}

class StaticFaceScare extends Scare {
  constructor(show) { super(show, 3.3); this.variant = pick(['scream', 'ghoul']); }
  draw(ctx) {
    const { W, H, t } = this;
    if (t > 2.7) { this.fadeOut(ctx); return; }
    fillScreen(ctx, W, H, '#000');
    if (t > 0.45 && t < 2.3) {
      ctx.save(); this.shake(ctx, 6);
      drawScareFace(ctx, W / 2 + rand(-8, 8), H * 0.5, H * 0.4, this.variant, t);
      ctx.restore();
      drawStatic(ctx, W, H, 0.45 + 0.2 * Math.random(), 3);
      if (Math.random() < 0.3) { const sy = rand(0, H), sh = rand(20, 120); ctx.drawImage(ctx.canvas, 0, sy * this.show.scale, ctx.canvas.width, sh * this.show.scale, rand(-60, 60), sy, W, sh); }
    } else drawStatic(ctx, W, H, 1, 3);
  }
}

class TextScare extends Scare {
  constructor(show) { super(show, 2.5); this.msg = pick(['BEHIND YOU', 'BOO!', 'LOOK OUT', 'RUN', "DON'T BLINK", 'GOTCHA', 'IT SEES YOU']); }
  draw(ctx) {
    const { W, H, t } = this;
    if (t > 1.9) { this.fadeOut(ctx); return; }
    const phase = Math.floor(t / 0.3) % 2 === 0 && t < 1.8;
    const bright = phase && CONFIG.FLASHES;
    fillScreen(ctx, W, H, bright ? '#fff' : '#000');
    const size = fitFontSize(ctx, this.msg, FONT_CREEPY, W * 0.92, H * 0.4);
    ctx.save(); this.shake(ctx, 8); ctx.font = `${size}px ${FONT_CREEPY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = bright ? '#000' : (phase ? '#fff' : '#e01010'); ctx.fillText(this.msg, W / 2, H / 2); ctx.restore();
  }
}

class LightningFigureScare extends Scare {
  constructor(show) { super(show, 4.4); this.flashes = [0.4, 1.6, 2.7]; this.bolts = this.flashes.map(() => makeBolt(rand(this.W * 0.2, this.W * 0.8), 0, rand(this.W * 0.2, this.W * 0.8), this.H * 0.6)); this.fx = rand(0.4, 0.6); }
  figure(ctx, x, groundY, h) {
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x, groundY - h * 0.92, h * 0.07, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - h * 0.09, groundY - h * 0.85); ctx.lineTo(x + h * 0.09, groundY - h * 0.85); ctx.lineTo(x + h * 0.12, groundY); ctx.lineTo(x - h * 0.12, groundY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = h * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - h * 0.08, groundY - h * 0.8); ctx.lineTo(x - h * 0.2, groundY - h * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + h * 0.08, groundY - h * 0.8); ctx.lineTo(x + h * 0.2, groundY - h * 0.35); ctx.stroke();
  }
  draw(ctx) {
    const { W, H, t } = this;
    fillScreen(ctx, W, H, '#000');
    if (t > 3.6) { this.fadeOut(ctx); return; }
    for (let i = 0; i < 3; i++) {
      const k = t - this.flashes[i];
      if (k < 0 || k > 0.55) continue;
      const a = 1 - k / 0.55;
      fillScreen(ctx, W, H, CONFIG.FLASHES ? '#dfe8ff' : '#2a3050', a);
      drawBolt(ctx, this.bolts[i], a, 4);
      ctx.save(); ctx.globalAlpha = a;
      if (i === 0) this.figure(ctx, W * this.fx, H * 0.9, H * 0.35);
      else if (i === 1) this.figure(ctx, W * (this.fx * 0.7 + 0.15), H * 1.0, H * 0.75);
      else { this.shake(ctx, 10); drawScareFace(ctx, W / 2, H * 0.5, H * 0.42, 'scream', t); }
      ctx.restore();
    }
  }
}

class ShadowRushScare extends Scare {
  constructor(show) { super(show, 2.0); this.dir = Math.random() < 0.5 ? 1 : -1; this.y = rand(0.3, 0.7); }
  draw(ctx) {
    const { W, H, t } = this;
    const k = clamp01(t / 0.4);
    if (k < 1) {
      const x = lerp(this.dir > 0 ? -W * 0.3 : W * 1.3, this.dir > 0 ? W * 1.3 : -W * 0.3, k);
      for (let i = 0; i < 5; i++) drawGlow(ctx, x - this.dir * i * W * 0.07, H * this.y, H * 0.45, [0, 0, 0], 1 - i * 0.18, 0.5);
      fillScreen(ctx, W, H, '#000', 0.3);
    }
    const ex = this.dir > 0 ? W * 0.93 : W * 0.07, ey = H * this.y;
    const open = t < 0.5 ? 0 : t < 0.6 ? (t - 0.5) / 0.1 : t < 1.6 ? 1 : Math.max(0, 1 - (t - 1.6) / 0.1);
    const w = W * 0.04;
    drawEye(ctx, ex - w * 0.75, ey, w, open, [255, 30, 20], -this.dir, 0, true); drawEye(ctx, ex + w * 0.75, ey, w, open, [255, 30, 20], -this.dir, 0, true);
  }
}

// Party photo scare: a guest photo (uploaded from a phone) slammed up full-wall.
class PhotoScare extends Scare {
  constructor(show, img) { super(show, 3.0); this.img = img; this.tint = pick(['#5a0000', '#001a40', '#0a3a00']); }
  draw(ctx) {
    const { W, H, t } = this;
    if (t < 0.1) { fillScreen(ctx, W, H, CONFIG.FLASHES ? '#fff' : '#000'); return; }
    if (t > 2.4) { this.fadeOut(ctx); return; }
    fillScreen(ctx, W, H, '#000');
    const img = this.img; if (!img || !img.naturalWidth) return;
    const k = easeOut(clamp01((t - 0.1) / 0.35));
    const cover = Math.max(W / img.naturalWidth, H / img.naturalHeight) * lerp(1.6, 1.05, k);
    const dw = img.naturalWidth * cover, dh = img.naturalHeight * cover;
    ctx.save(); this.shake(ctx, 18 * (1 - k) + 3);
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    if (Math.random() < 0.35) { const slices = randInt(2, 5); for (let i = 0; i < slices; i++) { const sy = rand(0, H), sh = rand(10, 60); ctx.drawImage(img, 0, (sy - (H - dh) / 2) / cover, img.naturalWidth, sh / cover, rand(-40, 40), sy, W, sh); } }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; fillScreen(ctx, W, H, this.tint, 0.3); ctx.restore();
    vignette(ctx, W, H, 0.55);
    if (Math.random() < 0.4) drawStatic(ctx, W, H, 0.18, 3);
    if (t > 2.2) drawStatic(ctx, W, H, 0.7, 3);
  }
}

// Blood hits the wall and runs down.
class BloodSplatScare extends Scare {
  constructor(show) {
    super(show, 3.6); const { W, H } = this;
    const cx = W * rand(0.35, 0.65), cy = H * rand(0.3, 0.5);
    const mk = (x, y, r) => ({ x, y, r, wob: Array.from({ length: 16 }, () => rand(0.7, 1.3)), drip: Math.random() < 0.55 ? { l: 0, max: rand(H * 0.05, H * 0.5), v: rand(80, 260) } : null });
    this.blobs = [];
    for (let i = 0; i < 5; i++) { const a = rand(TAU), d = rand(0, H * 0.07); this.blobs.push(mk(cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d, rand(H * 0.07, H * 0.15))); }
    for (let i = 0; i < 60; i++) { const a = rand(TAU), d = Math.pow(Math.random(), 0.6) * H * 0.42; this.blobs.push(mk(cx + Math.cos(a) * d * 1.5, cy + Math.sin(a) * d, rand(H * 0.004, H * 0.035) * (1 - d / (H * 0.5)) + H * 0.003)); }
    this.cx = cx; this.cy = cy;
  }
  blob(ctx, b, k) {
    const n = 16, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = b.r * k * b.wob[i]; pts.push([b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr]); }
    ctx.beginPath(); ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.closePath(); ctx.fill();
  }
  draw(ctx) {
    const { W, H, t } = this;
    if (t > 3.0) { this.fadeOut(ctx); return; }
    if (t < 0.08) { fillScreen(ctx, W, H, '#7a0000'); return; }
    const k = clamp01((t - 0.08) / 0.1);
    ctx.save(); if (t < 0.5) this.shake(ctx, 14 * (1 - t / 0.5));
    fillScreen(ctx, W, H, '#000', 0.6);
    ctx.fillStyle = '#8e0000';
    for (const b of this.blobs) {
      if (b.drip) {
        b.drip.l = Math.min(b.drip.max, b.drip.l + b.drip.v * (1 / 60)); b.drip.v = Math.max(15, b.drip.v - 3);
        const w = b.r * 0.7, l = b.drip.l;
        ctx.beginPath(); ctx.moveTo(b.x - w / 2, b.y); ctx.lineTo(b.x + w / 2, b.y); ctx.lineTo(b.x + w * 0.12, b.y + l); ctx.lineTo(b.x - w * 0.12, b.y + l); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(b.x, b.y + l, w * 0.2, 0, TAU); ctx.fill();
      }
    }
    ctx.fillStyle = '#a30000';
    for (const b of this.blobs) this.blob(ctx, b, k);
    drawGlow(ctx, this.cx, this.cy, H * 0.5, [120, 0, 0], 0.4, 0.1);
    ctx.restore();
  }
}

// Borg takeover: green glitch wash and WE ARE THE BORG, a red laser sight sweeps the room and locks on,
// then RESISTANCE IS FUTILE. Text and colour only, no likenesses.
class BorgScare extends Scare {
  constructor(show) {
    super(show, 4.9); const { W, H } = this;
    this.lockX = W * rand(0.3, 0.7); this.lockY = H * rand(0.35, 0.6);
    this.fromLeft = Math.random() < 0.5; this.designation = `${Math.floor(rand(1, 9))} OF 9`;
    this.lines = Array.from({ length: 14 }, () => ({ y: rand(0, 1), w: rand(0.02, 0.3), x: rand(0, 1), v: rand(-0.4, 0.4) }));
  }
  glitchText(ctx, msg, size, color, jit) {
    const glyphs = '01#%/\\|<>_';
    const txt = msg.split('').map(c => (c !== ' ' && Math.random() < 0.05) ? glyphs[Math.floor(rand(0, glyphs.length))] : c).join('');
    ctx.font = `bold ${size}px "Courier New", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (Math.random() < 0.5) { ctx.fillStyle = 'rgba(255,0,60,0.45)'; ctx.fillText(txt, this.W / 2 - 6 + rand(-jit, jit), this.H / 2); ctx.fillStyle = 'rgba(0,200,255,0.35)'; ctx.fillText(txt, this.W / 2 + 6 + rand(-jit, jit), this.H / 2); }
    ctx.fillStyle = color; ctx.fillText(txt, this.W / 2 + rand(-jit, jit), this.H / 2 + rand(-jit, jit) * 0.3);
  }
  circuit(ctx, alpha) {
    const { W, H } = this;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = '#2cff5a'; ctx.lineWidth = 2;
    for (const l of this.lines) { l.x += l.v / 60; if (l.x > 1.1) l.x = -0.3; if (l.x < -0.3) l.x = 1.1; ctx.beginPath(); ctx.moveTo(l.x * W, l.y * H); ctx.lineTo((l.x + l.w) * W, l.y * H); ctx.stroke(); }
    for (let y = 0; y < H; y += 4) { if (Math.random() < 0.5) ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, y, W, 2); }
    ctx.restore();
  }
  draw(ctx) {
    const { W, H, t } = this;
    if (t > 4.3) { this.fadeOut(ctx); return; }
    fillScreen(ctx, W, H, '#000');
    if (t < 1.4) {
      // Phase 1: green glitch wash, WE ARE THE BORG.
      const k = t / 1.4;
      fillScreen(ctx, W, H, '#062a10', 0.5 + 0.3 * noise(t * 20));
      drawStatic(ctx, W, H, 0.12, 3);
      this.circuit(ctx, 0.5);
      ctx.save(); this.shake(ctx, 10 * (1 - k));
      const size = fitFontSize(ctx, 'WE ARE THE BORG', '"Courier New", monospace', W * 0.86, H * 0.2);
      if (Math.floor(t / 0.11) % 3 !== 2) this.glitchText(ctx, 'WE ARE THE BORG', size, '#4dff6a', 6);
      ctx.restore();
      tearFrame(ctx, this.show, 5, 60);
      if (t < 0.1) fillScreen(ctx, W, H, '#20ff40', 1 - t / 0.1);
      return;
    }
    if (t < 3.3) {
      // Phase 2: dark room, one red laser sight sweeps across and locks on.
      const p = clamp01((t - 1.4) / 1.3);
      const e = 1 - Math.pow(1 - p, 3);
      const startX = this.fromLeft ? -W * 0.1 : W * 1.1;
      const x = startX + (this.lockX - startX) * e;
      const y = this.lockY + Math.sin(t * 9) * H * 0.08 * (1 - e) + (p < 1 ? noise(t * 3) * H * 0.03 : 0);
      this.circuit(ctx, 0.12);
      fillScreen(ctx, W, H, '#061008', 0.6);
      const ox = this.fromLeft ? -W * 0.2 : W * 1.2, oy = -H * 0.3;
      ctx.save(); ctx.strokeStyle = 'rgba(255,0,0,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,40,40,0.12)'; ctx.lineWidth = 10; ctx.stroke(); ctx.restore();
      const locked = p >= 1;
      const pulse = locked ? 0.7 + 0.3 * Math.sin(t * 30) : 1;
      drawGlow(ctx, x, y, H * (locked ? 0.09 : 0.06) * pulse, [255, 0, 0], 0.9, 0.15);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, H * 0.006, 0, TAU); ctx.fill();
      if (locked) {
        const r = H * 0.09 * (1 + 0.6 * (1 - clamp01((t - 2.7) / 0.3)));
        ctx.save(); ctx.strokeStyle = '#ff2020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - r * 1.4, y); ctx.lineTo(x - r * 0.6, y); ctx.moveTo(x + r * 0.6, y); ctx.lineTo(x + r * 1.4, y);
        ctx.moveTo(x, y - r * 1.4); ctx.lineTo(x, y - r * 0.6); ctx.moveTo(x, y + r * 0.6); ctx.lineTo(x, y + r * 1.4); ctx.stroke();
        const left = x > W / 2, lx = left ? x - r * 1.6 : x + r * 1.6;
        ctx.font = `bold ${H * 0.035}px "Courier New", monospace`; ctx.fillStyle = '#ff3030'; ctx.textAlign = left ? 'right' : 'left'; ctx.textBaseline = 'top';
        ctx.fillText('TARGET ACQUIRED', lx, y - r);
        ctx.fillStyle = '#4dff6a'; ctx.fillText('SPECIES 5618', lx, y - r + H * 0.045); ctx.fillText(`DESIGNATION ${this.designation}`, lx, y - r + H * 0.09);
        ctx.restore();
      }
      return;
    }
    // Phase 3: RESISTANCE IS FUTILE.
    const k = (t - 3.3) / 1.0;
    fillScreen(ctx, W, H, '#041a08', 0.7);
    drawStatic(ctx, W, H, 0.15, 3);
    this.circuit(ctx, 0.35);
    ctx.save(); this.shake(ctx, 7);
    const size = fitFontSize(ctx, 'RESISTANCE IS FUTILE', '"Courier New", monospace', W * 0.9, H * 0.17);
    const on = Math.floor(t / 0.09) % 4 !== 3;
    if (on) this.glitchText(ctx, 'RESISTANCE IS FUTILE', size, k > 0.5 ? '#c8ffd0' : '#4dff6a', 5);
    ctx.font = `bold ${H * 0.05}px "Courier New", monospace`; ctx.fillStyle = '#2cff5a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (on) ctx.fillText('YOU WILL BE ASSIMILATED', W / 2, H * 0.68);
    ctx.restore();
    tearFrame(ctx, this.show, 3, 40);
    if (t < 3.38) fillScreen(ctx, W, H, '#20ff40', 1 - (t - 3.3) / 0.08);
  }
}

// Micro scares: under a second, drawn over the running scene. Static burst, light flicker, single-frame face, picture tearing.
class MicroScare {
  constructor(show) {
    this.show = show; this.W = show.W; this.H = show.H; this.t = 0; this.done = false;
    this.kind = pick(['static', 'static', 'flicker', 'frame', 'frame', 'glitch', 'blackout']);
    this.dur = { static: rand(0.3, 0.6), flicker: rand(0.8, 1.4), frame: 0.5, glitch: rand(0.4, 0.7), blackout: rand(0.5, 1.1) }[this.kind];
    this.variant = pick(['scream', 'ghoul', 'skull']); this.x = rand(0.3, 0.7); this.y = rand(0.35, 0.6); this.s = rand(0.3, 0.5);
  }
  update(dt) { this.t += dt; if (this.t >= this.dur) this.done = true; }
  draw(ctx) {
    const { W, H, t } = this; const sc = this.show.scale;
    switch (this.kind) {
      case 'static': drawStatic(ctx, W, H, 0.95, 3); if (Math.random() < 0.35) { ctx.globalAlpha = 0.5; drawScareFace(ctx, W * this.x, H * this.y, H * this.s, this.variant, t); ctx.globalAlpha = 1; } break;
      case 'flicker': { const on = noise(t * 23, 7) > -0.2 && Math.random() > 0.35; fillScreen(ctx, W, H, '#000', on ? 0.15 : 0.92); break; }
      case 'frame':
        if (t < 0.08) fillScreen(ctx, W, H, '#000');
        else if (t < 0.2) { fillScreen(ctx, W, H, '#000'); ctx.save(); ctx.translate(rand(-6, 6), rand(-6, 6)); drawScareFace(ctx, W * this.x, H * this.y, H * this.s, this.variant, t); ctx.restore(); }
        else fillScreen(ctx, W, H, '#000');
        break;
      case 'glitch': {
        const n = randInt(3, 8);
        for (let i = 0; i < n; i++) { const sy = rand(0, H), sh = rand(8, H * 0.12); ctx.drawImage(ctx.canvas, 0, sy * sc, ctx.canvas.width, sh * sc, rand(-W * 0.08, W * 0.08), sy, W, sh); }
        ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,0,0,0.07)' : 'rgba(0,80,255,0.07)'; ctx.fillRect(rand(-12, 12), 0, W, H); ctx.globalCompositeOperation = 'source-over';
        drawStatic(ctx, W, H, 0.08, 3); break;
      }
      case 'blackout': fillScreen(ctx, W, H, '#000', t < this.dur - 0.1 ? 1 : 0.5); if (t > 0.3 && Math.random() < 0.06) { drawEye(ctx, W * this.x, H * this.y, W * 0.05, 1, [255, 220, 40]); drawEye(ctx, W * this.x + W * 0.08, H * this.y, W * 0.05, 1, [255, 220, 40]); } break;
    }
  }
}
function makeMicroScare(show) { return new MicroScare(show); }

function registerScares(show) {
  show.registerScare('face', s => new FaceScare(s));
  show.registerScare('eyes', s => new EyesScare(s));
  show.registerScare('hand', s => new HandScare(s));
  show.registerScare('spider', s => new SpiderScare(s));
  show.registerScare('static', s => new StaticFaceScare(s));
  show.registerScare('text', s => new TextScare(s));
  show.registerScare('lightning', s => new LightningFigureScare(s));
  show.registerScare('shadow', s => new ShadowRushScare(s));
  show.registerScare('blood', s => new BloodSplatScare(s));
  show.registerScare('borg', s => new BorgScare(s));
  show.registerScare('pumpkin', s => new PumpkinFlashScare(s));
}

// A carved-pumpkin close-up slammed full screen with a flash and a shake, then gone.
// Uses the bundled photos (IMAGES); if they haven't loaded yet it falls back to a drawn scare.
class PumpkinFlashScare extends Scare {
  constructor(show) {
    super(show, 2.4);
    this.img = IMAGES[Math.random() < 0.5 ? 'pumpkin-orange' : 'pumpkin-green'];
    this.zoom = rand(1.05, 1.18);
  }
  draw(ctx) {
    const { W, H, t } = this;
    if (t > 1.9) { this.fadeOut(ctx); return; }
    fillScreen(ctx, W, H, '#000');
    if (t < 0.07 && CONFIG.FLASHES) { fillScreen(ctx, W, H, '#ff7a00', 1 - t / 0.07); }
    ctx.save();
    if (t < 0.6) this.shake(ctx, 16 * (1 - t / 0.6));
    // punch-in zoom settling to a tight framing
    const z = this.zoom * (1 + 0.12 * Math.max(0, 1 - t / 0.4));
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    if (!(this.img && this.img.ready && drawCover(ctx, this.img, W, H, 1))) {
      // fallback: drawn jack-o-lantern glow if the photo isn't ready
      ctx.restore();
      drawGlow(ctx, W / 2, H / 2, H * 0.4, [255, 110, 0], 0.9, 0.2);
      ctx.fillStyle = '#ff8c00'; ctx.font = `${H * 0.2}px ${FONT_CREEPY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('BOO', W / 2, H / 2); return;
    }
    ctx.restore();
    vignette(ctx, W, H, 0.6);
  }
}
