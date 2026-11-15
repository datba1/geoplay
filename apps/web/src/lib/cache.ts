'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Small stale-while-revalidate cache for API data.
 * - Values live in memory and in localStorage, so repeat visits render instantly.
 * - A value younger than its TTL is used as is; older values are shown immediately
 *   and refreshed in the background.
 * - Concurrent requests for the same key share one network call.
 * - If the network fails, the last known value is kept.
 */
interface Entry<T> { t: number; v: T }

const PREFIX = 'geoplay.cache.';
const VERSION = 1;
const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<(v: unknown) => void>>();

function read<T>(key: string): Entry<T> | null {
  const m = memory.get(key);
  if (m) return m as Entry<T>;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const e = JSON.parse(raw) as Entry<T> & { ver?: number };
    if (e.ver !== VERSION) return null;
    memory.set(key, e);
    return e;
  } catch {
    return null;
  }
}

function write<T>(key: string, v: T) {
  const e = { t: Date.now(), v };
  memory.set(key, e);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ ...e, ver: VERSION }));
  } catch {
    // storage full or unavailable: memory cache still works
  }
  listeners.get(key)?.forEach((fn) => fn(v));
}

/** Fetches through the cache. Resolves with fresh data, or stale data if the network fails. */
export async function cachedFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>, force = false): Promise<T> {
  const hit = read<T>(key);
  if (hit && !force && Date.now() - hit.t < ttlMs) return hit.v;
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fetcher()
      .then((v) => { write(key, v); return v; })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  try {
    return await p;
  } catch (e) {
    if (hit) return hit.v;
    throw e;
  }
}

/** Warms the cache in the background (errors ignored). */
export function prefetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>) {
  const run = () => cachedFetch(key, ttlMs, fetcher).catch(() => {});
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) window.requestIdleCallback(run);
  else setTimeout(run, 200);
}

/** Drops cached entries whose key starts with a prefix (e.g. after submitting a score). */
export function invalidate(prefix: string) {
  for (const k of [...memory.keys()]) if (k.startsWith(prefix)) memory.delete(k);
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX + prefix)) localStorage.removeItem(k);
    }
  } catch {}
}

/**
 * React hook: returns cached data right away (even if stale), then the fresh value.
 * Pass `null` as key to skip fetching.
 */
export function useCached<T>(key: string | null, ttlMs: number, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const hit = read<T>(key);
    setData(hit?.v);
    setError(null);
    setLoading(!hit);

    const onUpdate = (v: unknown) => alive && setData(v as T);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(onUpdate);

    cachedFetch(key, ttlMs, () => fetcherRef.current())
      .then((v) => { if (alive) { setData(v); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e); setLoading(false); } });

    return () => {
      alive = false;
      listeners.get(key)?.delete(onUpdate);
    };
  }, [key, ttlMs]);

  return { data, error, loading };
}

export const TTL = {
  minute: 60_000,
  tenMinutes: 600_000,
  hour: 3_600_000,
  day: 86_400_000,
};
