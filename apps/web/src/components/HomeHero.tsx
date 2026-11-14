'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { levelInfo, useProgress } from '@/lib/progress';
import { Globe } from './Globe';

export function HomeHero() {
  const { t } = useI18n();
  const { progress } = useProgress();
  const info = levelInfo(progress.xp);
  return (
    <section className="hero">
      <div>
        <h1>Geo<span className="accent-text">Play</span></h1>
        <div className="tagline">{t('hero.tagline')}</div>
        <p className="lead">{t('hero.lead')}</p>
        <div className="xpbar"><div style={{ width: `${(info.into / info.need) * 100}%` }} /></div>
        <p className="small muted">{t('hero.xp', { xp: info.into, need: info.need, next: info.level + 1 })}</p>
        <Link href="#daily" className="btn btn-primary">{t('hero.play')} →</Link>
      </div>
      <Globe />
    </section>
  );
}
