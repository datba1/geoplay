'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoCircle, geoDistance, geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, loadWorld, type World } from '@/lib/geo';
import { mulberry32, shuffle } from '@/lib/rng';
import { countryAt } from '@/components/InteractiveGlobe';
import { GameShell, type GameContext } from '@/components/GameShell';

addGameText({
  en: {
    'qh.quake': 'Quake', 'qh.stations': 'Stations', 'qh.add': '+ Add station (−25)', 'qh.guess': 'Tap the map where you think the epicentre is.',
    'qh.result': 'Off by {km} km', 'qh.near': 'Epicentre: near {place}', 'qh.sea': 'Epicentre: at sea',
    'qh.dist': '{name}: ~{km} km',
  },
  vi: {
    'qh.quake': 'Trận', 'qh.stations': 'Trạm đo', 'qh.add': '+ Thêm trạm (−25)', 'qh.guess': 'Chạm vào bản đồ nơi bạn nghĩ là tâm chấn.',
    'qh.result': 'Lệch {km} km', 'qh.near': 'Tâm chấn: gần {place}', 'qh.sea': 'Tâm chấn: ngoài biển',
    'qh.dist': '{name}: ~{km} km',
  },
});

const W = 960;
const H = 500;
const ROUNDS = 5;
const R_KM = 6371;
const ERROR = 0.08;
const MAX_STATIONS = 5;
type P = [number, number];

interface Station { a2: string; at: P; estKm: number }
interface Quake { epi: P; stations: Station[] }

/** Builds a quake with five candidate stations (shown one by one). */
function makeQuake(world: World, rand: () => number): Quake {
  const epi: P = [-180 + rand() * 360, -55 + rand() * 120];
  const pool = shuffle(world.countries.filter((c) => c.areaKm2 > 50_000), rand);
  // Stations between ~800 and ~9000 km away keep rings readable.
  const near = pool.filter((c) => {
    const d = geoDistance(epi, c.centroid) * R_KM;
    return d > 800 && d < 9000;
  });
  const stations = near.slice(0, MAX_STATIONS).map((c) => {
    const d = geoDistance(epi, c.centroid) * R_KM;
    return { a2: c.a2, at: c.centroid, estKm: d * (1 + (rand() * 2 - 1) * ERROR) };
  });
  return { epi, stations };
}

