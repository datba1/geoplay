'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type DailyChallenge as Daily } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useProgress } from '@/lib/progress';
import { gameMeta, gameName } from '@/lib/games';

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const ms = Math.max(0, Date.parse(target) - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export function DailyChallenge() {
  const { t, lang } = useI18n();
  const { progress } = useProgress();
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState(false);
  const countdown = useCountdown(daily?.resetsAt ?? null);

  useEffect(() => {
    api.daily().then(setDaily).catch(() => setError(true));
  }, []);

  const done = daily && progress.daily.date === daily.date ? progress.daily.done : [];
  const dateLabel = daily ? new Date(`${daily.date}T00:00:00`).toLocaleDateString(lang) : '';

  return (
    <div className="card daily">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <span className="eyebrow">{t('daily.eyebrow', { date: dateLabel })}</span>
        <span className="spacer" />
        <span className="chip">{t('daily.streak', { n: progress.streak.count })}</span>
        {countdown && <span className="chip">{t('daily.resets', { time: countdown })}</span>}
      </div>
      <h3>{t('daily.title')}</h3>
      {error && <p className="muted">{t('daily.offline')}</p>}
      {daily && (
        <div className="daily-games">
          {daily.games.map((g, i) => {
            const isDone = done.includes(g.slug);
            return (
              <Link
                key={g.slug}
                href={`/games/${g.slug}?seed=${g.seed}&daily=${daily.date}`}
                className={`daily-game ${isDone ? 'done' : ''}`}
              >
                <span className="num">{isDone ? '✓' : i + 1}</span>
                <span>
                  <b>{t(gameName(g.slug))}</b>
                  <span className="muted small" style={{ display: 'block' }}>
                    {gameMeta(g.slug)?.icon} {t(`game.${g.slug}.kind` as never)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
      <p className="muted small" style={{ marginBottom: 0 }}>
        {daily && done.length >= daily.games.length ? `✅ ${t('daily.done')}` : t('daily.bonus')}
      </p>
    </div>
  );
}
