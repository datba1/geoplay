'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export function HandbookCard() {
  const { t } = useI18n();
  return (
    <div>
    <div className="section-label" aria-hidden>&nbsp;</div>
    <div className="hb-cta">
      <span className="hb-icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M3 5.5C6 4 9 4 12 6c3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z" />
          <path d="M12 6v13.5" />
        </svg>
      </span>
      <span className="eyebrow" style={{ color: 'var(--teal)' }}>{t('hb.eyebrow')}</span>
      <h3>{t('hb.title')}</h3>
      <p className="muted small">{t('hb.desc')}</p>
      <Link href="/handbook" className="btn btn-teal">{t('hb.open')}</Link>
      <Link href="/facts" className="small muted" style={{ textDecoration: 'underline' }}>{t('fact.all')}</Link>
    </div>
    </div>
  );
}
