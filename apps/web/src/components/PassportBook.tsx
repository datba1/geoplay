'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import countries from 'i18n-iso-countries';
import { geoAzimuthalEqualArea, geoGraticule10, geoPath } from 'd3-geo';
import { useI18n } from '@/lib/i18n';
import { useProgress } from '@/lib/progress';
import { cachedApi, cacheKeys } from '@/lib/api';
import { TTL, useCached } from '@/lib/cache';
import { countryName, flagUrl, formatKm2, loadWorld, type World } from '@/lib/geo';
import { CONTINENTS } from '@/lib/continents';
import { CAPITALS, capitalName } from '@/lib/capitals';
import { ARCHIPELAGOS } from '@/lib/islands';
import { gameName } from '@/lib/games';

/** Entry ranks by how many times a country was stamped. */
const RANKS = [
  { min: 6, id: 'gold', ink: '#b8862b' },
  { min: 3, id: 'silver', ink: '#5d6b7a' },
  { min: 1, id: 'bronze', ink: '#9a5a2e' },
] as const;
const rankOf = (n: number) => RANKS.find((r) => n >= r.min) ?? null;

const continentOf = (a2: string) => CONTINENTS.find((c) => c.codes.includes(a2));

/** Two machine-readable lines, 44 characters each, like the bottom of a real passport. */
function mrz(a2: string, a3: string, nameEn: string, entries: number, capital: string) {
  const clean = (s: string) => s.toUpperCase().normalize('NFD').replace(/[^A-Z ]/g, '').trim().replace(/\s+/g, '<');
  const pad = (s: string) => (s + '<'.repeat(44)).slice(0, 44);
  const l1 = pad(`P<${a3}${clean(nameEn)}<<GEOPLAY`);
  const l2 = pad(`GP${String(entries).padStart(2, '0')}<<<<${a2}${a3}0000000<${clean(capital).slice(0, 12)}`);
  return [l1, l2];
}

/** Guilloche rosette: a few rose curves layered, drawn once per page. */
function Rosette({ x, y, r, color, petals = 7 }: { x: number; y: number; r: number; color: string; petals?: number }) {
  const paths = [0, 0.5, 1].map((shift) => {
    let d = '';
    for (let i = 0; i <= 720; i++) {
      const t = (i / 720) * Math.PI * 2;
      const rr = r * (0.55 + 0.45 * Math.cos(petals * t + shift));
      d += `${i ? 'L' : 'M'}${(x + rr * Math.cos(t)).toFixed(1)} ${(y + rr * Math.sin(t)).toFixed(1)}`;
    }
    return d;
  });
  return (
    <g fill="none" stroke={color} strokeWidth="0.7" opacity="0.5">
      {paths.map((d, i) => <path key={i} d={d} />)}
      <circle cx={x} cy={y} r={r * 0.12} />
    </g>
  );
}

function Waves({ color, y }: { color: string; y: number }) {
  return (
    <g fill="none" stroke={color} strokeWidth="0.7" opacity="0.45">
      {[0, 6, 12, 18].map((o) => (
        <path key={o} d={`M0 ${y + o} C60 ${y - 14 + o} 120 ${y + 14 + o} 180 ${y + o} S300 ${y - 14 + o} 360 ${y + o}`} />
      ))}
    </g>
  );
}

interface Props {
  code: string;
  order: string[];
  onNavigate: (code: string) => void;
  onClose: () => void;
}

