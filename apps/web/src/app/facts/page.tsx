'use client';

import { api, cacheKeys, type Fact } from '@/lib/api';
import { TTL, useCached } from '@/lib/cache';
import { useI18n } from '@/lib/i18n';
import { FactFlip } from '@/components/FactCard';

export default function FactsPage() {
  const { t, lang } = useI18n();
  const { data, error: fetchError } = useCached<Fact[]>(cacheKeys.facts(lang), TTL.day, () => api.facts(lang));
  const facts = data ?? null;
  const error = !facts && !!fetchError;
  return (
    <div className="container">
      <div className="game-top"><h1>💡 {t('facts.title')}</h1></div>
      {error && <p className="muted">{t('daily.offline')}</p>}
      {!facts && !error && <p className="muted">{t('common.loading')}</p>}
      <div className="grid-3">
        {facts?.map((f) => <FactFlip key={f.id} fact={f} />)}
      </div>
    </div>
  );
}