export function QuakeHunt({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const [world, setWorld] = useState<World | null>(null);
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState(2);
  const [guess, setGuess] = useState<P | null>(null);
  const [score, setScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [stamps, setStamps] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => { loadWorld().then(setWorld); }, []);
  const quakes = useMemo(() => {
    if (!world) return [];
    const rand = mulberry32(ctx.seed);
    return Array.from({ length: ROUNDS }, () => makeQuake(world, rand));
  }, [world, ctx.seed]);
  const quake = quakes[round];

  const projection = useMemo(() => geoEqualEarth().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' }), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const base = useMemo(() => (world ? world.countries.map((c) => ({ a2: c.a2, d: path(c.feature) ?? '' })) : []), [world, path]);

  const click = (e: React.MouseEvent) => {
    if (guess || !quake) return;
    const r = svgRef.current!.getBoundingClientRect();
    const p = projection.invert?.([((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]);
    if (!p || Number.isNaN(p[0])) return;
    setGuess(p as P);
    const errKm = geoDistance(p as P, quake.epi) * R_KM;
    const pts = Math.max(0, Math.round(200 * Math.max(0, 1 - errKm / 3000)) - (shown - 2) * 25);
    setRoundScore(pts);
    setScore((s) => s + pts);
    const place = countryAt(world!, quake.epi);
    if (place && errKm < 1000) setStamps((s) => [...s, place]);
  };

  const next = () => {
    if (round + 1 >= quakes.length) {
      ctx.finish({ points: score, stamps, meta: {} }, { score: String(score) });
      return;
    }
    setRound((r) => r + 1);
    setShown(2);
    setGuess(null);
  };

  if (!world || !quake) return <div className="card muted">{t('common.loading')}</div>;

  const stations = quake.stations.slice(0, shown);
  const errKm = guess ? Math.round(geoDistance(guess, quake.epi) * R_KM) : 0;
  const place = guess ? countryAt(world, quake.epi) : null;
  const pt = (p: P) => projection(p) ?? [0, 0];

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 270px' }}>
      <div>
        <div className="board">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto', cursor: guess ? 'default' : 'crosshair' }} onClick={click}>
            <path d={path({ type: 'Sphere' }) ?? ''} fill="#0c1430" stroke="rgba(255,255,255,0.08)" />
            <path d={path(geoGraticule10()) ?? ''} fill="none" stroke="rgba(255,255,255,0.04)" />
            {base.map((c) => <path key={c.a2} d={c.d} fill="#25335a" stroke="rgba(7,11,20,0.6)" strokeWidth={0.5} />)}
            {stations.map((s, i) => {
              const deg = (s.estKm / R_KM) * (180 / Math.PI);
              // Draw rings as lines, not polygons, so circles over a pole don't get a closing edge.
              const ring = (k: number) =>
                path({ type: 'LineString', coordinates: geoCircle().center(s.at).radius(deg * k).precision(2)().coordinates[0] }) ?? '';
              const hue = [0, 30, 200, 280, 140][i];
              return (
                <g key={s.a2}>
                  <path d={ring(1 + ERROR)} fill="none" stroke={`hsla(${hue},85%,65%,0.25)`} strokeWidth={1} strokeDasharray="3 4" />
                  <path d={ring(1)} fill="none" stroke={`hsla(${hue},85%,65%,0.95)`} strokeWidth={2} />
                  <path d={ring(1 - ERROR)} fill="none" stroke={`hsla(${hue},85%,65%,0.25)`} strokeWidth={1} strokeDasharray="3 4" />
                  <g transform={`translate(${pt(s.at)[0]},${pt(s.at)[1]})`}>
                    <path d="M0-9 L7 5 L-7 5Z" fill={`hsl(${hue},85%,65%)`} stroke="#111" />
                  </g>
                </g>
              );
            })}
            {guess && (
              <g>
                <path d={path({ type: 'LineString', coordinates: [guess, quake.epi] }) ?? ''} stroke="#fff" strokeDasharray="4 4" fill="none" />
                <circle cx={pt(guess)[0]} cy={pt(guess)[1]} r={6} fill="#fff" />
                <g transform={`translate(${pt(quake.epi)[0]},${pt(quake.epi)[1]})`}>
                  <circle r={14} fill="none" stroke="#f87171" strokeWidth={2} />
                  <circle r={5} fill="#f87171" />
                </g>
              </g>
            )}
          </svg>
        </div>
        <p className="small muted">{t('qh.guess')}</p>
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('qh.quake')}</small><b>{round + 1} / {quakes.length}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
        <div className="card">
          <span className="eyebrow">{t('qh.stations')}</span>
          <ul style={{ paddingLeft: 18, margin: '8px 0' }} className="small">
            {stations.map((s) => <li key={s.a2}>{t('qh.dist', { name: countryName(s.a2, lang), km: Math.round(s.estKm / 10) * 10 })}</li>)}
          </ul>
          <button className="btn btn-sm" disabled={!!guess || shown >= quake.stations.length} onClick={() => setShown((n) => n + 1)}>{t('qh.add')}</button>
          {guess && (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: '4px 0' }}><b className={errKm < 800 ? 'pill-good' : 'pill-bad'}>{t('qh.result', { km: errKm.toLocaleString(lang) })}</b> · +{roundScore}</p>
              <p className="small muted" style={{ margin: '4px 0 10px' }}>{place ? t('qh.near', { place: countryName(place, lang) }) : t('qh.sea')}</p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={next}>{t('common.next')} →</button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export function QuakeHuntPage() {
  return (
    <GameShell slug="quake-hunt" rules={['qh.rules.1', 'qh.rules.2', 'qh.rules.3']}>
      {(ctx) => <QuakeHunt key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
