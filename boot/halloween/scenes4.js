'use strict';
// Scenes, part 4: built for an OLED screen, where #000 is genuinely off. These lean on long
// stretches of true black and silence, then something arrives. Restraint is the point: the
// room should start wondering whether the wall has died, right before it answers.

// True black. On OLED this is the panel switching off, which is darker than any "dark grey".
const VOID = '#000000';

// ---------------------------------------------------------------- 1. the dark
// Almost nothing. Rare, tiny events in a black field: a blink, a distant shape, a breath of
// static. Mostly it is just dark, which makes everything after it louder.
class TheDarkScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = rand(26, 38);
    this.next = rand(3, 7); this.event = null; this.eventT = 0;
  }
  update(dt, t) {
    this.next -= dt;
    if (this.event) { this.eventT -= dt; if (this.eventT <= 0) this.event = null; }
    else if (this.next <= 0) {
      this.event = pick(['blink', 'blink', 'shape', 'hiss', 'word']);
      this.eventT = this.event === 'shape' ? rand(1.2, 2.2) : rand(0.25, 0.7);
      this.ex = rand(0.15, 0.85); this.ey = rand(0.2, 0.8);
      this.word = pick(['STILL HERE', 'WAITING', 'NOT YET', 'SOON']);
      this.next = rand(4, 11);
    }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    if (!this.event) return;
    const k = clamp01(this.eventT / 0.35);
    if (this.event === 'blink') {
      const w = W * 0.022;
      drawEye(ctx, this.ex * W - w * 0.7, this.ey * H, w, k, [220, 190, 90], 0, 0, false);
      drawEye(ctx, this.ex * W + w * 0.7, this.ey * H, w, k, [220, 190, 90], 0, 0, false);
    } else if (this.event === 'shape') {
      ctx.save(); ctx.globalAlpha = 0.5 * clamp01(this.eventT);
      drawFigure(ctx, this.ex * W, H * 0.95, H * rand(0.3, 0.34), '#0a0a0c');
      ctx.restore();
    } else if (this.event === 'hiss') {
      drawStatic(ctx, W, H, 0.10 * k, 3);
    } else {
      ctx.save(); ctx.globalAlpha = 0.5 * k;
      ctx.font = `${H * 0.05}px ${FONT_SERIF}`; ctx.fillStyle = '#9a9aa6';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.word, W / 2, H / 2); ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- 2. power cut
// The wall "dies": black, nothing, for an uncomfortably long time. Then it comes back wrong.
class PowerCutScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 24;
    this.dieAt = rand(2.5, 4.5); this.backAt = this.dieAt + rand(7, 11);
  }
  update() {}
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    if (t < this.dieAt) {
      // a dying fluorescent flicker, then gone
      const f = Math.random() < 0.35 ? rand(0.05, 0.3) : 0.02;
      fillScreen(ctx, W, H, '#1b1b22', f);
      if (Math.random() < 0.2) drawStatic(ctx, W, H, 0.08, 3);
      return;
    }
    if (t < this.backAt) return;              // nothing at all. pure black.
    const k = t - this.backAt;
    if (k < 0.12 && CONFIG.FLASHES) { fillScreen(ctx, W, H, '#ffffff', 1 - k / 0.12); return; }
    drawStatic(ctx, W, H, 0.5, 3);
    ctx.save();
    ctx.globalAlpha = clamp01(k - 0.1);
    ctx.font = `${H * 0.11}px ${FONT_CREEPY}`; ctx.fillStyle = '#d01818';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('WE TURNED IT OFF', W / 2 + rand(-3, 3), H / 2);
    ctx.restore();
    tearFrame(ctx, this.show, 3, 30);
  }
}

