'use client';

import { useEffect, useMemo, useState } from 'react';
import { geoAzimuthalEqualArea, geoPath } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, largestPolygon, loadWorld, type World } from '@/lib/geo';
import { mulberry32 } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

addGameText({
  en: {
    'nw.code': 'World code', 'nw.year': 'Year', 'nw.yours': 'Your provinces', 'nw.pick': 'Choose a province next to your border.',
    'nw.weak': 'Your border there is too weak ({a} vs {b}).', 'nw.resembles': 'Your empire resembles', 'nw.shape': 'Shape match',
    'nw.plains': 'Plains', 'nw.forest': 'Forest', 'nw.hills': 'Hills', 'nw.mountain': 'Mountains', 'nw.ai': 'Kingdoms are moving…',
    'nw.legend': 'Defence: plains 0, forest +1, hills +1, mountains +2',
  },
  vi: {
    'nw.code': 'Mã thế giới', 'nw.year': 'Năm', 'nw.yours': 'Tỉnh của bạn', 'nw.pick': 'Chọn một tỉnh sát biên giới của bạn.',
    'nw.weak': 'Biên giới của bạn ở đó quá yếu ({a} so với {b}).', 'nw.resembles': 'Đế chế của bạn giống', 'nw.shape': 'Độ khớp hình dạng',
    'nw.plains': 'Đồng bằng', 'nw.forest': 'Rừng', 'nw.hills': 'Đồi', 'nw.mountain': 'Núi', 'nw.ai': 'Các vương quốc đang hành động…',
    'nw.legend': 'Phòng thủ: đồng bằng 0, rừng +1, đồi +1, núi +2',
  },
});

const COLS = 26;
const ROWS = 18;
const R = 17; // hex radius
const YEARS = 30;
const KINGS = ['#f5c66b', '#9b6bff', '#5eead4', '#f87171'];
type Terrain = 'plains' | 'forest' | 'hills' | 'mountain';
const DEFENCE: Record<Terrain, number> = { plains: 0, forest: 1, hills: 1, mountain: 2 };
const TERRAIN_FILL: Record<Terrain, string> = { plains: '#2f4a3a', forest: '#24402f', hills: '#4a4632', mountain: '#5a5560' };

interface Cell { id: number; q: number; r: number; x: number; y: number; terrain: Terrain }

/** Smooth value noise from a seed. */
function noise2(seed: number) {
  const rand = mulberry32(seed);
  const g = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => rand()));
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const at = (i: number, j: number) => g[((j % 8) + 8) % 8][((i % 8) + 8) % 8];
    const s = (t: number) => t * t * (3 - 2 * t);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * s(xf);
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * s(xf);
    return a + (b - a) * s(yf);
  };
}

function generate(seed: number) {
  const rand = mulberry32(seed);
  const shape = noise2(seed ^ 0xabc);
  const relief = noise2(seed ^ 0x123);
  const phases = Array.from({ length: 4 }, () => rand() * Math.PI * 2);
  const cells: Cell[] = [];
  const index = new Map<string, number>();
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
    const x = R * 1.5 * q + R + 12;
    const y = R * Math.sqrt(3) * (r + (q % 2 ? 0.5 : 0)) + R + 12;
    const nx = q / COLS - 0.5, ny = r / ROWS - 0.5;
    const ang = Math.atan2(ny, nx);
    const radius = 0.36 + 0.06 * Math.sin(2 * ang + phases[0]) + 0.05 * Math.sin(3 * ang + phases[1]) + 0.04 * Math.sin(5 * ang + phases[2]);
    const d = Math.hypot(nx, ny * 1.15) + (shape(q / 4, r / 4) - 0.5) * 0.22;
    if (d > radius) continue;
    const h = relief(q / 5, r / 5) + (rand() - 0.5) * 0.15;
    const terrain: Terrain = h > 0.78 ? 'mountain' : h > 0.62 ? 'hills' : h > 0.45 ? 'forest' : 'plains';
    index.set(`${q},${r}`, cells.length);
    cells.push({ id: cells.length, q, r, x, y, terrain });
  }
  const nb = cells.map((c) => {
    const odd = c.q % 2 === 1;
    const dirs = odd ? [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]] : [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]];
    return dirs.map(([dq, dr]) => index.get(`${c.q + dq},${c.r + dr}`)).filter((v): v is number => v !== undefined);
  });
  // Starts: four cells far apart (corners of the land's bounding box).
  const corners = [[0, 0], [1, 1], [1, 0], [0, 1]].map(([fx, fy]) => {
    const tx = fx * COLS * R * 1.5, ty = fy * ROWS * R * 1.7;
    return cells.reduce((best, c) => (Math.hypot(c.x - tx, c.y - ty) < Math.hypot(best.x - tx, best.y - ty) ? c : best)).id;
  });
  return { cells, nb, starts: corners };
}

