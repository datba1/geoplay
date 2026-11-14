'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoAzimuthalEqualArea, geoPath } from 'd3-geo';
import { useI18n, type DictKey } from '@/lib/i18n';
import { countryName, formatKm2, loadWorld, type Country, type World } from '@/lib/geo';
import { mulberry32 } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

/* ------------------------------------------------------------------ */
/* Challenges: a frame country and a tray of countries to pack inside. */
/* Countries missing from the 1:110m map are skipped automatically.    */
/* ------------------------------------------------------------------ */

interface Challenge { frame: string; region: 'europe' | 'asia' | 'africa' | 'west-europe'; tray: string[] }

const CHALLENGES: Challenge[] = [
  {
    frame: 'BR', region: 'europe',
    tray: ['UA', 'FR', 'ES', 'SE', 'DE', 'FI', 'NO', 'IT', 'PL', 'GB', 'RO', 'BY', 'GR', 'BG', 'IS', 'PT', 'HU', 'AT', 'CZ', 'RS', 'LV', 'LT', 'IE', 'HR', 'BA', 'SK', 'CH', 'EE', 'DK', 'NL', 'MD', 'BE', 'AL', 'MK', 'SI', 'ME', 'LU'],
  },
  {
    frame: 'AU', region: 'asia',
    tray: ['IN', 'PK', 'MM', 'AF', 'TH', 'TM', 'UZ', 'IQ', 'JP', 'VN', 'MY', 'PH', 'LA', 'KG', 'NP', 'TJ', 'BD', 'KH', 'KP', 'KR', 'JO', 'AE', 'LK', 'BT', 'TW', 'IL', 'KW', 'QA', 'LB'],
  },
  {
    frame: 'AR', region: 'africa',
    tray: ['NG', 'TZ', 'ZM', 'MA', 'ZW', 'CM', 'CG', 'CI', 'BF', 'GA', 'GN', 'UG', 'GH', 'SN', 'TN', 'MW', 'ER', 'BJ', 'LR', 'SL', 'TG', 'RW', 'BI', 'GW', 'GQ', 'GM'],
  },
  {
    frame: 'GL', region: 'west-europe',
    tray: ['FR', 'ES', 'DE', 'IT', 'GB', 'PT', 'IE', 'NL', 'BE', 'CH', 'AT', 'DK', 'LU', 'NO', 'SE', 'FI', 'IS', 'PL', 'CZ'],
  },
];

const W = 900;
const H = 640;
const RASTER = 0.4;
const STAR_THRESHOLDS = [0.3, 0.45, 0.58];

interface Shape { a2: string; d: string; area: number; hue: number }
interface Piece { a2: string; x: number; y: number; rot: number }
interface Evaluation { bad: Set<string>; fill: number; good: string[] }

const hueFor = (a2: string) => (a2.charCodeAt(0) * 47 + a2.charCodeAt(1) * 13) % 360;

/** Projects every country with an equal-area projection centred on itself, all at one scale. */
function buildShapes(world: World, challenge: Challenge) {
  const frame = world.byA2.get(challenge.frame)!;
  const project = (c: Country, scale: number) => {
    const proj = geoAzimuthalEqualArea().rotate([-c.centroid[0], -c.centroid[1]]).scale(scale).translate([0, 0]);
    const [[x0, y0], [x1, y1]] = geoPath(proj).bounds(c.feature);
    proj.translate([-(x0 + x1) / 2, -(y0 + y1) / 2]);
    return { d: geoPath(proj)(c.feature) ?? '', w: x1 - x0, h: y1 - y0 };
  };
  const unit = project(frame, 1);
  const scale = Math.min((W * 0.62) / unit.w, (H * 0.86) / unit.h);
  const frameShape: Shape = { a2: frame.a2, d: project(frame, scale).d, area: frame.areaKm2, hue: 0 };
  const tray: Shape[] = challenge.tray
    .map((a2) => world.byA2.get(a2))
    .filter((c): c is Country => !!c)
    .map((c) => ({ a2: c.a2, d: project(c, scale).d, area: c.areaKm2, hue: hueFor(c.a2) }))
    .sort((a, b) => b.area - a.area);
  return { frameShape, tray };
}

