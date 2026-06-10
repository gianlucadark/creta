/* One-time seeding of the Vercel Blob store from the local JSON documents:
     npx tsx scripts/seed-blob.ts
   Loads BLOB_READ_WRITE_TOKEN from .env.local and uploads every file in
   content/pages as private pages/<slug>.json. Safe to re-run (overwrites). */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  loadEnvLocal();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "BLOB_READ_WRITE_TOKEN mancante. Copialo dal dashboard Vercel " +
        "(Storage → creta-blob → .env.local) oppure esegui `vercel env pull .env.local`."
    );
    process.exit(1);
  }

  const { put } = await import("@vercel/blob");

  const pagesDir = join(process.cwd(), "content", "pages");
  const files = readdirSync(pagesDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("Nessun documento in content/pages: niente da caricare.");
    return;
  }

  for (const file of files) {
    const json = readFileSync(join(pagesDir, file), "utf8");
    const { url } = await put(`pages/${file}`, json, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    console.log(`✔ ${file} → ${url}`);
  }

  console.log(`\n${files.length} documenti caricati sul Blob store.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
