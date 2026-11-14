'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoEqualEarth, geoPath, geoGraticule10 } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { api, type StatIndicator } from '@/lib/api';
import { countryName, loadWorld, type World } from '@/lib/geo';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';
import { IslandMarks } from '@/components/IslandMarks';

const W = 960;
const H = 500;
const ROUNDS = 6;
const SECONDS = 20;
const MIN_SCALE = 0.06;
const MAX_SCALE = 3.2;

interface Shape { a2: string; d: string; cx: number; cy: number; area: number }

/** Projects every country once with Equal Earth (an equal-area projection). */
function buildShapes(world: World): Shape[] {
  const projection = geoEqualEarth().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' });
  const path = geoPath(projection);
  return world.countries
    .filter((c) => c.a2 !== 'AQ')
    .map((c) => {
      const [cx, cy] = path.centroid(c.feature);
      return { a2: c.a2, d: path(c.feature) ?? '', cx, cy, area: path.area(c.feature) };
    });
}

/**
 * Non-contiguous cartogram: each country keeps its shape and centre but is
 * scaled so its on-screen area is proportional to the statistic.
 */
function scalesFor(shapes: Shape[], values: Record<string, number>) {
  const withData = shapes.filter((s) => values[s.a2] > 0 && s.area > 0);
  const totalValue = withData.reduce((sum, s) => sum + values[s.a2], 0);
  const totalArea = withData.reduce((sum, s) => sum + s.area, 0);
  const out: Record<string, number> = {};
  for (const s of shapes) {
    const v = values[s.a2];
    if (!v || !s.area) { out[s.a2] = 0; continue; }
    const k = Math.sqrt((v / totalValue) / (s.area / totalArea));
    out[s.a2] = Math.max(MIN_SCALE, Math.min(MAX_SCALE, k));
  }
  return out;
}

function formatValue(v: number, unit: string, lang: string) {
  const n = new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  if (unit === 'usd') return `$${n}`;
  if (unit === 'km2') return `${n} km²`;
  if (unit === 'ha') return `${n} ha`;
  return n;
}

interface Round { answer: StatIndicator; options: StatIndicator[] }

function makeRounds(indicators: StatIndicator[], seed: number): Round[] {
  const rand = mulberry32(seed);
  const order = shuffle(indicators, rand);
  return Array.from({ length: Math.min(ROUNDS, order.length) }, (_, i) => {
    const answer = order[i];
    // Prefer distractors from other groups so similar maps (e.g. population vs urban) rarely compete.
    const others = shuffle(indicators.filter((x) => x.slug !== answer.slug), rand)
      .sort((a, b) => Number(a.group === answer.group) - Number(b.group === answer.group));
    return { answer, options: shuffle([answer, ...others.slice(0, 3)], rand) };
  });
}

