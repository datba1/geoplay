'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useI18n } from '@/lib/i18n';
import { useProgress } from '@/lib/progress';
import { GAMES, gameName } from '@/lib/games';
import { CardArt } from './CardArt';

export function GameGrid() {
  const { t } = useI18n();
  const { progress } = useProgress();
  const categories = ['maps', 'flags', 'strategy', 'nature'] as const;

  return (
    <div id="games">
      {categories.map((cat) => (
        <div key={cat} className="section">
          <div className="section-label">{t(`games.${cat}`)}</div>
          <div className="game-grid">
            {GAMES.filter((g) => g.category === cat).map((g) => {
              const stats = progress.games[g.slug];
              const style = { '--c': g.accent } as CSSProperties;
              const body = (
                <>
                  <div className="card-top">
                    <span className="no">{g.no}</span>
                    <span className="tag">{g.implemented ? t(`game.${g.slug}.kind` as never) : t('games.soon')}</span>
                  </div>
                  <CardArt slug={g.slug} />
                  <h3>{t(gameName(g.slug))}</h3>
                  {g.implemented && <p>{t(`game.${g.slug}.desc` as never)}</p>}
                  <div className="card-foot">
                    <span>
                      {!g.implemented ? t('games.soon') : stats ? t('games.best', { n: stats.best, plays: stats.plays }) : t('games.notPlayed')}
                    </span>
                    {g.implemented && <span className="arrow">→</span>}
                  </div>
                </>
              );
              return g.implemented ? (
                <Link key={g.slug} href={`/games/${g.slug}`} className="game-card" style={style}>{body}</Link>
              ) : (
                <div key={g.slug} className="game-card soon" style={style}>{body}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
