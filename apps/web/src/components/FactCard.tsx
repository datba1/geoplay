'use client';

import { useEffect, useState } from 'react';
import { api, cacheKeys, type Fact } from '@/lib/api';
import { TTL, useCached } from '@/lib/cache';
import { useI18n } from '@/lib/i18n';

const CATEGORY_ICON: Record<string, string> = {
  general: '🌍', size: '📏', maps: '🗺️', flags: '🚩', borders: '🧱', nature: '🏔️',
};

export function FactFlip({ fact }: { fact: Fact }) {
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(false);
  useEffect(() => setFlipped(false), [fact.id]);
  const icon = CATEGORY_ICON[fact.category] ?? '🌍';
  return (
    <div className={`flip ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((f) => !f)}>
      <div className="flip-inner">
        <div className="flip-face">
          <span className="eyebrow">{icon} {fact.category}</span>
          <h3>{fact.question}</h3>
          <span className="muted small" style={{ marginTop: 'auto' }}>↻ {t('fact.flip')}</span>
        </div>
        <div className="flip-face flip-back">
          <span className="eyebrow">{icon} {fact.category}</span>
          <h3 className="accent-text">{fact.answer}</h3>
          <p className="muted" style={{ margin: 0 }}>{fact.detail}</p>
          {fact.source && <span className="small muted" style={{ marginTop: 'auto' }}>{t('fact.source', { s: fact.source })}</span>}
        </div>
      </div>
    </div>
  );
}

export function FactCard() {
  const { t, lang } = useI18n();
  const all = useCached<Fact[]>(cacheKeys.facts(lang), TTL.day, () => api.facts(lang));
  const today = useCached(cacheKeys.factToday(lang), TTL.hour, () => api.factToday(lang));
  const facts = all.data ?? null;
  const todayIndex = today.data?.index ?? 0;
  const [index, setIndex] = useState<number | null>(null);
  const error = !facts && !!all.error;
  // Start on today's card once it is known; keep the user's position after that.
  useEffect(() => setIndex(null), [lang]);
  const shown = index ?? todayIndex;

  const placeholder = (text: string) => (
    <div>
      <div className="section-label">{t('fact.eyebrow')}</div>
      <div className="card muted" style={{ minHeight: 220 }}>{text}</div>
    </div>
  );
  if (error) return placeholder(t('daily.offline'));
  if (!facts) return placeholder(t('common.loading'));
  const fact = facts[Math.min(shown, facts.length - 1)];

  return (
    <div>
      <div className="section-label">{t('fact.eyebrow')}</div>
      <FactFlip fact={fact} />
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn btn-sm" onClick={() => setIndex((shown - 1 + facts.length) % facts.length)}>‹</button>
        <span className="small muted">{shown === todayIndex ? t('fact.today') : ''} {shown + 1} / {facts.length}</span>
        <button className="btn btn-sm" onClick={() => setIndex((shown + 1) % facts.length)}>›</button>
      </div>
    </div>
  );
}
