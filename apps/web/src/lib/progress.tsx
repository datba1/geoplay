'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from './api';
import { gameMeta } from './games';

/* ---------------- levels ---------------- */

/** Total XP needed to *reach* a level. Level 2 = 60, 3 = 180, 4 = 360 … */
export const xpToReach = (level: number) => 30 * level * (level - 1);

export function levelInfo(xp: number) {
  let level = 1;
  while (xp >= xpToReach(level + 1)) level++;
  const base = xpToReach(level);
  const need = xpToReach(level + 1) - base;
  const tier = level >= 20 ? 'platinum' : level >= 10 ? 'gold' : level >= 5 ? 'silver' : 'bronze';
  return { level, into: xp - base, need, tier: tier as 'bronze' | 'silver' | 'gold' | 'platinum' };
}

/* ---------------- state ---------------- */

export interface GameStats { plays: number; best: number }

export interface Progress {
  version: 1;
  playerId: string;
  nickname: string | null;
  nicknameAsked: boolean;
  xp: number;
  stamps: string[];
  badges: string[];
  games: Record<string, GameStats>;
  daily: { date: string | null; done: string[] };
  streak: { count: number; last: string | null };
  flags: Record<string, boolean>;
}

const STORAGE_KEY = 'geoplay.progress.v1';

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

const fresh = (): Progress => ({
  version: 1,
  playerId: uuid(),
  nickname: null,
  nicknameAsked: false,
  xp: 0,
  stamps: [],
  badges: [],
  games: {},
  daily: { date: null, done: [] },
  streak: { count: 0, last: null },
  flags: {},
});

/* ---------------- badges ---------------- */

export interface BadgeDef {
  id: string;
  icon: string;
  name: { en: string; vi: string };
  desc: { en: string; vi: string };
  test: (p: Progress) => boolean;
}

const totalPlays = (p: Progress) => Object.values(p.games).reduce((s, g) => s + g.plays, 0);

export const BADGES: BadgeDef[] = [
  { id: 'departure', icon: '🛫', name: { en: 'Departure', vi: 'Khởi hành' }, desc: { en: 'Finish your first game', vi: 'Hoàn thành trò chơi đầu tiên' }, test: (p) => totalPlays(p) >= 1 },
  { id: 'explorer', icon: '🧭', name: { en: 'Explorer', vi: 'Nhà thám hiểm' }, desc: { en: 'Play all three games', vi: 'Chơi cả ba trò chơi' }, test: (p) => ['true-size', 'flag-fault', 'border-sketch'].every((s) => (p.games[s]?.plays ?? 0) > 0) },
  { id: 'stamps-10', icon: '📮', name: { en: 'Postcard', vi: 'Bưu thiếp' }, desc: { en: 'Collect 10 stamps', vi: 'Sưu tầm 10 con dấu' }, test: (p) => p.stamps.length >= 10 },
  { id: 'stamps-30', icon: '🗺️', name: { en: 'Globetrotter', vi: 'Du mục' }, desc: { en: 'Collect 30 stamps', vi: 'Sưu tầm 30 con dấu' }, test: (p) => p.stamps.length >= 30 },
  { id: 'stamps-75', icon: '🌏', name: { en: 'Cartographer', vi: 'Người vẽ bản đồ' }, desc: { en: 'Collect 75 stamps', vi: 'Sưu tầm 75 con dấu' }, test: (p) => p.stamps.length >= 75 },
  { id: 'level-5', icon: '🥈', name: { en: 'Silver wings', vi: 'Cánh bạc' }, desc: { en: 'Reach level 5', vi: 'Đạt cấp 5' }, test: (p) => levelInfo(p.xp).level >= 5 },
  { id: 'level-10', icon: '🥇', name: { en: 'Golden compass', vi: 'La bàn vàng' }, desc: { en: 'Reach level 10', vi: 'Đạt cấp 10' }, test: (p) => levelInfo(p.xp).level >= 10 },
  { id: 'daily-1', icon: '📅', name: { en: 'Daily habit', vi: 'Thói quen' }, desc: { en: 'Complete a daily set', vi: 'Hoàn thành một bộ thử thách ngày' }, test: (p) => p.streak.count >= 1 },
  { id: 'streak-3', icon: '🔥', name: { en: 'On fire', vi: 'Bùng cháy' }, desc: { en: '3-day streak', vi: 'Chuỗi 3 ngày' }, test: (p) => p.streak.count >= 3 },
  { id: 'streak-7', icon: '☄️', name: { en: 'Unstoppable', vi: 'Không thể cản' }, desc: { en: '7-day streak', vi: 'Chuỗi 7 ngày' }, test: (p) => p.streak.count >= 7 },
  { id: 'ts-3star', icon: '⭐', name: { en: 'Tetris master', vi: 'Bậc thầy xếp hình' }, desc: { en: 'Get 3 stars in True Size', vi: 'Đạt 3 sao trong Kích Thước Thật' }, test: (p) => !!p.flags['ts-3star'] },
  { id: 'ff-perfect', icon: '🦅', name: { en: 'Eagle eye', vi: 'Mắt đại bàng' }, desc: { en: 'Find all 8 faults in a Flag Fault run', vi: 'Tìm đủ 8 lỗi trong một lượt Cờ Sai' }, test: (p) => !!p.flags['ff-perfect'] },
  { id: 'bs-80', icon: '✍️', name: { en: 'Steady hand', vi: 'Tay vững' }, desc: { en: 'Draw a country with 80% match', vi: 'Vẽ một nước giống 80%' }, test: (p) => !!p.flags['bs-80'] },
];