const hexPoints = (x: number, y: number) =>
  Array.from({ length: 6 }, (_, i) => `${x + R * Math.cos((Math.PI / 3) * i)},${y + R * Math.sin((Math.PI / 3) * i)}`).join(' ');

/** Shape descriptors: compactness (4πA/P²) and elongation (PCA axis ratio). */
function descriptors(points: [number, number][], area: number, perimeter: number) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p[0], 0) / n, my = points.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of points) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  const tr = sxx + syy, det = sxx * syy - sxy * sxy;
  const l1 = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  return { compact: (4 * Math.PI * area) / (perimeter * perimeter), elong: Math.sqrt(l1 / Math.max(l2, 1e-9)) };
}

function countryDescriptors(world: World) {
  return world.countries.filter((c) => c.areaKm2 > 40_000).map((c) => {
    const poly = largestPolygon(c.feature);
    const proj = geoAzimuthalEqualArea().rotate([-c.centroid[0], -c.centroid[1]]).fitSize([200, 200], poly);
    const ring = poly.geometry.coordinates[0].map((p) => proj(p as [number, number])!) as [number, number][];
    const path = geoPath(proj);
    return { a2: c.a2, d: path(poly) ?? '', ...descriptors(ring, path.area(poly), path.measure(poly)) };
  });
}