// ---------------------------------------------------------------- 3. breathing dark
// A faint shape swells out of black as if something large is breathing in the room.
class BreathScene extends Scene {
  constructor(show) { super(show); this.fog = 0; this.duration = 28; this.p = rand(TAU); }
  update(dt) { this.p += dt * 0.55; }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    const b = (Math.sin(this.p) * 0.5 + 0.5);
    const r = Math.max(W, H) * (0.22 + 0.10 * b);
    if (!this._g) this._g = glowSprite([40, 0, 0], 0.4);
    ctx.save(); ctx.globalAlpha = 0.10 + 0.32 * b;
    ctx.drawImage(this._g, W / 2 - r, H / 2 - r, r * 2, r * 2);
    ctx.restore();
    if (t > 16 && b > 0.93) {           // at the peak of a late breath, eyes open briefly
      const w = W * 0.03;
      drawEye(ctx, W / 2 - w * 1.1, H / 2, w, 1, [200, 40, 20], 0, 0, true);
      drawEye(ctx, W / 2 + w * 1.1, H / 2, w, 1, [200, 40, 20], 0, 0, true);
    }
  }
}

// ---------------------------------------------------------------- 4. countdown
// Big numerals falling to zero in silence. Everyone watches. Zero is not an explosion:
// it is one word, which is worse.
class CountdownScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 22;
    this.from = randInt(8, 12); this.end = pick(['HELLO', 'FOUND YOU', 'BEHIND YOU', 'TOO LATE']);
  }
  update() {}
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    const step = 1.15;
    const i = Math.floor(t / step);
    const n = this.from - i;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (n > 0) {
      const into = (t / step) % 1;
      ctx.save(); ctx.globalAlpha = clamp01(1.4 - into * 1.4);
      ctx.font = `bold ${H * (0.42 + 0.06 * (1 - into))}px "Courier New", monospace`;
      ctx.fillStyle = '#c8c8d2';
      ctx.fillText(String(n), W / 2, H / 2);
      ctx.restore();
      return;
    }
    const k = t - this.from * step;
    if (k < 0.1 && CONFIG.FLASHES) { fillScreen(ctx, W, H, '#ffffff', 1 - k / 0.1); return; }
    ctx.save(); ctx.globalAlpha = clamp01(k * 2) * clamp01((this.duration - t) / 2);
    const size = fitFontSize(ctx, this.end, FONT_CREEPY, W * 0.9, H * 0.24);
    ctx.font = `${size}px ${FONT_CREEPY}`; ctx.fillStyle = '#c00000';
    ctx.fillText(this.end, W / 2 + rand(-2, 2), H / 2);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- 5. the approach
// One shape, very far away in black, walking straight at the camera for half a minute.
// Nothing else happens. It simply gets closer.
class ApproachScene extends Scene {
  constructor(show) { super(show); this.fog = 0; this.duration = 30; this.x = rand(0.42, 0.58); }
  update() {}
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    const k = clamp01(t / (this.duration - 4));
    const h = H * (0.05 + Math.pow(k, 2.6) * 0.95);    // slow at first, then rushing; ends filling the frame
    // a hint of floor so it reads as distance, kept almost black for OLED
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, 'rgba(14,14,20,0)'); g.addColorStop(1, 'rgba(26,26,34,1)');
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.55, W, H * 0.45);
    const shake = k > 0.86 ? (k - 0.86) * 60 : 0;
    ctx.save(); if (shake) ctx.translate(rand(-shake, shake), rand(-shake, shake));
    drawFigure(ctx, this.x * W, H * 0.97, h, '#14141a', k > 0.55 ? (k - 0.55) * 2.2 : 0);
    ctx.restore();
    if (k > 0.985 && CONFIG.FLASHES) fillScreen(ctx, W, H, '#140000', (k - 0.985) * 60);
  }
}

