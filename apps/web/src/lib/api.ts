export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** The server answered with an error status (as opposed to being unreachable). */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Only send Content-Type with a body: a GET without custom headers is a "simple" request
  // and needs no extra CORS preflight round trip.
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } : init?.headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(msg || `Request failed (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

/** Same rule as the API (apps/api/src/players/nickname.ts). */
export const NICKNAME_PATTERN = /^[\p{L}\p{M}\p{N}\p{Extended_Pictographic}\u200d\ufe0f _.'\u2019!?&()\-]+$/u;
export const cleanNickname = (v: string) => v.normalize('NFC').replace(/\s+/g, ' ').trim();
export function nicknameProblem(v: string): 'short' | 'long' | 'chars' | null {
  const n = cleanNickname(v);
  if (n.length < 2) return 'short';
  if (n.length > 24) return 'long';
  return NICKNAME_PATTERN.test(n) ? null : 'chars';
}

export interface DailyChallenge {
  date: string;
  games: { slug: string; seed: number }[];
  resetsAt: string | null;
}
export interface Fact {
  id: number;
  category: string;
  question: string;
  answer: string;
  detail: string;
  source: string | null;
}
export interface LeaderboardEntry { rank: number; nickname: string; points: number; isMe: boolean }
export interface Leaderboard {
  game: string | null;
  period: 'all' | 'week' | 'day';
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

export interface StatIndicator {
  slug: string;
  group: string;
  unit: 'people' | 'usd' | 'km2' | 'ha';
  name: { en: string; vi: string };
  years: [number, number];
  values: Record<string, number>;
}

export const api = {
  stats: () => request<{ indicators: StatIndicator[] }>('/stats'),
  daily: () => request<DailyChallenge>('/daily'),
  facts: (lang: string) => request<Fact[]>(`/facts?lang=${lang}`),
  factToday: (lang: string) =>
    request<{ index: number; total: number; fact: Fact }>(`/facts/today?lang=${lang}`),
  setNickname: (playerId: string, nickname: string) =>
    request<{ nickname: string }>(`/players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify({ nickname }),
    }),
  submitScore: (body: {
    playerId: string;
    nickname: string;
    gameSlug: string;
    points: number;
    daily?: boolean;
    meta?: Record<string, unknown>;
  }) => request<{ saved: boolean; best: number }>('/scores', { method: 'POST', body: JSON.stringify(body) }),
  leaderboard: (params: { game?: string; period?: string; playerId?: string; limit?: number }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.set(k, String(v)));
    return request<Leaderboard>(`/leaderboard?${q.toString()}`);
  },
};

/* ------------------------------------------------------------------ */
/* Cached versions (stale-while-revalidate, see lib/cache.ts)          */
/* ------------------------------------------------------------------ */
import { cachedFetch, TTL } from './cache';

/** Day key matching the API's daily reset (UTC+7). */
export const dayKey = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

export const cacheKeys = {
  daily: () => `daily.${dayKey()}`,
  facts: (lang: string) => `facts.${lang}`,
  factToday: (lang: string) => `factToday.${lang}.${dayKey()}`,
  stats: () => 'stats',
  leaderboard: (p: Record<string, unknown>) => `lb.${JSON.stringify(p)}`,
};

export const cachedApi = {
  daily: () => cachedFetch(cacheKeys.daily(), TTL.tenMinutes, api.daily),
  facts: (lang: string) => cachedFetch(cacheKeys.facts(lang), TTL.day, () => api.facts(lang)),
  factToday: (lang: string) => cachedFetch(cacheKeys.factToday(lang), TTL.hour, () => api.factToday(lang)),
  /** World Bank figures change yearly: keep them a day. */
  stats: () => cachedFetch(cacheKeys.stats(), TTL.day, api.stats),
};