/* ---------------- items ---------------- */

/** Cosmetic collectibles, unlocked by reaching a level. */
export interface ItemDef {
  id: string;
  icon: string;
  level: number;
  name: { en: string; vi: string };
}

export const ITEMS: ItemDef[] = [
  { id: 'coral', icon: '🪸', level: 1, name: { en: 'Coral globe', vi: 'Địa cầu san hô' } },
  { id: 'plane', icon: '✈️', level: 1, name: { en: 'Paper plane', vi: 'Máy bay giấy' } },
  { id: 'compass', icon: '🧭', level: 1, name: { en: 'Brass compass', vi: 'La bàn đồng' } },
  { id: 'lotus', icon: '🪷', level: 2, name: { en: 'Lotus stamp', vi: 'Con dấu sen' } },
  { id: 'lantern', icon: '🏮', level: 3, name: { en: 'Hội An lantern', vi: 'Đèn lồng Hội An' } },
  { id: 'kite', icon: '🪁', level: 4, name: { en: 'Kite', vi: 'Cánh diều' } },
  { id: 'balloon', icon: '🎈', level: 5, name: { en: 'Weather balloon', vi: 'Bóng thám không' } },
  { id: 'telescope', icon: '🔭', level: 6, name: { en: 'Telescope', vi: 'Kính viễn vọng' } },
  { id: 'ship', icon: '⛵', level: 8, name: { en: 'Sailing ship', vi: 'Thuyền buồm' } },
  { id: 'volcano', icon: '🌋', level: 10, name: { en: 'Volcano', vi: 'Núi lửa' } },
  { id: 'aurora', icon: '🌌', level: 12, name: { en: 'Aurora', vi: 'Cực quang' } },
  { id: 'satellite', icon: '🛰️', level: 15, name: { en: 'Satellite', vi: 'Vệ tinh' } },
];

export const unlockedItems = (xp: number) => ITEMS.filter((i) => i.level <= levelInfo(xp).level);

/* ---------------- context ---------------- */

export interface FinishInput {
  slug: string;
  points: number;
  stamps: string[];
  /** extra achievement flags, e.g. { 'ts-3star': true } */
  flags?: Record<string, boolean>;
  /** set when the run belongs to today's daily challenge */
  daily?: { date: string; total: number } | null;
  meta?: Record<string, unknown>;
}

export interface FinishResult {
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  newBadges: BadgeDef[];
  newStamps: string[];
  dailyCompleted: boolean;
  streak: number;
  submitted: 'ok' | 'offline' | 'no-nickname';
}

