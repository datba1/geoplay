'use client';

import { useEffect, useMemo, useState } from 'react';
import { geoBounds, geoContains, geoDistance, geoInterpolate } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, loadWorld, type World } from '@/lib/geo';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';
import { InteractiveGlobe } from '@/components/InteractiveGlobe';

addGameText({
  en: {
    'gc.cut': 'Cut through exactly:', 'gc.tapA': 'Tap the start of your cut', 'gc.tapB': 'Now tap the end',
    'gc.solved': 'Clean cut!', 'gc.missed': 'Missed: {list}', 'gc.extra': 'Also cut: {list}', 'gc.tries': 'Tries left: {n}',
    'gc.reset': 'Reset points', 'gc.failed': 'Out of tries. One solution is shown.', 'gc.puzzle': 'Puzzle',
  },
  vi: {
    'gc.cut': 'Cắt qua đúng:', 'gc.tapA': 'Chạm điểm bắt đầu nhát cắt', 'gc.tapB': 'Giờ chạm điểm kết thúc',
    'gc.solved': 'Cắt chuẩn!', 'gc.missed': 'Thiếu: {list}', 'gc.extra': 'Cắt thừa: {list}', 'gc.tries': 'Còn {n} lần thử',
    'gc.reset': 'Chọn lại điểm', 'gc.failed': 'Hết lượt. Đây là một lời giải.', 'gc.puzzle': 'Câu đố',
  },
});

const PUZZLES = 3;
const TRIES = 3;
type P = [number, number];

/** Countries crossed by the great-circle segment a→b (sampled every ~0.25°). */
function crossed(world: World, bounds: Map<string, [[number, number], [number, number]]>, a: P, b: P) {
  const interp = geoInterpolate(a, b);
  const steps = Math.max(8, Math.ceil((geoDistance(a, b) * 180) / Math.PI / 0.25));
  const hit = new Set<string>();
  for (let i = 0; i <= steps; i++) {
    const p = interp(i / steps) as P;
    for (const c of world.countries) {
      if (hit.has(c.a2)) continue;
      const [[x0, y0], [x1, y1]] = bounds.get(c.a2)!;
      if (p[1] < y0 || p[1] > y1) continue;
      const inLon = x0 <= x1 ? p[0] >= x0 && p[0] <= x1 : p[0] >= x0 || p[0] <= x1;
      if (!inLon) continue;
      if (geoContains(c.feature, p)) hit.add(c.a2);
    }
  }
  return hit;
}

interface Puzzle { a: P; b: P; target: string[] }

function makePuzzles(world: World, bounds: Map<string, [[number, number], [number, number]]>, seed: number, base: number, minArea: number): Puzzle[] {
  const rand = mulberry32(seed);
  const pool = world.countries.filter((c) => c.areaKm2 > minArea);
  const out: Puzzle[] = [];
  let guard = 0;
  while (out.length < PUZZLES && guard++ < 400) {
    const [ca, cb] = shuffle(pool, rand).slice(0, 2);
    const dist = (geoDistance(ca.centroid, cb.centroid) * 180) / Math.PI;
    if (dist < 12 || dist > 55) continue;
    const set = crossed(world, bounds, ca.centroid, cb.centroid);
    const want = base + out.length; // puzzles get harder; the base count depends on difficulty
    if (set.size < want || set.size > want + 1) continue;
    if (out.some((p) => p.target.join() === [...set].sort().join())) continue;
    out.push({ a: ca.centroid, b: cb.centroid, target: [...set].sort() });
  }
  return out;
}

