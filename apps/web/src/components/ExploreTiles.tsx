'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useI18n } from '@/lib/i18n';
import { BADGES, useProgress } from '@/lib/progress';
import { GAMES } from '@/lib/games';
import { CardArt } from './CardArt';

const TOTAL_COUNTRIES = 195;

/** Four large entry tiles on the home page: Games, Collection, Handbook, Facts. */
export function ExploreTiles() {
  const { t } = useI18n();
  const { progress } = useProgress();
  const preview = ['warped-map', 'globe-cut', 'flag-fault', 'border-go'];
  const total = GAMES.filter((g) => g.implemented).length;

  return (
    <section className="section">
      <div className="section-label">{t('ex.title')}</div>
      <div className="explore">
        <Link href="/games" className="ex-tile ex-games" style={{ '--c': '#ff7a50' } as CSSProperties}>
          <div className="ex-art ex-mosaic">
            {preview.map((s) => {
              const g = GAMES.find((x) => x.slug === s)!;
              return <div key={s} className="ex-cell" style={{ '--c': g.accent } as CSSProperties}><CardArt slug={s} /></div>;
            })}
          </div>
          <span className="eyebrow">{t('nav.games')}</span>
          <h3>{t('ex.games')}</h3>
          <p className="muted small">{t('ex.gamesDesc', { n: total })}</p>
          <span className="arrow">→</span>
        </Link>

        <Link href="/collection" className="ex-tile" style={{ '--c': '#c9953f' } as CSSProperties}>
          <div className="ex-art">
            <svg className="passport-book" viewBox="0 0 60 78" aria-hidden>
              <rect x="1" y="1" width="58" height="76" rx="5" fill="#5b1d2a" stroke="#c9953f" strokeWidth="1.2" />
              <circle cx="30" cy="30" r="11" fill="none" stroke="#e8c27a" strokeWidth="1.2" />
              <path d="M19 30h22M30 19c-5 4-5 18 0 22M30 19c5 4 5 18 0 22" stroke="#e8c27a" strokeWidth="1" fill="none" />
              <text x="30" y="58" textAnchor="middle" fontSize="6.5" fill="#e8c27a" letterSpacing="1">GEOPLAY</text>
            </svg>
            <span className="ex-ring" /><span className="ex-ring" />
          </div>
          <span className="eyebrow">{t('nav.collection')}</span>
          <h3>{t('ex.collection')}</h3>
          <p className="muted small">{t('ex.collectionDesc', { s: progress.stamps.length, st: TOTAL_COUNTRIES, b: progress.badges.length, bt: BADGES.length })}</p>
          <span className="arrow">→</span>
        </Link>

        <Link href="/handbook" className="ex-tile" style={{ '--c': '#5eead4' } as CSSProperties}>
          <div className="ex-art"><span className="ex-icon">📖</span></div>
          <span className="eyebrow">{t('nav.handbook')}</span>
          <h3>{t('ex.handbook')}</h3>
          <p className="muted small">{t('ex.handbookDesc')}</p>
          <span className="arrow">→</span>
        </Link>

        <Link href="/facts" className="ex-tile" style={{ '--c': '#f5c45c' } as CSSProperties}>
          <div className="ex-art"><span className="ex-icon ex-bulb">💡</span></div>
          <span className="eyebrow">{t('nav.facts')}</span>
          <h3>{t('ex.facts')}</h3>
          <p className="muted small">{t('ex.factsDesc')}</p>
          <span className="arrow">→</span>
        </Link>
      </div>
    </section>
  );
}
