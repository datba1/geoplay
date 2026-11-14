'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useI18n } from '@/lib/i18n';
import { HANDBOOK as H } from '@/lib/handbook';
import { GAMES, gameName } from '@/lib/games';
import { CardArt } from '@/components/CardArt';

export default function HandbookPage() {
  const { t, lang } = useI18n();
  const games = GAMES.filter((g) => g.implemented).sort((a, b) => a.difficulty - b.difficulty);

  return (
    <div className="container handbook">
      <div className="game-top"><h1>📖 {H.title[lang]}</h1></div>
      <p className="lead muted">{H.intro[lang]}</p>

      <section className="section">
        <div className="section-label">{H.startTitle[lang]}</div>
        <div className="hb-games">
          {games.map((g, i) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="hb-game" style={{ '--c': g.accent } as CSSProperties}>
              <span className="hb-step">{i + 1}</span>
              <CardArt slug={g.slug} />
              <div>
                <h3>{t(gameName(g.slug))}</h3>
                <div className="row small muted" style={{ margin: '4px 0 8px' }}>
                  <span>{H.difficulty[lang]} <span className="dots">{[1, 2, 3].map((d) => <i key={d} className={d <= g.difficulty ? 'on' : ''} />)}</span></span>
                  <span>⏱ {H.minutes[lang].replace('{n}', String(g.minutes))}</span>
                </div>
                <p className="muted small" style={{ margin: 0 }}>{H.tips[g.slug]?.[lang] ?? t(`game.${g.slug}.tip`)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 10 }}>{H.liesTitle[lang]}</h2>
          {H.lies.map((p, i) => <p key={i} className="muted">{p[lang]}</p>)}
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 10 }}>{H.progressTitle[lang]}</h2>
          {H.progress.map((p, i) => <p key={i} className="muted">{p[lang]}</p>)}
        </div>
      </section>
    </div>
  );
}
