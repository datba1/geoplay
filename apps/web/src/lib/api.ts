export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
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