interface ProgressCtx {
  progress: Progress;
  ready: boolean;
  setNickname: (name: string) => Promise<boolean>;
  dismissNickname: () => void;
  finishGame: (input: FinishInput) => Promise<FinishResult>;
  reset: () => void;
}

const Ctx = createContext<ProgressCtx | null>(null);

function previousDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(fresh);
  const [ready, setReady] = useState(false);
  const ref = useRef(progress);
  ref.current = progress;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProgress({ ...fresh(), ...JSON.parse(raw) });
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(ref.current));
    } catch {}
    setReady(true);
  }, []);

  const save = useCallback((p: Progress) => {
    ref.current = p;
    setProgress(p);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
  }, []);

  const setNickname = useCallback(async (name: string) => {
    const nickname = name.trim().slice(0, 24);
    save({ ...ref.current, nickname, nicknameAsked: true });
    try {
      await api.setNickname(ref.current.playerId, nickname);
      return true;
    } catch {
      return false;
    }
  }, [save]);

  const dismissNickname = useCallback(() => save({ ...ref.current, nicknameAsked: true }), [save]);

  const finishGame = useCallback(async (input: FinishInput): Promise<FinishResult> => {
    const before = ref.current;
    const meta = gameMeta(input.slug);
    const ratio = meta ? Math.min(1, input.points / meta.maxPoints) : 0;
    let xpGained = 10 + Math.round(ratio * 40);

    const prevGame = before.games[input.slug] ?? { plays: 0, best: 0 };
    const newStamps = [...new Set(input.stamps.map((s) => s.toUpperCase()))].filter((s) => !before.stamps.includes(s));

    let daily = before.daily;
    let streak = before.streak;
    let dailyCompleted = false;
    if (input.daily) {
      const done = daily.date === input.daily.date ? daily.done : [];
      const wasComplete = done.length >= input.daily.total;
      const nextDone = done.includes(input.slug) ? done : [...done, input.slug];
      daily = { date: input.daily.date, done: nextDone };
      if (!wasComplete && nextDone.length >= input.daily.total) {
        dailyCompleted = true;
        xpGained += 50;
        streak = {
          count: streak.last === previousDay(input.daily.date) ? streak.count + 1 : streak.last === input.daily.date ? streak.count : 1,
          last: input.daily.date,
        };
      }
    }

    const next: Progress = {
      ...before,
      xp: before.xp + xpGained,
      stamps: [...before.stamps, ...newStamps],
      games: { ...before.games, [input.slug]: { plays: prevGame.plays + 1, best: Math.max(prevGame.best, input.points) } },
      daily,
      streak,
      flags: { ...before.flags, ...(input.flags ?? {}) },
    };
    const newBadges = BADGES.filter((b) => !next.badges.includes(b.id) && b.test(next));
    next.badges = [...next.badges, ...newBadges.map((b) => b.id)];
    save(next);

    let submitted: FinishResult['submitted'] = 'no-nickname';
    if (next.nickname) {
      try {
        await api.submitScore({
          playerId: next.playerId,
          nickname: next.nickname,
          gameSlug: input.slug,
          points: Math.round(input.points),
          daily: !!input.daily,
          meta: input.meta,
        });
        submitted = 'ok';
      } catch {
        submitted = 'offline';
      }
    }

    return {
      xpGained,
      levelBefore: levelInfo(before.xp).level,
      levelAfter: levelInfo(next.xp).level,
      newBadges,
      newStamps,
      dailyCompleted,
      streak: next.streak.count,
      submitted,
    };
  }, [save]);

  const reset = useCallback(() => {
    const keepId = ref.current.playerId;
    save({ ...fresh(), playerId: keepId });
  }, [save]);

  const value = useMemo(
    () => ({ progress, ready, setNickname, dismissNickname, finishGame, reset }),
    [progress, ready, setNickname, dismissNickname, finishGame, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useProgress must be used inside ProgressProvider');
  return c;
}
