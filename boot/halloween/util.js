'use strict';
// Small helpers shared by the engine, scenes and scares.
const TAU = Math.PI * 2;

// Seedable RNG. Normally this is just Math.random. In mirrored mode the leader and follower
// both call seedRandom(n) at the start of each scene/scare, so every rand()/pick() below
// produces the same sequence on both screens and the scenes render identically.
let _rngState = 0, _rngSeeded = false;
function seedRandom(seed) {
  _rngState = (seed >>> 0) || 1; _rngSeeded = true;
}
function clearRandomSeed() { _rngSeeded = false; }
function _rng() {
  if (!_rngSeeded) return Math.random();
  // mulberry32: fast, decent-quality, fully deterministic from the seed
  _rngState |= 0; _rngState = (_rngState + 0x6D2B79F5) | 0;
  let t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rand = (a = 1, b) => (b === undefined ? _rng() * a : a + _rng() * (b - a));
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(_rng() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = v => clamp(v, 0, 1);
const smooth = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn = t => t * t;
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// Cheap smooth 1-D noise in roughly -1..1. Not real Perlin, but good enough for flicker and drift.
function noise(t, seed = 0) {
  return Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 2.3 + seed * 1.3 + 1.2) * 0.3 + Math.sin(t * 4.1 + seed * 0.7 + 2.9) * 0.2;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(_rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// Radial glow sprites, cached. Drawing a cached gradient image is far cheaper than
// shadowBlur or per-frame gradients on a Raspberry Pi.
const _glowCache = new Map();
function glowSprite(c, hard = 0.25) {
  const key = c.join(',') + '|' + hard;
  let s = _glowCache.get(key);
  if (s) return s;
  const size = 128;
  s = document.createElement('canvas'); s.width = s.height = size;
  const g = s.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, rgba(c, 1));
  grd.addColorStop(hard, rgba(c, 0.55));
  grd.addColorStop(0.6, rgba(c, 0.15));
  grd.addColorStop(1, rgba(c, 0));
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  _glowCache.set(key, s);
  return s;
}
function drawGlow(ctx, x, y, r, c, alpha = 1, hard = 0.25) {
  if (alpha <= 0.003 || r <= 0) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * clamp01(alpha);
  ctx.drawImage(glowSprite(c, hard), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
}

// TV static: a few pre-rendered noise tiles used as a fill pattern.
const _noiseTiles = [];
function noisePattern(ctx) {
  if (!_noiseTiles.length) {
    for (let n = 0; n < 4; n++) {
      const c = document.createElement('canvas'); c.width = c.height = 192;
      const g = c.getContext('2d');
      const img = g.createImageData(192, 192);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() < 0.5 ? rand(0, 70) : rand(120, 255);
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      _noiseTiles.push(c);
    }
  }
  return ctx.createPattern(pick(_noiseTiles), 'repeat');
}
function drawStatic(ctx, W, H, alpha = 1, scale = 2) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(rand(-192, 0) * scale, rand(-192, 0) * scale);
  ctx.scale(scale, scale);
  ctx.fillStyle = noisePattern(ctx);
  ctx.fillRect(0, 0, W / scale + 200, H / scale + 200);
  ctx.restore();
}

// Fill helpers
function fillScreen(ctx, W, H, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp01(alpha); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function skyGradient(ctx, W, H, top, bottom, horizon = 1) {
  const g = ctx.createLinearGradient(0, 0, 0, H * horizon);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function vignette(ctx, W, H, strength = 0.7) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// Text helpers. Fonts are bundled (fonts/ directory) so these work offline.
const FONT_CREEPY = 'Creepster, Impact, sans-serif';
const FONT_DRIP = 'Nosifer, Impact, sans-serif';
const FONT_EATER = 'Eater, Impact, sans-serif';
const FONT_SERIF = 'Georgia, "DejaVu Serif", serif';
function fitFontSize(ctx, text, font, maxWidth, start) {
  let size = start;
  ctx.font = `${size}px ${font}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) { size *= 0.92; ctx.font = `${size}px ${font}`; }
  return size;
}
