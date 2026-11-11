/**
 * Canvas Visualizer Engine
 * Renders all Avee Player elements & AUDIOVIS layers with high performance and post-processing.
 */

import { VisualizerLayer, SceneSettings } from '../types/avee';
import { audioEngine, FREQ_BANDS } from './audioEngine';

const TAU = Math.PI * 2;

const EASING: Record<string, (x: number) => number> = {
  linear: (x) => x,
  ease_in: (x) => x * x,
  ease_out: (x) => 1 - (1 - x) * (1 - x),
  smooth: (x) => x * x * (3 - 2 * x),
  step: (x) => (x > 0.5 ? 1 : 0),
};

export function getEffectiveLayer(l: VisualizerLayer, t: number): VisualizerLayer {
  l._smooth = l._smooth || [];
  l._particles = l._particles || [];
  l._history = l._history || [];
  l._randomVals = l._randomVals || [];

  const e: VisualizerLayer = { ...l };

  // Apply reactive rules
  for (const r of l.rules) {
    if (!r.on) continue;
    let x = audioEngine.smoothValues[r.src] || 0;
    x = Math.max(0, Math.min(1, (x - r.i0) / Math.max(0.001, r.i1 - r.i0)));
    const easeFn = EASING[r.cv] || EASING.linear;
    x = easeFn(x);
    if (r.inv) x = 1 - x;

    const old = r._v || 0;
    x = old + (x - old) * (x > old ? r.att / 100 : r.rel / 100);
    r._v = x;

    (e as any)[r.prop] = r.o0 + (r.o1 - r.o0) * x;
  }

  // Animation mods
  const amt = e.aa / 100;
  const s = t * e.as;
  if (e.anim === 'pulse') {
    const k = 1 + Math.sin(s * TAU) * amt * 0.3;
    e.sx *= k;
    e.sy *= k;
  } else if (e.anim === 'bounce') {
    e.y -= Math.abs(Math.sin(s * Math.PI)) * amt * 14;
  } else if (e.anim === 'sway') {
    e.x += Math.sin(s * TAU) * amt * 10;
  } else if (e.anim === 'fade') {
    e.op *= 1 - (amt * (1 + Math.sin(s * TAU))) / 2;
  }

  return e;
}

function getFreqHz(l: VisualizerLayer, frac: number): number {
  const f0 = Math.max(20, l.f0);
  const f1 = Math.max(f0 + 1, l.f1);
  if (l.fsc === 'linear') return f0 + (f1 - f0) * frac;
  if (l.fsc === 'mel') {
    const mel = (x: number) => 2595 * Math.log10(1 + x / 700);
    return 700 * (Math.pow(10, (mel(f0) + (mel(f1) - mel(f0)) * frac) / 2595) - 1);
  }
  return f0 * Math.pow(f1 / f0, frac);
}

function getBinValue(l: VisualizerLayer, i: number, total: number): number {
  const hz0 = getFreqHz(l, i / total);
  const hz1 = getFreqHz(l, (i + 1) / total);
  let v = audioEngine.bandAverage(hz0, hz1);

  const old = l._smooth![i] || 0;
  v = old + (v - old) * (v > old ? l.att / 100 : l.rel / 100);
  l._smooth![i] = v;

  return Math.min(1.8, Math.max(0, (v * l.sens) / 100));
}

function getFillStyle(
  ctx: CanvasRenderingContext2D,
  l: VisualizerLayer,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  t: number
): string | CanvasGradient {
  if (l.grad === 'solid') return l.color;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const rad = ((l.gAng + l.gAnim * t) * Math.PI) / 180;
  const dist = Math.hypot(bw, bh) / 2;

  let g: CanvasGradient;
  if (l.grad === 'radial') {
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, dist);
  } else if (l.grad === 'conic' && (ctx as any).createConicGradient) {
    g = (ctx as any).createConicGradient(rad, cx, cy);
  } else {
    g = ctx.createLinearGradient(
      cx - Math.cos(rad) * dist,
      cy - Math.sin(rad) * dist,
      cx + Math.cos(rad) * dist,
      cy + Math.sin(rad) * dist
    );
  }

  const colors = l.three ? [l.color, l.color2, l.color3] : [l.color, l.color2];
  colors.forEach((c, idx) => g.addColorStop(idx / (colors.length - 1), c));
  return g;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (r > 0 && ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}

