'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoDistance, geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, loadWorld, type World } from '@/lib/geo';
import { CAPITALS, capitalName, type Capital } from '@/lib/capitals';
import { mulberry32, shuffle } from '@/lib/rng';
import { IslandMarks } from '@/components/IslandMarks';
import { GameShell, type GameContext } from '@/components/GameShell';

addGameText({
  en: {
    'cp.where': 'Where is', 'cp.capitalOf': 'capital of {country}', 'cp.tap': 'Tap the map where you think the city is.',
    'cp.off': 'Off by {km} km', 'cp.bullseye': 'Bullseye!', 'cp.city': 'City', 'cp.next': 'Next city',
  },
  vi: {
    'cp.where': 'Đâu là', 'cp.capitalOf': 'thủ đô của {country}', 'cp.tap': 'Chạm vào bản đồ nơi bạn nghĩ thành phố nằm.',
    'cp.off': 'Lệch {km} km', 'cp.bullseye': 'Trúng phóc!', 'cp.city': 'Thành phố', 'cp.next': 'Thành phố tiếp',
  },
});

const W = 960;
const H = 500;
const ROUNDS = 5;
const R_KM = 6371;
type P = [number, number];

export function CapitalPin({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  // Easy: famous capitals with the country highlighted. Hard: any capital, city name only, tighter scoring.
  const POOL = ctx.pick(CAPITALS.filter((c) => c.tier === 1), CAPITALS, CAPITALS.filter((c) => c.tier === 2));
  const FULL_KM = ctx.pick(2400, 1600, 1000);
  const [world, setWorld] = useState<World | null>(null);
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<P | null>(null);
  const [score, setScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [stamps, setStamps] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => { loadWorld().then(setWorld); }, []);

  const cities = useMemo<Capital[]>(() => shuffle(POOL, mulberry32(ctx.seed)).slice(0, ROUNDS), [ctx.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const projection = useMemo(() => geoEqualEarth().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' }), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const base = useMemo(() => world?.countries.map((c) => ({ a2: c.a2, d: path(c.feature) ?? '' })) ?? [], [world, path]);
  const city = cities[round];
  const at: P = city ? [city.lon, city.lat] : [0, 0];

  const click = (e: React.MouseEvent) => {
    if (guess || !city) return;
    const r = svgRef.current!.getBoundingClientRect();
    const p = projection.invert?.([((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]);
    if (!p || Number.isNaN(p[0])) return;
    setGuess(p as P);
    const km = geoDistance(p as P, at) * R_KM;
    const pts = Math.round(200 * Math.max(0, 1 - km / FULL_KM));
    setRoundScore(pts);
    setScore((s) => s + pts);
    ctx.hit(km < FULL_KM / 3);
    if (km < FULL_KM / 2) setStamps((s) => [...s, city.a2]);
  };

  const next = () => {
    if (round + 1 >= cities.length) {
      ctx.finish({ points: score, stamps, meta: { cities: cities.map((c) => c.a2) } }, { score: String(score), subtitle: `${stamps.length} / ${cities.length}` });
      return;
    }
    setRound((r) => r + 1);
    setGuess(null);
  };

  if (!world || !city) return <div className="card muted">{t('common.loading')}</div>;

  const km = guess ? Math.round(geoDistance(guess, at) * R_KM) : 0;
  const pt = (p: P) => projection(p) ?? [0, 0];
  const showCountry = ctx.difficulty !== 'hard';
  const highlight = ctx.difficulty === 'easy' || !!guess;

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 270px' }}>
      <div>
        <div className="row" style={{ marginBottom: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <span className="muted">{t('cp.where')}</span>
          <h2 style={{ fontSize: 30, margin: 0 }}>{capitalName(city, lang)}</h2>
          {showCountry && <span className="muted">· {t('cp.capitalOf', { country: countryName(city.a2, lang) })}</span>}
        </div>
        <div className="board">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto', cursor: guess ? 'default' : 'crosshair' }} onClick={click}>
            <path d={path({ type: 'Sphere' }) ?? ''} fill="#0c1430" stroke="rgba(255,255,255,0.08)" />
            <path d={path(geoGraticule10()) ?? ''} fill="none" stroke="rgba(255,255,255,0.04)" />
            {base.map((c) => (
              <path key={c.a2} d={c.d} fill={highlight && c.a2 === city.a2 ? '#4b3f7a' : '#25335a'} stroke="rgba(7,11,20,0.6)" strokeWidth={0.5} />
            ))}
            <IslandMarks projection={projection} fill="#3a4c80" radius={1.2} labels={false} />
            {guess && (
              <g>
                <path d={path({ type: 'LineString', coordinates: [guess, at] }) ?? ''} stroke="#fff" strokeDasharray="4 4" fill="none" />
                <circle cx={pt(guess)[0]} cy={pt(guess)[1]} r={6} fill="#fff" />
                <g transform={`translate(${pt(at)[0]},${pt(at)[1]})`}>
                  <circle r={13} fill="none" stroke="#fbbf24" strokeWidth={2} />
                  <path d="M0 -7 L2 -2 L7 -2 L3 1.5 L4.5 7 L0 4 L-4.5 7 L-3 1.5 L-7 -2 L-2 -2 Z" fill="#fbbf24" />
                </g>
              </g>
            )}
          </svg>
        </div>
        <p className="small muted">{t('cp.tap')}</p>
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('cp.city')}</small><b>{round + 1} / {cities.length}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
        {guess && (
          <div className="card">
            <p style={{ margin: '0 0 6px' }}>
              <b className={km < FULL_KM / 3 ? 'pill-good' : 'pill-bad'}>{km < 100 ? t('cp.bullseye') : t('cp.off', { km: km.toLocaleString(lang) })}</b> · +{roundScore}
            </p>
            <p className="small muted" style={{ margin: '0 0 10px' }}>
              {capitalName(city, lang)}, {countryName(city.a2, lang)}
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={next}>{t('cp.next')} →</button>
          </div>
        )}
      </aside>
    </div>
  );
}

export function CapitalPinPage() {
  return (
    <GameShell slug="capital-pin" rules={['cp.rules.1', 'cp.rules.2', 'cp.rules.3']}>
      {(ctx) => <CapitalPin key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
