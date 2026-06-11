import { promises as fs } from "fs";
import { dirname, join } from "path";
import {
  CollectionsConfigSchema,
  EMPTY_COLLECTIONS,
  normalizeCollections,
  type CollectionsConfig,
} from "./collections";
import { shouldUseBlobStore } from "./pagesStore";

/* Store server-only della config delle rubriche: un singolo JSON con lo
   stesso doppio backend dei documenti (vedi pagesStore.ts).
   - filesystem: content/collections.json (fuori da content/pages, così
     listPageFiles non lo scambia per un documento)
   - Vercel Blob: pathname meta/collections.json (fuori dal prefisso pages/) */

const FS_PATH = join(process.cwd(), "content", "collections.json");
const BLOB_PATH = "meta/collections.json";

/* Cache TTL solo per il backend Blob, come in pagesStore: la home legge la
   config a ogni visita e ogni get è una chiamata di rete fatturabile. Vive su
   globalThis perché in dev route handler e page hanno istanze di modulo
   separate. */
const CACHE_TTL_MS = 60_000;

type CollectionsCache = { hit: { at: number; config: CollectionsConfig } | null };

const cache: CollectionsCache = ((
  globalThis as typeof globalThis & { __cretaCollectionsCache?: CollectionsCache }
).__cretaCollectionsCache ??= { hit: null });

function parseConfig(raw: string | null): CollectionsConfig {
  if (raw === null) return EMPTY_COLLECTIONS;
  try {
    const parsed = CollectionsConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? normalizeCollections(parsed.data) : EMPTY_COLLECTIONS;
  } catch {
    return EMPTY_COLLECTIONS;
  }
}

/** Config delle rubriche salvata; vuota se assente o illeggibile. */
export async function readCollections(): Promise<CollectionsConfig> {
  if (shouldUseBlobStore()) {
    if (cache.hit && Date.now() - cache.hit.at < CACHE_TTL_MS) {
      return cache.hit.config;
    }
    let raw: string | null = null;
    try {
      const { get } = await import("@vercel/blob");
      const result = await get(BLOB_PATH, { access: "private", useCache: false });
      raw =
        !result || result.statusCode === 304 || !result.stream
          ? null
          : await new Response(result.stream).text();
    } catch {
      raw = null;
    }
    const config = parseConfig(raw);
    cache.hit = { at: Date.now(), config };
    return config;
  }

  try {
    return parseConfig(await fs.readFile(FS_PATH, "utf8"));
  } catch {
    return EMPTY_COLLECTIONS;
  }
}

export async function writeCollections(config: CollectionsConfig) {
  const normalized = normalizeCollections(config);
  const json = JSON.stringify(normalized, null, 2);

  if (shouldUseBlobStore()) {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATH, json, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    cache.hit = { at: Date.now(), config: normalized };
    return normalized;
  }

  await fs.mkdir(dirname(FS_PATH), { recursive: true });
  await fs.writeFile(FS_PATH, json, "utf8");
  return normalized;
}