function useEvaluator(frame: Shape | null) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameMask = useRef<Uint8Array | null>(null);
  const frameCount = useRef(0);
  const cw = Math.round(W * RASTER);
  const ch = Math.round(H * RASTER);

  const rasterize = useCallback((d: string, x: number, y: number, rot: number) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = cw;
      canvasRef.current.height = ch;
    }
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true })!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(RASTER, 0, 0, RASTER, 0, 0);
    ctx.translate(x, y);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.fillStyle = '#000';
    ctx.fill(new Path2D(d));
    const data = ctx.getImageData(0, 0, cw, ch).data;
    const mask = new Uint8Array(cw * ch);
    let count = 0;
    for (let i = 0; i < mask.length; i++) {
      if (data[i * 4 + 3] > 127) { mask[i] = 1; count++; }
    }
    return { mask, count };
  }, [cw, ch]);

  useEffect(() => {
    frameMask.current = null;
  }, [frame]);

  return useCallback((pieces: Piece[], shapes: Map<string, Shape>): Evaluation => {
    if (!frame) return { bad: new Set(), fill: 0, good: [] };
    if (!frameMask.current) {
      const f = rasterize(frame.d, W / 2, H / 2, 0);
      frameMask.current = f.mask;
      frameCount.current = f.count;
    }
    const fm = frameMask.current;
    const masks = pieces.map((p) => rasterize(shapes.get(p.a2)!.d, p.x, p.y, p.rot));
    const cover = new Uint8Array(cw * ch);
    for (const m of masks) for (let i = 0; i < cover.length; i++) cover[i] += m.mask[i];

    const bad = new Set<string>();
    const good: string[] = [];
    const union = new Uint8Array(cw * ch);
    masks.forEach((m, idx) => {
      let inside = 0;
      let overlap = 0;
      for (let i = 0; i < m.mask.length; i++) {
        if (!m.mask[i]) continue;
        if (fm[i]) inside++;
        if (cover[i] > 1) overlap++;
      }
      const ok = m.count > 0 && inside / m.count >= 0.9 && overlap / m.count <= 0.04;
      if (!ok) { bad.add(pieces[idx].a2); return; }
      good.push(pieces[idx].a2);
      for (let i = 0; i < m.mask.length; i++) if (m.mask[i] && fm[i]) union[i] = 1;
    });
    let filled = 0;
    for (let i = 0; i < union.length; i++) filled += union[i];
    return { bad, good, fill: frameCount.current ? filled / frameCount.current : 0 };
  }, [frame, rasterize, cw, ch]);
}

