'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoAzimuthalEqualArea, geoPath } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { addGameText } from '@/lib/gameText';
import { countryName, loadWorld, type World } from '@/lib/geo';
import { mulberry32, shuffle } from '@/lib/rng';
import { GameShell, type GameContext } from '@/components/GameShell';
import { InteractiveGlobe } from '@/components/InteractiveGlobe';

addGameText({
  en: { 'sh.find': 'Whose shadow is this?', 'sh.right': 'Found: {name}', 'sh.wrong': 'Not {name} (−3s)', 'sh.timeout': 'It was {name}', 'sh.hint': 'Drag to spin the globe, tap a country to answer.' },
  vi: { 'sh.find': 'Đây là bóng của nước nào?', 'sh.right': 'Đúng: {name}', 'sh.wrong': 'Không phải {name} (−3s)', 'sh.timeout': 'Đó là {name}', 'sh.hint': 'Kéo để xoay quả cầu, chạm vào một nước để trả lời.' },
});

const ROUNDS = 6;

export function ShadowHunt({ ctx }: { ctx: GameContext }) {
  const { t, lang } = useI18n();
  const SECONDS = ctx.pick(35, 25, 15);
  const PENALTY = ctx.pick(2, 3, 5);
  // Easy: big, well-known countries. Hard: almost everything, including small states.
  const MIN_AREA = ctx.pick(450_000, 120_000, 20_000);
  const [world, setWorld] = useState<World | null>(null);
  const [round, setRound] = useState(0);
  const [rotation, setRotation] = useState<[number, number]>([-100, -15]);
  const [status, setStatus] = useState<'play' | 'found' | 'timeout'>('play');
  const [message, setMessage] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const deadline = useRef(0);

  useEffect(() => { loadWorld().then(setWorld); }, []);
  const targets = useMemo(() => {
    if (!world) return [];
    const pool = world.countries.filter((c) => c.areaKm2 > MIN_AREA && c.a2 !== 'AQ');
    return shuffle(pool, mulberry32(ctx.seed)).slice(0, ROUNDS).map((c) => c.a2);
  }, [world, ctx.seed, MIN_AREA]);
  const target = targets[round];

  const silhouette = useMemo(() => {
    if (!world || !target) return '';
    const c = world.byA2.get(target)!;
    const proj = geoAzimuthalEqualArea().rotate([-c.centroid[0], -c.centroid[1]]).fitExtent([[16, 16], [224, 224]], c.feature);
    return geoPath(proj)(c.feature) ?? '';
  }, [world, target]);

  useEffect(() => {
    if (!target) return;
    setStatus('play');
    setMessage(null);
    setWrong(null);
    deadline.current = performance.now() + SECONDS * 1000;
    setTimeLeft(SECONDS);
  }, [target]);

  useEffect(() => {
    if (status !== 'play') return;
    const id = setInterval(() => {
      const left = Math.max(0, (deadline.current - performance.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        ctx.hit(false);
        reveal('timeout');
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, target]);

  const reveal = (kind: 'found' | 'timeout') => {
    const c = world!.byA2.get(target)!;
    setRotation([-c.centroid[0], -c.centroid[1]]);
    setStatus(kind);
    setMessage(t(kind === 'found' ? 'sh.right' : 'sh.timeout', { name: countryName(target, lang) }));
  };

  const pick = (_p: [number, number], a2: string | null) => {
    if (status !== 'play' || !a2) return;
    if (a2 === target) {
      const left = Math.max(0, (deadline.current - performance.now()) / 1000);
      setScore((s) => s + 100 + Math.round((left / SECONDS) * 100));
      setFound((f) => [...f, a2]);
      ctx.hit(true);
      reveal('found');
    } else {
      deadline.current -= PENALTY * 1000;
      setWrong(a2);
      setMessage(t('sh.wrong', { name: countryName(a2, lang) }));
    }
  };

  const next = () => {
    if (round + 1 >= targets.length) {
      ctx.finish({ points: score, stamps: found, meta: { found: found.length } }, { score: String(score), subtitle: `${found.length} / ${targets.length}` });
      return;
    }
    setRound((r) => r + 1);
  };

  if (!world || !target) return <div className="card muted">{t('common.loading')}</div>;

  return (
    <div className="game-layout">
      <div className="board" style={{ padding: 12 }}>
        <InteractiveGlobe
          world={world}
          rotation={rotation}
          onRotate={setRotation}
          onPick={pick}
          fill={(a2) =>
            status !== 'play' && a2 === target ? 'rgba(79,209,161,0.9)' : a2 === wrong ? 'rgba(255,93,108,0.7)' : 'rgba(165,180,252,0.28)'
          }
        />
        <p className="small muted" style={{ textAlign: 'center' }}>{t('sh.hint')}</p>
      </div>
      <aside className="side">
        <div className="row">
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.round')}</small><b>{round + 1} / {targets.length}</b></div>
          <div className="stat-box" style={{ flex: 1 }}><small>{t('common.score')}</small><b>{score}</b></div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <span className="eyebrow">{t('sh.find')}</span>
          <svg viewBox="0 0 240 240" style={{ width: '100%', maxWidth: 240, display: 'block', margin: '8px auto' }}>
            <rect width="240" height="240" rx="16" fill="rgba(255,255,255,0.04)" />
            <path d={silhouette} fill="#0b0e18" stroke="rgba(165,180,252,0.5)" strokeWidth={1} transform="translate(4,6)" opacity={0.5} />
            <path d={silhouette} fill="#141a33" stroke="#a5b4fc" strokeWidth={1.2} />
            <text x="220" y="24" textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.4)">N↑</text>
          </svg>
          <div className="timer-bar"><div style={{ width: `${(timeLeft / SECONDS) * 100}%`, background: timeLeft < 6 ? 'var(--red)' : undefined }} /></div>
          {message && <p className={status === 'found' ? 'pill-good' : 'pill-bad'} style={{ fontWeight: 600 }}>{message}</p>}
          {status !== 'play' && <button className="btn btn-primary" style={{ width: '100%' }} onClick={next}>{t('common.next')} →</button>}
        </div>
      </aside>
    </div>
  );
}

export function ShadowHuntPage() {
  return (
    <GameShell slug="shadow-hunt" rules={['sh.rules.1', 'sh.rules.2', 'sh.rules.3']}>
      {(ctx) => <ShadowHunt key={ctx.runId} ctx={ctx} />}
    </GameShell>
  );
}
