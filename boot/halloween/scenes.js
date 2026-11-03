'use strict';
// Scenes, part 1: graveyard, eyes, batmoon, pumpkins, ghosts, spiders, blood, house

const EYE_COLORS = [[255, 210, 40], [255, 40, 30], [90, 255, 90], [200, 230, 255], [255, 120, 0]];

class GraveyardScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this;
    this.fog = 0.85;
    this.horizon = H * 0.78;
    this.moon = { x: W * rand(0.6, 0.85), y: H * rand(0.14, 0.3), r: Math.min(W, H) * 0.09 };
    this.stars = Array.from({ length: 70 }, () => ({ x: rand(W), y: rand(H * 0.6), s: rand(100) }));
    this.clouds = Array.from({ length: 7 }, () => ({ x: rand(-W * 0.2, W * 1.2), y: rand(H * 0.05, H * 0.45), r: rand(W * 0.08, W * 0.2), v: rand(6, 16) }));
    this.hills = []; for (let i = 0; i <= 14; i++) this.hills.push([W * (i / 14), this.horizon - Math.abs(noise(i * 0.9, 3)) * H * 0.06]);
    this.stones = [];
    for (let i = 0; i < 9; i++) { const d = rand(0, 1); this.stones.push({ x: rand(W * 0.03, W * 0.97), y: lerp(this.horizon + H * 0.01, H * 0.97, d), s: lerp(0.45, 1, d), type: pick([0, 0, 0, 1, 2]), tilt: rand(-0.12, 0.12) }); }
    this.stones.sort((a, b) => a.y - b.y);
    this.tree = makeTree(W * rand(0.08, 0.3), this.horizon + H * 0.02, H * 0.17, 7);
    this.bolt = null; this.flash = 0; this.nextStrike = rand(3, 7);
    this.ghost = null; this.nextGhost = rand(5, 12);
    this.hand = null; this.nextHand = rand(8, 16);
    this.rat = null; this.nextRat = rand(6, 14);
    this.bats = Array.from({ length: 6 }, () => ({ a: rand(TAU), r: rand(0.8, 2.2), s: rand(0.012, 0.03) * W, v: rand(0.4, 1), ph: rand(TAU) }));
  }
  update(dt, t) {
    const { W, H } = this;
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > W * 1.3) c.x = -W * 0.3; }
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.nextStrike -= dt;
    if (this.nextStrike <= 0) {
      const x = rand(W * 0.1, W * 0.9);
      this.bolt = makeBolt(x, 0, x + rand(-W * 0.1, W * 0.1), this.horizon);
      this.flash = 1; this.nextStrike = rand(4, 11);
      if (Math.random() < 0.5) this.reflash = 0.25; // second flicker
    }
    if (this.reflash !== undefined) { this.reflash -= dt; if (this.reflash <= 0) { this.flash = 0.7; delete this.reflash; } }
    this.nextGhost -= dt;
    if (this.nextGhost <= 0 && !this.ghost) { const st = pick(this.stones); this.ghost = { x: st.x, y: st.y, s: H * 0.09 * st.s, t: 0, dur: rand(5, 8), drift: rand(-20, 20) }; this.nextGhost = rand(8, 16); }
    if (this.ghost) { const g = this.ghost; g.t += dt; g.y -= 22 * dt; g.x += g.drift * dt; if (g.t > g.dur) this.ghost = null; }
    this.nextHand -= dt;
    if (this.nextHand <= 0 && !this.hand) { const st = pick(this.stones); this.hand = { x: st.x + rand(-40, 40) * st.s, y: st.y, s: H * 0.05 * st.s, t: 0 }; this.nextHand = rand(10, 20); }
    if (this.hand) { this.hand.t += dt; if (this.hand.t > 7) this.hand = null; }
    this.nextRat -= dt;
    if (this.nextRat <= 0 && !this.rat) { const dir = Math.random() < 0.5 ? 1 : -1; this.rat = { x: dir > 0 ? -60 : W + 60, dir, y: H * rand(0.9, 0.98), v: rand(250, 420), s: H * 0.02 }; this.nextRat = rand(10, 25); }
    if (this.rat) { this.rat.x += this.rat.dir * this.rat.v * dt; if (this.rat.x < -100 || this.rat.x > W + 100) this.rat = null; }
    for (const b of this.bats) b.a += b.v * dt;
  }
  draw(ctx, t) {
    const { W, H } = this; const m = this.moon;
    skyGradient(ctx, W, H, '#070b22', '#2a3160', 0.85);
    ctx.fillStyle = '#fff';
    for (const s of this.stars) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + s.s)); ctx.fillRect(s.x, s.y, 2, 2); }
    ctx.globalAlpha = 1;
    drawMoon(ctx, m.x, m.y, m.r);
    for (const b of this.bats) drawBat(ctx, m.x + Math.cos(b.a) * m.r * b.r, m.y + Math.sin(b.a * 1.3) * m.r * b.r * 0.6, b.s, Math.sin(t * 14 + b.ph));
    for (const c of this.clouds) drawGlow(ctx, c.x, c.y, c.r, [25, 28, 50], 0.75, 0.3);
    if (this.bolt && this.flash > 0) drawBolt(ctx, this.bolt, this.flash, 3);
    // hills
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-10, H + 10);
    for (const p of this.hills) ctx.lineTo(p[0], p[1]); ctx.lineTo(W + 10, H + 10); ctx.closePath(); ctx.fill();
    drawTree(ctx, this.tree, '#000', Math.sin(t * 0.8) * 3);
    // ghost behind the stones rises from a grave
    if (this.ghost) { const g = this.ghost; const k = g.t / g.dur; drawGhost(ctx, g.x, g.y, g.s, t, Math.sin(k * Math.PI) * 0.85, 0); }
    for (const s of this.stones) {
      const shade = Math.round(lerp(40, 95, s.s));
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.tilt);
      drawTombstone(ctx, 0, 0, H * 0.075 * s.s, H * 0.12 * s.s, s.type, `rgb(${shade},${shade},${shade + 18})`);
      ctx.restore();
    }
    if (this.hand) {
      const h = this.hand; const k = h.t < 2 ? easeOut(h.t / 2) : h.t < 5 ? 1 : 1 - easeIn((h.t - 5) / 2);
      drawHand(ctx, h.x, h.y - k * h.s * 2.6 + h.s * 2.4, h.s, Math.sin(t) * 0.1, t * 1.5, '#1c1c24', 3);
    }
    if (this.rat) drawRat(ctx, this.rat.x, this.rat.y, this.rat.s, t, this.rat.dir, '#15151c');
    if (this.flash > 0) fillScreen(ctx, W, H, '#dfe8ff', (CONFIG.FLASHES ? 0.55 : 0.18) * this.flash);
  }
}

class EyesScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0.12;
    this.eyes = Array.from({ length: 18 }, () => this.newEye());
    this.approach = null; this.nextApproach = rand(8, 15);
  }
  newEye() {
    const { W, H } = this; const w = rand(0.018, 0.065) * W;
    return { x: rand(w * 2, W - w * 2), y: rand(w, H - w), w, open: 0, state: 'closed', timer: rand(0.2, 4), c: pick(EYE_COLORS), lx: 0, ly: 0, tx: rand(-1, 1), ty: rand(-1, 1), slit: Math.random() < 0.35, life: rand(6, 16), blinkT: 0 };
  }
  update(dt, t) {
    const { W, H } = this;
    for (const e of this.eyes) {
      e.lx = lerp(e.lx, e.tx, dt * 2); e.ly = lerp(e.ly, e.ty, dt * 2);
      if (Math.random() < dt * 0.4) { e.tx = rand(-1, 1); e.ty = rand(-0.6, 0.6); }
      switch (e.state) {
        case 'closed': e.timer -= dt; if (e.timer <= 0) { Object.assign(e, this.newEye(), { state: 'opening' }); } break;
        case 'opening': e.open = Math.min(1, e.open + dt * 5); if (e.open >= 1) e.state = 'open'; break;
        case 'open': e.life -= dt; if (e.life <= 0) e.state = 'closing'; else if (Math.random() < dt * 0.3) { e.state = 'blink'; e.blinkT = 0; } break;
        case 'blink': e.blinkT += dt; e.open = e.blinkT < 0.08 ? 1 - e.blinkT / 0.08 : Math.min(1, (e.blinkT - 0.08) / 0.1); if (e.blinkT > 0.2) { e.open = 1; e.state = 'open'; } break;
        case 'closing': e.open = Math.max(0, e.open - dt * 4); if (e.open <= 0) { e.state = 'closed'; e.timer = rand(0.5, 4); } break;
      }
    }
    this.nextApproach -= dt;
    if (this.nextApproach <= 0 && !this.approach) { this.approach = { t: 0, x0: rand(W * 0.3, W * 0.7), y0: rand(H * 0.3, H * 0.7), c: pick(EYE_COLORS), slit: Math.random() < 0.5 }; this.nextApproach = rand(10, 18); }
    if (this.approach) { this.approach.t += dt; if (this.approach.t > 3.2) this.approach = null; }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#000');
    for (const e of this.eyes) {
      if (e.open <= 0) continue;
      drawEye(ctx, e.x - e.w * 0.75, e.y, e.w, e.open, e.c, e.lx, e.ly, e.slit);
      drawEye(ctx, e.x + e.w * 0.75, e.y, e.w, e.open, e.c, e.lx, e.ly, e.slit);
    }
    if (this.approach) {
      const a = this.approach; const k = a.t < 2.2 ? easeIn(a.t / 2.2) : 1;
      const w = lerp(W * 0.03, W * 0.3, k), x = lerp(a.x0, W / 2, k), y = lerp(a.y0, H / 2, k);
      const open = a.t > 2.6 ? Math.max(0, 1 - (a.t - 2.6) / 0.15) : 1;
      drawEye(ctx, x - w * 0.8, y, w, open, a.c, 0, 0, a.slit); drawEye(ctx, x + w * 0.8, y, w, open, a.c, 0, 0, a.slit);
    }
  }
}

class BatMoonScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0.3;
    this.moon = { x: W * rand(0.4, 0.6), y: H * rand(0.38, 0.48), r: Math.min(W, H) * 0.3 };
    this.clouds = Array.from({ length: 8 }, () => ({ x: rand(-W * 0.3, W * 1.3), y: rand(H * 0.1, H * 0.8), r: rand(W * 0.08, W * 0.22), v: rand(10, 28), a: rand(0.5, 0.85) }));
    this.bats = Array.from({ length: 26 }, () => this.newBat(true));
    this.trees = []; for (let i = 0; i < 7; i++) this.trees.push(makeTree(W * (i + rand(0.2, 0.8)) / 7, H * 1.0, H * rand(0.1, 0.2), 6));
    this.ground = []; for (let i = 0; i <= 20; i++) this.ground.push([W * i / 20, H * 0.9 + noise(i, 7) * H * 0.03]);
    this.witch = null; this.nextWitch = rand(6, 14);
    this.stars = Array.from({ length: 90 }, () => ({ x: rand(W), y: rand(H), s: rand(100) }));
  }
  newBat(anywhere) {
    const { W, H } = this; const d = rand(0.15, 1); const dir = Math.random() < 0.5 ? 1 : -1;
    return { x: anywhere ? rand(W) : (dir > 0 ? -W * 0.1 : W * 1.1), y: rand(H * 0.05, H * 0.85), vx: dir * rand(60, 160) * (0.4 + d), vy: rand(-20, 20), s: W * 0.012 + W * 0.04 * d, ph: rand(TAU), f: rand(9, 16), d };
  }
  update(dt, t) {
    const { W, H } = this;
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > W * 1.4) { c.x = -W * 0.3; c.y = rand(H * 0.1, H * 0.8); } }
    for (const b of this.bats) {
      b.x += b.vx * dt; b.y += (b.vy + Math.sin(t * 2 + b.ph) * 30) * dt;
      if (b.x < -W * 0.15 || b.x > W * 1.15 || b.y < -50 || b.y > H) Object.assign(b, this.newBat(false));
    }
    this.nextWitch -= dt;
    if (this.nextWitch <= 0 && !this.witch) { const dir = Math.random() < 0.5 ? 1 : -1; this.witch = { t: 0, dir, dur: rand(6, 9), y: this.moon.y + rand(-0.4, 0.4) * this.moon.r, s: this.moon.r * 0.45 }; this.nextWitch = rand(14, 26); }
    if (this.witch) { this.witch.t += dt; if (this.witch.t > this.witch.dur) this.witch = null; }
  }
  draw(ctx, t) {
    const { W, H } = this; const m = this.moon;
    skyGradient(ctx, W, H, '#120e34', '#3d2f72');
    ctx.fillStyle = '#fff';
    for (const s of this.stars) { ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.1 + s.s)); ctx.fillRect(s.x, s.y, 2, 2); }
    ctx.globalAlpha = 1;
    drawMoon(ctx, m.x, m.y, m.r, [255, 244, 200]);
    for (const c of this.clouds) drawGlow(ctx, c.x, c.y, c.r, [22, 18, 48], c.a, 0.3);
    if (this.witch) {
      const w = this.witch; const k = w.t / w.dur; const x = lerp(w.dir > 0 ? -w.s * 2 : W + w.s * 2, w.dir > 0 ? W + w.s * 2 : -w.s * 2, k);
      ctx.save(); ctx.translate(x, w.y + Math.sin(k * Math.PI * 2) * H * 0.05); if (w.dir < 0) ctx.scale(-1, 1); drawWitch(ctx, 0, 0, w.s, t); ctx.restore();
    }
    // far bats first
    const sorted = this.bats.slice().sort((a, b) => a.d - b.d);
    for (const b of sorted) { ctx.save(); if (b.vx < 0) { ctx.translate(b.x, b.y); ctx.scale(-1, 1); drawBat(ctx, 0, 0, b.s, Math.sin(t * b.f + b.ph), '#05030d'); } else drawBat(ctx, b.x, b.y, b.s, Math.sin(t * b.f + b.ph), '#05030d'); ctx.restore(); }
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-10, H + 10); for (const p of this.ground) ctx.lineTo(p[0], p[1]); ctx.lineTo(W + 10, H + 10); ctx.closePath(); ctx.fill();
    for (const tr of this.trees) drawTree(ctx, tr, '#000', Math.sin(t * 0.7) * 3);
  }
}

class PumpkinScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0.55;
    this.horizon = H * 0.72;
    this.stars = Array.from({ length: 60 }, () => ({ x: rand(W), y: rand(this.horizon), s: rand(100) }));
    this.pumpkins = [];
    const n = 6; const slots = shuffle([...Array(n).keys()]);
    for (let i = 0; i < n; i++) { const d = rand(0, 1); this.pumpkins.push({ x: W * (slots[i] + rand(0.3, 0.7)) / n, y: lerp(this.horizon + H * 0.06, H * 0.93, d), r: H * 0.075 * lerp(0.7, 1.3, d), face: { eyes: randInt(0, 3), mouth: randInt(0, 3) }, seed: rand(100), evil: 0 }); }
    this.pumpkins.sort((a, b) => a.y - b.y);
    this.flies = Array.from({ length: 40 }, () => ({ x: rand(W), y: rand(H * 0.3, H), s: rand(100), ph: rand(TAU) }));
    this.nextEvil = rand(5, 10);
    this.vines = Array.from({ length: 10 }, () => ({ x: rand(W), y: rand(this.horizon + 10, H), l: rand(80, 220), seed: rand(100) }));
  }
  update(dt, t) {
    this.nextEvil -= dt;
    if (this.nextEvil <= 0) { const p = pick(this.pumpkins); p.evil = 2.5; this.nextEvil = rand(6, 12); }
    for (const p of this.pumpkins) if (p.evil > 0) p.evil -= dt;
    for (const f of this.flies) { f.x += noise(t * 0.5 + f.s) * 40 * dt; f.y += noise(t * 0.4 + f.s + 50) * 30 * dt; }
  }
  draw(ctx, t) {
    const { W, H } = this;
    skyGradient(ctx, W, H, '#05071a', '#1d2250', 0.75);
    ctx.fillStyle = '#fff';
    for (const s of this.stars) { ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + s.s)); ctx.fillRect(s.x, s.y, 2, 2); }
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, this.horizon, 0, H); g.addColorStop(0, '#0d1a0a'); g.addColorStop(1, '#010301');
    ctx.fillStyle = g; ctx.fillRect(0, this.horizon, W, H - this.horizon);
    ctx.strokeStyle = '#163a12'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const v of this.vines) { ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.quadraticCurveTo(v.x + v.l * 0.4, v.y - 30 + noise(v.seed) * 20, v.x + v.l, v.y + 10); ctx.stroke(); }
    for (const p of this.pumpkins) {
      const flick = 0.7 + 0.3 * (0.5 + 0.5 * noise(t * 3, p.seed));
      if (p.evil > 0) {
        const k = Math.min(1, p.evil / 0.3);
        drawGlow(ctx, p.x, p.y, p.r * 3.2, [255, 30, 10], 0.6 * k * (0.7 + 0.3 * Math.sin(t * 25)));
        drawPumpkin(ctx, p.x, p.y, p.r * (1 + 0.08 * Math.sin(t * 30)), { eyes: 1, mouth: 2 }, 1);
      } else drawPumpkin(ctx, p.x, p.y, p.r, p.face, flick);
    }
    for (const f of this.flies) { const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.5 + f.ph)); drawGlow(ctx, f.x, f.y, 4 + a * 3, [200, 255, 120], a * 0.9, 0.5); }
  }
}

class GhostScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0.6;
    this.ghosts = Array.from({ length: 5 }, (_, i) => ({ x: rand(W), y: rand(H * 0.1, H * 0.8), s: rand(H * 0.09, H * 0.17), vx: rand(25, 60) * (Math.random() < 0.5 ? 1 : -1), ph: rand(TAU), face: Math.random() < 0.3 ? 1 : 0, a: rand(0.6, 0.9), scale: 1 }));
    this.charge = null; this.nextCharge = rand(8, 14);
    this.moon = { x: W * 0.8, y: H * 0.2, r: Math.min(W, H) * 0.06 };
  }
  update(dt, t) {
    const { W, H } = this;
    for (const g of this.ghosts) {
      if (g === this.charge) continue;
      g.x += g.vx * dt; g.y += Math.sin(t * 0.9 + g.ph) * 35 * dt;
      if (g.x > W + g.s * 2) g.x = -g.s * 2; if (g.x < -g.s * 2) g.x = W + g.s * 2;
    }
    this.nextCharge -= dt;
    if (this.nextCharge <= 0 && !this.charge) { this.charge = pick(this.ghosts); this.chargeT = 0; this.cx0 = this.charge.x; this.cy0 = this.charge.y; this.nextCharge = rand(12, 20); }
    if (this.charge) {
      this.chargeT += dt; const g = this.charge; const k = Math.min(1, this.chargeT / 1.6);
      g.x = lerp(this.cx0, W / 2, easeIn(k)); g.y = lerp(this.cy0, H / 2, easeIn(k)); g.scale = lerp(1, 4.5, easeIn(k)); g.face = 1;
      if (this.chargeT > 1.6) { g.a = Math.max(0, g.a - dt * 4); }
      if (this.chargeT > 2.2) { Object.assign(g, { x: rand(W), y: rand(H * 0.1, H * 0.8), scale: 1, a: rand(0.6, 0.9), face: Math.random() < 0.3 ? 1 : 0 }); this.charge = null; }
    }
  }
  draw(ctx, t) {
    const { W, H } = this;
    skyGradient(ctx, W, H, '#1c0c33', '#05020a');
    drawMoon(ctx, this.moon.x, this.moon.y, this.moon.r, [220, 220, 255]);
    for (const g of this.ghosts) if (g !== this.charge) drawGhost(ctx, g.x, g.y, g.s * g.scale, t + g.ph, g.a, g.face);
    if (this.charge) { const g = this.charge; drawGhost(ctx, g.x, g.y, g.s * g.scale, t, g.a, g.face); }
  }
}

class SpiderScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0.2;
    this.corner = Math.random() < 0.5 ? 0 : 1; // 0 = top-left, 1 = top-right
    this.cx = this.corner ? W : 0; this.cy = 0;
    this.R = Math.min(W, H) * rand(0.55, 0.75);
    this.spokes = 9; this.rings = 10;
    this.a0 = this.corner ? Math.PI / 2 : 0; // angle range: top-left 0..90deg, top-right 90..180deg
    this.spiders = Array.from({ length: 7 }, () => this.newSpider(true));
    this.webSpider = { a: this.a0 + Math.PI / 4, r: this.R * 0.5, ta: this.a0 + rand(0.2, 1.3), tr: rand(this.R * 0.2, this.R * 0.9), s: W * 0.03 };
  }
  newSpider(anywhere) {
    const { W, H } = this;
    return { x: rand(W * 0.05, W * 0.95), y: anywhere ? rand(-50, H * 0.5) : -60, ty: rand(H * 0.25, H * 0.85), v: rand(150, 320), s: rand(0.012, 0.035) * W, state: 'drop', timer: rand(2, 6), ph: rand(TAU) };
  }
  update(dt, t) {
    for (const s of this.spiders) {
      if (s.state === 'drop') { s.y += s.v * dt; if (s.y >= s.ty) { s.y = s.ty; s.state = 'hang'; } }
      else if (s.state === 'hang') { s.timer -= dt; if (s.timer <= 0) s.state = 'climb'; }
      else { s.y -= s.v * 0.5 * dt; if (s.y < -80) Object.assign(s, this.newSpider(false)); }
    }
    const w = this.webSpider;
    w.a = lerp(w.a, w.ta, dt * 0.5); w.r = lerp(w.r, w.tr, dt * 0.5);
    if (Math.abs(w.a - w.ta) < 0.02 && Math.abs(w.r - w.tr) < 5 && Math.random() < dt * 0.4) { w.ta = this.a0 + rand(0.15, 1.4); w.tr = rand(this.R * 0.15, this.R * 0.9); }
  }
  draw(ctx, t) {
    const { W, H } = this;
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, '#2b2a3c'); g.addColorStop(1, '#07070c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // web
    ctx.save(); ctx.translate(this.cx, this.cy); ctx.strokeStyle = 'rgba(235,235,255,0.8)'; ctx.lineWidth = 1.6;
    const angs = []; for (let i = 0; i <= this.spokes; i++) angs.push(this.a0 + (Math.PI / 2) * (i / this.spokes));
    for (const a of angs) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * this.R * 1.03, Math.sin(a) * this.R * 1.03); ctx.stroke(); }
    for (let k = 1; k <= this.rings; k++) {
      const r = this.R * (k / this.rings) * (1 + 0.02 * Math.sin(t + k));
      ctx.beginPath();
      for (let i = 0; i < angs.length; i++) {
        const x = Math.cos(angs[i]) * r, y = Math.sin(angs[i]) * r;
        if (i === 0) ctx.moveTo(x, y);
        else { const pa = angs[i - 1]; const mx = (Math.cos(pa) + Math.cos(angs[i])) / 2 * r * 0.93, my = (Math.sin(pa) + Math.sin(angs[i])) / 2 * r * 0.93; ctx.quadraticCurveTo(mx, my, x, y); }
      }
      ctx.stroke();
    }
    ctx.restore();
    const ws = this.webSpider;
    drawSpider(ctx, this.cx + Math.cos(ws.a) * ws.r, this.cy + Math.sin(ws.a) * ws.r, ws.s, t, '#000');
    // droppers
    ctx.strokeStyle = 'rgba(230,230,245,0.55)'; ctx.lineWidth = 1.2;
    for (const s of this.spiders) {
      const sway = Math.sin(t * 1.5 + s.ph) * (s.state === 'hang' ? 12 : 4);
      ctx.beginPath(); ctx.moveTo(s.x, 0); ctx.lineTo(s.x + sway, s.y - s.s * 0.6); ctx.stroke();
      drawSpider(ctx, s.x + sway, s.y, s.s, s.state === 'hang' ? t * 0.3 : t, '#000');
    }
  }
}

class BloodScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0;
    this.drips = []; this.pools = []; this.nextDrip = 0.2;
    this.msg = pick(['HAPPY HALLOWEEN', 'GET OUT', 'HELP US', 'REDRUM', 'NO ESCAPE']);
    this.msgAt = 7;
  }
  update(dt, t) {
    const { W, H } = this;
    this.nextDrip -= dt;
    if (this.nextDrip <= 0 && this.drips.length < 40) {
      this.drips.push({ x: rand(W * 0.02, W * 0.98), y: 0, w: rand(6, 22), v: rand(40, 220), stop: rand(H * 0.25, H * 1.15), bulge: 0 });
      this.nextDrip = rand(0.25, 0.9);
    }
    for (const d of this.drips) {
      if (d.y < d.stop) { d.y += d.v * dt; d.v = Math.max(15, d.v - 20 * dt); if (d.y >= H + 20) { d.stop = d.y; this.pools.push({ x: d.x, r: d.w, max: d.w * rand(4, 9) }); } }
      else d.bulge = Math.min(1, d.bulge + dt * 0.5);
    }
    for (const p of this.pools) p.r = Math.min(p.max, p.r + 12 * dt);
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, '#000');
    if (t > this.msgAt) {
      const a = clamp01((t - this.msgAt) / 3);
      const size = fitFontSize(ctx, this.msg, FONT_DRIP, W * 0.85, H * 0.22);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${size}px ${FONT_DRIP}`;
      drawGlow(ctx, W / 2, H / 2, W * 0.45, [180, 0, 0], 0.5 * a, 0.1);
      ctx.fillStyle = '#c40000'; ctx.fillText(this.msg, W / 2, H / 2);
      ctx.fillStyle = '#ff2020'; ctx.globalAlpha = a * 0.6; ctx.fillText(this.msg, W / 2 - 2, H / 2 - 2);
      ctx.restore();
    }
    for (const d of this.drips) {
      const y = Math.min(d.y, H + 30);
      ctx.fillStyle = '#b30000';
      ctx.beginPath(); ctx.moveTo(d.x - d.w / 2, 0); ctx.lineTo(d.x + d.w / 2, 0); ctx.lineTo(d.x + d.w * 0.28, y); ctx.lineTo(d.x - d.w * 0.28, y); ctx.closePath(); ctx.fill();
      const hr = d.w * (0.55 + d.bulge * 0.5);
      ctx.beginPath(); ctx.ellipse(d.x, y, hr, hr * 1.25, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff3a3a'; ctx.fillRect(d.x - d.w * 0.3, 0, d.w * 0.14, y * 0.8);
      ctx.beginPath(); ctx.arc(d.x - hr * 0.3, y - hr * 0.3, hr * 0.22, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#9a0000';
    for (const p of this.pools) { ctx.beginPath(); ctx.ellipse(p.x, H, p.r, p.r * 0.25, 0, 0, TAU); ctx.fill(); }
  }
}

class HouseScene extends Scene {
  constructor(show) {
    super(show); const { W, H } = this; this.fog = 0.7;
    this.ground = H * 0.84;
    this.moon = { x: W * rand(0.3, 0.7), y: H * rand(0.22, 0.34), r: Math.min(W, H) * 0.14 };
    this.stars = Array.from({ length: 70 }, () => ({ x: rand(W), y: rand(H * 0.7), s: rand(100) }));
    const cx = W * 0.5, g = this.ground, hw = Math.min(W * 0.22, H * 0.29);
    this.hw = hw; this.cx = cx;
    // windows in house coords relative to cx, ground
    this.windows = [];
    const add = (x, y, w, h) => this.windows.push({ x: cx + x * hw, y: g + y * hw, w: w * hw, h: h * hw, lit: Math.random() < 0.4, timer: rand(2, 8), fig: 0, seed: rand(100) });
    add(-0.62, -0.95, 0.16, 0.22); add(-0.62, -0.55, 0.16, 0.22);
    add(-0.2, -1.0, 0.16, 0.22); add(0.1, -1.0, 0.16, 0.22); add(0.4, -1.0, 0.16, 0.22);
    add(-0.2, -0.6, 0.16, 0.22); add(0.4, -0.6, 0.16, 0.22);
    add(-0.07, -1.45, 0.14, 0.18); // attic
    add(-0.9, -1.8, 0.1, 0.16); // tower
    this.bolt = null; this.flash = 0; this.nextStrike = rand(4, 9);
    this.smoke = [];
    this.bats = Array.from({ length: 5 }, () => ({ a: rand(TAU), r: rand(0.9, 2.0), s: rand(0.01, 0.025) * W, v: rand(0.4, 1), ph: rand(TAU) }));
    this.fence = []; for (let x = 0; x < W; x += W * 0.02) this.fence.push(x);
  }
  update(dt, t) {
    const { W, H } = this;
    for (const w of this.windows) {
      w.timer -= dt;
      if (w.timer <= 0) { w.lit = !w.lit; w.timer = w.lit ? rand(4, 14) : rand(2, 9); if (w.lit && Math.random() < 0.45) { w.fig = rand(2, 5); } }
      if (w.fig > 0) w.fig -= dt;
    }
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.nextStrike -= dt;
    if (this.nextStrike <= 0) { const x = rand(W * 0.05, W * 0.95); this.bolt = makeBolt(x, 0, x + rand(-80, 80), this.ground * 0.9); this.flash = 1; this.nextStrike = rand(6, 14); }
    if (Math.random() < dt * 6) this.smoke.push({ x: this.cx + this.hw * 0.55, y: this.ground - this.hw * 1.42, r: this.hw * 0.05, a: 0.5, vx: rand(5, 25) });
    for (const s of this.smoke) { s.y -= 30 * dt; s.x += s.vx * dt; s.r += 14 * dt; s.a -= 0.12 * dt; }
    this.smoke = this.smoke.filter(s => s.a > 0);
    for (const b of this.bats) b.a += b.v * dt;
  }
  draw(ctx, t) {
    const { W, H } = this; const m = this.moon, cx = this.cx, g = this.ground, hw = this.hw;
    skyGradient(ctx, W, H, '#0a0e2c', '#2d336f', 0.9);
    ctx.fillStyle = '#fff';
    for (const s of this.stars) { ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.2 + s.s)); ctx.fillRect(s.x, s.y, 2, 2); }
    ctx.globalAlpha = 1;
    drawMoon(ctx, m.x, m.y, m.r);
    for (const b of this.bats) drawBat(ctx, m.x + Math.cos(b.a) * m.r * b.r, m.y + Math.sin(b.a * 1.3) * m.r * b.r * 0.6, b.s, Math.sin(t * 14 + b.ph));
    if (this.bolt && this.flash > 0) drawBolt(ctx, this.bolt, this.flash, 3);
    for (const s of this.smoke) drawGlow(ctx, s.x, s.y, s.r, [120, 120, 130], s.a, 0.2);
    // house silhouette
    ctx.fillStyle = '#030308';
    ctx.beginPath(); ctx.rect(cx - hw * 0.75, g - hw * 1.2, hw * 1.5, hw * 1.2); ctx.fill(); // main block
    ctx.beginPath(); ctx.moveTo(cx - hw * 0.85, g - hw * 1.2); ctx.lineTo(cx, g - hw * 1.75); ctx.lineTo(cx + hw * 0.85, g - hw * 1.2); ctx.closePath(); ctx.fill(); // roof
    ctx.beginPath(); ctx.rect(cx - hw * 1.05, g - hw * 1.95, hw * 0.4, hw * 1.95); ctx.fill(); // tower
    ctx.beginPath(); ctx.moveTo(cx - hw * 1.12, g - hw * 1.95); ctx.lineTo(cx - hw * 0.85, g - hw * 2.5); ctx.lineTo(cx - hw * 0.58, g - hw * 1.95); ctx.closePath(); ctx.fill(); // tower roof
    ctx.beginPath(); ctx.rect(cx + hw * 0.5, g - hw * 1.55, hw * 0.12, hw * 0.4); ctx.fill(); // chimney
    ctx.beginPath(); ctx.rect(cx - hw * 0.3, g - hw * 0.5, hw * 0.6, hw * 0.5); ctx.fill(); // porch
    ctx.beginPath(); ctx.moveTo(cx - hw * 0.35, g - hw * 0.5); ctx.lineTo(cx, g - hw * 0.68); ctx.lineTo(cx + hw * 0.35, g - hw * 0.5); ctx.closePath(); ctx.fill();
    // door
    ctx.fillStyle = '#1a1208'; ctx.fillRect(cx - hw * 0.08, g - hw * 0.34, hw * 0.16, hw * 0.34);
    // windows
    for (const w of this.windows) {
      if (w.lit) {
        const f = 0.75 + 0.25 * noise(t * 4, w.seed);
        drawGlow(ctx, w.x + w.w / 2, w.y + w.h / 2, w.w * 1.6, [255, 190, 70], 0.5 * f, 0.3);
        ctx.fillStyle = `rgba(255,${200 + 30 * f | 0},${90 + 40 * f | 0},1)`; ctx.fillRect(w.x, w.y, w.w, w.h);
        if (w.fig > 0) {
          ctx.fillStyle = '#000'; const k = Math.min(1, (5 - w.fig) * 2);
          ctx.beginPath(); ctx.arc(w.x + w.w / 2, w.y + w.h * (1.2 - 0.75 * k), w.w * 0.22, 0, TAU); ctx.fill();
          ctx.fillRect(w.x + w.w * 0.15, w.y + w.h * (1.2 - 0.75 * k) + w.w * 0.2, w.w * 0.7, w.h);
        }
        ctx.fillStyle = 'rgba(3,3,8,0.9)'; ctx.fillRect(w.x + w.w * 0.47, w.y, w.w * 0.06, w.h); ctx.fillRect(w.x, w.y + w.h * 0.47, w.w, w.h * 0.06);
      } else { ctx.fillStyle = '#0d0f22'; ctx.fillRect(w.x, w.y, w.w, w.h); }
    }
    // ground and fence
    ctx.fillStyle = '#000'; ctx.fillRect(0, g, W, H - g);
    ctx.fillStyle = '#1d1d2e';
    for (const x of this.fence) { ctx.fillRect(x, g - hw * 0.14, W * 0.006, hw * 0.16); }
    ctx.fillRect(0, g - hw * 0.1, W, W * 0.004);
    if (this.flash > 0) fillScreen(ctx, W, H, '#dfe8ff', (CONFIG.FLASHES ? 0.5 : 0.15) * this.flash);
  }
}
