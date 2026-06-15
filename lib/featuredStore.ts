import { promises as fs } from "fs";
import { dirname, join } from "path";
import { isValidSlug } from "./slug";
import { shouldUseBlobStore } from "./pagesStore";

/* Store server-only del documento "in evidenza" scelto a mano: un singolo
   JSON { slug } con lo stesso doppio backend di rubriche e documenti
   (vedi collectionsStore.ts / pagesStore.ts).
   - filesystem: content/featured.json (fuori da content/pages)
   - Vercel Blob: pathname meta/featured.json (fuori dal prefisso pages/)
   slug assente/non valido = nessuna scelta manuale: la home ricade
   sull'ultimo documento caricato. */

const FS_PATH = join(process.cwd(), "content", "featured.json");
const BLOB_PATH = "meta/featured.json";

/* Cache TTL solo per il backend Blob, come in collectionsStore: la home legge
   la scelta a ogni visita e ogni get è una chiamata di rete fatturabile. Vive
   su globalThis perché in dev route handler e page hanno istanze separate. */
const CACHE_TTL_MS = 60_000;

type FeaturedCache = { hit: { at: number; slug: string | null } | null };

const cache: FeaturedCache = ((
  globalThis as typeof globalThis & { __cretaFeaturedCache?: FeaturedCache }
).__cretaFeaturedCache ??= { hit: null });

function parseFeatured(raw: string | null): string | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as { slug?: unknown };
    const slug = typeof parsed.slug === "string" ? parsed.slug : null;
    return slug && isValidSlug(slug) ? slug : null;
  } catch {
    return null;
  }
}

/** Slug del documento messo in evidenza a mano; null se assente o illeggibile. */
export async function readFeatured(): Promise<string | null> {
  if (shouldUseBlobStore()) {
    if (cache.hit && Date.now() - cache.hit.at < CACHE_TTL_MS) {
      return cache.hit.slug;
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
    const slug = parseFeatured(raw);
    cache.hit = { at: Date.now(), slug };
    return slug;
  }

  try {
    return parseFeatured(await fs.readFile(FS_PATH, "utf8"));
  } catch {
    return null;
  }
}

export async function writeFeatured(slug: string | null): Promise<string | null> {
  const clean = slug && isValidSlug(slug) ? slug : null;
  const json = JSON.stringify({ slug: clean }, null, 2);

  if (shouldUseBlobStore()) {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATH, json, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    cache.hit = { at: Date.now(), slug: clean };
    return clean;
  }

  await fs.mkdir(dirname(FS_PATH), { recursive: true });
  await fs.writeFile(FS_PATH, json, "utf8");
  return clean;
}