export function TrueSize({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const [world, setWorld] = useState<World | null>(null);
  const [challengeIdx, setChallengeIdx] = useState(() => Math.floor(mulberry32(ctx.seed)() * CHALLENGES.length));
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation>({ bad: new Set(), fill: 0, good: [] });
  const [dragging, setDragging] = useState<{ a2: string; dx: number; dy: number } | null>(null);
  const [locked, setLocked] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => { loadWorld().then(setWorld); }, []);

  const challenge = CHALLENGES[challengeIdx];
  const built = useMemo(() => (world ? buildShapes(world, challenge) : null), [world, challenge]);
  const shapeMap = useMemo(() => new Map(built?.tray.map((s) => [s.a2, s]) ?? []), [built]);
  const evaluate = useEvaluator(built?.frameShape ?? null);

  useEffect(() => {
    if (!dragging && built) setEvaluation(evaluate(pieces, shapeMap));
  }, [pieces, dragging, built, evaluate, shapeMap]);

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }, []);

  // Global pointer handling while dragging (works for drags started in the tray too).
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const p = toSvg(e.clientX, e.clientY);
      setPieces((ps) => ps.map((pc) => (pc.a2 === dragging.a2 ? { ...pc, x: p.x - dragging.dx, y: p.y - dragging.dy } : pc)));
    };
    const up = (e: PointerEvent) => {
      const p = toSvg(e.clientX, e.clientY);
      if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) {
        setPieces((ps) => ps.filter((pc) => pc.a2 !== dragging.a2));
        setSelected(null);
      }
      setDragging(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging, toSvg]);

  const rotate = useCallback((a2: string | null, delta: number) => {
    if (!a2) return;
    setPieces((ps) => ps.map((p) => (p.a2 === a2 ? { ...p, rot: (p.rot + delta + 360) % 360 } : p)));
  }, []);

  const removePiece = useCallback((a2: string | null) => {
    if (!a2) return;
    setPieces((ps) => ps.filter((p) => p.a2 !== a2));
    setSelected(null);
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') rotate(selected, -15);
      if (e.key === 'e' || e.key === 'E') rotate(selected, 15);
      if (e.key === 'Delete' || e.key === 'Backspace') removePiece(selected);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [selected, rotate, removePiece]);

  // Wheel rotates the piece under the cursor (needs a non-passive listener).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (e: WheelEvent) => {
      const target = (e.target as Element).closest('[data-piece]');
      if (!target) return;
      e.preventDefault();
      rotate(target.getAttribute('data-piece'), e.deltaY > 0 ? 5 : -5);
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [rotate, built]);

  const startDragFromTray = (a2: string, e: React.PointerEvent) => {
    if (locked) return;
    e.preventDefault();
    const p = toSvg(e.clientX, e.clientY);
    setPieces((ps) => [...ps, { a2, x: p.x, y: p.y, rot: 0 }]);
    setSelected(a2);
    setDragging({ a2, dx: 0, dy: 0 });
  };

  const startDragPiece = (piece: Piece, e: React.PointerEvent) => {
    if (locked) return;
    e.stopPropagation();
    const p = toSvg(e.clientX, e.clientY);
    setSelected(piece.a2);
    // Bring to front
    setPieces((ps) => [...ps.filter((x) => x.a2 !== piece.a2), piece]);
    setDragging({ a2: piece.a2, dx: p.x - piece.x, dy: p.y - piece.y });
  };

  const changeChallenge = () => {
    setChallengeIdx((i) => (i + 1) % CHALLENGES.length);
    setPieces([]);
    setSelected(null);
  };

  const lockIn = () => {
    setLocked(true);
    const stars = STAR_THRESHOLDS.filter((s) => evaluation.fill >= s).length;
    const pct = (evaluation.fill * 100).toFixed(1);
    ctx.finish(
      {
        points: Math.round(evaluation.fill * 1000),
        stamps: stars > 0 ? [challenge.frame, ...evaluation.good] : evaluation.good,
        flags: stars === 3 ? { 'ts-3star': true } : {},
        meta: { challenge: challenge.frame, fill: evaluation.fill, pieces: evaluation.good.length },
      },
      { score: `${pct}%`, subtitle: '★'.repeat(stars) + '☆'.repeat(3 - stars) },
    );
  };

  if (!built) return <div className="card muted">{t('common.loading')}</div>;

  const frameName = countryName(challenge.frame, lang);
  const placed = new Set(pieces.map((p) => p.a2));
  const stars = STAR_THRESHOLDS.filter((s) => evaluation.fill >= s).length;

  return (
    <div className="game-layout">
      <div>
        <div className="board">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto' }} onPointerDown={() => setSelected(null)}>
            <defs>
              <pattern id="ts-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M30 0H0V30" fill="none" stroke="rgba(255,255,255,0.035)" />
              </pattern>
            </defs>
            <rect width={W} height={H} fill="url(#ts-grid)" />
            <g transform={`translate(${W / 2},${H / 2})`}>
              <path d={built.frameShape.d} fill="rgba(155,107,255,0.12)" stroke="#9b6bff" strokeWidth={2} strokeDasharray="6 5" />
            </g>
            <text x={20} y={32} fill="rgba(255,255,255,0.4)" fontSize={14} letterSpacing={3}>{frameName.toUpperCase()}</text>
            {pieces.map((p) => {
              const s = shapeMap.get(p.a2)!;
              const bad = evaluation.bad.has(p.a2);
              return (
                <g
                  key={p.a2}
                  data-piece={p.a2}
                  transform={`translate(${p.x},${p.y}) rotate(${p.rot})`}
                  onPointerDown={(e) => startDragPiece(p, e)}
                  onDoubleClick={() => removePiece(p.a2)}
                  style={{ cursor: locked ? 'default' : 'grab' }}
                >
                  <path
                    d={s.d}
                    fill={bad ? 'rgba(255,93,108,0.55)' : `hsla(${s.hue},70%,62%,0.78)`}
                    stroke={selected === p.a2 ? '#fff' : 'rgba(0,0,0,0.45)'}
                    strokeWidth={selected === p.a2 ? 2 : 1}
                  />
                  <text textAnchor="middle" dy="0.35em" fontSize={11} fill="#0b0f1c" style={{ pointerEvents: 'none', fontWeight: 600 }}>
                    {p.a2}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="small muted">{t('ts.help')}</p>
      </div>

      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('ts.filled')}</small><b>{(evaluation.fill * 100).toFixed(1)}%</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('ts.placed')}</small><b>{evaluation.good.length}</b></div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <span className="eyebrow">{t('ts.challenge')}</span>
          <h3 style={{ fontSize: 22, margin: '4px 0' }}>
            {t('ts.cTitle', { tray: t(`ts.region.${challenge.region}` as DictKey), frame: frameName })}
          </h3>
          <p className="small muted" style={{ margin: '0 0 8px' }}>
            {t('ts.cDesc', { frame: frameName, area: formatKm2(built.frameShape.area, lang) })}
          </p>
          <div className="stars">{[0, 1, 2].map((i) => <span key={i} className={i < stars ? 'on' : ''}>★</span>)}</div>
          <p className="small muted">{t('ts.rule')}</p>
          <div className="row">
            <button className="btn btn-sm" disabled={!selected || locked} onClick={() => rotate(selected, -15)}>⟲</button>
            <button className="btn btn-sm" disabled={!selected || locked} onClick={() => rotate(selected, 15)}>⟳</button>
            <span className="spacer" />
            <button className="btn btn-sm btn-ghost" disabled={locked} onClick={changeChallenge}>{t('ts.change')}</button>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={locked || evaluation.good.length === 0} onClick={lockIn}>
            {t('ts.lock')}
          </button>
        </div>
        <div>
          <span className="eyebrow">{t('ts.tray')}</span>
          <div className="tray" style={{ marginTop: 8 }}>
            {built.tray.filter((s) => !placed.has(s.a2)).map((s) => (
              <button key={s.a2} className="tray-item" onPointerDown={(e) => startDragFromTray(s.a2, e)} style={{ borderLeft: `3px solid hsl(${s.hue},70%,62%)` }}>
                {countryName(s.a2, lang)}
                <small>{formatKm2(s.area, lang)}</small>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function TrueSizePage() {
  return (
    <GameShell slug="true-size" rules={['ts.rules.1', 'ts.rules.2', 'ts.rules.3']}>
      {(ctx) => <TrueSize key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
