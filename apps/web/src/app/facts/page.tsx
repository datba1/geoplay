'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, cachedApi, cacheKeys, dayKey, type DailyChallenge, type Fact, type StatIndicator } from '@/lib/api';
import { TTL, useCached } from '@/lib/cache';
import { useI18n } from '@/lib/i18n';
import { useProgress } from '@/lib/progress';
import { loadWorld } from '@/lib/geo';
import { buildQuiz, hourKey, type QuizQuestion } from '@/lib/quiz';
import { FactFlip } from '@/components/FactCard';

/* ---------- clocks ---------- */

/** Next midnight in Vietnam (UTC+7), when the daily card changes. */
const nextDayAt = (now: number) => {
  const shifted = now + 7 * 3_600_000;
  return Math.ceil(shifted / 86_400_000) * 86_400_000 - 7 * 3_600_000;
};
const nextHourAt = (now: number) => Math.ceil((now + 1) / 3_600_000) * 3_600_000;
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (ms: number, withHours: boolean) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return withHours ? `${pad(h)}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ---------- page ---------- */

export default function FactsPage() {
  const { t, lang } = useI18n();
  const { progress } = useProgress();
  const now = useNow();
  const facts = useCached<Fact[]>(cacheKeys.facts(lang), TTL.day, () => api.facts(lang));
  const today = useCached(cacheKeys.factToday(lang), TTL.hour, () => api.factToday(lang));
  const daily = useCached<DailyChallenge>(cacheKeys.daily(), 10 * 60_000, cachedApi.daily);

  const list = facts.data ?? [];
  const todayFact = today.data?.fact ?? null;
  const bonusFact = list.length && today.data ? list[(today.data.index + Math.floor(list.length / 2)) % list.length] : null;
  const doneToday = progress.daily.date === dayKey() ? progress.daily.done : [];
  const dailyGames = daily.data?.games ?? [];
  const bonusOpen = dailyGames.length > 0 && dailyGames.every((g) => doneToday.includes(g.slug));
  const nextGame = dailyGames.find((g) => !doneToday.includes(g.slug));
  const collected = list.filter((f) => progress.cards.includes(f.id));

  return (
    <div className="container facts-page">
      <header className="facts-hero">
        <span className="eyebrow">💡 GeoPlay</span>
        <h1>{t('facts.title')}</h1>
        <p className="muted">{t('facts.lead')}</p>
        <div className="facts-timers">
          <span className="chip">🗓 {t('facts.newCards')} <b className="mono">{clock(nextDayAt(now) - now, true)}</b></span>
          <span className="chip">⚡ {t('facts.newQuiz')} <b className="mono">{clock(nextHourAt(now) - now, false)}</b></span>
        </div>
      </header>

      {!!facts.error && !facts.data && <p className="muted">{t('daily.offline')}</p>}

      <div className="section-label">{t('facts.drop')}</div>
      <div className="drop-grid">
        <div>
          <div className="mini-label">🗓 {t('fact.todayCard')}</div>
          {todayFact ? <FactFlip fact={todayFact} /> : <div className="card muted flip-placeholder">{t('common.loading')}</div>}
        </div>
        <div>
          <div className="mini-label">🎁 {t('facts.bonus')}</div>
          {bonusOpen && bonusFact ? (
            <FactFlip fact={bonusFact} />
          ) : (
            <div className="bonus-locked">
              <span className="lock">🔒</span>
              <b>{t('facts.bonusLocked')}</b>
              <span className="muted small">{t('facts.bonusHow', { n: dailyGames.length || 3 })}</span>
              <div className="pips">
                {(dailyGames.length ? dailyGames : [0, 1, 2]).map((g, i) => (
                  <span key={i} className={typeof g === 'object' && doneToday.includes(g.slug) ? 'on' : ''} />
                ))}
                <span className="muted small">{doneToday.filter((s) => dailyGames.some((g) => g.slug === s)).length}/{dailyGames.length || 3}</span>
              </div>
              {nextGame && daily.data && (
                <Link className="btn btn-primary btn-sm" href={`/games/${nextGame.slug}?seed=${nextGame.seed}&daily=${daily.data.date}`}>
                  {t('facts.doChallenge', { game: t(`game.${nextGame.slug}.name`) })}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <OnThisDay />
      <QuickQuiz />

      <section className="section">
        <div className="section-head">
          <h2>🗂 {t('facts.collected', { n: collected.length, total: list.length || '…' })}</h2>
        </div>
        <p className="muted small">{t('facts.collectedHow')}</p>
        {collected.length === 0 ? (
          <div className="empty-album">
            <span>🃏</span>
            <p className="muted">{t('facts.albumEmpty')}</p>
          </div>
        ) : (
          <div className="grid-3">
            {collected.map((f) => <FactFlip key={f.id} fact={f} startFlipped />)}
          </div>
        )}
        {list.length > collected.length && (
          <p className="muted small album-more">{t('facts.albumMore', { n: list.length - collected.length })}</p>
        )}
      </section>
    </div>
  );
}

/* ---------- on this day (Wikipedia feed; English only) ---------- */

interface DayEvent { year: number; text: string; url: string | null }

function OnThisDay() {
  const { t, lang } = useI18n();
  const date = new Date(Date.now() + 7 * 3_600_000); // Vietnam calendar day
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const { data, error } = useCached<DayEvent[]>(`otd.${mm}${dd}`, TTL.day, async () => {
    const res = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${mm}/${dd}`);
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { selected?: { year: number; text: string; pages?: { content_urls?: { desktop?: { page?: string } } }[] }[] };
    return (body.selected ?? []).map((e) => ({ year: e.year, text: e.text, url: e.pages?.[0]?.content_urls?.desktop?.page ?? null }));
  });
  const [offset, setOffset] = useState(0);
  if (error && !data) return null;
  const events = data ?? [];
  const event = events.length ? events[(Number(dd) + offset) % events.length] : null;

  return (
    <section className="section otd card">
      <div className="otd-head">
        <h2>📅 {t('facts.onThisDay')}</h2>
        <span className="otd-date">{dd}/{mm}</span>
      </div>
      {!event ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <div className="otd-body">
          <span className="otd-year">{event.year}</span>
          <div>
            <p>{event.text}</p>
            <div className="otd-actions">
              {event.url && <a href={event.url} target="_blank" rel="noreferrer" className="small">Wikipedia ↗</a>}
              {lang === 'vi' && <span className="muted small">{t('facts.englishOnly')}</span>}
              {events.length > 1 && (
                <button className="btn btn-sm btn-ghost" onClick={() => setOffset((o) => o + 1)}>{t('facts.anotherEvent')}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- hourly quick quiz ---------- */

const ANSWERS_KEY = 'geoplay.quiz.answers';

function QuickQuiz() {
  const { t, lang } = useI18n();
  const now = useNow();
  const hour = hourKey(now);
  const stats = useCached<{ indicators: StatIndicator[] }>(cacheKeys.stats(), TTL.day, cachedApi.stats);
  const [areas, setAreas] = useState<Map<string, number> | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    loadWorld().then((w) => setAreas(new Map(w.countries.map((c) => [c.a2, c.areaKm2]))));
    try {
      setAnswers(JSON.parse(localStorage.getItem(ANSWERS_KEY) ?? '{}'));
    } catch {}
  }, []);

  const questions = useMemo(
    () => (stats.data && areas ? buildQuiz(stats.data.indicators, areas, lang, hour) : null),
    [stats.data, areas, lang, hour],
  );

  const answer = (q: QuizQuestion, i: number) => {
    const next = Object.fromEntries(Object.entries({ ...answers, [q.id]: i }).filter(([k]) => k.startsWith(`${hour}-`)));
    setAnswers(next);
    try {
      localStorage.setItem(ANSWERS_KEY, JSON.stringify(next));
    } catch {}
  };

  if (stats.error && !stats.data) return null;
  return (
    <section className="section">
      <div className="section-head"><h2>⚡ {t('facts.quiz')}</h2></div>
      <p className="muted small">{t('facts.quizLead')}</p>
      {!questions ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <div className="quiz-grid">
          {questions.map((q) => {
            const picked = answers[q.id];
            const done = picked !== undefined;
            return (
              <div key={q.id} className={`quiz-card tone-${q.tone}`}>
                <span className="eyebrow">{t(`facts.tone.${q.tone}`)}</span>
                <h3>{q.question}</h3>
                <div className="quiz-options">
                  {q.options.map((o, i) => (
                    <button
                      key={o}
                      disabled={done}
                      onClick={() => answer(q, i)}
                      className={done ? (i === q.answer ? 'right' : i === picked ? 'wrong' : '') : ''}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                {done && (
                  <p className="quiz-explain">
                    <b>{picked === q.answer ? t('facts.right') : t('facts.wrong')}</b> {q.explain}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
