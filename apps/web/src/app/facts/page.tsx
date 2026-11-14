'use client';

import { useEffect, useState } from 'react';
import { api, type Fact } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { FactFlip } from '@/components/FactCard';

export default function FactsPage() {
  const { t, lang } = useI18n();
  const [facts, setFacts] = useState<Fact[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api.facts(lang).then(setFacts).catch(() => setError(true));
  }, [lang]);
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
