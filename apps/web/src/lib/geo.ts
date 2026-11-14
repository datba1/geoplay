import { geoArea, geoCentroid } from 'd3-geo';
import { feature, neighbors as topoNeighbors } from 'topojson-client';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import vi from 'i18n-iso-countries/langs/vi.json';

countries.registerLocale(en);
countries.registerLocale(vi);

const EARTH_RADIUS_KM = 6371.0088;

export type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }>;

export interface Country {
  /** ISO 3166-1 alpha-2, upper case */
  a2: string;
  /** English name from the map data (fallback) */
  mapName: string;
  feature: CountryFeature;
  areaKm2: number;
  centroid: [number, number];
}

export interface World {
  countries: Country[];
  byA2: Map<string, Country>;
  land: Feature<MultiPolygon>;
  /** Countries sharing a border (plus a few short sea straits). */
  neighbors: Map<string, Set<string>>;
}

/** Short sea crossings treated as borders so island countries can join board games. */
const STRAITS: [string, string][] = [
  ['GB', 'FR'], ['DK', 'SE'], ['FI', 'EE'], ['ES', 'MA'], ['IT', 'TN'], ['MG', 'MZ'],
  ['JP', 'KR'], ['LK', 'IN'], ['TW', 'CN'], ['PH', 'MY'], ['PH', 'TW'], ['ID', 'PH'], ['SG', 'MY'],
  ['YE', 'DJ'], ['SA', 'EG'], ['CU', 'US'], ['AU', 'PG'], ['NZ', 'AU'],
];

let worldPromise: Promise<World> | null = null;

export function loadWorld(): Promise<World> {
  if (!worldPromise) {
    worldPromise = (async () => {
      const [cTopo, lTopo] = await Promise.all([
        fetch('/geo/countries-110m.json').then((r) => r.json() as Promise<Topology>),
        fetch('/geo/land-110m.json').then((r) => r.json() as Promise<Topology>),
      ]);
      const geoms = cTopo.objects.countries as GeometryCollection<{ name: string }>;
      const fc = feature(cTopo, geoms);
      const nb = topoNeighbors(geoms.geometries);
      const indexA2: (string | null)[] = (fc.features as CountryFeature[]).map((f) =>
        f.id === undefined ? null : countries.numericToAlpha2(String(f.id)) ?? null,
      );
      const neighbors = new Map<string, Set<string>>();
      const link = (a: string, b: string) => {
        if (a === b) return;
        if (!neighbors.has(a)) neighbors.set(a, new Set());
        if (!neighbors.has(b)) neighbors.set(b, new Set());
        neighbors.get(a)!.add(b);
        neighbors.get(b)!.add(a);
      };
      nb.forEach((list, i) => {
        const a = indexA2[i];
        if (a) for (const j of list) { const b = indexA2[j]; if (b) link(a, b); }
      });
      const list: Country[] = [];
      for (const f of fc.features as CountryFeature[]) {
        if (f.id === undefined) continue;
        const a2 = countries.numericToAlpha2(String(f.id));
        if (!a2) continue;
        list.push({
          a2,
          mapName: f.properties.name,
          feature: f,
          areaKm2: geoArea(f) * EARTH_RADIUS_KM ** 2,
          centroid: geoCentroid(f) as [number, number],
        });
      }
      const landFc = feature(lTopo, lTopo.objects.land as GeometryCollection);
      const land = (landFc.features[0] ?? landFc) as unknown as Feature<MultiPolygon>;
      const byA2 = new Map(list.map((c) => [c.a2, c]));
      for (const [a, b] of STRAITS) if (byA2.has(a) && byA2.has(b)) link(a, b);
      return { countries: list, byA2, land, neighbors };
    })();
  }
  return worldPromise;
}

/** Everyday short names where the ISO list is long or ambiguous. */
const SHORT: Record<string, Record<string, string>> = {
  en: {
    KR: 'South Korea', KP: 'North Korea', LA: 'Laos', SY: 'Syria', CD: 'DR Congo', CG: 'Republic of the Congo',
    MD: 'Moldova', TZ: 'Tanzania', GB: 'United Kingdom', US: 'United States', IR: 'Iran', VN: 'Vietnam', BO: 'Bolivia',
    VE: 'Venezuela', RU: 'Russia', TW: 'Taiwan', CN: 'China', PS: 'Palestine', BN: 'Brunei', CI: 'Côte d’Ivoire',
    SZ: 'Eswatini', TL: 'Timor-Leste', FK: 'Falkland Islands', EH: 'Western Sahara', MK: 'North Macedonia',
  },
  vi: {
    LA: 'Lào', IR: 'Iran', SY: 'Syria', CD: 'CHDC Congo', CG: 'Cộng hòa Congo', TZ: 'Tanzania', MD: 'Moldova',
    CZ: 'Séc', US: 'Hoa Kỳ', GB: 'Anh', RU: 'Nga', KR: 'Hàn Quốc', KP: 'Triều Tiên', TW: 'Đài Loan',
  },
};

export function countryName(a2: string, lang: string, fallback?: string): string {
  return SHORT[lang]?.[a2] ?? countries.getName(a2, lang, { select: 'alias' }) ?? countries.getName(a2, lang) ?? fallback ?? a2;
}

/** The biggest ring-set of a (multi)polygon, e.g. mainland France without French Guiana. */
export function largestPolygon(f: CountryFeature): Feature<Polygon> {
  if (f.geometry.type === 'Polygon') return f as Feature<Polygon>;
  let best: Feature<Polygon> | null = null;
  let bestArea = -1;
  for (const coords of f.geometry.coordinates) {
    const poly: Feature<Polygon> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: coords } };
    const a = geoArea(poly);
    if (a > bestArea) {
      bestArea = a;
      best = poly;
    }
  }
  return best!;
}

export const flagUrl = (a2: string) => `/flags/4x3/${a2.toLowerCase()}.svg`;

export const formatKm2 = (n: number, lang: string) => {
  const rounded = n >= 10_000 ? Math.round(n / 1000) * 1000 : Math.round(n);
  return `${rounded.toLocaleString(lang)} km²`;
};
