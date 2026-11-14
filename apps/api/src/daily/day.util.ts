/** Minutes east of UTC used to decide when a new daily set starts (default UTC+7). */
const offsetMinutes = () => Number(process.env.DAILY_TZ_OFFSET_MINUTES ?? 420);

export function dayKey(date = new Date()): string {
  const shifted = new Date(date.getTime() + offsetMinutes() * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** UTC instant at which the next daily set starts. */
export function nextReset(date = new Date()): Date {
  const key = dayKey(date);
  const startOfDayUtc = Date.parse(`${key}T00:00:00Z`) - offsetMinutes() * 60_000;
  return new Date(startOfDayUtc + 24 * 3600_000);
}

/** Small deterministic PRNG (mulberry32) seeded from a string. */
export function seededRandom(seedText: string) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
