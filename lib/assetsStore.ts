import { promises as fs } from "fs";
import { join } from "path";
import { createHash } from "crypto";

/* Storage server-only degli asset binari (immagini) estratti dai documenti.
   Stesso switch di pagesStore.ts, per chiamata:
   - con BLOB_READ_WRITE_TOKEN (o OIDC su Vercel) → Vercel Blob. Lo store è
     configurato ad accesso PRIVATO (come i JSON), quindi non esistono URL CDN
     pubbliche: l'immagine viene salvata in images/<slug>/<hash>.<ext> e servita
     dall'app via /api/assets/<slug>/<name> (readImage + route)
   - altrimenti (dev senza token) → filesystem sotto public/creta-assets,
     servito staticamente da Next con percorso /creta-assets/<slug>/<name>

   Il nome file è l'hash del contenuto: immagini identiche non si duplicano e la
   stessa immagine re-ingestata riusa lo stesso percorso (operazione idempotente). */

const PUBLIC_DIR = join(process.cwd(), "public", "creta-assets");
const BLOB_PREFIX = "images/";

function shouldUseBlobStore() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL)
  );
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-emf": "emf",
  "image/x-wmf": "wmf",
};

const TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  tiff: "image/tiff",
  emf: "image/x-emf",
  wmf: "image/x-wmf",
};

function extFor(contentType: string): string {
  return EXT_BY_TYPE[contentType.toLowerCase().split(";")[0].trim()] ?? "bin";
}

/** Content-type da dedurre dall'estensione del nome (la route non rilegge i
    metadati del blob: l'estensione la controlliamo noi all'upload). */
export function imageContentType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXT[ext] ?? "application/octet-stream";
}

function blobPath(slug: string, name: string) {
  return `${BLOB_PREFIX}${slug}/${name}`;
}

/** Carica un'immagine nello store e restituisce la URL con cui referenziarla
    dentro un blocco `image` del PageDesign. */
export async function storeImage(
  slug: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const hash = createHash("sha1").update(data).digest("hex").slice(0, 16);
  const name = `${hash}.${extFor(contentType)}`;

  if (shouldUseBlobStore()) {
    const path = blobPath(slug, name);
    const { put, head, BlobNotFoundError } = await import("@vercel/blob");
    // Idempotente: se l'immagine è già caricata si salta il re-upload.
    try {
      await head(path);
      return `/api/assets/${slug}/${name}`;
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) throw error;
    }
    await put(path, data, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return `/api/assets/${slug}/${name}`;
  }

  const dir = join(PUBLIC_DIR, slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(join(dir, name), data);
  return `/creta-assets/${slug}/${name}`;
}

/** Corpo di un'immagine salvata, per la route /api/assets che la serve dal
    blob privato. null se non esiste. */
export async function readImage(
  slug: string,
  name: string
): Promise<{ body: ReadableStream | ArrayBuffer; contentType: string } | null> {
  if (shouldUseBlobStore()) {
    const { get } = await import("@vercel/blob");
    const result = await get(blobPath(slug, name), {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode === 304 || !result.stream) return null;
    return { body: result.stream, contentType: imageContentType(name) };
  }

  try {
    const data = await fs.readFile(join(PUBLIC_DIR, slug, name));
    const body = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
    return { body, contentType: imageContentType(name) };
  } catch {
    return null;
  }
}
