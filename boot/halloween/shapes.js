'use strict';
// Procedural drawing routines. Everything is vector so it stays crisp at any projector resolution.

function drawBat(ctx, x, y, s, flap, color = '#000') {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = color;
  const wy = flap * s * 0.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-s * 0.35, -s * 0.3 + wy * 0.3, -s, wy - s * 0.1);
  ctx.quadraticCurveTo(-s * 0.8, wy * 0.6 + s * 0.15, -s * 0.6, wy * 0.5 + s * 0.1);
  ctx.quadraticCurveTo(-s * 0.45, wy * 0.4 + s * 0.25, -s * 0.3, wy * 0.3 + s * 0.15);
  ctx.quadraticCurveTo(-s * 0.15, s * 0.3, 0, s * 0.25);
  ctx.quadraticCurveTo(s * 0.15, s * 0.3, s * 0.3, wy * 0.3 + s * 0.15);
  ctx.quadraticCurveTo(s * 0.45, wy * 0.4 + s * 0.25, s * 0.6, wy * 0.5 + s * 0.1);
  ctx.quadraticCurveTo(s * 0.8, wy * 0.6 + s * 0.15, s, wy - s * 0.1);
  ctx.quadraticCurveTo(s * 0.35, -s * 0.3 + wy * 0.3, 0, 0);
  ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 0.13, s * 0.24, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -s * 0.16, s * 0.11, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.09, -s * 0.2); ctx.lineTo(-s * 0.13, -s * 0.38); ctx.lineTo(-s * 0.01, -s * 0.25); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.09, -s * 0.2); ctx.lineTo(s * 0.13, -s * 0.38); ctx.lineTo(s * 0.01, -s * 0.25); ctx.fill();
  ctx.restore();
}