export function NewWorld({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const [world, setWorld] = useState<World | null>(null);
  const map = useMemo(() => generate(ctx.seed), [ctx.seed]);
  const [owner, setOwner] = useState<(number | null)[]>(() => {
    const o: (number | null)[] = map.cells.map(() => null);
    map.starts.forEach((s, i) => (o[s] = i));
    return o;
  });
  const [year, setYear] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [match, setMatch] = useState<{ a2: string; d: string; pct: number } | null>(null);

  useEffect(() => { loadWorld().then(setWorld); }, []);

  const strength = (o: (number | null)[], cell: number, k: number) => map.nb[cell].filter((n) => o[n] === k).length;
  const canTake = (o: (number | null)[], cell: number, k: number) => {
    if (o[cell] === k || strength(o, cell, k) === 0) return { ok: false, a: 0, b: 0 };
    if (o[cell] === null) return { ok: true, a: 0, b: 0 };
    const a = strength(o, cell, k);
    const b = strength(o, cell, o[cell]!) + DEFENCE[map.cells[cell].terrain] + 1;
    return { ok: a > b, a, b };
  };

  const finish = (o: (number | null)[]) => {
    const mine = map.cells.filter((c) => o[c.id] === 0);
    const land = map.cells.length;
    const pts = Math.min(1000, Math.round((1000 * mine.length) / (land * 0.4)));
    let best: { a2: string; d: string; pct: number } | null = null;
    if (world && mine.length > 2) {
      const hexArea = (3 * Math.sqrt(3) * R * R) / 2;
      const edges = mine.reduce((s, c) => s + 6 - map.nb[c.id].filter((n) => o[n] === 0).length, 0);
      const me = descriptors(mine.map((c) => [c.x, c.y]), mine.length * hexArea, edges * R);
      for (const d of countryDescriptors(world)) {
        const dist = Math.hypot(Math.log(d.elong / me.elong), (d.compact - me.compact) * 2);
        const pct = Math.round(100 * Math.exp(-dist * 1.5));
        if (!best || pct > best.pct) best = { a2: d.a2, d: d.d, pct };
      }
    }
    setMatch(best);
    ctx.finish(
      { points: pts, stamps: best ? [best.a2] : [], meta: { provinces: mine.length, resembles: best?.a2 } },
      { score: String(pts), subtitle: best ? `${t('nw.resembles')} ${countryName(best.a2, lang)} (${best.pct}%)` : undefined },
    );
  };

  const aiTurns = (o: (number | null)[]) => {
    const next = [...o];
    for (let k = 1; k < 4; k++) {
      let best: { cell: number; s: number } | null = null;
      for (const c of map.cells) {
        const r = canTake(next, c.id, k);
        if (!r.ok) continue;
        const s = (next[c.id] === null ? 2 : 3) + strength(next, c.id, k) - DEFENCE[c.terrain] * 0.5 + Math.random();
        if (!best || s > best.s) best = { cell: c.id, s };
      }
      if (best) next[best.cell] = k;
    }
    return next;
  };

  const click = (cell: number) => {
    if (busy || match) return;
    const r = canTake(owner, cell, 0);
    if (!r.ok) {
      if (strength(owner, cell, 0) > 0 && owner[cell] !== 0) setMsg(t('nw.weak', { a: r.a, b: r.b }));
      return;
    }
    setMsg(null);
    const mine = [...owner];
    mine[cell] = 0;
    setOwner(mine);
    setBusy(true);
    setTimeout(() => {
      const after = aiTurns(mine);
      setOwner(after);
      setBusy(false);
      if (year >= YEARS) finish(after);
      else setYear((y) => y + 1);
    }, 350);
  };

  const counts = KINGS.map((_, k) => owner.filter((o) => o === k).length);
  const W = COLS * R * 1.5 + R * 2 + 24, H = ROWS * R * Math.sqrt(3) + R * 2 + 24;

  return (
    <div className="game-layout">
      <div className="board">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
          <rect width={W} height={H} fill="#0b1630" />
          {map.cells.map((c) => {
            const o = owner[c.id];
            const takeable = !busy && !match && canTake(owner, c.id, 0).ok;
            return (
              <polygon
                key={c.id}
                points={hexPoints(c.x, c.y)}
                fill={o === null ? TERRAIN_FILL[c.terrain] : KINGS[o]}
                fillOpacity={o === null ? 1 : 0.85}
                stroke={takeable ? '#ffffff' : 'rgba(7,11,20,0.6)'}
                strokeWidth={takeable ? 1.6 : 1}
                style={{ cursor: takeable ? 'pointer' : 'default' }}
                onClick={() => click(c.id)}
              >
                <title>{t(`nw.${c.terrain}`)}</title>
              </polygon>
            );
          })}
          {map.cells.filter((c) => c.terrain === 'mountain' && owner[c.id] === null).map((c) => (
            <text key={`m${c.id}`} x={c.x} y={c.y} textAnchor="middle" dy="0.35em" fontSize={11} fill="rgba(255,255,255,0.5)" style={{ pointerEvents: 'none' }}>▲</text>
          ))}
        </svg>
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('nw.year')}</small><b>{year} / {YEARS}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('nw.code')}</small><b style={{ fontSize: 13 }}>W-{ctx.seed % 1_000_000}</b></div>
        </div>
        <div className="card">
          {KINGS.map((c, k) => (
            <div key={c} className="row small" style={{ marginBottom: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block' }} />
              <span>{k === 0 ? t('nw.yours') : `#${k + 1}`}</span><span className="spacer" /><b>{counts[k]}</b>
            </div>
          ))}
          <p className="small muted">{busy ? t('nw.ai') : msg ?? t('nw.pick')}</p>
          <p className="small muted">{t('nw.legend')}</p>
        </div>
        {match && (
          <div className="card" style={{ textAlign: 'center' }}>
            <span className="eyebrow">{t('nw.resembles')}</span>
            <svg viewBox="0 0 200 200" style={{ width: 140, display: 'block', margin: '8px auto' }}><path d={match.d} fill="#f5c66b" /></svg>
            <b>{countryName(match.a2, lang)}</b>
            <p className="small muted">{t('nw.shape')}: {match.pct}%</p>
          </div>
        )}
      </aside>
    </div>
  );
}

export function NewWorldPage() {
  return (
    <GameShell slug="new-world" rules={['nw.rules.1', 'nw.rules.2', 'nw.rules.3']}>
      {(ctx) => <NewWorld key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
