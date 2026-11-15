'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import { useProgress, type FinishInput, type FinishResult } from '@/lib/progress';
import { gameName } from '@/lib/games';
import { randomSeed } from '@/lib/rng';
import { openNicknameModal } from './NicknameModal';

export interface GameContext {
  seed: number;
  isDaily: boolean;
  /** Call once when a run ends. */
  finish: (input: Omit<FinishInput, 'slug' | 'daily'>, display: { score: string; subtitle?: string }) => void;
  /** Increments every time the player restarts, use as a React key. */
  runId: number;
}

interface Props {
  slug: string;
  rules: string[];
  stats?: ReactNode;
  children: (ctx: GameContext) => ReactNode;
}

const DAILY_GAME_COUNT = 3;

export function GameShell({ slug, rules, stats, children }: Props) {
  const { t, lang } = useI18n();
  const { finishGame } = useProgress();
  const params = useSearchParams();
  const dailyDate = params.get('daily');
  const seedParam = params.get('seed');
  const [runId, setRunId] = useState(0);
  const [seed, setSeed] = useState<number>(() => (seedParam ? Number(seedParam) : 0));
  const [showRules, setShowRules] = useState(false);
  const [result, setResult] = useState<{ res: FinishResult; score: string; subtitle?: string } | null>(null);

  useEffect(() => {
    if (!seedParam) setSeed(randomSeed());
  }, [seedParam]);

  useEffect(() => {
    try {
      const key = `geoplay.rules.${slug}`;
      if (!localStorage.getItem(key)) {
        setShowRules(true);
        localStorage.setItem(key, '1');
      }
    } catch {}
  }, [slug]);

  // Only the first run with the daily seed counts for the daily challenge.
  const isDaily = !!dailyDate && runId === 0;

  const finish = useCallback<GameContext['finish']>(
    async (input, display) => {
      const res = await finishGame({
        ...input,
        slug,
        daily: isDaily && dailyDate ? { date: dailyDate, total: DAILY_GAME_COUNT } : null,
      });
      setResult({ res, ...display });
    },
    [finishGame, slug, isDaily, dailyDate],
  );

  const restart = () => {
    setResult(null);
    setSeed(randomSeed());
    setRunId((r) => r + 1);
  };

  const ctx = useMemo(() => ({ seed, isDaily, finish, runId }), [seed, isDaily, finish, runId]);

  return (
    <div className="container">
      <div className="game-top">
        <Link href="/#games" className="btn btn-sm btn-ghost">{t('common.back')}</Link>
        <h1>{t(gameName(slug))}</h1>
        {isDaily && <span className="chip">📅 {t('common.daily')}</span>}
        <span className="spacer" />
        {stats}
        <button className="btn btn-sm" onClick={() => setShowRules(true)}>? {t('common.howTo')}</button>
      </div>

      {seed !== 0 && children(ctx)}

      {showRules && (
        <div className="modal-backdrop" onClick={() => setShowRules(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <span className="eyebrow">{t('common.howTo')}</span>
            <h2>{t(gameName(slug))}</h2>
            <ol className="muted" style={{ paddingLeft: 18 }}>
              {rules.map((r) => <li key={r} style={{ marginBottom: 6 }}>{t(r)}</li>)}
            </ol>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowRules(false)}>{t('common.gotIt')}</button>
          </div>
        </div>
      )}

      {result && (
        <div className="modal-backdrop">
          <div className="modal result">
            <span className="eyebrow">{t(gameName(slug))}</span>
            <h2>{t('result.title')}</h2>
            <div className="score">{result.score}</div>
            {result.subtitle && <div className="muted">{result.subtitle}</div>}
            <div className="toast-list">
              <span className="chip">✨ {t('result.xp', { n: result.res.xpGained })}</span>
              {result.res.levelAfter > result.res.levelBefore && <span className="chip">⬆️ {t('result.levelUp', { n: result.res.levelAfter })}</span>}
              {result.res.newStamps.length > 0 && <span className="chip">🛂 {t('result.stamps', { n: result.res.newStamps.length })}</span>}
              {result.res.dailyCompleted && <span className="chip">🔥 {t('result.dailyDone', { n: result.res.streak })}</span>}
              {result.res.newBadges.map((b) => (
                <span key={b.id} className="chip">{b.icon} {t('result.badge', { name: b.name[lang] })}</span>
              ))}
            </div>
            <p className="small muted">
              {result.res.submitted === 'ok' && `✓ ${t('result.submitted')}`}
              {result.res.submitted === 'offline' && t('result.offline')}
              {result.res.submitted === 'rejected' && (
                <button className="btn btn-sm btn-ghost" onClick={openNicknameModal}>{t('result.rejected')}</button>
              )}
              {result.res.submitted === 'no-nickname' && (
                <button className="btn btn-sm btn-ghost" onClick={openNicknameModal}>{t('result.noNick')}</button>
              )}
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <Link href="/" className="btn" style={{ flex: 1 }}>{t('common.home')}</Link>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={restart}>{t('common.playAgain')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
