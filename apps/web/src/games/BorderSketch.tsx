'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { geoMercator } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { countryName, flagUrl, largestPolygon, loadWorld, type World } from '@/lib/geo';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

/** Countries with a recognisable main outline (largest polygon is used). */
const POOL = [
  'IT', 'CL', 'VN', 'FR', 'BR', 'IN', 'AU', 'EG', 'MX', 'ES', 'TH', 'AR', 'DE', 'PL', 'UA', 'TR', 'IR', 'PE',
  'MN', 'KZ', 'ZA', 'NG', 'MG', 'CU', 'SE', 'CN', 'SO', 'SA', 'LY', 'IS', 'LA', 'KH', 'GB', 'US', 'PT', 'NO',
];
const ROUNDS = 5;
const SIZE = 600;
const GRID = 200;

type Pt = [number, number];

function areaCentroid(pts: Pt[]) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-9) return { area: 0, cx: 0, cy: 0 };
  return { area: Math.abs(a), cx: cx / (6 * a), cy: cy / (6 * a) };
}

/** Scales a ring about its centroid to a given area and moves the centroid to (tx, ty). */
function normalize(pts: Pt[], targetArea: number, tx: number, ty: number): Pt[] {
  const { area, cx, cy } = areaCentroid(pts);
  const k = area ? Math.sqrt(targetArea / area) : 1;
  return pts.map(([x, y]) => [(x - cx) * k + tx, (y - cy) * k + ty]);
}

function rasterMask(pts: Pt[], canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, GRID, GRID);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.fill('nonzero');
  const data = ctx.getImageData(0, 0, GRID, GRID).data;
  const mask = new Uint8Array(GRID * GRID);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  return mask;
}

/** Intersection-over-union of two outlines after equalising area and position. */
function similarity(user: Pt[], target: Pt[]) {
  const canvas = document.createElement('canvas');
  canvas.width = GRID;
  canvas.height = GRID;
  const area = GRID * GRID * 0.3;
  const a = rasterMask(normalize(user, area, GRID / 2, GRID / 2), canvas);
  const b = rasterMask(normalize(target, area, GRID / 2, GRID / 2), canvas);
  let inter = 0, union = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) inter++;
    if (a[i] || b[i]) union++;
  }
  const iou = union ? inter / union : 0;
  // Any blob of the right size already overlaps ~50-65%, so rescale: 0.45 -> 0%, 0.95 -> 100%.
  return Math.max(0, Math.min(1, (iou - 0.45) / 0.5));
}

function targetRing(world: World, a2: string): Pt[] {
  const poly = largestPolygon(world.byA2.get(a2)!.feature);
  const proj = geoMercator().fitExtent([[60, 60], [SIZE - 60, SIZE - 60]], poly);
  return poly.geometry.coordinates[0].map((c) => proj(c as [number, number]) as Pt);
}