export function WarpedMap({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const [world, setWorld] = useState<World | null>(null);
  const [indicators, setIndicators] = useState<StatIndicator[] | null>(null);
  const [error, setError] = useState(false);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState<string[]>([]);
  const [warped, setWarped] = useState(false);
  const deadline = useRef(0);

  useEffect(() => {
    loadWorld().then(setWorld);
    api.stats().then((s) => setIndicators(s.indicators)).catch(() => setError(true));
  }, []);

  const shapes = useMemo(() => (world ? buildShapes(world) : []), [world]);
  const graticule = useMemo(() => {
    const projection = geoEqualEarth().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' });
    const path = geoPath(projection);
    return { sphere: path({ type: 'Sphere' }) ?? '', lines: path(geoGraticule10()) ?? '' };
  }, []);
  const rounds = useMemo(() => (indicators ? makeRounds(indicators, ctx.seed) : []), [indicators, ctx.seed]);
  const islandProjection = useMemo(() => geoEqualEarth().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' }), []);
  const current = rounds[round];
  const scales = useMemo(() => (current ? scalesFor(shapes, current.answer.values) : {}), [shapes, current]);

  // Start each round: show the real map, then let it swell.
  useEffect(() => {
    if (!current || !shapes.length) return;
    setWarped(false);
    setPicked(null);
    const id = setTimeout(() => {
      setWarped(true);
      deadline.current = performance.now() + SECONDS * 1000 + 1200;
      setTimeLeft(SECONDS);
    }, 350);
    return () => clearTimeout(id);
  }, [current, shapes.length]);

  useEffect(() => {
    if (!warped || picked) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.min(SECONDS, (deadline.current - performance.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) setPicked('__timeout');
    }, 100);
    return () => clearInterval(id);
  }, [warped, picked]);

  const choose = (slug: string) => {
    if (picked || !current) return;
    setPicked(slug);
    if (slug === current.answer.slug) {
      setScore((s) => s + 150 + Math.round((timeLeft / SECONDS) * 50));
      setCorrect((c) => [...c, slug]);
    }
  };

  const top = useMemo(() => {
    if (!current) return [];
    return Object.entries(current.answer.values)
      .filter(([a2]) => shapes.some((s) => s.a2 === a2))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [current, shapes]);

  const next = () => {
    if (round + 1 >= rounds.length) {
      // Stamp the top three countries of every statistic guessed right.
      const stamps = rounds
        .filter((r) => correct.includes(r.answer.slug))
        .flatMap((r) => Object.entries(r.answer.values).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a2]) => a2));
      ctx.finish(
        { points: score, stamps, meta: { correct: correct.length, rounds: rounds.length } },
        { score: String(score), subtitle: `${correct.length} / ${rounds.length}` },
      );
      return;
    }
    setRound((r) => r + 1);
  };

  if (error) {
    return (
      <div className="card">
        <p>{t('wm.noData')}</p>
        <code className="small">npm run data:worldbank</code>
      </div>
    );
  }
  if (!current || !shapes.length) return <div className="card muted">{t('common.loading')}</div>;

  const answered = picked !== null;
  const right = picked === current.answer.slug;

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 280px' }}>
      <div>
        <div className="board">
          <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
            <path d={graticule.sphere} fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.08)" />
            <path d={graticule.lines} fill="none" stroke="rgba(255,255,255,0.035)" />
            {/* real outlines, faint */}
            {shapes.map((s) => (
              <path key={`g-${s.a2}`} d={s.d} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={0.5} />
            ))}
            {/* warped countries, biggest first so small ones stay visible on top */}
            {[...shapes].sort((a, b) => (scales[b.a2] ?? 0) * b.area - (scales[a.a2] ?? 0) * a.area).map((s) => {
              const k = warped ? scales[s.a2] ?? 0 : 1;
              const hue = 250 - Math.min(1, (scales[s.a2] ?? 0) / MAX_SCALE) * 230;
              return (
                <path
                  key={s.a2}
                  d={s.d}
                  className="warp-shape"
                  style={{
                    transformOrigin: `${s.cx}px ${s.cy}px`,
                    transform: `scale(${k || 0.001})`,
                    fill: warped ? `hsla(${hue}, 75%, 62%, 0.82)` : 'rgba(155,107,255,0.35)',
                  }}
                >
                  <title>{countryName(s.a2, lang)}</title>
                </path>
              );
            })}
            <IslandMarks projection={islandProjection} fill="rgba(255,255,255,0.45)" radius={1.1} labels={false} />
          </svg>
        </div>
        <div className="timer-bar" style={{ marginTop: 10 }}>
          <div style={{ width: `${(timeLeft / SECONDS) * 100}%`, background: timeLeft < 6 ? 'var(--red)' : undefined }} />
        </div>
        <p className="small muted">{t('wm.help')}</p>
      </div>

      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.round')}</small><b>{round + 1} / {rounds.length}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <span className="eyebrow">{t('wm.question')}</span>
          <div className="wm-options">
            {current.options.map((o) => {
              const state = !answered ? '' : o.slug === current.answer.slug ? 'good' : o.slug === picked ? 'bad' : 'dim';
              return (
                <button key={o.slug} className={`wm-option ${state}`} disabled={answered || !warped} onClick={() => choose(o.slug)}>
                  {o.name[lang]}
                </button>
              );
            })}
          </div>
          {answered && (
            <>
              <p style={{ margin: '12px 0 6px' }}>
                <b className={right ? 'pill-good' : 'pill-bad'}>
                  {picked === '__timeout' ? t('wm.timeout') : right ? t('wm.right') : t('wm.wrong')}
                </b>{' '}
                <span className="muted small">
                  {current.answer.name[lang]} · {current.answer.years[0] === current.answer.years[1] ? current.answer.years[0] : `${current.answer.years[0]}–${current.answer.years[1]}`}
                </span>
              </p>
              <ol className="wm-top">
                {top.map(([a2, v]) => (
                  <li key={a2}><span>{countryName(a2, lang)}</span><b>{formatValue(v, current.answer.unit, lang)}</b></li>
                ))}
              </ol>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={next}>{t('common.next')} →</button>
            </>
          )}
        </div>
        <p className="small muted">{t('wm.source')}</p>
      </aside>
    </div>
  );
}

export function WarpedMapPage() {
  return (
    <GameShell slug="warped-map" rules={['wm.rules.1', 'wm.rules.2', 'wm.rules.3']}>
      {(ctx) => <WarpedMap key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
