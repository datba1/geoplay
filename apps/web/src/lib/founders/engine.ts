/**
 * Founders (Dựng Nước): a seasonal kingdom-building game on a generated continent.
 * Pure game logic, no React. Every function returns a new state.
 */
import { Delaunay } from 'd3-delaunay';
import { mulberry32, shuffle } from '@/lib/rng';
import type { Difficulty } from '@/lib/progress';
import { PETITIONS, type Effects, type Petition } from './petitions';

export const MAP_W = 1500;
export const MAP_H = 1000;
export const SEASONS = 16; // four years

export type Terrain = 'plains' | 'forest' | 'hills' | 'mountains' | 'desert' | 'marsh';
export type Building = 'farm' | 'mine' | 'market' | 'temple' | 'barracks' | 'port' | 'walls';
export type Res = 'gold' | 'food' | 'materials' | 'army';

export type Landmark = 'cave' | 'tree' | 'ruins' | 'dragon' | 'shrine' | 'oasis' | 'lighthouse';
export interface LandmarkInfo { kind: Landmark; name: string; looted: boolean }

export interface Province {
  id: number;
  name: string;
  poly: [number, number][];
  cx: number;
  cy: number;
  terrain: Terrain;
  coast: boolean;
  neighbors: number[];
  owner: number | null; // 0 = player, 1.. = rivals, null = free tribes
  buildings: Building[];
  tribe: number; // defence of free tribes
  landmark?: LandmarkInfo;
}

export interface Nation {
  id: number;
  name: string;
  color: string;
  flag: FlagSpec;
  capital: number;
  gold: number;
  food: number;
  materials: number;
  army: number;
  stability: number;
  relation: number; // rivals only: attitude to the player, -100..100
  pact: boolean;
  war: boolean;
  alive: boolean;
}

export interface FlagSpec { layout: 'v3' | 'h3' | 'cross' | 'diag' | 'canton'; colors: [string, string, string]; emblem: 'star' | 'sun' | 'diamond' | 'ring' | 'none' }

export interface LogLine { season: number; text: { en: string; vi: string }; tone: 'good' | 'bad' | 'info' }

export interface OpenPetition { id: string; petition: Petition }

export interface State {
  seed: number;
  difficulty: Difficulty;
  season: number; // 0-based; 0 = spring of year 1
  mandate: number;
  provinces: Province[];
  nations: Nation[];
  petitions: OpenPetition[];
  log: LogLine[];
  phase: 'found' | 'play' | 'over';
  lost: boolean;
  rng: number; // rolling seed for in-game randomness
}

/* ------------------------------------------------------------------ */
/* tables                                                              */
/* ------------------------------------------------------------------ */

export const YIELD: Record<Terrain, Partial<Record<Res, number>>> = {
  plains: { food: 3, gold: 1 },
  forest: { materials: 2, food: 1 },
  hills: { materials: 2, gold: 1 },
  mountains: { materials: 3 },
  desert: { gold: 2 },
  marsh: { food: 2 },
};

export const TRIBE_DEFENCE: Record<Terrain, number> = { plains: 4, forest: 6, hills: 7, mountains: 10, desert: 5, marsh: 6 };

export const BUILDINGS: Record<Building, { cost: Partial<Record<Res, number>>; yields: Partial<Record<Res, number>>; stability?: number; defence?: number; needs?: (p: Province) => boolean }> = {
  farm: { cost: { materials: 15, gold: 10 }, yields: { food: 4 }, needs: (p) => p.terrain !== 'mountains' && p.terrain !== 'desert' },
  mine: { cost: { gold: 20, materials: 5 }, yields: { materials: 4, gold: 1 }, needs: (p) => p.terrain === 'hills' || p.terrain === 'mountains' },
  market: { cost: { materials: 25 }, yields: { gold: 4 } },
  temple: { cost: { materials: 25, gold: 15 }, yields: {}, stability: 3 },
  barracks: { cost: { materials: 20, gold: 15 }, yields: { army: 2 } },
  port: { cost: { materials: 30 }, yields: { gold: 4, food: 1 }, needs: (p) => p.coast },
  walls: { cost: { materials: 30 }, yields: {}, defence: 6 },
};

