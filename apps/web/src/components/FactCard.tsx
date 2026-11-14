'use client';

import { useEffect, useState } from 'react';
import { api, type Fact } from '@/lib/api';
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
  const [facts, setFacts] = useState<Fact[] | null>(null);
  const [index, setIndex] = useState(0);
  const [todayIndex, setTodayIndex] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([api.facts(lang), api.factToday(lang)])
      .then(([all, today]) => {
        setFacts(all);
        setIndex(today.index);
        setTodayIndex(today.index);
      })
      .catch(() => setError(true));
  }, [lang]);

  const placeholder = (text: string) => (
    <div>
      <div className="section-label">{t('fact.eyebrow')}</div>
      <div className="card muted" style={{ minHeight: 220 }}>{text}</div>
    </div>
  );
  if (error) return placeholder(t('daily.offline'));
  if (!facts) return placeholder(t('common.loading'));
  const fact = facts[index];

  return (
    <div>
      <div className="section-label">{t('fact.eyebrow')}</div>
      <FactFlip fact={fact} />
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn btn-sm" onClick={() => setIndex((i) => (i - 1 + facts.length) % facts.length)}>‹</button>
        <span className="small muted">{index === todayIndex ? t('fact.today') : ''} {index + 1} / {facts.length}</span>
        <button className="btn btn-sm" onClick={() => setIndex((i) => (i + 1) % facts.length)}>›</button>
      </div>
    </div>
  );
}
