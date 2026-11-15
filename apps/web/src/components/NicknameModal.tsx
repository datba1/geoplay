'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useProgress } from '@/lib/progress';
import { nicknameProblem } from '@/lib/api';

/** Asks for a nickname on the first visit, or whenever `open` is forced via the event. */
export function NicknameModal() {
  const { t } = useI18n();
  const { progress, ready, setNickname, dismissNickname } = useProgress();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [note, setNote] = useState<{ text: string; kind: 'error' | 'info' } | null>(null);
  const [saving, setSaving] = useState(false);

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
  const problem = nicknameProblem(value);
  const valid = problem === null;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const res = await setNickname(value);
    setSaving(false);
    if (res.status === 'ok') setOpen(false);
    else if (res.status === 'offline') setNote({ text: t('nick.offline'), kind: 'info' });
    else setNote({ text: t('nick.rejected'), kind: 'error' });
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
          onChange={(e) => { setValue(e.target.value); setNote(null); }}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        {value.trim() && problem === 'chars' && <p className="small pill-bad">{t('nick.chars')}</p>}
        {problem === 'long' && <p className="small pill-bad">{t('nick.long')}</p>}
        {note && <p className={`small ${note.kind === 'error' ? 'pill-bad' : ''}`} style={note.kind === 'info' ? { color: 'var(--accent-2)' } : undefined}>{note.text}</p>}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => { dismissNickname(); setOpen(false); }}>{t('nick.later')}</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!valid || saving} onClick={save}>{saving ? '…' : t('nick.save')}</button>
        </div>
      </div>
    </div>
  );
}

export const openNicknameModal = () => window.dispatchEvent(new Event('geoplay:nickname'));
