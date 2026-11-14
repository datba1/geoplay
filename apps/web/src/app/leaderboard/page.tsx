'use client';

import { useEffect, useState } from 'react';
import { api, type Leaderboard } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useProgress } from '@/lib/progress';
import { GAMES, gameName } from '@/lib/games';

const PERIODS = ['all', 'week', 'day'] as const;

export default function LeaderboardPage() {
  const { t } = useI18n();
  const { progress, ready } = useProgress();
  const [game, setGame] = useState<string>('');
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('all');
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setError(false);
    api.leaderboard({ game: game || undefined, period, playerId: progress.playerId, limit: 50 })
      .then(setData)
      .catch(() => setError(true));
  }, [game, period, ready, progress.playerId]);

  return (
    <div className="container">
      <div className="game-top"><h1>🏆 {t('lb.title')}</h1></div>
      <div className="card">
        <div className="tabs" style={{ marginBottom: 10 }}>
          <button className={`tab ${game === '' ? 'active' : ''}`} onClick={() => setGame('')}>{t('lb.overall')}</button>
          {GAMES.filter((g) => g.implemented).map((g) => (
            <button key={g.slug} className={`tab ${game === g.slug ? 'active' : ''}`} onClick={() => setGame(g.slug)}>
              {g.icon} {t(gameName(g.slug))}
            </button>
          ))}
        </div>
        <div className="tabs" style={{ marginBottom: 16 }}>
          {PERIODS.map((p) => (
            <button key={p} className={`tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>{t(`lb.${p}`)}</button>
          ))}
        </div>
        {error && <p className="muted">{t('lb.offline')}</p>}
        {data && !error && (
          data.entries.length === 0 ? <p className="muted">{t('lb.empty')}</p> : (
            <table className="lb-table">
              <thead><tr><th>{t('lb.rank')}</th><th>{t('lb.player')}</th><th style={{ textAlign: 'right' }}>{t('lb.points')}</th></tr></thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={`${e.rank}-${e.nickname}`} className={e.isMe ? 'me' : ''}>
                    <td>{e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}</td>
                    <td>{e.nickname} {e.isMe && <span className="chip">{t('lb.you')}</span>}</td>
                    <td className="num">{e.points.toLocaleString()}</td>
                  </tr>
                ))}
                {data.me && !data.entries.some((e) => e.isMe) && (
                  <tr className="me"><td>{data.me.rank}</td><td>{data.me.nickname} <span className="chip">{t('lb.you')}</span></td><td className="num">{data.me.points.toLocaleString()}</td></tr>
                )}
              </tbody>
            </table>
          )
        )}
        {!progress.nickname && <p className="small muted">{t('result.noNick')}</p>}
      </div>
    </div>
  );
}
