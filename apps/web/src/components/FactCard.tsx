'use client';

import { useEffect, useState } from 'react';
import { api, cacheKeys, type Fact } from '@/lib/api';
import { TTL, useCached } from '@/lib/cache';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useProgress } from '@/lib/progress';

const TRY_GAME: Record<string, string> = {
  general: 'diplomacy', size: 'true-size', maps: 'warped-map', flags: 'flag-fault', borders: 'border-chess', nature: 'shadow-hunt',
};

const CATEGORY_ICON: Record<string, string> = {
  general: '🌍', size: '📏', maps: '🗺️', flags: '🚩', borders: '🧱', nature: '🏔️',
};

export function FactFlip({ fact, startFlipped = false }: { fact: Fact; startFlipped?: boolean }) {
  const { t } = useI18n();
  const { collectCard } = useProgress();
  const [flipped, setFlipped] = useState(startFlipped);
  useEffect(() => setFlipped(startFlipped), [fact.id, startFlipped]);
  const toggle = () => {
    if (!flipped) collectCard(fact.id);
    setFlipped((f) => !f);
  };
  const icon = CATEGORY_ICON[fact.category] ?? '🌍';
  return (
    <div className={`flip ${flipped ? 'flipped' : ''}`} onClick={toggle}>
      <div className="flip-inner">
        <div className="flip-face">
          <span className="eyebrow">{icon} {t(`factcat.${fact.category}`)}</span>
          <h3>{fact.question}</h3>
          <span className="muted small" style={{ marginTop: 'auto' }}>↻ {t('fact.flip')}</span>
        </div>
        <div className="flip-face flip-back">
          <span className="eyebrow">{icon} {t(`factcat.${fact.category}`)}</span>
          <h3 className="accent-text">{fact.answer}</h3>
          <p className="muted" style={{ margin: 0 }}>{fact.detail}</p>
          <div className="flip-foot">
            {TRY_GAME[fact.category] && (
              <Link href={`/games/${TRY_GAME[fact.category]}`} className="chip chip-link small" onClick={(e) => e.stopPropagation()}>
                {t('fact.tryIt', { game: t(`game.${TRY_GAME[fact.category]}.name`) })}
              </Link>
            )}
            {fact.source && <span className="small muted">{t('fact.source', { s: fact.source })}</span>}
          </div>
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
      <div className="row section-label-row">
        <div className="section-label" style={{ margin: 0 }}>💡 {t('fact.todayCard')}</div>
        <span className="spacer" />
        <Link href="/facts" className="small" style={{ textDecoration: 'underline' }}>{t('fact.all')}</Link>
      </div>
      <FactFlip fact={fact} />
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn btn-sm" onClick={() => setIndex((shown - 1 + facts.length) % facts.length)}>‹</button>
        <span className="small muted">{shown === todayIndex ? t('fact.today') : ''} {shown + 1} / {facts.length}</span>
        <button className="btn btn-sm" onClick={() => setIndex((shown + 1) % facts.length)}>›</button>
      </div>
    </div>
  );
}