export function PassportBook({ code, order, onNavigate, onClose }: Props) {
  const { t, lang } = useI18n();
  const { progress } = useProgress();
  const [spread, setSpread] = useState(0);
  const [world, setWorld] = useState<World | null>(null);
  const stats = useCached(cacheKeys.stats(), TTL.day, cachedApi.stats);

  useEffect(() => { loadWorld().then(setWorld); }, []);
  useEffect(() => setSpread(0), [code]);

  const idx = order.indexOf(code);
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  const SPREADS = 2;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setSpread((s) => Math.min(SPREADS - 1, s + 1));
      if (e.key === 'ArrowLeft') setSpread((s) => Math.max(0, s - 1));
      if (e.key === 'PageDown' && next) onNavigate(next);
      if (e.key === 'PageUp' && prev) onNavigate(prev);
    };
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('immersive-lock');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('immersive-lock');
    };
  }, [next, prev, onClose, onNavigate]);

  const name = countryName(code, lang);
  const nameEn = countryName(code, 'en');
  const a3 = countries.alpha2ToAlpha3(code) ?? code;
  const continent = continentOf(code);
  const capital = CAPITALS.find((c) => c.a2 === code);
  const area = world?.byA2.get(code)?.areaKm2;
  const pop = stats.data?.indicators.find((i) => i.slug === 'population')?.values[code];
  const stamped = progress.stamps.includes(code);
  const log = progress.stampLog?.[code] ?? (stamped ? { n: 1, first: '', game: '' } : null);
  const rank = log ? rankOf(log.n) : null;
  const lines = mrz(code, a3, nameEn, log?.n ?? 0, capital?.en ?? '');
  const neighbours = [...(world?.neighbors.get(code) ?? [])].filter((n) => n !== code);
  const nf = (n: number, d = 0) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: d }).format(n);
  const popText = pop ? (pop >= 1e9 ? `${nf(pop / 1e9, 2)} ${t('pp.billion')}` : pop >= 1e6 ? `${nf(pop / 1e6, 1)} ${t('pp.million')}` : nf(pop)) : '—';
  const firstDate = log?.first ? new Date(log.first).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB') : '—';

  // Locator map for the second spread.
  const map = useMemo(() => {
    const c = world?.byA2.get(code);
    if (!world || !c) return null;
    const islands = ARCHIPELAGOS.filter((a) => a.owner === code).flatMap((a) => a.points);
    const proj = geoAzimuthalEqualArea().rotate([-c.centroid[0], -c.centroid[1]]).fitExtent([[60, 50], [300, 290]], c.feature);
    proj.scale(proj.scale() * 0.55); // zoom out to show the neighbourhood
    const path = geoPath(proj);
    return {
      grat: path(geoGraticule10()) ?? '',
      others: world.countries.filter((o) => o.a2 !== code).map((o) => ({ a2: o.a2, d: path(o.feature) ?? '', near: neighbours.includes(o.a2) })),
      self: path(c.feature) ?? '',
      dots: islands.map((p) => proj(p)).filter((q): q is [number, number] => !!q),
      sphere: path({ type: 'Sphere' }) ?? '',
    };
  }, [world, code]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageLabels = [t('pp.idPage'), t('pp.visa'), t('pp.map'), t('pp.neighbours')];

  return (
    <div className="pp-overlay" role="dialog" aria-modal="true" aria-label={name}>
      <div className="pp-top">
        <button className="btn btn-sm btn-ghost" disabled={!prev} onClick={() => prev && onNavigate(prev)}>← {prev ? countryName(prev, lang) : ''}</button>
        <div className="pp-title">
          <img src={flagUrl(code)} alt="" width={30} />
          <b>{name}</b>
          <span className={`chip ${stamped ? 'chip-on' : ''}`}>{stamped ? t('pp.stamped') : t('pp.notStamped')}</span>
        </div>
        <div className="row">
          <button className="btn btn-sm btn-ghost" disabled={!next} onClick={() => next && onNavigate(next)}>{next ? countryName(next, lang) : ''} →</button>
          <button className="pp-close" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>
      </div>

      <div className="pp-stage">
        <button className="pp-arrow" disabled={spread === 0} onClick={() => setSpread((s) => s - 1)} aria-label="Previous page">‹</button>

        <div className="pp-book" key={`${code}-${spread}`}>
          {spread === 0 ? (
            <>
              {/* ---------- identity page ---------- */}
              <section className="pp-page pp-left">
                <svg className="pp-guilloche" viewBox="0 0 360 480" preserveAspectRatio="none" aria-hidden>
                  <Rosette x={290} y={150} r={95} color="#4f9a8f" />
                  <Rosette x={60} y={380} r={60} color="#4f9a8f" petals={5} />
                  <Waves color="#4f9a8f" y={420} />
                </svg>
                <header className="pp-head"><span>{t('pp.idPage')}</span><span>GEOPLAY</span></header>
                <div className="pp-h-row"><h2>{t('pp.profile')}</h2><span className="pp-code">P · {a3}</span></div>
                <div className="pp-id">
                  <div className="pp-photo"><img src={flagUrl(code)} alt="" /></div>
                  <dl className="pp-fields">
                    <div className="wide"><dt>{t('pp.name')} / NAME</dt><dd className="big">{name}</dd></div>
                    <div className="wide"><dt>{t('pp.intlName')}</dt><dd>{nameEn}</dd></div>
                    <div><dt>{t('pp.code')} / CODE</dt><dd>{a3} · {code}</dd></div>
                    <div><dt>{t('pp.continent')}</dt><dd>{continent ? continent.name[lang] : '—'}</dd></div>
                  </dl>
                </div>
                <dl className="pp-fields pp-grid">
                  <div><dt>{t('pp.capital')} / CAPITAL</dt><dd>{capital ? capitalName(capital, lang) : '—'}</dd></div>
                  <div><dt>{t('pp.area')} / AREA</dt><dd>{area ? `≈ ${formatKm2(area, lang)}` : '—'}</dd></div>
                  <div><dt>{t('pp.population')} / POPULATION</dt><dd>{popText}</dd></div>
                  <div><dt>{t('pp.entry')} / ENTRY</dt><dd>{log ? firstDate : t('pp.none')}</dd></div>
                  <div><dt>{t('pp.entries')} / ENTRIES</dt><dd>{log?.n ?? 0}</dd></div>
                  <div><dt>{t('pp.rank')}</dt><dd style={{ color: rank?.ink }}>{rank ? t(`tier.${rank.id}`) : '—'}</dd></div>
                </dl>
                <div className="pp-mrz">{lines.map((l, i) => <div key={i}>{l}</div>)}</div>
                <span className="pp-num">1</span>
              </section>

              {/* ---------- visa page ---------- */}
              <section className="pp-page pp-right">
                <svg className="pp-guilloche" viewBox="0 0 360 480" preserveAspectRatio="none" aria-hidden>
                  <Rosette x={300} y={90} r={85} color="#c9858a" petals={6} />
                  <Rosette x={50} y={330} r={55} color="#c9858a" petals={8} />
                  <Waves color="#c9858a" y={430} />
                </svg>
                <header className="pp-head"><span>{t('pp.visa')}</span><span>GEOPLAY</span></header>
                <div className="pp-h-row"><h2>{t('pp.visa')}</h2><span className="pp-code">VISAS</span></div>
                <div className="pp-visa">
                  {log ? (
                    <div className="pp-stamp" style={{ ['--ink' as string]: rank?.ink ?? '#9a5a2e' }}>
                      <svg viewBox="0 0 200 200" aria-hidden>
                        <defs><path id={`arc-${code}`} d="M30 100 A70 70 0 1 1 170 100" /></defs>
                        <circle cx="100" cy="100" r="88" className="ring" />
                        <circle cx="100" cy="100" r="78" className="ring thin" />
                        <text className="arc"><textPath href={`#arc-${code}`} startOffset="50%" textAnchor="middle">{nameEn.toUpperCase()} · GEOPLAY</textPath></text>
                        <text x="100" y="146" textAnchor="middle" className="date">{log.first || '★'}</text>
                        <text x="100" y="166" textAnchor="middle" className="tier">{rank ? t(`tier.${rank.id}`).toUpperCase() : ''}</text>
                      </svg>
                      <img src={flagUrl(code)} alt="" />
                    </div>
                  ) : (
                    <div className="pp-slot">
                      <span className="q">?</span>
                      <span>{name.toUpperCase()}</span>
                    </div>
                  )}
                </div>
                {log ? (
                  <div className="pp-visa-text">
                    <b>{t('pp.admitted')}</b>
                    <p>{log.game ? t('pp.via', { game: t(gameName(log.game)), date: firstDate }) : t('pp.earlier')}</p>
                    {rank && rank.id !== 'gold' && <p className="small">{t('pp.nextRank', { n: (rank.id === 'bronze' ? 3 : 6) - log.n })}</p>}
                  </div>
                ) : (
                  <div className="pp-visa-text">
                    <b>{t('pp.notYet')}</b>
                    <p>{t('pp.howTo', { name })}</p>
                    <Link href="/games" className="btn btn-primary btn-sm">{t('pp.pickGame')} →</Link>
                  </div>
                )}
                <span className="pp-num">2</span>
              </section>
            </>
          ) : (
            <>
              {/* ---------- map page ---------- */}
              <section className="pp-page pp-left">
                <header className="pp-head"><span>{t('pp.map')}</span><span>GEOPLAY</span></header>
                <div className="pp-h-row"><h2>{t('pp.mapTitle')}</h2><span className="pp-code">{a3}</span></div>
                {map ? (
                  <svg viewBox="0 0 360 340" className="pp-map">
                    <path d={map.sphere} className="sea" />
                    <path d={map.grat} className="grat" />
                    {map.others.map((o) => <path key={o.a2} d={o.d} className={o.near ? 'near' : 'land'} />)}
                    <path d={map.self} className="self" />
                    {map.dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.8} className="self" />)}
                  </svg>
                ) : <p className="muted">{t('common.loading')}</p>}
                <p className="pp-caption">{t('pp.mapCaption', { n: neighbours.length })}</p>
                <span className="pp-num">3</span>
              </section>

              {/* ---------- neighbours page ---------- */}
              <section className="pp-page pp-right">
                <header className="pp-head"><span>{t('pp.neighbours')}</span><span>GEOPLAY</span></header>
                <div className="pp-h-row"><h2>{t('pp.neighbours')}</h2><span className="pp-code">{neighbours.filter((n) => progress.stamps.includes(n)).length}/{neighbours.length}</span></div>
                {neighbours.length === 0 ? (
                  <p className="pp-caption">{t('pp.island')}</p>
                ) : (
                  <ul className="pp-neighbours">
                    {neighbours.map((n) => (
                      <li key={n}>
                        <button onClick={() => onNavigate(n)}>
                          <img src={flagUrl(n)} alt="" width={26} />
                          <span>{countryName(n, lang)}</span>
                          <i className={progress.stamps.includes(n) ? 'on' : ''}>{progress.stamps.includes(n) ? '✓' : '·'}</i>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <span className="pp-num">4</span>
              </section>
            </>
          )}
        </div>

        <button className="pp-arrow" disabled={spread === SPREADS - 1} onClick={() => setSpread((s) => s + 1)} aria-label="Next page">›</button>
      </div>

      <div className="pp-foot">
        <div className="pp-dots">
          {Array.from({ length: SPREADS }, (_, i) => (
            <button key={i} className={i === spread ? 'on' : ''} onClick={() => setSpread(i)} aria-label={`${pageLabels[i * 2]} · ${pageLabels[i * 2 + 1]}`} />
          ))}
        </div>
        <span>{pageLabels[spread * 2]} · {pageLabels[spread * 2 + 1]}</span>
      </div>
    </div>
  );
}
