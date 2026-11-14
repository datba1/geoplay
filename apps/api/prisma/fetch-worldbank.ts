/**
 * Downloads the latest World Bank value for every country and indicator in
 * src/stats/indicators.ts and stores it in the CountryStat table.
 *
 *   npm run data:worldbank
 *
 * Data: World Bank Open Data (CC BY 4.0), https://data.worldbank.org
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { INDICATORS } from '../src/stats/indicators';

const BASE = 'https://api.worldbank.org/v2';
const FIRST_YEAR = 2012;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

interface WbCountry { id: string; iso2Code: string; region: { value: string } }
interface WbRow { countryiso3code: string; date: string; value: number | null }

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('unreachable');
}

/** ISO3 -> ISO2 for real economies (aggregates such as "World" are dropped). */
async function loadCountries() {
  const [, rows] = await getJson<[unknown, WbCountry[]]>(`${BASE}/country?format=json&per_page=500`);
  const map = new Map<string, string>();
  for (const c of rows) {
    if (c.region?.value === 'Aggregates' || !/^[A-Z]{2}$/.test(c.iso2Code)) continue;
    map.set(c.id, c.iso2Code);
  }
  return map;
}

/** Latest non-null value per country for one World Bank indicator code. */
async function latest(code: string, iso3to2: Map<string, string>) {
  const year = new Date().getFullYear();
  const url = `${BASE}/country/all/indicator/${code}?format=json&date=${FIRST_YEAR}:${year}&per_page=20000`;
  const [, rows] = await getJson<[unknown, WbRow[] | null]>(url);
  const out = new Map<string, { year: number; value: number }>();
  for (const r of rows ?? []) {
    const iso2 = iso3to2.get(r.countryiso3code);
    if (!iso2 || r.value === null) continue;
    const y = Number(r.date);
    const prev = out.get(iso2);
    if (!prev || y > prev.year) out.set(iso2, { year: y, value: r.value });
  }
  return out;
}

async function main() {
  const iso3to2 = await loadCountries();
  console.log(`World Bank economies: ${iso3to2.size}`);
  const population = await latest('SP.POP.TOTL', iso3to2);

  for (const ind of INDICATORS) {
    let values = ind.code === 'SP.POP.TOTL' ? population : await latest(ind.code, iso3to2);
    if (ind.percentOfPopulation) {
      const derived = new Map<string, { year: number; value: number }>();
      for (const [iso2, v] of values) {
        const pop = population.get(iso2);
        if (pop) derived.set(iso2, { year: v.year, value: (v.value / 100) * pop.value });
      }
      values = derived;
    }
    const data = [...values].filter(([, v]) => v.value > 0).map(([iso2, v]) => ({ iso2, indicator: ind.slug, year: v.year, value: v.value }));
    await prisma.$transaction([
      prisma.countryStat.deleteMany({ where: { indicator: ind.slug } }),
      prisma.countryStat.createMany({ data }),
    ]);
    console.log(`${ind.slug.padEnd(12)} ${String(data.length).padStart(3)} countries`);
  }
}

main()
  .catch((e) => {
    console.error('World Bank import failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
