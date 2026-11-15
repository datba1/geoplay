'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import { DIFF_XP, DIFFICULTIES, useProgress, type Difficulty, type FinishInput, type FinishResult } from '@/lib/progress';
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
  difficulty: Difficulty;
  /** Pick a value by difficulty: pick(easy, normal, hard). */
  pick: <T>(easy: T, normal: T, hard: T) => T;
  /** Report one answer; builds the combo and speed bonus. */
  hit: (correct: boolean) => void;
}

interface RunBonus { combo: number; best: number; fast: number }
const FAST_MS: Record<Difficulty, number> = { easy: 12_000, normal: 8_000, hard: 6_000 };
const comboXp = (b: RunBonus) => (b.best >= 3 ? b.best * 2 : 0) + b.fast * 2;

interface Props {
  slug: string;
  rules: string[];
  stats?: ReactNode;
  /** Take over the whole window (site header/footer hidden). */
  immersive?: boolean;
  children: (ctx: GameContext) => ReactNode;
}

const DAILY_GAME_COUNT = 3;

export function GameShell({ slug, rules, stats, immersive, children }: Props) {
  const { t, lang } = useI18n();
  const { finishGame } = useProgress();
  const params = useSearchParams();
  const dailyDate = params.get('daily');
  const seedParam = params.get('seed');
  const [runId, setRunId] = useState(0);
  const [seed, setSeed] = useState<number>(() => (seedParam ? Number(seedParam) : 0));
  const [showRules, setShowRules] = useState(false);
  const [result, setResult] = useState<{ res: FinishResult; score: string; subtitle?: string; bonus: RunBonus } | null>(null);
  const [chosen, setChosen] = useState<Difficulty>('normal');
  const [bonus, setBonus] = useState<RunBonus>({ combo: 0, best: 0, fast: 0 });
  const bonusRef = useRef(bonus);
  const lastHit = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`geoplay.diff.${slug}`) as Difficulty | null;
      if (saved && DIFFICULTIES.includes(saved)) setChosen(saved);
    } catch {}
  }, [slug]);

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
  // The daily set is the same for everyone, so it is always played on Normal.
  const difficulty: Difficulty = isDaily ? 'normal' : chosen;

  useEffect(() => {
    const fresh = { combo: 0, best: 0, fast: 0 };
    bonusRef.current = fresh;
    setBonus(fresh);
    lastHit.current = Date.now();
  }, [runId, seed]);

  const hit = useCallback(
    (correct: boolean) => {
      const now = Date.now();
      const b = bonusRef.current;
      const quick = correct && now - lastHit.current < FAST_MS[difficulty];
      lastHit.current = now;
      const combo = correct ? b.combo + 1 : 0;
      const next = { combo, best: Math.max(b.best, combo), fast: b.fast + (quick ? 1 : 0) };
      bonusRef.current = next;
      setBonus(next);
    },
    [difficulty],
  );

  const finish = useCallback<GameContext['finish']>(
    async (input, display) => {
      const b = bonusRef.current;
      const res = await finishGame({
        ...input,
        slug,
        difficulty,
        bonusXp: comboXp(b),
        flags: { ...input.flags, ...(b.best >= 8 ? { 'combo-8': true } : {}) },
        daily: isDaily && dailyDate ? { date: dailyDate, total: DAILY_GAME_COUNT } : null,
      });
      setResult({ res, ...display, bonus: b });
    },
    [finishGame, slug, isDaily, dailyDate, difficulty],
  );

  const restart = () => {
    setResult(null);
    setSeed(randomSeed());
    setRunId((r) => r + 1);
  };

  const changeDifficulty = (d: Difficulty) => {
    if (d === chosen) return;
    setChosen(d);
    try {
      localStorage.setItem(`geoplay.diff.${slug}`, d);
    } catch {}
    restart();
  };

  const ctx = useMemo<GameContext>(
    () => ({
      seed, isDaily, finish, runId, difficulty, hit,
      pick: <T,>(easy: T, normal: T, hard: T) => (difficulty === 'easy' ? easy : difficulty === 'hard' ? hard : normal),
    }),
    [seed, isDaily, finish, runId, difficulty, hit],
  );

  return (
    <div className={immersive ? 'game-immersive' : 'container'}>
      {immersive && <ImmersiveLock />}
      <div className="game-top">
        <Link href="/games" className="btn btn-sm btn-ghost">{t('common.back')}</Link>
        <h1>{t(gameName(slug))}</h1>
        {isDaily && <span className="chip">📅 {t('common.daily')}</span>}
        <span className="spacer" />
        {bonus.combo >= 2 && (
          <span key={bonus.combo} className="combo-chip" title={t('depth.combo')}>⚡ ×{bonus.combo}</span>
        )}
        {immersive && <FullscreenButton />}
        <div className="segmented diff-picker" role="radiogroup" aria-label={t('depth.difficulty')} title={isDaily ? t('depth.dailyNormal') : undefined}>
          {DIFFICULTIES.map((d) => (
            <button key={d} role="radio" aria-checked={difficulty === d} className={difficulty === d ? 'on' : ''} disabled={isDaily} onClick={() => changeDifficulty(d)}>
              {t(`depth.${d}`)}
            </button>
          ))}
        </div>
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
            <div className="stars-row" aria-label={t('depth.starsLabel', { n: result.res.stars })}>
              {[1, 2, 3].map((i) => <span key={i} className={i <= result.res.stars ? 'on' : ''}>★</span>)}
            </div>
            <div className="score">{result.score}</div>
            {result.subtitle && <div className="muted">{result.subtitle}</div>}
            <div className="toast-list">
              <span className="chip">✨ {t('result.xp', { n: result.res.xpGained })}</span>
              {result.res.newBest && <span className="chip chip-on">🏅 {t('depth.newBest')}</span>}
              {difficulty !== 'normal' && <span className="chip">{t(`depth.${difficulty}`)} ×{DIFF_XP[difficulty]} XP</span>}
              {result.bonus.best >= 3 && <span className="chip">⚡ {t('depth.bestCombo', { n: result.bonus.best })}</span>}
              {result.bonus.fast > 0 && <span className="chip">⏱ {t('depth.fast', { n: result.bonus.fast })}</span>}
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

/** Stops the page behind an immersive game from scrolling. */
function ImmersiveLock() {
  useEffect(() => {
    document.documentElement.classList.add('immersive-lock');
    return () => document.documentElement.classList.remove('immersive-lock');
  }, []);
  return null;
}

/** Toggles real browser fullscreen. */
function FullscreenButton() {
  const { t } = useI18n();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  if (typeof document !== 'undefined' && !document.fullscreenEnabled) return null;
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };
  return (
    <button className="btn btn-sm btn-ghost" onClick={toggle} title={on ? t('common.exitFullscreen') : t('common.fullscreen')}>
      {on ? '⤡' : '⤢'} <span className="hide-sm">{on ? t('common.exitFullscreen') : t('common.fullscreen')}</span>
    </button>
  );
}
