/** Helpers to find the visible, paintable parts of an inline flag SVG. */

const SHAPES = 'path, rect, circle, ellipse, polygon, polyline';
const HIDDEN_PARENTS = 'defs, clipPath, mask, marker, pattern, symbol';

export function parseColor(css: string): [number, number, number] | null {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  if (a === 0) return null;
  return [r, g, b];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export const hsl = (h: number, s: number, l: number) =>
  `hsl(${Math.round(((h % 360) + 360) % 360)}, ${Math.round(Math.max(0, Math.min(1, s)) * 100)}%, ${Math.round(Math.max(0, Math.min(1, l)) * 100)}%)`;

function topmostAt(shapes: SVGGeometryElement[], svg: SVGSVGElement, x: number, y: number) {
  const pt = svg.createSVGPoint();
  for (let i = shapes.length - 1; i >= 0; i--) {
    const el = shapes[i];
    const m = el.getScreenCTM();
    if (!m) continue;
    pt.x = x; pt.y = y;
    const local = pt.matrixTransform(m.inverse());
    const style = getComputedStyle(el);
    if ((style.fill !== 'none' && el.isPointInFill(local)) || (style.stroke !== 'none' && el.isPointInStroke(local))) return el;
  }
  return null;
}

/** Shapes with a solid fill that are actually visible somewhere on the flag. */
export function visibleFilledShapes(stage: HTMLElement, minShare = 0.002) {
  const svg = stage.querySelector('svg');
  if (!svg) return [];
  const box = stage.getBoundingClientRect();
  const shapes = [...svg.querySelectorAll<SVGGeometryElement>(SHAPES)].filter((el) => !el.closest(HIDDEN_PARENTS));
  const out: { el: SVGGeometryElement; color: [number, number, number] }[] = [];
  for (const el of shapes) {
    const color = parseColor(getComputedStyle(el).fill);
    if (!color) continue;
    const r = el.getBoundingClientRect();
    const visW = Math.min(r.right, box.right) - Math.max(r.left, box.left);
    const visH = Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top);
    if (visW <= 0 || visH <= 0 || (visW * visH) / (box.width * box.height) < minShare) continue;
    const left = Math.max(r.left, box.left), top = Math.max(r.top, box.top);
    let hits = 0;
    for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) {
      if (topmostAt(shapes, svg, left + (visW * i) / 6, top + (visH * j) / 6) === el) hits++;
    }
    if (hits >= 2) out.push({ el, color });
  }
  return out;
}