/** What each landmark gives its owner. */
export const LANDMARKS: Record<Landmark, {
  fits: (p: Province) => boolean;
  yields?: Partial<Record<Res, number>>;
  stability?: number;
  treasure?: { gold?: number; stability?: number };
  tribeBonus?: number;
}> = {
  cave: { fits: (p) => p.terrain === 'hills' || p.terrain === 'mountains', yields: { materials: 2 } },
  tree: { fits: (p) => p.terrain === 'forest', stability: 2 },
  ruins: { fits: () => true, treasure: { gold: 40 }, tribeBonus: 3 },
  dragon: { fits: (p) => p.terrain === 'mountains' || p.terrain === 'hills', treasure: { gold: 80, stability: 6 }, tribeBonus: 12 },
  shrine: { fits: (p) => p.terrain === 'plains' || p.terrain === 'marsh', yields: { gold: 1 }, stability: 1 },
  oasis: { fits: (p) => p.terrain === 'desert', yields: { food: 3 } },
  lighthouse: { fits: (p) => p.coast, yields: { gold: 3 } },
};

export const RECRUIT = { cost: { gold: 15, food: 10 } as Partial<Record<Res, number>>, army: 6 };
export const GIFT_GOLD = 25;
export const PEACE_GOLD = 30;
export const SEASON_NAMES = { en: ['Spring', 'Summer', 'Autumn', 'Winter'], vi: ['Xuân', 'Hạ', 'Thu', 'Đông'] };

const PALETTE = ['#e0b84a', '#d0574f', '#4d8fd6', '#5fb07a', '#a46fd1', '#e08a3c', '#3fb3b0'];
const FLAG_COLORS = ['#c8102e', '#f2c230', '#1f4fa3', '#118a4b', '#f4f1e8', '#1b1b1b', '#7a2e8c', '#e06c1f', '#5fb3e8'];

const DIFF = {
  easy: { rivals: 2, aggression: 0.6, gold: 90, severity: 0.7 },
  normal: { rivals: 3, aggression: 1, gold: 65, severity: 1 },
  hard: { rivals: 4, aggression: 1.4, gold: 45, severity: 1.3 },
} as const;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clone = (s: State): State => structuredClone(s);

/** Deterministic random numbers that continue across turns. */
function roll(s: State) {
  const r = mulberry32(s.rng)();
  s.rng = (s.rng * 1664525 + 1013904223) >>> 0;
  return r;
}

function say(s: State, tone: LogLine['tone'], en: string, vi: string) {
  s.log.unshift({ season: s.season, text: { en, vi }, tone });
  s.log = s.log.slice(0, 40);
}

export const owned = (s: State, nation: number) => s.provinces.filter((p) => p.owner === nation);
export const player = (s: State) => s.nations[0];
export const canAfford = (n: Nation, cost: Partial<Record<Res, number>>) =>
  Object.entries(cost).every(([k, v]) => n[k as Res] >= (v ?? 0));
const pay = (n: Nation, cost: Partial<Record<Res, number>>) => {
  for (const [k, v] of Object.entries(cost)) n[k as Res] -= v ?? 0;
};
export const maxMandate = (s: State) => Math.min(10, 4 + Math.floor(owned(s, 0).length / 3));
export const buildSlots = (s: State, p: Province) => (p.id === player(s).capital ? 3 : 2);
export const claimCost = (s: State) => ({ gold: 8 + 2 * owned(s, 0).length });
export const defenceOf = (s: State, p: Province) => {
  if (p.owner === null) return p.tribe;
  const n = s.nations[p.owner];
  const walls = p.buildings.filter((b) => b === 'walls').length * BUILDINGS.walls.defence!;
  const garrison = n.army / Math.max(1, owned(s, n.id).length);
  return Math.round(3 + walls + garrison * (p.id === n.capital ? 1.5 : 1));
};

/* ------------------------------------------------------------------ */
/* map generation                                                      */
/* ------------------------------------------------------------------ */

const SYL = ['an', 'bel', 'cor', 'da', 'el', 'fen', 'gar', 'hal', 'ith', 'ka', 'lun', 'mor', 'nev', 'ol', 'pra', 'quen', 'ros', 'sul', 'tar', 'ul', 'vay', 'wen', 'yr', 'zan', 'mi', 'to', 're'];
const END = ['ia', 'or', 'en', 'ath', 'ar', 'eth', 'os', 'um', 'ira', 'and', 'el', 'is', 'ov', 'une'];