export function drawLayer(
  ctx: CanvasRenderingContext2D,
  l: VisualizerLayer,
  W: number,
  H: number,
  t: number,
  trackInfo: { title: string; artist: string }
) {
  const e = getEffectiveLayer(l, t);
  const u = H / 720;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, e.op / 100));
  ctx.globalCompositeOperation = e.blend || 'source-over';

  if (e.blur || e.hue || e.bright !== 100 || e.contr !== 100 || e.sat !== 100) {
    ctx.filter = `hue-rotate(${e.hue}deg) brightness(${e.bright}%) contrast(${e.contr}%) saturate(${e.sat}%) blur(${e.blur * u}px)`;
  }

  // 1. Background Layer
  if (e.type === 'bg') {
    ctx.fillStyle = getFillStyle(ctx, e, 0, 0, W, H, t);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  // Coordinate transforms
  ctx.translate((e.x / 100) * W, (e.y / 100) * H);
  ctx.rotate(((e.rot + e.spin * t) * Math.PI) / 180);
  ctx.scale(e.sx / 100, e.sy / 100);

  if (e.shOff) {
    ctx.shadowColor = '#000000';
    ctx.shadowOffsetY = e.shOff * u;
    ctx.shadowBlur = Math.max(e.glow, 6) * u;
  } else if (e.glow) {
    ctx.shadowColor = e.color;
    ctx.shadowBlur = e.glow * u;
  }

  const R = Math.min(W, H) * 0.22;
  const ty = e.type;

  // 2. Bars Spectrum (Vertical / Horizontal)
  if (ty === 'bars' || ty === 'barsh') {
    const isHoriz = ty === 'barsh';
    const span = (isHoriz ? H : W) * 0.85;
    const len = (isHoriz ? W : H) * 0.45 * (e.maxH / 100);
    const n = Math.max(4, e.n);
    const slot = span / n;
    const barW = Math.max(1.5, slot * (e.thick / 100));

    if (isHoriz) ctx.rotate(Math.PI / 2);
    const both = e.dir === 'both';
    const down = e.dir === 'down';
    ctx.fillStyle = getFillStyle(ctx, e, -span / 2, down ? 0 : -len, span, both ? len * 2 : len, t);
    const half = Math.ceil(n / 2);
    const alpha0 = ctx.globalAlpha;

    for (let i = 0; i < n; i++) {
      const v =
        e.mir === 'sym'
          ? getBinValue(e, Math.min(half - 1, Math.floor(Math.abs(i - (n - 1) / 2))), half)
          : getBinValue(e, i, n);
      const h = Math.max(2, v * len);
      const x = -span / 2 + i * slot + (slot - barW) / 2;
      const corner = (e.round * barW) / 100;

      if (!down) drawRoundedRect(ctx, x, -h, barW, h, corner);
      if (down || both) drawRoundedRect(ctx, x, 0, barW, h, corner);

      if (e.mir === 'mirror') {
        ctx.globalAlpha = alpha0 * 0.35;
        drawRoundedRect(ctx, x, 0, barW, h * 0.65, corner);
        ctx.globalAlpha = alpha0;
      }
    }
  }

  // 3. Circular / Radial Spectrum
  else if (ty === 'circle' || ty === 'multiring') {
    const rings = ty === 'multiring' ? Math.max(1, e.rings) : 1;
    for (let rIdx = 0; rIdx < rings; rIdx++) {
      const r0 = R * (e.r0 / 100) * (1 + rIdx * 0.45);
      const len = R * (e.maxH / 100) * (rings > 1 ? 0.6 : 1);
      const n = Math.max(8, e.n);
      const lw = Math.max(1.2, (TAU * Math.max(r0, 10)) / n * (e.thick / 100));
      const half = Math.ceil(n / 2);

      ctx.lineWidth = lw;
      ctx.strokeStyle = getFillStyle(ctx, e, -R * 2, -R * 2, R * 4, R * 4, t);

      for (let i = 0; i < n; i++) {
        const v =
          e.mir !== 'none'
            ? getBinValue(e, i < half ? i : n - 1 - i, half)
            : getBinValue(e, i + rIdx * n, n * rings);
        const a = ((e.a0 + ((e.a1 - e.a0) * i) / n) * Math.PI) / 180;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const l = v * len;

        let p = r0;
        let q = r0 + l;
        if (e.odir === 'in') q = Math.max(0, r0 - l);
        else if (e.odir === 'both') {
          p = Math.max(0, r0 - l / 2);
          q = r0 + l / 2;
        }

        ctx.beginPath();
        ctx.moveTo(cos * p, sin * p);
        ctx.lineTo(cos * q, sin * q);
        ctx.stroke();
      }
    }
  }

  // 4. Concentric Rings
  else if (ty === 'concentric') {
    ctx.strokeStyle = getFillStyle(ctx, e, -R * 2, -R * 2, R * 4, R * 4, t);
    for (let k = 0; k < e.rings; k++) {
      const v = getBinValue(e, k, e.rings);
      ctx.lineWidth = Math.max(1.5, u * (e.thick / 10) * (1 + v * 2));
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        R * (0.2 + (0.8 * (k + 1)) / e.rings) * (1 + v * 0.18 * (e.maxH / 100)),
        0,
        TAU
      );
      ctx.stroke();
    }
  }

  // 5. Audio Ring / Center Disc
  else if (ty === 'ring') {
    const v = getBinValue(e, 0, 1);
    const p = 160;
    ctx.lineWidth = u * (e.thick / 6) * (1 + v * 0.8);
    ctx.strokeStyle = getFillStyle(ctx, e, -R * 2, -R * 2, R * 4, R * 4, t);
    ctx.beginPath();
    for (let i = 0; i <= p; i++) {
      const k = Math.floor((i / p) * (audioEngine.timeData.length - 1));
      const radius =
        R * (e.r0 / 100 + v * 0.22) +
        ((audioEngine.timeData[k] - 128) / 128) * R * 0.3 * (e.sens / 100);
      const a = (i / p) * TAU;
      const px = Math.cos(a) * radius;
      const py = Math.sin(a) * radius;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // 6. Waveforms & Oscilloscope
  else if (ty === 'wave' || ty === 'wavec' || ty === 'scope') {
    const isCirc = ty === 'wavec';
    const w = W * 0.85;
    const p = Math.max(20, Math.min(audioEngine.timeData.length, e.n * 4));
    const A = (isCirc ? R * 0.45 : H * 0.22) * (e.sens / 100) * (e.maxH / 100);

    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, e.thick / 10 + 1);
    ctx.strokeStyle = ctx.fillStyle = getFillStyle(ctx, e, -w / 2, -H * 0.2, w, H * 0.4, t);

    // Oscilloscope grid
    if (ty === 'scope') {
      const a0 = ctx.globalAlpha;
      ctx.globalAlpha = a0 * 0.18;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 + (w * i) / 8, -H * 0.25);
        ctx.lineTo(-w / 2 + (w * i) / 8, H * 0.25);
        ctx.stroke();
      }
      ctx.globalAlpha = a0;
      ctx.lineWidth = Math.max(1.5, e.thick / 10 + 1);
    }

    const mirrors = e.mir !== 'none' && !isCirc ? [1, -1] : [1];
    for (const m of mirrors) {
      ctx.beginPath();
      for (let i = 0; i <= p; i++) {
        const k = Math.floor((i / p) * (audioEngine.timeData.length - 1));
        const val = ((audioEngine.timeData[k] - 128) / 128) * A * m;

        let px: number, py: number;
        if (isCirc) {
          const a = (i / p) * TAU - Math.PI / 2;
          const r = R * (e.r0 / 100) + val;
          px = Math.cos(a) * r;
          py = Math.sin(a) * r;
        } else {
          px = -w / 2 + (i / p) * w;
          py = val;
        }

        if (e.ws === 'spiky' && !isCirc) {
          ctx.moveTo(px, 0);
          ctx.lineTo(px, py);
        } else {
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      }
      if (isCirc) ctx.closePath();
      if (e.wfill && !isCirc) {
        const a0 = ctx.globalAlpha;
        ctx.lineTo(w / 2, 0);
        ctx.lineTo(-w / 2, 0);
        ctx.globalAlpha = a0 * 0.35;
        ctx.fill();
        ctx.globalAlpha = a0;
      }
      ctx.stroke();
    }
  }

  // 7. Particle Systems
  else if (ty === 'particles') {
    const P = e._particles!;
    const bass = audioEngine.smoothValues.bass;
    const isBeat = audioEngine.isBeatNow;

    // Spawn new particles on beat or rhythm
    if (isBeat || (audioEngine.smoothValues.volume > 0.3 && Math.random() < 0.35)) {
      const spawnCount = isBeat ? Math.floor(e.n / 4) : 4;
      for (let i = 0; i < spawnCount && P.length < 320; i++) {
        const a = Math.random() * TAU;
        const speed = (2 + Math.random() * 5.5) * (0.6 + bass * 2) * u;
        P.push({
          x: 0,
          y: 0,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          l: 1,
          size: (e.thick / 12 + 2) * u,
        });
      }
    }

    ctx.fillStyle = e.color;
    const a0 = ctx.globalAlpha;

    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.x += p.vx;
      p.y += p.vy;
      p.l -= 0.015;
      if (p.l <= 0) {
        P.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = a0 * p.l;
      const sz = p.size || 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = a0;
  }

  // 8. Image / Album Art
  else if (ty === 'image') {
    const img = e._img;
    const bassPulse = 1 + audioEngine.smoothValues.kick * 0.15;
    const maxDimension = Math.min(W, H) * (e.maxH / 100) * bassPulse;

    if (img && img.complete && img.naturalWidth) {
      const aspect = img.naturalHeight / img.naturalWidth;
      const w = maxDimension;
      const h = w * aspect;

      if (e.mask === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(w, h) / 2, 0, TAU);
        ctx.clip();
      }
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      // Default album art placeholder badge
      const rad = maxDimension / 2;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, TAU);
      ctx.fill();

      // Inner disc ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.4, 0, TAU);
      ctx.stroke();
    }
  }

  // 9. Dynamic Text
  else if (ty === 'text') {
    const v = getBinValue(e, 0, 1);
    let displayText = e.text || '{ArtistOrTitle}';
    displayText = displayText
      .replace(/\{ArtistOrTitle\}/gi, `${trackInfo.artist ? trackInfo.artist + ' - ' : ''}${trackInfo.title}`)
      .replace(/\{Title\}/gi, trackInfo.title)
      .replace(/\{Artist\}/gi, trackInfo.artist || 'Artist');

    if (e.up) displayText = displayText.toUpperCase();

    const fontSize = H * (e.fz / 100) * (1 + v * 0.28);
    ctx.font = `${e.fi ? 'italic ' : ''}${e.fw || 700} ${fontSize}px "${e.font || 'Plus Jakarta Sans'}", sans-serif`;
    ctx.textAlign = e.al || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = getFillStyle(ctx, e, -W * 0.3, -H * 0.1, W * 0.6, H * 0.2, t);

    ctx.fillText(displayText, 0, 0);

    if (e.sw > 0) {
      ctx.strokeStyle = e.sc || '#ffffff';
      ctx.lineWidth = e.sw * u;
      ctx.strokeText(displayText, 0, 0);
    }
  }

  // 10. Geometric Shape
  else if (ty === 'shape') {
    const v = getBinValue(e, 0, 1);
    const r = R * (e.maxH / 100) * (0.6 + v * 0.5);

    ctx.fillStyle = getFillStyle(ctx, e, -r, -r, r * 2, r * 2, t);
    ctx.strokeStyle = e.sc || '#ffffff';
    ctx.lineWidth = e.sw * u;

    ctx.beginPath();
    if (e.shape === 'circle') {
      ctx.arc(0, 0, r, 0, TAU);
    } else if (e.shape === 'rect') {
      ctx.rect(-r, -r, r * 2, r * 2);
    } else if (e.shape === 'star') {
      const points = e.sides || 5;
      for (let i = 0; i < points * 2; i++) {
        const a = (i / (points * 2)) * TAU - Math.PI / 2;
        const dist = i % 2 === 0 ? r : r * 0.48;
        i === 0 ? ctx.moveTo(Math.cos(a) * dist, Math.sin(a) * dist) : ctx.lineTo(Math.cos(a) * dist, Math.sin(a) * dist);
      }
      ctx.closePath();
    } else {
      // Regular polygon
      const sides = Math.max(3, e.sides || 3);
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * TAU - Math.PI / 2;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
    }
    ctx.fill();
    if (e.sw > 0) ctx.stroke();
  }

  ctx.restore();
}