export function GlobeCut({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const BASE = ctx.pick(1, 2, 3);
  const MIN_AREA = ctx.pick(150_000, 60_000, 25_000);
  const [world, setWorld] = useState<World | null>(null);
  const [idx, setIdx] = useState(0);
  const [points, setPoints] = useState<P[]>([]);
  const [tries, setTries] = useState(TRIES);
  const [result, setResult] = useState<{ hit: Set<string>; solved: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [stamps, setStamps] = useState<string[]>([]);
  const [rotation, setRotation] = useState<[number, number]>([0, 0]);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => { loadWorld().then(setWorld); }, []);
  const bounds = useMemo(() => new Map(world?.countries.map((c) => [c.a2, geoBounds(c.feature) as [[number, number], [number, number]]]) ?? []), [world]);
  const puzzles = useMemo(() => (world ? makePuzzles(world, bounds, ctx.seed, BASE, MIN_AREA) : []), [world, bounds, ctx.seed, BASE, MIN_AREA]);
  const puzzle = puzzles[idx];
  const order = useMemo(() => (puzzle ? shuffle(puzzle.target, mulberry32(ctx.seed + idx)) : []), [puzzle, ctx.seed, idx]);

  // Face the puzzle when it starts.
  useEffect(() => {
    if (!puzzle) return;
    const mid = geoInterpolate(puzzle.a, puzzle.b)(0.5);
    setRotation([-mid[0], -mid[1]]);
  }, [puzzle]);

  const pick = (p: P) => {
    if (!world || result?.solved || showSolution) return;
    if (points.length >= 2) return;
    const next = [...points, p];
    setPoints(next);
    if (next.length < 2) return;
    const hit = crossed(world, bounds, next[0], next[1]);
    const solved = hit.size === puzzle.target.length && puzzle.target.every((c) => hit.has(c));
    setResult({ hit, solved });
    ctx.hit(solved);
    if (solved) {
      setScore((s) => s + [300, 200, 100][TRIES - tries]);
      setStamps((s) => [...s, ...puzzle.target]);
    } else {
      setTries((n) => n - 1);
      if (tries - 1 <= 0) setShowSolution(true);
    }
  };

  const retry = () => { setPoints([]); setResult(null); };

  const nextPuzzle = () => {
    if (idx + 1 >= puzzles.length) {
      ctx.finish({ points: score, stamps, meta: { solved: stamps.length } }, { score: String(score) });
      return;
    }
    setIdx((i) => i + 1);
    setPoints([]);
    setResult(null);
    setTries(TRIES);
    setShowSolution(false);
  };

  if (!world || !puzzle) return <div className="card muted">{t('common.loading')}</div>;

  const target = new Set(puzzle.target);
  const line = showSolution ? [puzzle.a, puzzle.b] : points.length === 2 ? points : null;
  const missed = result ? puzzle.target.filter((c) => !result.hit.has(c)) : [];
  const extra = result ? [...result.hit].filter((c) => !target.has(c)) : [];
  const done = result?.solved || showSolution;

  return (
    <div className="game-layout">
      <div className="board" style={{ padding: 12 }}>
        <InteractiveGlobe
          world={world}
          rotation={rotation}
          onRotate={setRotation}
          onPick={pick}
          fill={(a2) => {
            if (result && result.hit.has(a2)) return target.has(a2) ? 'rgba(79,209,161,0.85)' : 'rgba(255,93,108,0.8)';
            if (target.has(a2)) return 'rgba(124,196,255,0.55)';
            return 'rgba(255,255,255,0.10)';
          }}
          overlay={(path, projection) => (
            <g>
              {line && <path d={path({ type: 'LineString', coordinates: line }) ?? ''} fill="none" stroke="#ffb26b" strokeWidth={3} strokeLinecap="round" />}
              {(showSolution ? [puzzle.a, puzzle.b] : points).map((p, i) => {
                const xy = projection(p);
                return xy ? <circle key={i} cx={xy[0]} cy={xy[1]} r={6} fill="#ffb26b" stroke="#111" /> : null;
              })}
            </g>
          )}
        />
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('gc.puzzle')}</small><b>{idx + 1} / {puzzles.length}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
        <div className="card">
          <span className="eyebrow">{t('gc.cut')}</span>
          <ul style={{ paddingLeft: 18, margin: '8px 0' }}>
            {order.map((c) => <li key={c} style={{ fontWeight: 600 }}>{countryName(c, lang)}</li>)}
          </ul>
          <p className="small muted">{done ? '' : points.length === 0 ? t('gc.tapA') : points.length === 1 ? t('gc.tapB') : ''}</p>
          {result && !result.solved && (
            <div className="small">
              {missed.length > 0 && <p className="pill-bad" style={{ margin: '4px 0' }}>{t('gc.missed', { list: missed.map((c) => countryName(c, lang)).join(', ') })}</p>}
              {extra.length > 0 && <p className="pill-bad" style={{ margin: '4px 0' }}>{t('gc.extra', { list: extra.map((c) => countryName(c, lang)).join(', ') })}</p>}
            </div>
          )}
          {result?.solved && <p className="pill-good"><b>{t('gc.solved')}</b></p>}
          {showSolution && <p className="small muted">{t('gc.failed')}</p>}
          <p className="small muted">{t('gc.tries', { n: tries })}</p>
          {done ? (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={nextPuzzle}>{t('common.next')} →</button>
          ) : (
            <button className="btn" style={{ width: '100%' }} onClick={retry} disabled={!points.length}>{t('gc.reset')}</button>
          )}
        </div>
      </aside>
    </div>
  );
}

export function GlobeCutPage() {
  return (
    <GameShell slug="globe-cut" rules={['gc.rules.1', 'gc.rules.2', 'gc.rules.3']}>
      {(ctx) => <GlobeCut key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
