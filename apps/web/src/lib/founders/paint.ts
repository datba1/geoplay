/**
 * Paints the continent as a soft raster: provinces are drawn small and scaled up,
 * so neighbouring terrains blend like watercolour and the coast melts into the sea.
 * Browser only (uses canvas). Returns a PNG data URL sized MAP_W/2 × MAP_H/2.
 */
import { MAP_H, MAP_W, type Province, type Terrain } from './engine';

export const PAINT: Record<Terrain, [number, number, number]> = {
  plains: [190, 186, 122],
  forest: [118, 140, 86],
  hills: [176, 158, 112],
  mountains: [214, 208, 194], // pale rock with snow
  desert: [222, 200, 146],
  marsh: [132, 160, 136],
};

const SHALLOW = 'rgba(92, 140, 142, 0.85)';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawPolys(ctx: CanvasRenderingContext2D, provinces: Province[], scale: number, fill: (p: Province) => string) {
  for (const p of provinces) {
    if (!p.poly.length) continue;
    ctx.beginPath();
    p.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale)));
    ctx.closePath();
    ctx.fillStyle = fill(p);
    ctx.fill();
    // a matching stroke closes hairline gaps between cells
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Gaussian blur where the browser supports canvas filters; otherwise a down/up resample. */
function soften(src: HTMLCanvasElement, px: number) {
  const out = canvas(src.width, src.height);
  const ctx = out.getContext('2d')!;
  if ('filter' in ctx) {
    // Draw an edge-padded copy so the blur doesn't fade colours at the borders.
    ctx.filter = `blur(${px}px)`;
    ctx.drawImage(src, 0, 0);
    ctx.filter = 'none';
    return out;
  }
  return upscale(upscale(src, Math.ceil(src.width / 4), Math.ceil(src.height / 4)), src.width, src.height);
}

/** Upscale a small canvas into a bigger one with smoothing (this is the blur). */
function upscale(src: HTMLCanvasElement, w: number, h: number) {
  const out = canvas(w, h);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return out;
}

export function paintContinent(provinces: Province[], seed: number): string {
  const OUT_W = MAP_W / 2;
  const OUT_H = MAP_H / 2;
  const SMALL = 1 / 10; // province colours are laid down at a tenth of the size

  // 1. Terrain colours at low resolution, with a little per-province variation.
  const sw = Math.ceil(MAP_W * SMALL);
  const sh = Math.ceil(MAP_H * SMALL);
  const terrain = canvas(sw, sh);
  const tctx = terrain.getContext('2d')!;
  drawPolys(tctx, provinces, SMALL, (p) => {
    const [r, g, b] = PAINT[p.terrain];
    const v = (((p.id * 2654435761 + seed) >>> 0) % 21) - 10; // ±10 brightness
    return `rgb(${r + v},${g + v},${b + v})`;
  });
  // Two-step upscale gives a smoother wash than one big jump; a real blur on top hides the cell edges.
  const terrainOut = soften(upscale(upscale(terrain, sw * 3, sh * 3), OUT_W, OUT_H), 14);

  // 2. Land mask at slightly higher resolution so the coast keeps its shape but stays soft.
  const MASK = 1 / 5;
  const mw = Math.ceil(MAP_W * MASK);
  const mh = Math.ceil(MAP_H * MASK);
  const mask = canvas(mw, mh);
  const mctx = mask.getContext('2d')!;
  drawPolys(mctx, provinces, MASK, () => '#fff');
  const maskOut = upscale(mask, OUT_W, OUT_H);

  // 3. Shallow water halo: the land shape grown outwards, very soft.
  const halo = canvas(sw, sh);
  const hctx = halo.getContext('2d')!;
  hctx.lineJoin = 'round';
  for (const p of provinces) {
    if (!p.coast || !p.poly.length) continue;
    hctx.beginPath();
    p.poly.forEach(([x, y], i) => (i ? hctx.lineTo(x * SMALL, y * SMALL) : hctx.moveTo(x * SMALL, y * SMALL)));
    hctx.closePath();
    hctx.fillStyle = SHALLOW;
    hctx.strokeStyle = SHALLOW;
    hctx.lineWidth = 7;
    hctx.fill();
    hctx.stroke();
  }
  const haloOut = upscale(upscale(halo, sw * 2, sh * 2), OUT_W, OUT_H);

  // 4. Compose: halo, then terrain cut to the soft land mask.
  const out = canvas(OUT_W, OUT_H);
  const ctx = out.getContext('2d')!;
  ctx.globalAlpha = 0.75;
  ctx.drawImage(haloOut, 0, 0);
  ctx.globalAlpha = 1;
  const land = canvas(OUT_W, OUT_H);
  const lctx = land.getContext('2d')!;
  lctx.drawImage(terrainOut, 0, 0);
  lctx.globalCompositeOperation = 'destination-in';
  lctx.drawImage(maskOut, 0, 0);
  ctx.drawImage(land, 0, 0);

  // 5. Paper grain so the wash doesn't look digital.
  const img = ctx.getImageData(0, 0, OUT_W, OUT_H);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < img.data.length; i += 4) {
    if (!img.data[i + 3]) continue;
    s = (s * 1664525 + 1013904223) >>> 0;
    const n = ((s >>> 24) - 128) / 128; // -1..1
    const d = n * 7;
    img.data[i] += d;
    img.data[i + 1] += d;
    img.data[i + 2] += d;
  }
  ctx.putImageData(img, 0, 0);

  return out.toDataURL('image/png');
}