// ---------------------------------------------------------------- 6. blink and it is closer
// Black. A face appears for one frame, far off. Black. Nearer. Black. Filling the screen.
class BlinkCloserScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 20;
    this.variant = pick(['scream', 'ghoul', 'skull']);
    this.steps = [0.10, 0.18, 0.30, 0.52, 0.95];
    this.at = [4, 7.5, 10.5, 13, 15.2];
    this.x = rand(0.4, 0.6);
  }
  update() {}
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    for (let i = 0; i < this.at.length; i++) {
      const dt = t - this.at[i];
      const shown = i === this.at.length - 1 ? 0.5 : 0.12;   // the last one lingers
      if (dt >= 0 && dt < shown) {
        const s = H * this.steps[i];
        ctx.save();
        if (i === this.at.length - 1) ctx.translate(rand(-6, 6), rand(-6, 6));
        drawScareFace(ctx, this.x * W, H * 0.5, s, this.variant, t);
        ctx.restore();
        if (i === this.at.length - 1 && dt < 0.06 && CONFIG.FLASHES) {
          fillScreen(ctx, W, H, '#ffffff', 1 - dt / 0.06);
        }
        return;
      }
    }
  }
}

// ---------------------------------------------------------------- 7. photo flash
// Pure black, then one bundled image slammed full screen for a fraction of a second, like a
// camera flash in a dark room. Repeats a few times, each a little longer.
class PhotoFlashScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 24;
    this.img = IMAGES[pick(['pumpkin-green', 'pumpkin-orange', 'skull-mirror'])];
    this.at = [3.5, 7, 11, 14.5, 17.5, 19.8];
    this.len = [0.06, 0.08, 0.12, 0.2, 0.35, 1.6];
  }
  update() {}
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    for (let i = 0; i < this.at.length; i++) {
      const dt = t - this.at[i];
      if (dt >= 0 && dt < this.len[i]) {
        const last = i === this.at.length - 1;
        ctx.save();
        if (last) { const z = 1 + dt * 0.06; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); }
        if (!drawCover(ctx, this.img, W, H, 1)) { drawStatic(ctx, W, H, 0.6, 3); }
        ctx.restore();
        if (dt < 0.04 && CONFIG.FLASHES) fillScreen(ctx, W, H, '#ffffff', 1 - dt / 0.04);
        return;
      }
    }
  }
}

