import { promises as fs } from "fs";
import { join } from "path";
import { createHash } from "crypto";

/* Storage server-only degli allegati scaricabili (script .ps1, .txt, …) di un
   documento. Stesso switch per chiamata di assetsStore.ts:
   - con BLOB_READ_WRITE_TOKEN (o OIDC su Vercel) → Vercel Blob ad accesso
     PRIVATO: il file è salvato in files/<slug>/<hash>.<ext> e servito dall'app
     via /api/files/<slug>/<name>
   - altrimenti (dev senza token) → filesystem sotto public/creta-files,
     anch'esso servito SOLO dalla route /api/files (mai come statico: gli
     allegati vanno sempre forzati al download, vedi la route)

   Il nome file è l'hash del contenuto: allegati identici non si duplicano. Il
   nome ORIGINALE non finisce nel percorso (può contenere caratteri arbitrari);
   viene conservato nel blocco `attachment` del PageDesign e usato in download. */

const FILES_DIR = join(process.cwd(), "public", "creta-files");
const BLOB_PREFIX = "files/";

/* Whitelist delle estensioni ammesse. Tenuta volutamente stretta: script e
   testo. Niente eseguibili compilati (.exe/.msi) né formati attivi (.html/.svg)
   che, serviti dalla stessa origine, potrebbero eseguire codice nel browser. */
export const ALLOWED_FILE_EXT = new Set([
  "ps1", "psm1", "psd1", "bat", "cmd", "sh", "bash", "zsh",
  "txt", "md", "json", "yaml", "yml", "csv", "tsv", "xml",
  "ini", "conf", "cfg", "env", "log", "pdf", "zip",
]);

function shouldUseBlobStore() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL)
  );
}

/** Estensione (minuscola, senza punto) dedotta dal nome file, "" se assente. */
export function extFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isAllowedFileName(name: string): boolean {
  return ALLOWED_FILE_EXT.has(extFromName(name));
}

function blobPath(slug: string, name: string) {
  return `${BLOB_PREFIX}${slug}/${name}`;
}

/** Risultato dello store: la URL con cui referenziare il file nel blocco
    `attachment` e i metadati utili a comporlo. */
export type StoredFile = { href: string; name: string; ext: string };

/** Carica un file nello store. `filename` è il nome originale: serve solo a
    ricavare l'estensione (il nome salvato è l'hash del contenuto). */
export async function storeFile(
  slug: string,
  data: Buffer,
  filename: string
): Promise<StoredFile> {
  const ext = extFromName(filename) || "bin";
  const hash = createHash("sha1").update(data).digest("hex").slice(0, 16);
  const name = `${hash}.${ext}`;

  if (shouldUseBlobStore()) {
    const path = blobPath(slug, name);
    const { put, head, BlobNotFoundError } = await import("@vercel/blob");
    // Idempotente: se il file è già caricato si salta il re-upload.
    try {
      await head(path);
      return { href: `/api/files/${slug}/${name}`, name, ext };
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) throw error;
    }
    await put(path, data, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      // Tipo neutro a riposo: la route forza comunque octet-stream + download.
      contentType: "application/octet-stream",
    });
    return { href: `/api/files/${slug}/${name}`, name, ext };
  }

  const dir = join(FILES_DIR, slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(join(dir, name), data);
  return { href: `/api/files/${slug}/${name}`, name, ext };
}

/** Corpo di un allegato salvato, per la route /api/files che lo serve dal blob
    privato. null se non esiste. */
export async function readFile(
  slug: string,
  name: string
): Promise<{ body: ReadableStream | ArrayBuffer } | null> {
  if (shouldUseBlobStore()) {
    const { get } = await import("@vercel/blob");
    const result = await get(blobPath(slug, name), {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode === 304 || !result.stream) return null;
    return { body: result.stream };
  }

  try {
    const data = await fs.readFile(join(FILES_DIR, slug, name));
    const body = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
    return { body };
  } catch {
    return null;
  }
}

/** Rimuove un allegato dallo store (best-effort: l'assenza non è un errore). */
export async function deleteFile(slug: string, name: string): Promise<void> {
  if (shouldUseBlobStore()) {
    const { del } = await import("@vercel/blob");
    await del(blobPath(slug, name)).catch(() => {});
    return;
  }
  await fs.rm(join(FILES_DIR, slug, name), { force: true }).catch(() => {});
}