function makeName(rand: () => number, used: Set<string>) {
  for (let tries = 0; tries < 50; tries++) {
    const n = 1 + Math.floor(rand() * 2);
    let w = '';
    for (let i = 0; i < n; i++) w += SYL[Math.floor(rand() * SYL.length)];
    w += END[Math.floor(rand() * END.length)];
    w = w[0].toUpperCase() + w.slice(1);
    if (w.length <= 10 && !used.has(w)) {
      used.add(w);
      return w;
    }
  }
  return `Land ${used.size}`;
}

/** Smooth value noise on a coarse grid. */
function noise(rand: () => number, cells: number) {
  const g = Array.from({ length: (cells + 1) * (cells + 1) }, () => rand());
  return (x: number, y: number) => {
    const gx = x * cells;
    const gy = y * cells;
    const x0 = Math.min(cells - 1, Math.floor(gx));
    const y0 = Math.min(cells - 1, Math.floor(gy));
    const fx = gx - x0;
    const fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const at = (i: number, j: number) => g[j * (cells + 1) + i];
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

export function makeFlag(rand: () => number): FlagSpec {
  const cols = shuffle(FLAG_COLORS, rand);
  const layouts: FlagSpec['layout'][] = ['v3', 'h3', 'cross', 'diag', 'canton'];
  const emblems: FlagSpec['emblem'][] = ['star', 'sun', 'diamond', 'ring', 'none'];
  return { layout: layouts[Math.floor(rand() * layouts.length)], colors: [cols[0], cols[1], cols[2]], emblem: emblems[Math.floor(rand() * emblems.length)] };
}

export function generate(seed: number, difficulty: Difficulty): State {
  const rand = mulberry32(seed);
  const elevA = noise(rand, 4);
  const elevB = noise(rand, 9);
  const moist = noise(rand, 5);

  // Jittered grid of sites.
  const pts: [number, number][] = [];
  const COLS = 22;
  const ROWS = 15;
  for (let j = 0; j < ROWS; j++)
    for (let i = 0; i < COLS; i++)
      pts.push([((i + 0.2 + rand() * 0.6) / COLS) * MAP_W, ((j + 0.2 + rand() * 0.6) / ROWS) * MAP_H]);

  const delaunay = Delaunay.from(pts);
  const vor = delaunay.voronoi([0, 0, MAP_W, MAP_H]);

  const elevation = pts.map(([x, y]) => {
    const nx = x / MAP_W;
    const ny = y / MAP_H;
    const d = Math.hypot((nx - 0.5) * 1.15, (ny - 0.5) * 1.35) * 2; // 0 centre … ~1 edge
    // Keep a ring of open sea so the continent never runs off the map.
    const edge = Math.min(nx, 1 - nx, ny, 1 - ny);
    const shore = Math.max(0, 0.16 - edge) * 4;
    return elevA(nx, ny) * 0.65 + elevB(nx, ny) * 0.35 - d * 0.8 + 0.44 - shore;
  });
  const isLand = elevation.map((e) => e > 0.12);

  // Keep only the largest connected landmass.
  const comp = new Array(pts.length).fill(-1);
  let best = -1;
  let bestSize = 0;
  for (let i = 0; i < pts.length; i++) {
    if (!isLand[i] || comp[i] >= 0) continue;
    const stack = [i];
    comp[i] = i;
    let size = 0;
    while (stack.length) {
      const c = stack.pop()!;
      size++;
      for (const n of delaunay.neighbors(c)) if (isLand[n] && comp[n] < 0) { comp[n] = i; stack.push(n); }
    }
    if (size > bestSize) { bestSize = size; best = i; }
  }

  const used = new Set<string>();
  const ids = new Map<number, number>();
  const provinces: Province[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (comp[i] !== best) continue;
    const e = elevation[i];
    const m = moist(pts[i][0] / MAP_W, pts[i][1] / MAP_H);
    const terrain: Terrain = e > 0.8 ? 'mountains' : e > 0.55 ? 'hills' : m < 0.3 ? 'desert' : m > 0.68 ? (e < 0.25 ? 'marsh' : 'forest') : m > 0.52 ? 'forest' : 'plains';
    const poly = (vor.cellPolygon(i) ?? []).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as [number, number]);
    ids.set(i, provinces.length);
    provinces.push({
      id: provinces.length, name: makeName(rand, used), poly, cx: pts[i][0], cy: pts[i][1], terrain,
      coast: false, neighbors: [], owner: null, buildings: [], tribe: TRIBE_DEFENCE[terrain] + Math.floor(rand() * 3),
    });
  }
  for (const [site, pid] of ids) {
    const p = provinces[pid];
    for (const n of delaunay.neighbors(site)) {
      if (ids.has(n)) p.neighbors.push(ids.get(n)!);
      else p.coast = true;
    }
    // Cells touching the map edge also face the sea.
    if (p.poly.some(([x, y]) => x <= 0.5 || y <= 0.5 || x >= MAP_W - 0.5 || y >= MAP_H - 0.5)) p.coast = true;
  }

  // Landmarks: one dragon, then a scattering of the rest (about one province in nine).
  const order = shuffle(provinces, rand);
  const place = (kind: Landmark, count: number) => {
    for (const p of order) {
      if (count <= 0) break;
      if (p.landmark || !LANDMARKS[kind].fits(p)) continue;
      if (p.neighbors.some((n) => provinces[n].landmark)) continue; // keep them spread out
      p.landmark = { kind, name: makeName(rand, used), looted: false };
      p.tribe += LANDMARKS[kind].tribeBonus ?? 0;
      count--;
    }
  };
  const share = Math.max(1, Math.round(provinces.length / 50));
  place('dragon', 1);
  place('ruins', share * 2);
  place('cave', share * 2);
  place('tree', share * 2);
  place('shrine', share);
  place('oasis', share);
  place('lighthouse', share);

  const d = DIFF[difficulty];
  const nations: Nation[] = [];
  const nameRand = mulberry32(seed ^ 0x9e3779b9);
  const colors = shuffle(PALETTE.slice(1), nameRand);
  for (let n = 0; n <= d.rivals; n++) {
    nations.push({
      id: n, name: makeName(nameRand, used), color: n === 0 ? PALETTE[0] : colors[n - 1], flag: makeFlag(nameRand), capital: -1,
      gold: n === 0 ? d.gold : 40, food: 40, materials: n === 0 ? 30 : 20, army: n === 0 ? 10 : 8, stability: 60,
      relation: n === 0 ? 0 : Math.round(-10 + nameRand() * 30), pact: false, war: false, alive: true,
    });
  }

  return { seed, difficulty, season: 0, mandate: 0, provinces, nations, petitions: [], log: [], phase: 'found', lost: false, rng: (seed ^ 0x51ed27) >>> 0 };
}

/** Breadth-first hop distance between provinces. */
function hops(s: State, from: number) {
  const dist = new Array(s.provinces.length).fill(Infinity);
  dist[from] = 0;
  const q = [from];
  while (q.length) {
    const c = q.shift()!;
    for (const n of s.provinces[c].neighbors) if (dist[n] === Infinity) { dist[n] = dist[c] + 1; q.push(n); }
  }
  return dist;
}

/** The player picks a capital; rivals settle far away, spread apart. */
export function found(prev: State, pid: number): State {
  const s = clone(prev);
  const me = player(s);
  const cap = s.provinces[pid];
  cap.owner = 0;
  cap.buildings = [];
  me.capital = pid;
  const taken = [pid];
  for (const rival of s.nations.slice(1)) {
    const dists = taken.map((t) => hops(s, t));
    let bestP = -1;
    let bestD = -1;
    for (const p of s.provinces) {
      if (p.owner !== null) continue;
      const d = Math.min(...dists.map((dd) => dd[p.id]));
      if (d !== Infinity && d > bestD) { bestD = d; bestP = p.id; }
    }
    if (bestP < 0) { rival.alive = false; continue; }
    s.provinces[bestP].owner = rival.id;
    rival.capital = bestP;
    taken.push(bestP);
  }
  s.phase = 'play';
  s.mandate = maxMandate(s);
  say(s, 'good', `The realm of ${me.name} is founded. ${cap.name} is the capital.`, `Vương quốc ${me.name} ra đời. Kinh đô đặt tại ${cap.name}.`);
  drawPetitions(s);
  return s;
}

/* ------------------------------------------------------------------ */
/* player actions                                                      */
/* ------------------------------------------------------------------ */

export type ActionResult = { state: State; ok: boolean; reason?: string };

export function claim(prev: State, pid: number): ActionResult {
  const s = clone(prev);
  const me = player(s);
  const p = s.provinces[pid];
  if (p.owner !== null || !p.neighbors.some((n) => s.provinces[n].owner === 0)) return { state: prev, ok: false, reason: 'notAdjacent' };
  if (s.mandate < 2) return { state: prev, ok: false, reason: 'mandate' };
  const cost = claimCost(s);
  if (!canAfford(me, cost)) return { state: prev, ok: false, reason: 'gold' };
  if (me.army < p.tribe) return { state: prev, ok: false, reason: 'army' };
  pay(me, cost);
  s.mandate -= 2;
  me.army -= Math.ceil(p.tribe / 2);
  p.owner = 0;
  say(s, 'good', `${p.name} joins the realm.`, `${p.name} sáp nhập vào vương quốc.`);
  lootLandmark(s, p, me);
  return { state: s, ok: true };
}

export function build(prev: State, pid: number, b: Building): ActionResult {
  const s = clone(prev);
  const me = player(s);
  const p = s.provinces[pid];
  const spec = BUILDINGS[b];
  if (p.owner !== 0) return { state: prev, ok: false, reason: 'notOwned' };
  if (p.buildings.length >= buildSlots(s, p)) return { state: prev, ok: false, reason: 'slots' };
  if (spec.needs && !spec.needs(p)) return { state: prev, ok: false, reason: 'terrain' };
  if (b !== 'walls' && p.buildings.includes(b)) return { state: prev, ok: false, reason: 'duplicate' };
  if (s.mandate < 1) return { state: prev, ok: false, reason: 'mandate' };
  if (!canAfford(me, spec.cost)) return { state: prev, ok: false, reason: 'cost' };
  pay(me, spec.cost);
  s.mandate -= 1;
  p.buildings.push(b);
  return { state: s, ok: true };
}

export function recruit(prev: State): ActionResult {
  const s = clone(prev);
  const me = player(s);
  if (s.mandate < 1) return { state: prev, ok: false, reason: 'mandate' };
  if (!canAfford(me, RECRUIT.cost)) return { state: prev, ok: false, reason: 'cost' };
  pay(me, RECRUIT.cost);
  me.army += RECRUIT.army;
  s.mandate -= 1;
  return { state: s, ok: true };
}

export function gift(prev: State, nid: number): ActionResult {
  const s = clone(prev);
  const me = player(s);
  const n = s.nations[nid];
  if (s.mandate < 1) return { state: prev, ok: false, reason: 'mandate' };
  if (me.gold < GIFT_GOLD) return { state: prev, ok: false, reason: 'gold' };
  me.gold -= GIFT_GOLD;
  s.mandate -= 1;
  n.relation = clamp(n.relation + 18, -100, 100);
  n.gold += GIFT_GOLD;
  return { state: s, ok: true };
}

export function proposePact(prev: State, nid: number): ActionResult {
  const s = clone(prev);
  const n = s.nations[nid];
  if (s.mandate < 1) return { state: prev, ok: false, reason: 'mandate' };
  if (n.war || n.relation < 35) return { state: prev, ok: false, reason: 'relation' };
  s.mandate -= 1;
  n.pact = true;
  say(s, 'good', `A trade pact is signed with ${n.name}.`, `Ký hiệp ước thương mại với ${n.name}.`);
  return { state: s, ok: true };
}

export function declareWar(prev: State, nid: number): ActionResult {
  const s = clone(prev);
  const n = s.nations[nid];
  if (s.mandate < 1) return { state: prev, ok: false, reason: 'mandate' };
  s.mandate -= 1;
  n.war = true;
  n.pact = false;
  n.relation = clamp(n.relation - 50, -100, 100);
  player(s).stability -= 4;
  say(s, 'bad', `War is declared on ${n.name}.`, `Tuyên chiến với ${n.name}.`);
  return { state: s, ok: true };
}

export function makePeace(prev: State, nid: number): ActionResult {
  const s = clone(prev);
  const me = player(s);
  const n = s.nations[nid];
  if (s.mandate < 1) return { state: prev, ok: false, reason: 'mandate' };
  if (me.gold < PEACE_GOLD) return { state: prev, ok: false, reason: 'gold' };
  s.mandate -= 1;
  // A weaker or tired rival accepts more readily.
  const willing = n.army < me.army * 1.1 || roll(s) < 0.45;
  if (!willing) {
    say(s, 'bad', `${n.name} rejects peace.`, `${n.name} từ chối hòa ước.`);
    return { state: s, ok: false, reason: 'refused' };
  }
  me.gold -= PEACE_GOLD;
  n.war = false;
  n.relation = clamp(n.relation + 25, -100, 100);
  say(s, 'good', `Peace is made with ${n.name}.`, `Ký hòa ước với ${n.name}.`);
  return { state: s, ok: true };
}

export function attack(prev: State, pid: number): ActionResult {
  const s = clone(prev);
  const me = player(s);
  const p = s.provinces[pid];
  if (p.owner === null || p.owner === 0) return { state: prev, ok: false, reason: 'target' };
  const foe = s.nations[p.owner];
  if (!foe.war) return { state: prev, ok: false, reason: 'notAtWar' };
  if (!p.neighbors.some((n) => s.provinces[n].owner === 0)) return { state: prev, ok: false, reason: 'notAdjacent' };
  if (s.mandate < 2) return { state: prev, ok: false, reason: 'mandate' };
  s.mandate -= 2;
  const def = defenceOf(s, p);
  const strength = me.army * (0.75 + roll(s) * 0.5);
  if (strength > def) {
    me.army -= Math.ceil(def / 2);
    foe.army = Math.max(0, foe.army - Math.ceil(def / 3));
    p.owner = 0;
    p.buildings = p.buildings.filter((b) => b !== 'walls');
    say(s, 'good', `Our army takes ${p.name} from ${foe.name}.`, `Quân ta chiếm ${p.name} từ tay ${foe.name}.`);
    if (p.id === foe.capital) relocateCapital(s, foe);
    return { state: s, ok: true };
  }
  me.army = Math.floor(me.army * 0.7);
  say(s, 'bad', `The assault on ${p.name} fails.`, `Cuộc tấn công ${p.name} thất bại.`);
  return { state: s, ok: false, reason: 'lost' };
}

/** One-time treasure from ruins and dragon hoards. */
function lootLandmark(s: State, p: Province, n: Nation) {
  const lm = p.landmark;
  if (!lm || lm.looted) return;
  const t = LANDMARKS[lm.kind].treasure;
  if (!t) return;
  lm.looted = true;
  if (t.gold) n.gold += t.gold;
  if (t.stability) n.stability = clamp(n.stability + t.stability, 0, 100);
  if (n.id !== 0) return;
  if (lm.kind === 'dragon') say(s, 'good', `The dragon of ${lm.name} is driven off. Its hoard fills our treasury (+${t.gold} gold).`, `Rồng ở ${lm.name} bị đánh đuổi. Kho báu của nó làm đầy ngân khố (+${t.gold} vàng).`);
  else say(s, 'good', `Explorers search the ruins of ${lm.name} and find treasure (+${t.gold} gold).`, `Đoàn thám hiểm lục soát phế tích ${lm.name} và tìm được kho báu (+${t.gold} vàng).`);
}

function relocateCapital(s: State, n: Nation) {
  const rest = owned(s, n.id);
  if (!rest.length) {
    n.alive = false;
    say(s, 'info', `${n.name} has fallen.`, `${n.name} đã sụp đổ.`);
    return;
  }
  n.capital = rest[0].id;
}

/* ------------------------------------------------------------------ */
/* petitions                                                           */
/* ------------------------------------------------------------------ */

function drawPetitions(s: State) {
  const coast = owned(s, 0).some((p) => p.coast);
  const pool = PETITIONS.filter((p) => (!p.coast || coast) && (p.season === undefined || p.season === s.season % 4));
  const count = 2;
  const picked: OpenPetition[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 30 && picked.length < count; i++) {
    const pet = pool[Math.floor(roll(s) * pool.length)];
    if (seen.has(pet.id)) continue;
    seen.add(pet.id);
    picked.push({ id: `${s.season}-${pet.id}`, petition: pet });
  }
  s.petitions = picked;
}

export function answer(prev: State, petitionId: string, choice: 0 | 1): State {
  const s = clone(prev);
  const open = s.petitions.find((p) => p.id === petitionId);
  if (!open) return prev;
  const opt = open.petition.options[choice];
  applyEffects(s, opt.effects);
  s.petitions = s.petitions.filter((p) => p.id !== petitionId);
  say(s, 'info', opt.result.en, opt.result.vi);
  return s;
}

function applyEffects(s: State, e: Effects) {
  const me = player(s);
  const sev = DIFF[s.difficulty].severity;
  const scale = (v: number) => (v < 0 ? Math.round(v * sev) : v);
  if (e.gold) me.gold = Math.max(0, me.gold + scale(e.gold));
  if (e.food) me.food = Math.max(0, me.food + scale(e.food));
  if (e.materials) me.materials = Math.max(0, me.materials + scale(e.materials));
  if (e.army) me.army = Math.max(0, me.army + scale(e.army));
  if (e.stability) me.stability = clamp(me.stability + scale(e.stability), 0, 100);
  if (e.relations) for (const n of s.nations.slice(1)) n.relation = clamp(n.relation + e.relations, -100, 100);
}

/* ------------------------------------------------------------------ */
/* season end                                                          */
/* ------------------------------------------------------------------ */

export function income(s: State, nid: number) {
  const out: Record<Res, number> = { gold: 0, food: 0, materials: 0, army: 0 };
  let stab = 0;
  for (const p of owned(s, nid)) {
    for (const [k, v] of Object.entries(YIELD[p.terrain])) out[k as Res] += v ?? 0;
    if (p.coast) out.gold += 1;
    for (const b of p.buildings) {
      for (const [k, v] of Object.entries(BUILDINGS[b].yields)) out[k as Res] += v ?? 0;
      stab += BUILDINGS[b].stability ?? 0;
    }
    if (p.landmark) {
      const lm = LANDMARKS[p.landmark.kind];
      for (const [k, v] of Object.entries(lm.yields ?? {})) out[k as Res] += v ?? 0;
      stab += lm.stability ?? 0;
    }
  }
  const n = s.nations[nid];
  // The capital's palace and markets.
  if (n.capital >= 0) { out.gold += 5; out.food += 2; out.materials += 2; }
  const season = s.season % 4;
  if (season === 2) out.food = Math.round(out.food * 1.5); // harvest
  if (season === 3) out.food = Math.round(out.food * 0.5); // winter
  for (const r of s.nations.slice(1)) if (nid === 0 && r.pact && r.alive) out.gold += 3;
  const provinces = owned(s, nid).length;
  out.food -= provinces + Math.floor(n.army / 4);
  out.gold -= Math.floor(n.army / 3);
  return { ...out, stability: stab - Math.max(0, provinces - 6) * 0.5 };
}

export function endSeason(prev: State): State {
  const s = clone(prev);
  const me = player(s);
  const d = DIFF[s.difficulty];

  // Unanswered petitions make people feel unheard.
  if (s.petitions.length) {
    me.stability -= 2 * s.petitions.length;
    say(s, 'bad', 'Petitions went unanswered.', 'Có tấu chương bị bỏ qua.');
  }

  // Player economy.
  const inc = income(s, 0);
  me.gold += inc.gold;
  me.food += inc.food;
  me.materials += inc.materials;
  me.army += inc.army;
  me.stability = clamp(Math.round(me.stability + inc.stability - 1), 0, 100);
  if (me.food < 0) {
    me.food = 0;
    me.stability -= 8;
    me.army = Math.floor(me.army * 0.85);
    say(s, 'bad', 'Famine! The granaries are empty.', 'Nạn đói! Kho lương đã cạn.');
  }
  if (me.gold < 0) {
    me.gold = 0;
    me.army = Math.floor(me.army * 0.8);
    me.stability -= 6;
    say(s, 'bad', 'The treasury is empty; soldiers desert.', 'Ngân khố cạn, binh lính bỏ ngũ.');
  }
  if (me.stability < 15) {
    const outer = owned(s, 0).filter((p) => p.id !== me.capital);
    if (outer.length) {
      const lost = outer[Math.floor(roll(s) * outer.length)];
      lost.owner = null;
      lost.buildings = [];
      me.stability += 10;
      say(s, 'bad', `Unrest: ${lost.name} breaks away.`, `Bất ổn: ${lost.name} ly khai.`);
    }
  }

  // A free dragon raids the realm next door.
  for (const lair of s.provinces.filter((p) => p.landmark?.kind === 'dragon' && p.owner === null)) {
    const prey = lair.neighbors.map((n) => s.provinces[n]).filter((p) => p.owner === 0);
    if (prey.length && roll(s) < 0.3) {
      const hit = prey[Math.floor(roll(s) * prey.length)];
      me.food = Math.max(0, me.food - 10);
      me.stability = clamp(me.stability - 3, 0, 100);
      say(s, 'bad', `The dragon of ${lair.landmark!.name} burns the fields of ${hit.name}.`, `Rồng ở ${lair.landmark!.name} thiêu rụi ruộng đồng ở ${hit.name}.`);
    }
  }

  // Rivals.
  for (const r of s.nations.slice(1)) {
    if (!r.alive) continue;
    const mine = owned(s, r.id);
    r.gold += mine.length * 3;
    r.army += Math.round(mine.length * 0.55 * d.aggression + 1);
    // Expand into free land.
    const free = [...new Set(mine.flatMap((p) => p.neighbors))].map((i) => s.provinces[i]).filter((p) => p.owner === null);
    if (free.length && roll(s) < 0.42 * d.aggression) {
      const target = free.sort((a, b) => a.tribe - b.tribe)[0];
      if (r.army >= target.tribe) {
        r.army -= Math.ceil(target.tribe / 2);
        target.owner = r.id;
        lootLandmark(s, target, r);
      }
    }
    // Relations drift: borders breed friction, pacts build trust.
    const borders = mine.some((p) => p.neighbors.some((n) => s.provinces[n].owner === 0));
    r.relation = clamp(r.relation + (r.pact ? 2 : 0) - (borders ? 2 : 0), -100, 100);
    if (!r.war && !r.pact && borders && r.relation < -25 && r.army > me.army * 1.2 && roll(s) < 0.35 * d.aggression) {
      r.war = true;
      say(s, 'bad', `${r.name} declares war on us!`, `${r.name} tuyên chiến với ta!`);
    }
    // Attack a bordering player province.
    if (r.war && roll(s) < 0.6 * d.aggression) {
      const targets = owned(s, 0).filter((p) => p.neighbors.some((n) => s.provinces[n].owner === r.id));
      if (targets.length) {
        const target = targets.sort((a, b) => defenceOf(s, a) - defenceOf(s, b))[0];
        const def = defenceOf(s, target);
        const strength = r.army * 0.6 * (0.75 + roll(s) * 0.5);
        if (strength > def) {
          target.owner = r.id;
          target.buildings = target.buildings.filter((b) => b !== 'walls');
          r.army -= Math.ceil(def / 2);
          me.army = Math.floor(me.army * 0.85);
          me.stability -= 5;
          say(s, 'bad', `${r.name} seizes ${target.name}!`, `${r.name} chiếm ${target.name}!`);
          if (target.id === me.capital) {
            s.lost = true;
            s.phase = 'over';
            say(s, 'bad', 'The capital has fallen.', 'Kinh đô thất thủ.');
            return s;
          }
        } else {
          r.army = Math.floor(r.army * 0.7);
          say(s, 'good', `We hold ${target.name} against ${r.name}.`, `Ta giữ vững ${target.name} trước ${r.name}.`);
        }
      }
    }
  }

  s.season += 1;
  if (s.season >= SEASONS) {
    s.phase = 'over';
    return s;
  }
  s.mandate = maxMandate(s);
  drawPetitions(s);
  return s;
}

/* ------------------------------------------------------------------ */
/* scoring                                                             */
/* ------------------------------------------------------------------ */

export function scoreOf(s: State) {
  const me = player(s);
  const mine = owned(s, 0);
  const buildings = mine.reduce((n, p) => n + p.buildings.length, 0);
  const parts = {
    land: mine.length * 32,
    buildings: buildings * 10,
    stability: Math.round(me.stability * 1.5),
    treasury: Math.min(80, Math.floor((me.gold + me.food / 2 + me.materials / 2) / 6)),
    army: Math.min(60, Math.floor(me.army / 2)),
  };
  const total = s.lost ? Math.round(Object.values(parts).reduce((a, b) => a + b, 0) * 0.4) : Object.values(parts).reduce((a, b) => a + b, 0);
  return { total: Math.min(1000, total), parts };
}
