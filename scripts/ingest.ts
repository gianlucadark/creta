import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, basename, extname } from "path";
import mammoth from "mammoth";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { GEMINI_MODEL } from "@/lib/config";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { DocumentTreeSchema, BlockSchema } from "@/lib/schema";

// Load .env.local without adding a dependency
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([^#=][^=]*)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // .env.local not found — env vars must be set in the shell
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/ingest.ts <path-to-file.docx>");
    process.exit(1);
  }

  if (extname(filePath).toLowerCase() !== ".docx") {
    console.error("Only .docx files are supported.");
    process.exit(1);
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY. Add it to .env.local or export it in your shell."
    );
    process.exit(1);
  }

  const slug = basename(filePath, ".docx")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  console.log(`[creta] ingesting: ${filePath}`);
  console.log(`[creta] slug: ${slug}`);

  // Extract text
  const buffer = readFileSync(filePath);
  const { value: rawText } = await mammoth.extractRawText({ buffer });
  const text = rawText.replace(/\r\n/g, "\n").trim();

  if (!text) {
    console.error("[creta] Document appears empty or contains no readable text.");
    process.exit(1);
  }

  console.log(`[creta] extracted ${text.length} characters`);
  console.log(`[creta] calling Gemini (${GEMINI_MODEL})…`);

  // Call Gemini
  const result = await generateObject({
    model: google(GEMINI_MODEL),
    system: SYSTEM_PROMPT,
    prompt: `SOURCE DOCUMENT:\n\n${text}`,
    schema: DocumentTreeSchema,
  });

  // Validate and filter blocks
  const allBlocks = result.object?.blocks ?? [];
  const validBlocks = allBlocks.filter((block, i) => {
    const parsed = BlockSchema.safeParse(block);
    if (!parsed.success) {
      console.warn(`[creta] block ${i} failed validation, discarding:`, parsed.error.format());
    }
    return parsed.success;
  });

  const documentTree = { blocks: validBlocks };
  const finalParse = DocumentTreeSchema.safeParse(documentTree);
  if (!finalParse.success) {
    console.error("[creta] Final document tree is invalid:", finalParse.error.format());
    process.exit(1);
  }

  // Write to content/pages/<slug>.json
  const outDir = join(process.cwd(), "content", "pages");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${slug}.json`);
  writeFileSync(outPath, JSON.stringify(finalParse.data, null, 2), "utf8");

  console.log(`[creta] ✓ wrote ${validBlocks.length} blocks → ${outPath}`);
}

main().catch((err) => {
  console.error("[creta] fatal:", err);
  process.exit(1);
});
