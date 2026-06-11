import { promises as fs } from "fs";
import { join } from "path";
import { PageDesignSchema, sanitizePageDesign, type PageDesign } from "./schema";

/* Server-only access to the JSON document store.
   Two interchangeable backends behind the same async API:
   - local filesystem (content/pages) when no Blob credentials are configured
   - Vercel Blob (pathname pages/<slug>.json) with either a read-write token
     or Vercel's OIDC runtime credentials for the connected BLOB_STORE_ID.
   The switch is per-call: normal local dev stays on files, while Vercel uses
   the persistent private Blob store. */

const PAGES_DIR = join(process.cwd(), "content", "pages");
const BLOB_PREFIX = "pages/";

/* In-memory TTL cache over the Blob backend only: every list/get/head is a
   billable network call, so warm serverless instances reuse what they have
   already fetched. Mutations update the cache in place, so reads after a
   write/delete on the same instance are always fresh; staleness across
   instances is bounded by the TTL. The filesystem backend stays uncached
   (local dev must see files changed on disk, e.g. by scripts/reingest.ts).

   The cache lives on globalThis: in dev the bundler compiles route handlers
   and pages into separate module graphs, each with its own module instance —
   a write through one instance must be visible to reads through the others,
   or a just-saved change stays invisible for a whole TTL. */
const CACHE_TTL_MS = 60_000;

type StoreCache = {
  list: { at: number; files: PageFile[] } | null;
  reads: Map<string, { at: number; raw: string | null }>;
};

const storeCache: StoreCache = ((
  globalThis as typeof globalThis & { __cretaPagesCache?: StoreCache }
).__cretaPagesCache ??= { list: null, reads: new Map() });

function cacheRead(slug: string, raw: string | null) {
  storeCache.reads.set(slug, { at: Date.now(), raw });
}

function freshRead(slug: string) {
  const hit = storeCache.reads.get(slug);
  return hit && Date.now() - hit.at < CACHE_TTL_MS ? hit : null;
}

function shouldUseBlobStore() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL)
  );
}

function blobPath(slug: string) {
  return `${BLOB_PREFIX}${slug}.json`;
}

function isEnoent(error: unknown) {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export type PageFile = { slug: string; mtime: number };

/** List the stored documents with their last-modified time. */
export async function listPageFiles(): Promise<PageFile[]> {
  if (shouldUseBlobStore()) {
    if (storeCache.list && Date.now() - storeCache.list.at < CACHE_TTL_MS) {
      return storeCache.list.files;
    }
    const { list } = await import("@vercel/blob");
    const blobs: Awaited<ReturnType<typeof list>>["blobs"] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: BLOB_PREFIX, cursor });
      blobs.push(...page.blobs);
      cursor = page.cursor;
      if (!page.hasMore) break;
    } while (cursor);

    const files = blobs
      .filter((blob) => blob.pathname.endsWith(".json"))
      .map((blob) => ({
        slug: blob.pathname
          .slice(BLOB_PREFIX.length)
          .replace(/\.json$/, ""),
        mtime: blob.uploadedAt.getTime(),
      }));
    storeCache.list = { at: Date.now(), files };
    return files;
  }

  try {
    const names = (await fs.readdir(PAGES_DIR)).filter((f) =>
      f.endsWith(".json")
    );
    return await Promise.all(
      names.map(async (name) => ({
        slug: name.replace(/\.json$/, ""),
        mtime: (await fs.stat(join(PAGES_DIR, name))).mtimeMs,
      }))
    );
  } catch (error) {
    if (isEnoent(error)) return [];
    throw error;
  }
}

/** Raw JSON text of a stored document, or null when it doesn't exist. */
export async function readPageRaw(slug: string): Promise<string | null> {
  if (shouldUseBlobStore()) {
    const hit = freshRead(slug);
    if (hit) return hit.raw;
    const { get } = await import("@vercel/blob");
    const result = await get(blobPath(slug), {
      access: "private",
      useCache: false,
    });
    const raw =
      !result || result.statusCode === 304 || !result.stream
        ? null
        : await new Response(result.stream).text();
    cacheRead(slug, raw);
    return raw;
  }

  try {
    return await fs.readFile(join(PAGES_DIR, `${slug}.json`), "utf8");
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }
}

export type ReadPageResult =
  | { status: "ok"; design: PageDesign }
  | { status: "not-found" }
  | { status: "not-v2" };

export async function readPageDesign(slug: string): Promise<ReadPageResult> {
  const raw = await readPageRaw(slug);
  if (raw === null) return { status: "not-found" };

  try {
    const parsed = PageDesignSchema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { status: "ok", design: sanitizePageDesign(parsed.data) }
      : { status: "not-v2" };
  } catch {
    return { status: "not-v2" };
  }
}

export async function writePageDesign(slug: string, design: PageDesign) {
  const json = JSON.stringify(design, null, 2);

  if (shouldUseBlobStore()) {
    const { put } = await import("@vercel/blob");
    await put(blobPath(slug), json, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    cacheRead(slug, json);
    storeCache.list = null;
    return;
  }

  await fs.mkdir(PAGES_DIR, { recursive: true });
  await fs.writeFile(join(PAGES_DIR, `${slug}.json`), json, "utf8");
}

/** Delete a stored document. Returns false when it didn't exist. */
export async function deletePage(slug: string): Promise<boolean> {
  if (shouldUseBlobStore()) {
    if (!(await pageExists(slug))) return false;
    const { del } = await import("@vercel/blob");
    await del(blobPath(slug));
    cacheRead(slug, null);
    storeCache.list = null;
    return true;
  }

  try {
    await fs.unlink(join(PAGES_DIR, `${slug}.json`));
    return true;
  } catch (error) {
    if (isEnoent(error)) return false;
    throw error;
  }
}

export async function pageExists(slug: string): Promise<boolean> {
  if (shouldUseBlobStore()) {
    const hit = freshRead(slug);
    if (hit) return hit.raw !== null;
    if (storeCache.list && Date.now() - storeCache.list.at < CACHE_TTL_MS) {
      return storeCache.list.files.some((file) => file.slug === slug);
    }
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    try {
      await head(blobPath(slug));
      return true;
    } catch (error) {
      if (error instanceof BlobNotFoundError) return false;
      throw error;
    }
  }

  try {
    await fs.access(join(PAGES_DIR, `${slug}.json`));
    return true;
  } catch {
    return false;
  }
}

/** First free slug among base, base-2, base-3, … One fresh listing instead
    of a head call per candidate — and no stale cache right before a write. */
export async function uniqueSlug(base: string): Promise<string> {
  storeCache.list = null;
  const taken = new Set((await listPageFiles()).map((file) => file.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
