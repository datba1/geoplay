'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useI18n } from '@/lib/i18n';
import { bestStars, useProgress } from '@/lib/progress';
import { GAMES, gameName, type GameCategory, type GameMeta } from '@/lib/games';
import { CardArt } from './CardArt';

export const CATEGORIES: GameCategory[] = ['maps', 'flags', 'data', 'strategy', 'nature'];

/** Three dots, filled by difficulty (1 easy … 3 hard). */
export function DifficultyBadge({ level }: { level: 1 | 2 | 3 }) {
  const { t } = useI18n();
  return (
    <span className="meta-badge">
      <span className="dots">{[1, 2, 3].map((d) => <i key={d} className={d <= level ? 'on' : ''} />)}</span>
      {t(`diff.${level}`)}
    </span>
  );
}

export function GameCard({ g }: { g: GameMeta }) {
  const { t } = useI18n();
  const { progress } = useProgress();
  const stats = progress.games[g.slug];
  const style = { '--c': g.accent } as CSSProperties;
  return (
    <Link href={`/games/${g.slug}`} className="game-card" style={style}>
      <div className="card-top">
        <span className="no">{g.no}</span>
        <span className="tag">{t(`game.${g.slug}.kind`)}</span>
      </div>
      <CardArt slug={g.slug} />
      <h3>{t(gameName(g.slug))}</h3>
      <p>{t(`game.${g.slug}.desc`)}</p>
      <div className="card-meta">
        <DifficultyBadge level={g.difficulty} />
        <span className="meta-badge">⏱ {t('games.minutes', { n: g.minutes })}</span>
      </div>
      <div className="card-foot">
        {stats ? (
          <span className="card-progress">
            <span className="mini-stars" aria-label={t('depth.starsLabel', { n: bestStars(stats) })}>
              {[1, 2, 3].map((i) => <i key={i} className={i <= bestStars(stats) ? 'on' : ''}>★</i>)}
            </span>
            {t('games.best', { n: stats.best, plays: stats.plays })}
            {(stats.stars?.hard ?? 0) > 0 && <span className="hard-mark" title={t('depth.hard')}>{t('depth.hard')}</span>}
          </span>
        ) : (
          <span>{t('games.notPlayed')}</span>
        )}
        <span className="arrow">→</span>
      </div>
    </Link>
  );
}

/** Games grouped by category; pass a filtered list to show a subset. */
export function GameGrid({ games = GAMES.filter((g) => g.implemented) }: { games?: GameMeta[] }) {
  const { t } = useI18n();
  return (
    <div id="games">
      {CATEGORIES.map((cat) => {
        const list = games.filter((g) => g.category === cat);
        if (!list.length) return null;
        return (
          <div key={cat} className="section">
            <div className="section-label">{t(`games.${cat}`)} · {list.length}</div>
            <div className="game-grid">{list.map((g) => <GameCard key={g.slug} g={g} />)}</div>
          </div>
        );
      })}
    </div>
  );
}