/**
 * Main Scene Render Pass (Layers + Post FX)
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  layers: VisualizerLayer[],
  scene: SceneSettings,
  selectedLayerId: string | null,
  showGuides: boolean,
  trackInfo: { title: string; artist: string }
) {
  const u = H / 720;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';

  // Base background fill
  ctx.fillStyle = scene.bg;
  ctx.fillRect(0, 0, W, H);

  // Camera Bass Zoom Bounce
  const bassZoom = 1 + audioEngine.smoothValues.bass * (scene.cam / 100);
  ctx.translate(W / 2, H / 2);
  ctx.scale(bassZoom, bassZoom);
  ctx.translate(-W / 2, -H / 2);

  // Draw each visible layer in order
  for (const layer of layers) {
    if (layer.vis) {
      drawLayer(ctx, layer, W, H, t, trackInfo);
    }
  }

  ctx.restore();

  // Post-Processing FX
  // 1. Vignette
  if (scene.vig > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.hypot(W, H) / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${scene.vig / 100})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Scanlines
  if (scene.scan > 0) {
    ctx.fillStyle = `rgba(0,0,0,${(scene.scan / 100) * 0.45})`;
    for (let y = 0; y < H; y += 4 * u) {
      ctx.fillRect(0, y, W, u * 1.5);
    }
  }

  // 3. Film Grain
  if (scene.grain > 0) {
    const dots = Math.floor(scene.grain * 6);
    for (let i = 0; i < dots; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.22)';
      ctx.fillRect(Math.random() * W, Math.random() * H, 2 * u, 2 * u);
    }
  }

  // 4. Beat Flash
  if (scene.flash > 0 && audioEngine.smoothValues.beat > 0.05) {
    ctx.fillStyle = `rgba(255,255,255,${audioEngine.smoothValues.beat * (scene.flash / 100) * 0.4})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 5. Guides & Target Crosshair for Selected Layer
  if (showGuides) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    // 90% Safe Area
    ctx.strokeRect(W * 0.05, H * 0.05, W * 0.9, H * 0.9);
  }

  // Selected Layer highlight anchor
  const selected = layers.find((l) => l.id === selectedLayerId);
  if (selected && selected.type !== 'bg' && !selected.lock) {
    const px = (selected.x / 100) * W;
    const py = (selected.y / 100) * H;
    const size = 12 * u;

    ctx.strokeStyle = '#00e5c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - size, py);
    ctx.lineTo(px + size, py);
    ctx.moveTo(px, py - size);
    ctx.lineTo(px, py + size);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, 4 * u, 0, TAU);
    ctx.fillStyle = '#00e5c0';
    ctx.fill();
  }
}
