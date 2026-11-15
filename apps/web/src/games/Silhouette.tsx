'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoAzimuthalEqualArea, geoPath } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, flagUrl, loadWorld, type World } from '@/lib/geo';
import { PASSPORT_COUNTRIES } from '@/lib/continents';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';

addGameText({
  en: { 'si.which': 'Which country is this?', 'si.right': 'Yes, {name}!', 'si.wrong': 'No, it was {name}.', 'si.timeout': 'Time! It was {name}.', 'si.shape': 'Shape', 'si.rotated': 'Rotated' },
  vi: { 'si.which': 'Đây là nước nào?', 'si.right': 'Đúng, {name}!', 'si.wrong': 'Sai, đó là {name}.', 'si.timeout': 'Hết giờ! Đó là {name}.', 'si.shape': 'Hình', 'si.rotated': 'Đã xoay' },
});

const ROUNDS = 10;

interface Round { answer: string; options: string[]; turn: number }

export function Silhouette({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  // Easy: big countries, 3 options, upright. Hard: small countries too, 6 options, turned at a random angle.
  const MIN_AREA = ctx.pick(500_000, 90_000, 8_000);
  const OPTIONS = ctx.pick(3, 4, 6);
  const ROTATE = ctx.difficulty === 'hard';
  const SECONDS = ctx.pick(20, 12, 8);
  const [world, setWorld] = useState<World | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [stamps, setStamps] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const deadline = useRef(0);

  useEffect(() => { loadWorld().then(setWorld); }, []);

  const rounds = useMemo<Round[]>(() => {
    if (!world) return [];
    const rand = mulberry32(ctx.seed);
    const pool = world.countries.filter((c) => c.areaKm2 > MIN_AREA && PASSPORT_COUNTRIES.has(c.a2)).map((c) => c.a2);
    const answers = shuffle(pool, rand).slice(0, ROUNDS);
    return answers.map((answer) => {
      // Distractors of a similar size are harder to tell apart.
      const size = world.byA2.get(answer)!.areaKm2;
      const near = shuffle(pool.filter((c) => c !== answer), rand)
        .sort((a, b) => Math.abs(Math.log(world.byA2.get(a)!.areaKm2 / size)) - Math.abs(Math.log(world.byA2.get(b)!.areaKm2 / size)))
        .slice(0, OPTIONS * 2);
      const options = shuffle([answer, ...shuffle(near, rand).slice(0, OPTIONS - 1)], rand);
      return { answer, options, turn: ROTATE ? Math.round(rand() * 300 + 30) : 0 };
    });
  }, [world, ctx.seed, MIN_AREA, OPTIONS, ROTATE]);

  const r = rounds[idx];

  const shape = useMemo(() => {
    if (!world || !r) return '';
    const c = world.byA2.get(r.answer)!;
    const proj = geoAzimuthalEqualArea().rotate([-c.centroid[0], -c.centroid[1]]).fitExtent([[20, 20], [280, 280]], c.feature);
    return geoPath(proj)(c.feature) ?? '';
  }, [world, r]);

  useEffect(() => {
    if (!r) return;
    setPicked(null);
    deadline.current = performance.now() + SECONDS * 1000;
    setTimeLeft(SECONDS);
  }, [r, SECONDS]);

  useEffect(() => {
    if (!r || picked) return;
    const id = setInterval(() => {
      const left = Math.max(0, (deadline.current - performance.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        setPicked('__timeout');
        ctx.hit(false);
      }
    }, 100);
    return () => clearInterval(id);
  }, [r, picked, ctx]);

  const choose = (a2: string) => {
    if (picked || !r) return;
    setPicked(a2);
    const ok = a2 === r.answer;
    ctx.hit(ok);
    if (ok) {
      const left = Math.max(0, (deadline.current - performance.now()) / 1000);
      setScore((s) => s + 60 + Math.round((left / SECONDS) * 40));
      setStamps((s) => [...s, a2]);
    }
  };

  const next = () => {
    if (idx + 1 >= rounds.length) {
      ctx.finish({ points: score, stamps, meta: { right: stamps.length } }, { score: String(score), subtitle: `${stamps.length} / ${rounds.length}` });
      return;
    }
    setIdx((i) => i + 1);
  };

  if (!world || !r) return <div className="card muted">{t('common.loading')}</div>;
  const name = countryName(r.answer, lang);

  return (
    <div className="game-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 270px' }}>
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 26, margin: 0 }}>{t('si.which')}</h2>
          <span className="spacer" />
          {ROTATE && <span className="chip">↻ {t('si.rotated')}</span>}
        </div>
        <div className="timer-bar" style={{ marginBottom: 14 }}>
          <div style={{ width: `${(timeLeft / SECONDS) * 100}%`, background: timeLeft < 3 ? 'var(--red)' : undefined }} />
        </div>
        <div className="silhouette-stage">
          <svg viewBox="0 0 300 300" aria-label={t('si.which')}>
            <g transform={`rotate(${picked ? 0 : r.turn} 150 150)`} style={{ transition: 'transform 0.6s ease' }}>
              <path d={shape} fill={picked ? (picked === r.answer ? '#4fd1a1' : '#ff7a8a') : '#e9e2cf'} stroke="#0b1020" strokeWidth={1} />
            </g>
          </svg>
        </div>
        <div className="option-grid" style={{ gridTemplateColumns: `repeat(${OPTIONS > 4 ? 3 : 2}, 1fr)` }}>
          {r.options.map((o) => (
            <button
              key={o}
              className={`option ${picked ? (o === r.answer ? 'right' : o === picked ? 'wrong' : '') : ''}`}
              disabled={!!picked}
              onClick={() => choose(o)}
            >
              {picked && <img src={flagUrl(o)} alt="" width={22} />}
              {countryName(o, lang)}
            </button>
          ))}
        </div>
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('si.shape')}</small><b>{idx + 1} / {rounds.length}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
        {picked && (
          <div className="card">
            <p style={{ margin: '0 0 10px' }}>
              <b className={picked === r.answer ? 'pill-good' : 'pill-bad'}>
                {picked === r.answer ? t('si.right', { name }) : picked === '__timeout' ? t('si.timeout', { name }) : t('si.wrong', { name })}
              </b>
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={next}>{t('common.next')} →</button>
          </div>
        )}
      </aside>
    </div>
  );
}

export function SilhouettePage() {
  return (
    <GameShell slug="silhouette" rules={['si.rules.1', 'si.rules.2', 'si.rules.3']}>
      {(ctx) => <Silhouette key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