// ---------------------------------------------------------------- 8. interference
// The wall pretends to lose signal: black, a band of static crawling, a half-formed face
// inside the noise, then black again.
class InterferenceScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 26;
    this.bandY = rand(0.2, 0.8); this.bandV = rand(-0.08, 0.08);
    this.next = rand(2, 5); this.burst = 0; this.face = false;
  }
  update(dt, t) {
    this.bandY += this.bandV * dt;
    if (this.bandY < 0.05 || this.bandY > 0.95) this.bandV *= -1;
    this.next -= dt;
    if (this.burst > 0) this.burst -= dt;
    else if (this.next <= 0) { this.burst = rand(0.3, 1.1); this.face = Math.random() < 0.35; this.next = rand(3, 7); }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    // a thin band of noise, the only lit thing on the panel
    const h = H * 0.14;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, this.bandY * H - h / 2, W, h); ctx.clip();
    drawStatic(ctx, W, H, this.burst > 0 ? 0.55 : 0.18, 3);
    ctx.restore();
    if (this.burst > 0) {
      drawStatic(ctx, W, H, 0.06, 3);
      if (this.face) {
        ctx.save(); ctx.globalAlpha = 0.35;
        drawScareFace(ctx, W / 2, H / 2, H * 0.3, 'ghoul', t);
        ctx.restore();
      }
      tearFrame(ctx, this.show, 2, 24);
    }
    if (t > this.duration - 3) {
      ctx.save(); ctx.globalAlpha = clamp01((t - (this.duration - 3)) / 1.2) * 0.8;
      ctx.font = `bold ${H * 0.06}px "Courier New", monospace`; ctx.fillStyle = '#c8c8d2';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('NO SIGNAL', W / 2, H / 2); ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- 9. one match
// A single small flame in a black room, drifting. It shows almost nothing. Then it goes out,
// and in the dark after it, something is standing where it had been.
class MatchScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 26;
    this.x = rand(0.35, 0.65); this.y = rand(0.42, 0.58);
    this.outAt = rand(15, 19); this.seen = false;
  }
  update(dt, t) {
    this.x += Math.sin(t * 0.7) * 0.0006;
    this.y += Math.cos(t * 0.5) * 0.0004;
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    const x = this.x * W, y = this.y * H;
    if (t < this.outAt) {
      const flick = 0.75 + 0.25 * noise(t * 9);
      const r = H * 0.16 * flick;
      if (!this._g) this._g = glowSprite([255, 150, 40], 0.1);
      ctx.save(); ctx.globalAlpha = 0.55 * flick;
      ctx.drawImage(this._g, x - r, y - r, r * 2, r * 2);
      ctx.restore();
      ctx.fillStyle = '#ffd089'; ctx.beginPath();
      ctx.ellipse(x, y, H * 0.006 * flick, H * 0.012 * flick, 0, 0, TAU); ctx.fill();
      // the faintest suggestion of a figure at the edge of the light, late on
      if (t > this.outAt - 5) {
        ctx.save(); ctx.globalAlpha = 0.12;
        drawFigure(ctx, x + W * 0.16, H * 0.96, H * 0.45, '#0b0b0e');
        ctx.restore();
      }
      return;
    }
    // the match is out. a beat of nothing, then eyes where it stood.
    const k = t - this.outAt;
    if (k < 2.2) return;
    const a = clamp01((k - 2.2) / 0.5) * clamp01((this.duration - t) / 2);
    ctx.save(); ctx.globalAlpha = a;
    const w = W * 0.02;
    drawEye(ctx, x + W * 0.16 - w, H * 0.52, w, 1, [230, 60, 30], 0, 0, true);
    drawEye(ctx, x + W * 0.16 + w, H * 0.52, w, 1, [230, 60, 30], 0, 0, true);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- 10. they are counting
// Tally marks scratched one at a time in a black field, counting the people in the room.
// It keeps going past any sensible number.
class TallyScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 26;
    this.marks = 0; this.next = 1.2; this.target = randInt(17, 31);
  }
  update(dt, t) {
    this.next -= dt;
    if (this.next <= 0 && this.marks < this.target) {
      this.marks++;
      this.next = this.marks > this.target * 0.7 ? rand(0.12, 0.3) : rand(0.4, 0.9);
    }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    const perRow = 20, gap = W * 0.035, rowH = H * 0.17;
    const x0 = W * 0.1, y0 = H * 0.3;
    ctx.strokeStyle = '#b8b4a8'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, H * 0.006);
    for (let i = 0; i < this.marks; i++) {
      const row = Math.floor(i / perRow), col = i % perRow;
      const grp = Math.floor(col / 5), inGrp = col % 5;
      const x = x0 + grp * gap * 5.8 + inGrp * gap * 0.9;
      const y = y0 + row * rowH;
      ctx.save(); ctx.globalAlpha = i === this.marks - 1 ? 1 : 0.8;
      ctx.beginPath();
      if (inGrp === 4) { ctx.moveTo(x - gap * 3.4, y + H * 0.05); ctx.lineTo(x + gap * 0.3, y - H * 0.05); }
      else { ctx.moveTo(x + rand(-1, 1), y - H * 0.05); ctx.lineTo(x + rand(-1, 1), y + H * 0.05); }
      ctx.stroke(); ctx.restore();
    }
    if (t > this.duration - 4) {
      ctx.save(); ctx.globalAlpha = clamp01((t - (this.duration - 4)) / 1.5);
      ctx.font = `${H * 0.07}px ${FONT_CREEPY}`; ctx.fillStyle = '#c01414';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('THAT IS MORE THAN WE INVITED', W / 2, H * 0.84);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- 11. will-o'-the-wisp
// A single yellow orb drifts in a black room, drawing the eye. It wanders, dims, comes back,
// pulls toward the centre, swells... and the room is suddenly a full-screen image instead.
class OrbScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 26;
    this.x = rand(0.2, 0.8); this.y = rand(0.3, 0.7);
    this.vx = rand(-0.03, 0.03); this.vy = rand(-0.02, 0.02);
    this.revealAt = rand(16, 20);
    const keys = Object.keys(IMAGES);
    this.img = IMAGES[pick(keys.length ? keys : ['skull-mirror'])];
    this.flick = rand(TAU);
  }
  update(dt, t) {
    this.flick += dt * 3;
    if (t < this.revealAt - 3) {
      // wander, with a gentle pull back from the edges
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.x < 0.12 || this.x > 0.88) this.vx *= -1;
      if (this.y < 0.18 || this.y > 0.82) this.vy *= -1;
      this.vx += rand(-0.004, 0.004) * dt * 60 * 0.016;
      this.vy += rand(-0.003, 0.003) * dt * 60 * 0.016;
    } else {
      // drawn toward the middle just before it goes
      this.x += (0.5 - this.x) * dt * 1.4;
      this.y += (0.5 - this.y) * dt * 1.4;
    }
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    // after the reveal the orb is gone and the image owns the screen
    if (t >= this.revealAt) {
      const k = t - this.revealAt;
      if (k < 0.05 && CONFIG.FLASHES) { fillScreen(ctx, W, H, '#fff6d0', 1 - k / 0.05); return; }
      ctx.save();
      const z = 1 + Math.min(k, 6) * 0.012;           // very slow push in
      ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      const a = clamp01((this.duration - t) / 1.5);   // fade out at the very end
      if (!drawCover(ctx, this.img, W, H, a)) drawStatic(ctx, W, H, 0.5 * a, 3);
      ctx.restore();
      vignette(ctx, W, H, 0.7);
      return;
    }
    // the orb: a soft yellow glow with a bright core, breathing
    const near = clamp01((t - (this.revealAt - 3)) / 3);     // swells in the last 3s
    const f = 0.82 + 0.18 * Math.sin(this.flick) + near * 0.5;
    const r = H * (0.055 + near * 0.5) * f;
    const x = this.x * W, y = this.y * H;
    if (!this._g) this._g = glowSprite([255, 205, 90], 0.14);
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.55 + near * 0.45);
    ctx.drawImage(this._g, x - r, y - r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(x, y, H * (0.009 + near * 0.05) * f, 0, TAU); ctx.fill();
  }
}


