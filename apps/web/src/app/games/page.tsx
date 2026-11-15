'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { GAMES, gameName } from '@/lib/games';
import { CATEGORIES, GameGrid } from '@/components/GameGrid';

type Cat = 'all' | (typeof CATEGORIES)[number];
type Diff = 0 | 1 | 2 | 3;
type Len = 'any' | 'short' | 'mid' | 'long';

const LENGTH_TEST: Record<Len, (m: number) => boolean> = {
  any: () => true,
  short: (m) => m <= 3,
  mid: (m) => m >= 4 && m <= 6,
  long: (m) => m >= 7,
};
const STORAGE = 'geoplay.gameFilters';

export default function GamesPage() {
  const { t } = useI18n();
  const all = GAMES.filter((g) => g.implemented);
  const [cat, setCat] = useState<Cat>('all');
  const [diff, setDiff] = useState<Diff>(0);
  const [len, setLen] = useState<Len>('any');

  // Remember the last filters.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) ?? 'null');
      if (saved) { setCat(saved.cat ?? 'all'); setDiff(saved.diff ?? 0); setLen(saved.len ?? 'any'); }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify({ cat, diff, len })); } catch {}
  }, [cat, diff, len]);

  const filtered = useMemo(
    () => all.filter((g) => (cat === 'all' || g.category === cat) && (!diff || g.difficulty === diff) && LENGTH_TEST[len](g.minutes)),
    [all, cat, diff, len],
  );
  const starters = all.filter((g) => g.difficulty === 1).slice(0, 3);
  const count = (c: Cat) => (c === 'all' ? all.length : all.filter((g) => g.category === c).length);

  return (
    <div className="container">
      <section className="page-hero">
        <span className="eyebrow">🎮 GeoPlay</span>
        <h1>{t('gp.title')}</h1>
        <p className="lead muted">{t('gp.lead')}</p>
        <div className="row starters">
          <span className="small muted">{t('gp.start')}</span>
          {starters.map((g) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="chip chip-link">{t(gameName(g.slug))} →</Link>
          ))}
          <Link href="/handbook" className="small" style={{ textDecoration: 'underline' }}>📖 {t('nav.handbook')}</Link>
        </div>
      </section>

      <div className="filters">
        <div className="tabs">
          {(['all', ...CATEGORIES] as Cat[]).map((c) => (
            <button key={c} className={`tab ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
              {c === 'all' ? t('gp.all') : t(`games.${c}`)} <span className="count">{count(c)}</span>
            </button>
          ))}
        </div>
        <div className="segmented">
          {([0, 1, 2, 3] as Diff[]).map((d) => (
            <button key={d} className={diff === d ? 'on' : ''} onClick={() => setDiff(d)}>{d ? t(`diff.${d}`) : t('gp.anyDiff')}</button>
          ))}
        </div>
        <div className="segmented">
          {(['any', 'short', 'mid', 'long'] as Len[]).map((l) => (
            <button key={l} className={len === l ? 'on' : ''} onClick={() => setLen(l)}>{t(`gp.len.${l}`)}</button>
          ))}
        </div>
      </div>

      {filtered.length ? <GameGrid games={filtered} /> : (
        <div className="card" style={{ textAlign: 'center', margin: '24px 0' }}>
          <p className="muted">{t('gp.none')}</p>
          <button className="btn btn-sm" onClick={() => { setCat('all'); setDiff(0); setLen('any'); }}>{t('gp.reset')}</button>
        </div>
      )}
    </div>
  );
}
