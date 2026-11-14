'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useProgress } from '@/lib/progress';

/** Asks for a nickname on the first visit, or whenever `open` is forced via the event. */
export function NicknameModal() {
  const { t } = useI18n();
  const { progress, ready, setNickname, dismissNickname } = useProgress();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !progress.nicknameAsked) setOpen(true);
  }, [ready, progress.nicknameAsked]);

  useEffect(() => {
    const handler = () => {
      setValue(progress.nickname ?? '');
      setNote(null);
      setOpen(true);
    };
    window.addEventListener('geoplay:nickname', handler);
    return () => window.removeEventListener('geoplay:nickname', handler);
  }, [progress.nickname]);

  if (!open) return null;
  const valid = value.trim().length >= 2;

  const save = async () => {
    if (!valid) return;
    const ok = await setNickname(value);
    if (ok) setOpen(false);
    else setNote(t('nick.offline'));
  };

  return (
    <div className="modal-backdrop" onClick={() => { dismissNickname(); setOpen(false); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('nick.title')} <em className="accent">{t('nick.titleEm')}</em></h2>
        <p className="muted small">{t('nick.desc')}</p>
        <input
          className="input"
          autoFocus
          maxLength={24}
          placeholder={t('nick.placeholder')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        {note && <p className="small" style={{ color: 'var(--accent-2)' }}>{note}</p>}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => { dismissNickname(); setOpen(false); }}>{t('nick.later')}</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!valid} onClick={save}>{t('nick.save')}</button>
        </div>
      </div>
    </div>
  );
}

export const openNicknameModal = () => window.dispatchEvent(new Event('geoplay:nickname'));