// ---------------------------------------------------------------- 12. assimilation
// The Patrick Stewart tribute, rebuilt as a full scene so it cannot be missed: a Borg
// terminal wakes up, announces itself, scans a guest (a party photo when one exists),
// counts the assimilation up and floods the room with RESISTANCE IS FUTILE.
class BorgScene extends Scene {
  constructor(show) {
    super(show); this.fog = 0; this.duration = 24;
    this.green = '#4dff6a'; this.dim = '#1d7a33';
    // Subject to assimilate: prefer a guest photo, fall back to a bundled image.
    let img = (show.photoPick && show.photoPick()) || null;
    if (!img) { const k = Object.keys(IMAGES); img = k.length ? IMAGES[pick(k)] : null; }
    this.subject = img;
    this.sprite = null;        // green-tinted copy, built once when the image is ready
    this.designation = Math.floor(rand(1, 9)) + ' OF 9';
    this.lines = Array.from({ length: 10 }, () => ({ y: rand(0.05, 0.95), w: rand(0.03, 0.25), x: rand(0, 1), v: rand(-0.3, 0.3) }));
    this.flick = rand(TAU);
  }
  // Pre-tint the subject once: per-frame composite work is too expensive on the Pi.
  buildSprite() {
    const img = this.subject;
    if (!img || !(img.complete !== undefined ? img.complete && img.naturalWidth : img.ready)) return;
    const c = document.createElement('canvas');
    const w = 480, h = Math.max(1, Math.round(w * (img.naturalHeight || img.height) / (img.naturalWidth || img.width)));
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.filter = 'grayscale(1)';
    x.drawImage(img, 0, 0, w, h);
    x.filter = 'none';
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = '#58ff80'; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    for (let y = 0; y < h; y += 4) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, y, w, 2); }
    this.sprite = c;
  }
  type(ctx, text, t, t0, cps, x, y, size, color, align) {
    if (t < t0) return false;
    const n = Math.min(text.length, Math.floor((t - t0) * cps));
    const shown = text.slice(0, n);
    ctx.font = 'bold ' + size + 'px "Courier New", monospace';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    const cursor = (n < text.length && Math.floor(t * 3) % 2 === 0) ? '\u2588' : '';
    ctx.fillText(shown + cursor, x, y);
    return n >= text.length;
  }
  circuit(ctx, alpha) {
    const { W, H } = this;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = this.dim; ctx.lineWidth = 2;
    for (const l of this.lines) {
      l.x += l.v / 60; if (l.x > 1.1) l.x = -0.3; if (l.x < -0.3) l.x = 1.1;
      ctx.beginPath(); ctx.moveTo(l.x * W, l.y * H); ctx.lineTo((l.x + l.w) * W, l.y * H); ctx.stroke();
    }
    ctx.restore();
  }
  draw(ctx, t) {
    const { W, H } = this;
    fillScreen(ctx, W, H, VOID);
    if (!this.sprite) this.buildSprite();
    // 0-1.4s: a lone cursor blinks in the dark, like a terminal waking.
    if (t < 1.4) {
      if (Math.floor(t * 2.5) % 2 === 0) {
        ctx.font = 'bold ' + H * 0.07 + 'px "Courier New", monospace';
        ctx.fillStyle = this.green; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('\u2588', W * 0.08, H * 0.5);
      }
      return;
    }
    this.circuit(ctx, Math.min(1, (t - 1.4) / 3) * 0.35);
    // 1.4s on: WE ARE THE BORG types itself out.
    const size1 = fitFontSize(ctx, 'WE ARE THE BORG', '"Courier New", monospace', W * 0.8, H * 0.13);
    this.type(ctx, 'WE ARE THE BORG', t, 1.4, 11, W / 2, H * 0.2, size1, this.green);
    // 4s on: the longer sentence, two lines, smaller.
    const s2 = Math.min(H * 0.034, fitFontSize(ctx, 'YOUR BIOLOGICAL AND TECHNOLOGICAL DISTINCTIVENESS', '"Courier New", monospace', W * 0.92, H * 0.034));
    this.type(ctx, 'YOUR BIOLOGICAL AND TECHNOLOGICAL DISTINCTIVENESS', t, 4.2, 26, W / 2, H * 0.3, s2, this.dim);
    this.type(ctx, 'WILL BE ADDED TO OUR OWN', t, 6.2, 26, W / 2, H * 0.3 + s2 * 1.7, s2, this.dim);
    // 8-19s: the scan. The subject appears centre screen behind a sweeping scan bar.
    if (t > 8 && t < 19.2) {
      const k = clamp01((t - 8) / 0.8);
      const ph = H * 0.36, pw = this.sprite ? ph * this.sprite.width / this.sprite.height : ph * 0.75;
      const px = W / 2 - pw / 2, py = H * 0.38;
      if (this.sprite) {
        ctx.save(); ctx.globalAlpha = k * (0.82 + 0.12 * Math.sin(t * 20 + this.flick));
        ctx.drawImage(this.sprite, px, py, pw, ph);
        ctx.restore();
      }
      ctx.save(); ctx.strokeStyle = this.green; ctx.lineWidth = 2; ctx.globalAlpha = k;
      const c = 18;   // bracket corners
      for (const [bx, by, dx, dy] of [[px, py, 1, 1], [px + pw, py, -1, 1], [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(bx, by + dy * c); ctx.lineTo(bx, by); ctx.lineTo(bx + dx * c, by); ctx.stroke();
      }
      // scan bar sweeps top to bottom and back
      const sweep = (Math.sin((t - 8) * 1.1) + 1) / 2;
      const sy = py + ph * sweep;
      ctx.fillStyle = 'rgba(77,255,106,0.22)'; ctx.fillRect(px, sy - 3, pw, 6);
      ctx.fillStyle = 'rgba(77,255,106,0.7)'; ctx.fillRect(px, sy - 1, pw, 2);
      ctx.restore();
      const cap = Math.min(H * 0.03, fitFontSize(ctx, 'SUBJECT LOCATED. SPECIES 5618.', '"Courier New", monospace', W * 0.9, H * 0.03));
      this.type(ctx, 'SUBJECT LOCATED. SPECIES 5618.', t, 9, 22, W / 2, py + ph + H * 0.045, cap, this.green);
      this.type(ctx, 'DESIGNATION ' + this.designation, t, 11, 22, W / 2, py + ph + H * 0.085, cap, this.green);
    }
    // 12.5-19.2s: assimilation counter climbs with glitchy jumps.
    if (t > 12.5 && t < 19.2) {
      const p = clamp01((t - 12.5) / 6);
      let pct = Math.floor(100 * (p < 0.9 ? p * 1.06 : 0.95 + (p - 0.9) * 0.5));
      if (Math.floor(t * 7) % 9 === 0) pct = Math.min(99, pct + 2);   // nervous little jumps
      ctx.font = 'bold ' + H * 0.045 + 'px "Courier New", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = this.green;
      ctx.fillText('ASSIMILATION ' + Math.min(pct, 99) + '%', W / 2, H * 0.945);
    }
    // 19.2s on: the flood. Green static bursts and RESISTANCE IS FUTILE.
    if (t >= 19.2) {
      fillScreen(ctx, W, H, '#041a08', 0.75);
      drawStatic(ctx, W, H, 0.14, 3);
      this.circuit(ctx, 0.4);
      const sizeF = fitFontSize(ctx, 'RESISTANCE IS FUTILE', '"Courier New", monospace', W * 0.9, H * 0.15);
      if (Math.floor(t / 0.1) % 4 !== 3) {
        ctx.save();
        const jx = rand(-4, 4), jy = rand(-2, 2);
        ctx.font = 'bold ' + sizeF + 'px "Courier New", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,0,60,0.4)'; ctx.fillText('RESISTANCE IS FUTILE', W / 2 - 5 + jx, H * 0.45);
        ctx.fillStyle = 'rgba(0,200,255,0.3)'; ctx.fillText('RESISTANCE IS FUTILE', W / 2 + 5 + jx, H * 0.45);
        ctx.fillStyle = '#c8ffd0'; ctx.fillText('RESISTANCE IS FUTILE', W / 2 + jx, H * 0.45 + jy);
        ctx.restore();
      }
      this.type(ctx, 'YOU WILL ADAPT TO SERVICE US', t, 21, 24, W / 2, H * 0.62, H * 0.04, this.green);
      if (t < 19.5) fillScreen(ctx, W, H, '#20ff40', 1 - (t - 19.2) / 0.3);
    }
  }
}

function registerScenes4(show) {
  show.register('borgscene', s => new BorgScene(s));
  show.register('orb', s => new OrbScene(s));
  show.register('thedark', s => new TheDarkScene(s));
  show.register('powercut', s => new PowerCutScene(s));
  show.register('breath', s => new BreathScene(s));
  show.register('countdown', s => new CountdownScene(s));
  show.register('approach', s => new ApproachScene(s));
  show.register('blinkcloser', s => new BlinkCloserScene(s));
  show.register('photoflash', s => new PhotoFlashScene(s));
  show.register('interference', s => new InterferenceScene(s));
  show.register('match', s => new MatchScene(s));
  show.register('tally', s => new TallyScene(s));
}
