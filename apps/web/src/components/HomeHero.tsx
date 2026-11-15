'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { api, cacheKeys } from '@/lib/api';
import { prefetch, TTL } from '@/lib/cache';
import { useI18n } from '@/lib/i18n';
import { levelInfo, useProgress } from '@/lib/progress';
import { Globe } from './Globe';

export function HomeHero() {
  const { t } = useI18n();
  const { progress } = useProgress();
  const info = levelInfo(progress.xp);
  // Warm the World Bank data so the stats games open instantly.
  useEffect(() => prefetch(cacheKeys.stats(), TTL.day, api.stats), []);
  return (
    <section className="hero">
      <div>
        <h1>Geo<span className="accent-text">Play</span></h1>
        <div className="tagline">{t('hero.tagline')}</div>
        <p className="lead">{t('hero.lead')}</p>
        <div className="xpbar"><div style={{ width: `${(info.into / info.need) * 100}%` }} /></div>
        <p className="small muted">{t('hero.xp', { xp: info.into, need: info.need, next: info.level + 1 })}</p>
        <div className="row hero-cta">
          <Link href="/games" className="btn btn-primary">▶ {t('hero.playNow')}</Link>
          <Link href="/handbook" className="btn">📖 {t('hero.newHere')}</Link>
        </div>
      </div>
      <Globe />
    </section>
  );
}
