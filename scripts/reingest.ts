/* Re-runs the PageDesign v2 ingest pipeline on a .docx file from the CLI:
     npx tsx scripts/reingest.ts <file.docx>
   Loads GOOGLE_GENERATIVE_AI_API_KEY from .env.local and writes
   content/pages/<slug>.json, printing the per-chunk coverage report. */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";

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

function slugify(fileName: string) {
  return (
    fileName
      .replace(/\.docx$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "document"
  );
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Uso: npx tsx scripts/reingest.ts <file.docx>");
    process.exit(1);
  }

  loadEnvLocal();
  const { ingestDocxBuffer } = await import("../lib/ingestDocx");

  const buffer = readFileSync(filePath);
  const slug = slugify(basename(filePath));
  const { design, engine, report } = await ingestDocxBuffer(buffer, { slug });
  const outDir = join(process.cwd(), "content", "pages");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${slug}.json`);
  writeFileSync(outPath, JSON.stringify(design, null, 2), "utf8");

  console.log(`✔ ${outPath}`);
  console.log(`  engine: ${engine}`);
  console.log(`  chunks: ${report.chunks} (LLM ${report.llmChunks}, fallback ${report.fallbackChunks})`);
  console.log(`  chiamate Gemini: ${report.llmCalls}`);
  console.log(`  coverage: ${report.coverage.map((c) => c.toFixed(2)).join("  ")}`);
  console.log(`  sezioni: ${design.sections.length}`);
  for (const section of design.sections) {
    console.log(`    [${section.chapter ?? "—"}] ${section.title} (${section.blocks.length} blocchi)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