function drawGhost(ctx, x, y, s, t, alpha = 0.85, face = 0) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= alpha;
  const w = s, h = s * 1.5;
  drawGlow(ctx, 0, h * 0.2, w * 1.1, [220, 225, 255], 0.5);
  ctx.fillStyle = '#f2f2ff';
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.arc(0, 0, w / 2, Math.PI, 0);
  ctx.lineTo(w / 2, h * 0.6);
  const waves = 4;
  for (let i = 0; i < waves; i++) {
    const x0 = w / 2 - (i / waves) * w, x1 = w / 2 - ((i + 1) / waves) * w;
    const cy = h * 0.6 + (i % 2 ? -1 : 1) * s * 0.16 * (0.7 + 0.3 * Math.sin(t * 4 + i));
    ctx.quadraticCurveTo((x0 + x1) / 2, cy, x1, h * 0.6);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#101018';
  if (face === 1) {
    // angry
    ctx.beginPath(); ctx.moveTo(-w * 0.3, -w * 0.12); ctx.lineTo(-w * 0.08, -w * 0.02); ctx.lineTo(-w * 0.3, w * 0.08); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.3, -w * 0.12); ctx.lineTo(w * 0.08, -w * 0.02); ctx.lineTo(w * 0.3, w * 0.08); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, w * 0.25, w * 0.2, w * 0.14, 0, 0, TAU); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(-w * 0.17, -w * 0.04, w * 0.07, w * 0.11, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * 0.17, -w * 0.04, w * 0.07, w * 0.11, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, w * 0.2, w * 0.08, w * 0.13, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawEye(ctx, x, y, w, open, c, lookX = 0, lookY = 0, slit = false) {
  if (open <= 0.03) return;
  const h = w * 0.5 * open;
  ctx.save(); ctx.translate(x, y);
  drawGlow(ctx, 0, 0, w * 1.4, c, 0.55 * open);
  ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.quadraticCurveTo(0, -h * 1.7, w / 2, 0); ctx.quadraticCurveTo(0, h * 1.7, -w / 2, 0); ctx.closePath();
  ctx.fillStyle = rgba(c, 1); ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#000'; ctx.beginPath();
  if (slit) ctx.ellipse(lookX * w * 0.18, lookY * h * 0.3, w * 0.07, h * 0.95, 0, 0, TAU);
  else ctx.arc(lookX * w * 0.18, lookY * h * 0.3, h * 0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// Jack-o-lantern. face = {eyes:0..3, mouth:0..3}; glow 0..1
function drawPumpkin(ctx, x, y, r, face, glow, bodyOnly = false) {
  ctx.save(); ctx.translate(x, y);
  drawGlow(ctx, 0, 0, r * 2.0, [255, 140, 20], 0.4 * glow);
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const k = (i - (segs - 1) / 2) / ((segs - 1) / 2);
    ctx.fillStyle = i % 2 ? '#f5820f' : '#e26a07';
    ctx.beginPath(); ctx.ellipse(k * r * 0.55, 0, r * 0.5, r * 0.88 - Math.abs(k) * r * 0.12, 0, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(110,45,0,0.45)'; ctx.lineWidth = r * 0.035;
  for (const k of [-0.5, -0.17, 0.17, 0.5]) { ctx.beginPath(); ctx.ellipse(k * r * 0.55, 0, r * 0.5, r * 0.88 - Math.abs(k) * r * 0.12, 0, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = '#3f6a1f';
  ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.82); ctx.quadraticCurveTo(-r * 0.08, -r * 1.2, r * 0.18, -r * 1.12); ctx.lineTo(r * 0.22, -r * 1.0); ctx.quadraticCurveTo(r * 0.05, -r * 1.05, r * 0.12, -r * 0.8); ctx.fill();
  if (bodyOnly) { ctx.restore(); return; }
  const inner = `rgba(${255},${160 + 80 * glow | 0},${30 + 60 * glow | 0},${0.35 + 0.65 * glow})`;
  drawGlow(ctx, 0, 0, r * 0.9, [255, 200, 60], 0.5 * glow, 0.5);
  ctx.fillStyle = inner;
  const ex = r * 0.38, ey = -r * 0.25, es = r * 0.26;
  const eye = (sx) => {
    ctx.beginPath();
    switch (face.eyes) {
      case 0: ctx.moveTo(sx * ex, ey - es); ctx.lineTo(sx * ex + es, ey + es * 0.6); ctx.lineTo(sx * ex - es, ey + es * 0.6); break; // triangle up
      case 1: ctx.moveTo(sx * ex - es, ey - es * 0.6); ctx.lineTo(sx * ex + es, ey - es * 0.2); ctx.lineTo(sx * ex, ey + es * 0.7); break; // angry slant
      case 2: ctx.arc(sx * ex, ey, es * 0.7, 0, TAU); break; // round
      default: ctx.moveTo(sx * ex - es, ey); ctx.lineTo(sx * ex, ey - es * 0.9); ctx.lineTo(sx * ex + es, ey); ctx.lineTo(sx * ex, ey + es * 0.5); // diamond
    }
    ctx.closePath(); ctx.fill();
  };
  // mirrored angry eyes slant inward
  if (face.eyes === 1) {
    ctx.beginPath(); ctx.moveTo(-ex - es, ey - es * 0.2); ctx.lineTo(-ex + es, ey - es * 0.6); ctx.lineTo(-ex, ey + es * 0.7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ex + es, ey - es * 0.2); ctx.lineTo(ex - es, ey - es * 0.6); ctx.lineTo(ex, ey + es * 0.7); ctx.closePath(); ctx.fill();
  } else { eye(-1); eye(1); }
  // nose
  ctx.beginPath(); ctx.moveTo(0, r * 0.05); ctx.lineTo(r * 0.1, r * 0.25); ctx.lineTo(-r * 0.1, r * 0.25); ctx.closePath(); ctx.fill();
  // mouth
  const my = r * 0.45, mw = r * 0.62;
  ctx.beginPath();
  switch (face.mouth) {
    case 0: { // jagged grin
      ctx.moveTo(-mw, my - r * 0.08); ctx.quadraticCurveTo(0, my - r * 0.22, mw, my - r * 0.08);
      const n = 7; for (let i = n; i >= 0; i--) { const px = -mw + (i / n) * 2 * mw; const depth = r * 0.45 * (1 - Math.pow(px / mw, 2)) + r * 0.02; ctx.lineTo(px, my + (i % 2 ? depth : depth * 0.5)); }
      break;
    }
    case 1: ctx.ellipse(0, my + r * 0.05, r * 0.2, r * 0.26, 0, 0, TAU); break; // O
    case 2: { // frown jagged
      ctx.moveTo(-mw, my + r * 0.2); ctx.quadraticCurveTo(0, my - r * 0.3, mw, my + r * 0.2);
      const n = 5; for (let i = n; i >= 1; i--) { const px = -mw + (i / n) * 2 * mw; ctx.lineTo(px - mw / n, my + (i % 2 ? r * 0.3 : r * 0.1)); }
      break;
    }
    default: { // wide grin with teeth gaps
      ctx.moveTo(-mw, my - r * 0.05); ctx.quadraticCurveTo(0, my + r * 0.5, mw, my - r * 0.05);
      ctx.lineTo(mw * 0.8, my + r * 0.02); ctx.lineTo(mw * 0.6, my - r * 0.12); ctx.lineTo(mw * 0.45, my + r * 0.08);
      ctx.lineTo(-mw * 0.45, my + r * 0.08); ctx.lineTo(-mw * 0.6, my - r * 0.12); ctx.lineTo(-mw * 0.8, my + r * 0.02);
    }
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawSkull(ctx, x, y, r, eyeGlow = 0, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const bone = '#d8d4c6';
  // --- cranium: taller than wide, with brow ridge and temples, not a circle ---
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.moveTo(-r * 0.68, r * 0.10);                                 // left temple
  ctx.quadraticCurveTo(-r * 0.86, -r * 0.55, -r * 0.40, -r * 0.92); // up the left of the dome
  ctx.quadraticCurveTo(0, -r * 1.15, r * 0.40, -r * 0.92);          // over the top
  ctx.quadraticCurveTo(r * 0.86, -r * 0.55, r * 0.68, r * 0.10);    // down the right
  ctx.quadraticCurveTo(r * 0.60, r * 0.30, r * 0.46, r * 0.40);     // right cheekbone
  ctx.lineTo(-r * 0.46, r * 0.40);                                  // across under the cheeks
  ctx.quadraticCurveTo(-r * 0.60, r * 0.30, -r * 0.68, r * 0.10);
  ctx.closePath(); ctx.fill();
  // --- jaw: narrower, hangs below the cheekbones ---
  ctx.beginPath();
  ctx.moveTo(-r * 0.44, r * 0.36);
  ctx.quadraticCurveTo(-r * 0.46, r * 0.80, -r * 0.26, r * 1.00);
  ctx.quadraticCurveTo(0, r * 1.12, r * 0.26, r * 1.00);
  ctx.quadraticCurveTo(r * 0.46, r * 0.80, r * 0.44, r * 0.36);
  ctx.closePath(); ctx.fill();
  // --- form shadow to give the dome volume ---
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  const sh = ctx.createRadialGradient(-r * 0.2, -r * 0.4, 0, 0, 0, r * 1.2);
  sh.addColorStop(0, 'rgba(255,255,255,1)'); sh.addColorStop(0.7, 'rgba(180,176,164,1)'); sh.addColorStop(1, 'rgba(120,116,104,1)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.9, r * 1.05, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // --- deep angular eye sockets (slightly slanted inward, hollow) ---
  for (const s of [-1, 1]) {
    const ex = s * r * 0.33, ey = -r * 0.18;
    const sock = ctx.createRadialGradient(ex, ey - r * 0.05, 0, ex, ey, r * 0.34);
    sock.addColorStop(0, '#000'); sock.addColorStop(0.75, '#000'); sock.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sock;
    ctx.beginPath();
    ctx.moveTo(ex - s * r * 0.30, ey - r * 0.18);
    ctx.quadraticCurveTo(ex + s * r * 0.26, ey - r * 0.26, ex + s * r * 0.30, ey + r * 0.02);
    ctx.quadraticCurveTo(ex + s * r * 0.16, ey + r * 0.30, ex - s * r * 0.08, ey + r * 0.28);
    ctx.quadraticCurveTo(ex - s * r * 0.30, ey + r * 0.18, ex - s * r * 0.30, ey - r * 0.18);
    ctx.closePath(); ctx.fill();
  }
  if (eyeGlow > 0) { drawGlow(ctx, -r * 0.33, -r * 0.16, r * 0.3, [255, 40, 20], eyeGlow, 0.4); drawGlow(ctx, r * 0.33, -r * 0.16, r * 0.3, [255, 40, 20], eyeGlow, 0.4); }
  // --- nasal cavity: inverted teardrop ---
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(0, r * 0.02);
  ctx.quadraticCurveTo(r * 0.14, r * 0.30, r * 0.06, r * 0.40);
  ctx.quadraticCurveTo(0, r * 0.44, -r * 0.06, r * 0.40);
  ctx.quadraticCurveTo(-r * 0.14, r * 0.30, 0, r * 0.02);
  ctx.closePath(); ctx.fill();
  // --- teeth: a row of separated blocks across the jaw, with gaps and shadow ---
  ctx.fillStyle = '#c4c0b2';
  const ty = r * 0.58, th = r * 0.26, tw = r * 0.11;
  for (let i = -3; i <= 3; i++) {
    const tx = i * r * 0.125 - tw / 2;
    ctx.fillRect(tx, ty, tw, th);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = Math.max(1, r * 0.018);
  for (let i = -3; i <= 3; i++) { const gx = (i + 0.5) * r * 0.125; ctx.beginPath(); ctx.moveTo(gx, ty); ctx.lineTo(gx, ty + th); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(-r * 0.42, ty); ctx.lineTo(r * 0.42, ty); ctx.stroke();
  // --- a hairline crack across the dome ---
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.beginPath(); ctx.moveTo(r * 0.12, -r * 1.02); ctx.lineTo(r * 0.02, -r * 0.7); ctx.lineTo(r * 0.16, -r * 0.5); ctx.lineTo(r * 0.08, -r * 0.3); ctx.stroke();
  ctx.restore();
}

function drawSpider(ctx, x, y, s, phase, color = '#000') {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, s * 0.09);
  for (let i = 0; i < 4; i++) {
    for (const d of [-1, 1]) {
      const w = Math.sin(phase * 10 + i * 1.4 + (d > 0 ? 0 : Math.PI)) * 0.12 * s;
      const x0 = d * s * 0.22, y0 = -s * 0.25 + i * s * 0.17;
      const kx = d * (s * 0.75 + (i === 0 || i === 3 ? s * 0.1 : 0)), ky = y0 - s * 0.55 + i * s * 0.22 + w;
      const fx = d * (s * 1.15 - Math.abs(i - 1.5) * s * 0.08), fy = y0 + s * 0.25 + i * s * 0.28 + w * 1.6;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    }
  }
  ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 0.42, s * 0.55, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.28, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff2a2a';
  ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.38, s * 0.05, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.1, -s * 0.38, s * 0.05, 0, TAU); ctx.fill();
  ctx.restore();
}

// Bony hand. Fingers point along -y before rotation; the forearm runs off along +y. wig animates the curl.
function drawHand(ctx, x, y, s, angle, wig, color = '#000', armLen = 3) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-s * 0.4, s * 0.3); ctx.lineTo(s * 0.4, s * 0.3); ctx.lineTo(s * 0.62, s * armLen); ctx.lineTo(-s * 0.62, s * armLen); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.48, s * 0.4); ctx.quadraticCurveTo(-s * 0.74, -s * 0.1, -s * 0.62, -s * 0.55);
  ctx.quadraticCurveTo(0, -s * 0.78, s * 0.62, -s * 0.55); ctx.quadraticCurveTo(s * 0.74, -s * 0.1, s * 0.48, s * 0.4); ctx.closePath(); ctx.fill();
  const fingers = [[-0.46, 0.95, -0.2], [-0.16, 1.15, -0.06], [0.14, 1.2, 0.05], [0.44, 1.0, 0.18]];
  fingers.forEach((f, i) => {
    let px = f[0] * s, py = -s * 0.52, a = -Math.PI / 2 + f[2] + Math.sin(wig * 2.5 + i) * 0.07, lw = s * 0.25;
    const segs = [0.5, 0.32, 0.26];
    for (let k = 0; k < 3; k++) {
      const L = f[1] * s * segs[k], nx = px + Math.cos(a) * L, ny = py + Math.sin(a) * L;
      ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      px = nx; py = ny; lw *= 0.8;
      a += (0.2 + Math.sin(wig * 3 + i * 1.7 + k) * 0.18) * (i < 2 ? 1 : -1);
    }
    ctx.lineWidth = lw * 0.55; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * s * 0.18, py + Math.sin(a) * s * 0.18); ctx.stroke();
  });
  let px = s * 0.62, py = s * 0.05, a = -0.4 + Math.sin(wig * 2) * 0.1, lw = s * 0.26;
  for (let k = 0; k < 2; k++) {
    const L = s * (0.5 - k * 0.12), nx = px + Math.cos(a) * L, ny = py + Math.sin(a) * L;
    ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
    px = nx; py = ny; a -= 0.6; lw *= 0.8;
  }
  ctx.lineWidth = lw * 0.55; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * s * 0.16, py + Math.sin(a) * s * 0.16); ctx.stroke();
  ctx.restore();
}

function drawTombstone(ctx, x, y, w, h, type, color = '#3a3a48') {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = color;
  if (type === 1) {
    const t = w * 0.28;
    ctx.fillRect(-t / 2, -h, t, h); ctx.fillRect(-w / 2, -h * 0.75, w, t);
  } else if (type === 2) {
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.7); ctx.lineTo(0, -h); ctx.lineTo(w / 2, -h * 0.7); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h + w / 2); ctx.arc(0, -h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = `bold ${w * 0.32}px ${FONT_SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('RIP', 0, -h * 0.55);
  }
  // base
  ctx.fillStyle = color; ctx.fillRect(-w * 0.6, -h * 0.06, w * 1.2, h * 0.08);
  ctx.restore();
}

// Dead tree. Returns a list of segments to be drawn each frame (cheap).
function makeTree(x, y, len, depth) {
  const segs = [];
  const grow = (x, y, a, len, w, d) => {
    const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len;
    segs.push([x, y, nx, ny, w]);
    if (d <= 0 || len < 6) return;
    const n = d > 5 ? 2 : (Math.random() < 0.7 ? 2 : 3);
    for (let i = 0; i < n; i++) grow(nx, ny, a + rand(-0.75, 0.75), len * rand(0.62, 0.8), w * 0.65, d - 1);
  };
  grow(x, y, -Math.PI / 2 + rand(-0.15, 0.15), len, len * 0.14, depth);
  return segs;
}
function drawTree(ctx, segs, color = '#000', sway = 0) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (const s of segs) { ctx.lineWidth = s[4]; ctx.beginPath(); ctx.moveTo(s[0] + sway * (1 - s[4] / 40), s[1]); ctx.lineTo(s[2] + sway * (1 - s[4] / 40), s[3], s[4]); ctx.stroke(); }
  ctx.restore();
}

function drawMoon(ctx, x, y, r, c = [255, 248, 215]) {
  drawGlow(ctx, x, y, r * 3.2, c, 0.35, 0.15);
  ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(120,110,90,0.18)';
  const craters = [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [0.05, 0.45, 0.12], [-0.45, 0.35, 0.1], [0.5, -0.4, 0.09]];
  for (const k of craters) { ctx.beginPath(); ctx.arc(x + k[0] * r, y + k[1] * r, k[2] * r, 0, TAU); ctx.fill(); }
}

// Lightning bolt point list from (x,y) down to (x2,y2) with branches.
function makeBolt(x, y, x2, y2, jag = 1) {
  const bolts = [];
  const main = [[x, y]];
  const n = 14;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    main.push([lerp(x, x2, t) + rand(-40, 40) * jag * (1 - t * 0.3), lerp(y, y2, t) + rand(-10, 10)]);
  }
  bolts.push({ pts: main, w: 1 });
  for (let b = 0; b < 3; b++) {
    const i = randInt(2, n - 4);
    const [bx, by] = main[i];
    const pts = [[bx, by]];
    const dir = rand(-1, 1);
    for (let k = 1; k <= 5; k++) pts.push([bx + dir * k * rand(15, 45), by + k * rand(15, 40)]);
    bolts.push({ pts, w: 0.45 });
  }
  return bolts;
}
function drawBolt(ctx, bolts, alpha, width = 4) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const b of bolts) {
    const path = () => { ctx.beginPath(); ctx.moveTo(b.pts[0][0], b.pts[0][1]); for (let i = 1; i < b.pts.length; i++) ctx.lineTo(b.pts[i][0], b.pts[i][1]); };
    ctx.globalAlpha = alpha * 0.35; ctx.strokeStyle = '#9fb8ff'; ctx.lineWidth = width * 5 * b.w; path(); ctx.stroke();
    ctx.globalAlpha = alpha; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = width * b.w; path(); ctx.stroke();
  }
  ctx.restore();
}

function drawWitch(ctx, x, y, s, t, color = '#000') {
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round';
  // broom
  ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(-s * 0.9, s * 0.25); ctx.lineTo(s * 0.9, s * 0.05); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.9, s * 0.1); ctx.lineTo(-s * 1.35, s * 0.05 + Math.sin(t * 7) * s * 0.03); ctx.lineTo(-s * 1.4, s * 0.45); ctx.lineTo(-s * 0.9, s * 0.4); ctx.closePath(); ctx.fill();
  // body / cape
  ctx.beginPath(); ctx.moveTo(0, -s * 0.2); ctx.lineTo(-s * 0.55, s * 0.3); ctx.lineTo(s * 0.25, s * 0.3); ctx.closePath(); ctx.fill();
  // legs
  ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.moveTo(0, s * 0.2); ctx.lineTo(s * 0.4, s * 0.45); ctx.stroke();
  // head + hat
  ctx.beginPath(); ctx.arc(s * 0.08, -s * 0.35, s * 0.14, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.42); ctx.lineTo(s * 0.4, -s * 0.42); ctx.lineTo(s * 0.12, -s * 0.5); ctx.lineTo(s * 0.0, -s * 1.0); ctx.lineTo(-s * 0.05, -s * 0.5); ctx.closePath(); ctx.fill();
  // nose
  ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.37); ctx.lineTo(-s * 0.16, -s * 0.33); ctx.lineTo(-s * 0.04, -s * 0.3); ctx.fill();
  ctx.restore();
}

function drawRat(ctx, x, y, s, t, dir = 1, color = '#000') {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.45, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.1); ctx.lineTo(s * 1.5, s * 0.1); ctx.lineTo(s * 0.7, s * 0.3); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.95, -s * 0.25, s * 0.14, 0, TAU); ctx.fill();
  ctx.lineWidth = s * 0.1; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(-s * 1.6, Math.sin(t * 12) * s * 0.4, -s * 2.2, -s * 0.1); ctx.stroke();
  const leg = Math.sin(t * 25) * s * 0.25;
  ctx.lineWidth = s * 0.12;
  ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.3); ctx.lineTo(-s * 0.6 + leg, s * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.5, s * 0.3); ctx.lineTo(s * 0.6 - leg, s * 0.6); ctx.stroke();
  ctx.restore();
}

// Big jump-scare faces. variant: 'ghoul' | 'demon' | 'skull' | 'scream'
function drawScareFace(ctx, cx, cy, s, variant, t) {
  ctx.save(); ctx.translate(cx, cy);
  if (variant === 'skull') { drawSkull(ctx, 0, 0, s * 0.9, 1); ctx.restore(); return; }
  if (variant === 'demon') {
    ctx.fillStyle = '#b5100c';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.8, s, 0, 0, TAU); ctx.fill();
    // horns
    ctx.fillStyle = '#3a3a3a'; ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = s * 0.03;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * s * 0.35, -s * 0.75); ctx.quadraticCurveTo(d * s * 1.1, -s * 1.0, d * s * 0.75, -s * 1.6); ctx.quadraticCurveTo(d * s * 0.75, -s * 1.05, d * s * 0.7, -s * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // eyes
    drawEye(ctx, -s * 0.35, -s * 0.2, s * 0.42, 1, [255, 230, 40], 0, 0, true);
    drawEye(ctx, s * 0.35, -s * 0.2, s * 0.42, 1, [255, 230, 40], 0, 0, true);
    // grin
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.3); ctx.quadraticCurveTo(0, s * 0.9, s * 0.55, s * 0.3); ctx.quadraticCurveTo(0, s * 0.45, -s * 0.55, s * 0.3); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = -4; i <= 4; i++) { const px = i * s * 0.12; const base = s * 0.3 + (1 - Math.abs(i) / 5) * s * 0.06; ctx.beginPath(); ctx.moveTo(px - s * 0.05, base); ctx.lineTo(px + s * 0.05, base); ctx.lineTo(px, base + s * (Math.abs(i) === 3 ? 0.3 : 0.14)); ctx.fill(); }
    ctx.restore(); return;
  }
  // ghoul / scream: pale distorted face
  const pale = variant === 'scream' ? '#e9e9f0' : '#d9d2c4';
  ctx.fillStyle = pale;
  ctx.beginPath();
  ctx.moveTo(-s * 0.75, -s * 0.3); ctx.quadraticCurveTo(-s * 0.8, -s * 1.1, 0, -s * 1.05); ctx.quadraticCurveTo(s * 0.8, -s * 1.1, s * 0.75, -s * 0.3);
  ctx.quadraticCurveTo(s * 0.75, s * 0.6, 0, s * 1.15); ctx.quadraticCurveTo(-s * 0.75, s * 0.6, -s * 0.75, -s * 0.3); ctx.fill();
  if (variant === 'ghoul') {
    // stringy hair
    ctx.strokeStyle = '#111'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) { const px = -s * 0.7 + i * s * 0.065; ctx.beginPath(); ctx.moveTo(px, -s * 1.0 + Math.abs(px) * 0.25); ctx.quadraticCurveTo(px + Math.sin(i + t * 3) * s * 0.1, -s * 0.5, px * 1.15, -s * 0.2 + rand(0, s * 0.3)); ctx.stroke(); }
    // veins / cracks
    ctx.strokeStyle = 'rgba(60,20,30,0.7)'; ctx.lineWidth = s * 0.02;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.6 + i * s * 0.24, s * 0.2); ctx.lineTo(-s * 0.55 + i * s * 0.24 + s * 0.05, s * 0.6); ctx.lineTo(-s * 0.6 + i * s * 0.24 + s * 0.12, s * 0.95); ctx.stroke(); }
  }
  if (variant === 'scream') {
    // sunken shading around the eyes and cheeks
    ctx.fillStyle = 'rgba(70,70,90,0.55)';
    ctx.beginPath(); ctx.ellipse(-s * 0.33, -s * 0.28, s * 0.33, s * 0.42, 0.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.33, -s * 0.28, s * 0.33, s * 0.42, -0.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, s * 0.6, s * 0.52, s * 0.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(40,40,55,0.5)';
    ctx.beginPath(); ctx.ellipse(-s * 0.62, s * 0.2, s * 0.14, s * 0.3, 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.62, s * 0.2, s * 0.14, s * 0.3, -0.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,40,0.8)'; ctx.lineWidth = s * 0.03; ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const px = -s * 0.6 + i * s * 0.08; ctx.beginPath(); ctx.moveTo(px, -s * 0.95 + Math.abs(px) * 0.2); ctx.lineTo(px * 1.1 + Math.sin(i * 3.1) * s * 0.05, -s * 0.72 + Math.abs(Math.sin(i * 1.7)) * s * 0.15); ctx.stroke(); }
  }
  // eye sockets
  ctx.fillStyle = '#000';
  const ey = -s * 0.3, ew = variant === 'scream' ? s * 0.22 : s * 0.26, eh = variant === 'scream' ? s * 0.32 : s * 0.3;
  ctx.beginPath(); ctx.ellipse(-s * 0.33, ey, ew, eh, 0.1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.33, ey, ew, eh, -0.1, 0, TAU); ctx.fill();
  if (variant === 'ghoul') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-s * 0.33 + s * 0.04, ey + s * 0.02, s * 0.05, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.33 - s * 0.04, ey + s * 0.02, s * 0.05, 0, TAU); ctx.fill();
    // blood tears
    ctx.fillStyle = '#9b0000';
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * s * 0.33 - s * 0.05, ey + eh * 0.9); ctx.lineTo(d * s * 0.33 + s * 0.05, ey + eh * 0.9); ctx.lineTo(d * s * 0.36, ey + eh * 0.9 + s * 0.45 + Math.sin(t * 5) * s * 0.03); ctx.fill(); }
  }
  // nose
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(-s * 0.07, s * 0.12, s * 0.06, s * 0.09, 0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.07, s * 0.12, s * 0.06, s * 0.09, -0.3, 0, TAU); ctx.fill();
  // mouth: huge scream
  const my = variant === 'scream' ? s * 0.62 : s * 0.6, mw = variant === 'scream' ? s * 0.3 : s * 0.42, mh = variant === 'scream' ? s * 0.46 : s * 0.3;
  ctx.beginPath(); ctx.ellipse(0, my, mw, mh, 0, 0, TAU); ctx.fill();
  if (variant === 'ghoul') {
    ctx.fillStyle = '#eee';
    for (let i = -3; i <= 3; i++) { const px = i * s * 0.11; ctx.beginPath(); ctx.moveTo(px - s * 0.045, my - mh + s * 0.02); ctx.lineTo(px + s * 0.045, my - mh + s * 0.02); ctx.lineTo(px, my - mh + s * 0.16); ctx.fill(); ctx.beginPath(); ctx.moveTo(px - s * 0.04, my + mh - s * 0.02); ctx.lineTo(px + s * 0.04, my + mh - s * 0.02); ctx.lineTo(px, my + mh - s * 0.12); ctx.fill(); }
  }
  ctx.restore();
}
