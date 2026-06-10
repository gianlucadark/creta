/* Client-side reading progress, persisted in localStorage. No backend:
   the map lives in the browser and is matched against the library on render. */

const KEY = "creta:reading";

export type ReadingEntry = { pct: number; ts: number };
export type ReadingMap = Record<string, ReadingEntry>;

function parseMap(raw: string | null): ReadingMap {
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!parsed || typeof parsed !== "object") return {};
    const map: ReadingMap = {};
    for (const [slug, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof (entry as ReadingEntry).pct === "number" &&
        typeof (entry as ReadingEntry).ts === "number"
      ) {
        map[slug] = entry as ReadingEntry;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export function loadReading(): ReadingMap {
  if (typeof window === "undefined") return {};
  try {
    return parseMap(window.localStorage.getItem(KEY));
  } catch {
    return {};
  }
}

/* ── useSyncExternalStore adapters ───────────────────────────
   The snapshot is cached on the raw string so React sees a stable
   reference until the stored value actually changes. */

const EMPTY: ReadingMap = {};
let cachedRaw: string | null = null;
let cachedMap: ReadingMap = EMPTY;

export function readingSnapshot(): ReadingMap {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedMap = parseMap(raw);
  }
  return cachedMap;
}

export function readingServerSnapshot(): ReadingMap {
  return EMPTY;
}

export function subscribeReading(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function saveReading(slug: string, pct: number) {
  if (typeof window === "undefined") return;
  try {
    const map = loadReading();
    map[slug] = { pct: Math.min(1, Math.max(0, pct)), ts: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // storage full or blocked: reading progress is best-effort
  }
}

export function dropReading(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const map = loadReading();
    delete map[slug];
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