export function BorderSketch({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const [world, setWorld] = useState<World | null>(null);
  const [countries] = useState(() => shuffle(POOL, mulberry32(ctx.seed)).slice(0, ROUNDS));
  const [round, setRound] = useState(0);
  const [stroke, setStroke] = useState<Pt[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [result, setResult] = useState<{ match: number; truth: Pt[] } | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [warn, setWarn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const a2 = countries[round];

  useEffect(() => { loadWorld().then(setWorld); }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, SIZE, SIZE);
    // paper grid
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 1;
    for (let i = 0; i <= SIZE; i += 30) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i, SIZE); c.stroke();
      c.beginPath(); c.moveTo(0, i); c.lineTo(SIZE, i); c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.font = '14px sans-serif';
    c.fillText('N ↑', SIZE - 44, 26);

    const path = (pts: Pt[], close: boolean) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      if (close) c.closePath();
    };
    if (stroke.length > 1) {
      path(stroke, !drawing);
      c.fillStyle = 'rgba(155,107,255,0.18)';
      if (!drawing) c.fill();
      c.strokeStyle = '#b48cff';
      c.lineWidth = 3;
      c.lineJoin = 'round';
      c.stroke();
    }
    if (result) {
      path(result.truth, true);
      c.strokeStyle = '#ff7a50';
      c.lineWidth = 3;
      c.setLineDash([8, 6]);
      c.stroke();
      c.setLineDash([]);
    }
  }, [stroke, drawing, result]);

  useEffect(() => { redraw(); }, [redraw]);

  const toCanvas = (e: React.PointerEvent): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * SIZE, ((e.clientY - r.top) / r.height) * SIZE];
  };

  const down = (e: React.PointerEvent) => {
    if (result) return;
    canvasRef.current!.setPointerCapture(e.pointerId);
    setWarn(false);
    setDrawing(true);
    setStroke([toCanvas(e)]);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing) return;
    const p = toCanvas(e);
    setStroke((s) => {
      const last = s[s.length - 1];
      return Math.hypot(p[0] - last[0], p[1] - last[1]) > 2.5 ? [...s, p] : s;
    });
  };
  const up = () => setDrawing(false);

  const submit = () => {
    if (!world) return;
    if (stroke.length < 12 || areaCentroid(stroke).area < 3000) {
      setWarn(true);
      return;
    }
    const truthRaw = targetRing(world, a2);
    const match = similarity(stroke, truthRaw);
    // Show the real outline at the same size and position as the drawing.
    const u = areaCentroid(stroke);
    setResult({ match, truth: normalize(truthRaw, u.area, u.cx, u.cy) });
    setScores((s) => [...s, Math.round(match * 100)]);
  };

  const next = () => {
    if (round + 1 >= ROUNDS) {
      const total = scores.reduce((a, b) => a + b, 0);
      ctx.finish(
        {
          points: total * 10,
          stamps: countries.filter((_, i) => scores[i] >= 50),
          flags: scores.some((s) => s >= 80) ? { 'bs-80': true } : {},
          meta: { matches: scores },
        },
        { score: String(total * 10), subtitle: scores.map((s) => `${s}%`).join(' · ') },
      );
      return;
    }
    setRound((r) => r + 1);
    setStroke([]);
    setResult(null);
  };

  const pct = result ? Math.round(result.match * 100) : null;

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0, 620px) 1fr' }}>
      <div className="board">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="sketch-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      <aside className="side">
        <div className="stat-box"><small>{t('common.round')}</small><b>{round + 1} / {ROUNDS}</b></div>
        <div className="card">
          <span className="eyebrow">{t('bs.draw')}</span>
          <div className="row" style={{ margin: '6px 0 4px' }}>
            {result && <img src={flagUrl(a2)} alt="" width={36} style={{ borderRadius: 3 }} />}
            <h2 style={{ fontSize: 32 }}>{countryName(a2, lang)}</h2>
          </div>
          {warn && <p className="small pill-bad">{t('bs.tooSmall')}</p>}
          {pct !== null && (
            <>
              <div className="score" style={{ fontFamily: 'var(--font-display)', fontSize: 52, color: pct >= 60 ? 'var(--green)' : 'var(--accent)' }}>
                {t('bs.match', { n: pct })}
              </div>
              <p className="small muted">{t('bs.legend')}</p>
            </>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            {!result ? (
              <>
                <button className="btn" onClick={() => setStroke([])}>{t('bs.clear')}</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={!world}>{t('bs.submit')}</button>
              </>
            ) : (
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={next}>{t('common.next')} →</button>
            )}
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {scores.map((s, i) => (
            <span key={i} className="chip">{countryName(countries[i], lang)} · {s}%</span>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function BorderSketchPage() {
  return (
    <GameShell slug="border-sketch" rules={['bs.rules.1', 'bs.rules.2', 'bs.rules.3']}>
      {(ctx) => <BorderSketch key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
