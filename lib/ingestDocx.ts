/* Map-reduce ingest pipeline for PageDesign v2.

   The docx HTML is split into one chunk per main chapter (oversized
   chapters are sub-split), chunks are mapped to sections by parallel
   LLM calls, and every result is verified with a text-coverage check.
   A chunk whose mapping fails or drops content is retried and then
   rebuilt deterministically from its own HTML — so the final page
   always carries the whole document, chapter by chapter, no matter
   what the model does.

   To spend fewer calls without touching quality:
   - consecutive whole chapters that fit the chunk budget together share
     one call (multi-chapter prompt); a chapter that fails the coverage
     check inside a grouped call is re-run with the full single-chapter
     treatment, so the per-chapter guarantee is unchanged
   - the first call also produces the page header from the cover; the
     dedicated PAGE_META_PROMPT call remains only as fallback */

import mammoth from "mammoth";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { GEMINI_MODEL } from "./config";
import { chapterSystemPrompt, PAGE_META_PROMPT } from "./pageDesignPrompt";
import { extractJson } from "./extractJson";
import { normalizeDesignSections, type PageDesign } from "./schema";
import {
  buildChunks,
  cleanDocumentHtml,
  htmlToPlainText,
  splitChapters,
  type DocChunk,
} from "./docxHtml";
import { sectionsFromHtml } from "./htmlDesign";
import { coverageRatio, designText } from "./coverage";

const MAX_CHUNK_CHARS = 18_000;
const MIN_COVERAGE = 0.8;
const MAX_OUTPUT_TOKENS = 32_000;
const LLM_ATTEMPTS = 2;
const CONCURRENCY = 4;

export class EmptyDocumentError extends Error {}

export type IngestReport = {
  chunks: number;
  /** Gemini calls actually made (grouped calls + rescues + meta fallback). */
  llmCalls: number;
  llmChunks: number;
  fallbackChunks: number;
  /** Final per-chunk coverage ratios (0–1), in document order. */
  coverage: number[];
};

export type IngestResult = {
  design: PageDesign;
  engine: "gemini" | "fallback";
  report: IngestReport;
};

type Tally = { llmCalls: number };

function cleanText(text: string) {
  return text
    .replace(/ /g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

type Sections = PageDesign["sections"];

type ChunkResult = {
  sections: Sections;
  viaLlm: boolean;
  coverage: number;
};

/** Plan the LLM calls: one call per chunk, except that consecutive whole
    (single-part) chapters small enough to share the chunk budget ride
    together in one multi-chapter call. */
function buildCallGroups(chunks: DocChunk[], maxChars: number): DocChunk[][] {
  const groups: DocChunk[][] = [];
  let current: DocChunk[] = [];
  let currentLen = 0;

  const flush = () => {
    if (current.length) groups.push(current);
    current = [];
    currentLen = 0;
  };

  for (const chunk of chunks) {
    if (chunk.parts > 1) {
      // parts of a split chapter keep one call each: the continuation
      // merge in the reduce step relies on the single-chapter prompt
      flush();
      groups.push([chunk]);
      continue;
    }
    if (current.length && currentLen + chunk.html.length > maxChars) flush();
    current.push(chunk);
    currentLen += chunk.html.length;
  }
  flush();
  return groups;
}

function chunkUserPrompt(chunk: DocChunk): string {
  const partNote =
    chunk.parts > 1
      ? ` (part ${chunk.part + 1} of ${chunk.parts} — the other parts are processed separately)`
      : "";
  return [
    `CHAPTER: ${chunk.chapter}${partNote}`,
    "",
    "CHAPTER HTML:",
    chunk.html,
  ].join("\n");
}

function groupUserPrompt(group: DocChunk[], coverText?: string): string {
  const parts: string[] = [];
  if (coverText !== undefined) {
    parts.push("COVER (title page of the whole document):", coverText || "(none)", "");
  }
  if (group.length === 1) {
    parts.push(chunkUserPrompt(group[0]));
  } else {
    group.forEach((chunk, index) => {
      if (index > 0) parts.push("");
      parts.push(
        `=== CHAPTER ${index + 1} OF ${group.length}: ${chunk.chapter} ===`,
        "",
        chunk.html
      );
    });
  }
  return parts.join("\n");
}

/** Per-chunk raw sections out of a (possibly multi-chapter) response.
    A mismatched assignment is caught by the per-chapter coverage check. */
function rawSectionsByChunk(raw: unknown, group: DocChunk[]): unknown[] {
  if (group.length === 1) {
    if (Array.isArray(raw)) return [raw];
    return [(raw as { sections?: unknown })?.sections];
  }
  const fromKey = (raw as { chapters?: unknown })?.chapters;
  const entries: unknown[] = Array.isArray(fromKey)
    ? fromKey
    : Array.isArray(raw)
      ? raw
      : [];
  const norm = (value: string) => value.trim().toLowerCase();
  return group.map((chunk, index) => {
    const byTitle = entries.find(
      (entry) =>
        typeof (entry as { chapter?: unknown })?.chapter === "string" &&
        norm((entry as { chapter: string }).chapter) === norm(chunk.chapter)
    );
    const entry = (byTitle ?? entries[index]) as
      | { sections?: unknown }
      | undefined;
    return entry?.sections;
  });
}

async function mapChunk(
  chunk: DocChunk,
  hasKey: boolean,
  tally: Tally
): Promise<ChunkResult> {
  const sourceText = htmlToPlainText(chunk.html);

  if (hasKey) {
    for (let attempt = 1; attempt <= LLM_ATTEMPTS; attempt += 1) {
      try {
        tally.llmCalls += 1;
        const { text } = await generateText({
          model: google(GEMINI_MODEL),
          system: chapterSystemPrompt(1, false),
          temperature: 0.2,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          prompt: chunkUserPrompt(chunk),
        });

        const raw = extractJson(text);
        const rawSections = rawSectionsByChunk(raw, [chunk])[0];
        const sections = normalizeDesignSections(rawSections).map((section) => ({
          ...section,
          chapter: chunk.chapter,
        }));

        const coverage = coverageRatio(sourceText, designText(sections));
        if (sections.length > 0 && coverage >= MIN_COVERAGE) {
          return { sections, viaLlm: true, coverage };
        }
        console.warn(
          `[creta] chunk "${chunk.chapter}" #${chunk.part + 1}: coverage ${coverage.toFixed(2)} below ${MIN_COVERAGE} (attempt ${attempt}/${LLM_ATTEMPTS})`
        );
      } catch (error) {
        console.warn(
          `[creta] chunk "${chunk.chapter}" #${chunk.part + 1} failed (attempt ${attempt}/${LLM_ATTEMPTS}):`,
          error
        );
      }
    }
  }

  // guaranteed-coverage path: rebuild the chunk from its own HTML
  const sections = sectionsFromHtml(chunk.html, chunk.chapter).map((section) => ({
    ...section,
    chapter: chunk.chapter,
  }));
  return {
    sections,
    viaLlm: false,
    coverage: coverageRatio(sourceText, designText(sections)),
  };
}

/** One LLM call for a call group (single chunk needing the page header, or
    a batch of small whole chapters). Chapters that fail the coverage check
    fall back to the full single-chapter treatment. */
async function runGroup(
  group: DocChunk[],
  wantMeta: boolean,
  coverText: string,
  hasKey: boolean,
  tally: Tally
): Promise<{ perChunk: ChunkResult[]; page?: PageDesign["page"] }> {
  if (group.length === 1 && !wantMeta) {
    return { perChunk: [await mapChunk(group[0], hasKey, tally)] };
  }

  const perChunk: (ChunkResult | null)[] = group.map(() => null);
  let page: PageDesign["page"] | undefined;

  if (hasKey) {
    try {
      tally.llmCalls += 1;
      const { text } = await generateText({
        model: google(GEMINI_MODEL),
        system: chapterSystemPrompt(group.length, wantMeta),
        temperature: 0.2,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        prompt: groupUserPrompt(group, wantMeta ? coverText : undefined),
      });
      const raw = extractJson(text);
      if (wantMeta) {
        page = parsePageObject((raw as { page?: unknown })?.page) ?? undefined;
      }
      const rawSections = rawSectionsByChunk(raw, group);
      group.forEach((chunk, index) => {
        const sections = normalizeDesignSections(rawSections[index]).map(
          (section) => ({ ...section, chapter: chunk.chapter })
        );
        const coverage = coverageRatio(
          htmlToPlainText(chunk.html),
          designText(sections)
        );
        if (sections.length > 0 && coverage >= MIN_COVERAGE) {
          perChunk[index] = { sections, viaLlm: true, coverage };
        } else {
          console.warn(
            `[creta] grouped chunk "${chunk.chapter}": coverage ${coverage.toFixed(2)} below ${MIN_COVERAGE} — retrying individually`
          );
        }
      });
    } catch (error) {
      console.warn(
        `[creta] grouped call (${group.map((c) => `"${c.chapter}"`).join(", ")}) failed:`,
        error
      );
    }
  }

  for (let index = 0; index < group.length; index += 1) {
    if (!perChunk[index]) {
      perChunk[index] = await mapChunk(group[index], hasKey, tally);
    }
  }
  return { perChunk: perChunk as ChunkResult[], page };
}

function parsePageObject(value: unknown): PageDesign["page"] | null {
  const page = (value && typeof value === "object" ? value : null) as Record<
    string,
    unknown
  > | null;
  const title = typeof page?.title === "string" ? page.title.trim() : "";
  const summary = typeof page?.summary === "string" ? page.summary.trim() : "";
  if (!title || !summary) return null;
  return {
    title,
    summary,
    eyebrow:
      typeof page?.eyebrow === "string" && page.eyebrow.trim()
        ? page.eyebrow.trim()
        : "Documento",
    audience:
      typeof page?.audience === "string" && page.audience.trim()
        ? page.audience.trim()
        : undefined,
  };
}

function fallbackMeta(coverText: string, fullText: string): PageDesign["page"] {
  const lines = (coverText || fullText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const bodyLines = fullText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line.length > 60);
  return {
    title: lines[0]?.replace(/\*\*/g, "") ?? "Documento",
    eyebrow: "Documento",
    summary:
      bodyLines[0]?.slice(0, 520) ??
      "Documento importato da file Word e organizzato in una pagina web.",
  };
}

/** Dedicated page-header call — used only when the merged first call did
    not return a valid header. */
async function buildMeta(
  coverText: string,
  fullText: string,
  hasKey: boolean,
  tally: Tally
): Promise<PageDesign["page"]> {
  const fallback = fallbackMeta(coverText, fullText);
  if (!hasKey) return fallback;

  try {
    tally.llmCalls += 1;
    const { text } = await generateText({
      model: google(GEMINI_MODEL),
      system: PAGE_META_PROMPT,
      temperature: 0.2,
      maxOutputTokens: 2_000,
      prompt: [
        "COVER (title page):",
        coverText || "(none)",
        "",
        "DOCUMENT OPENING:",
        fullText.slice(0, 4_000),
      ].join("\n"),
    });
    const raw = extractJson(text) as { page?: unknown };
    return parsePageObject(raw?.page ?? raw) ?? fallback;
  } catch (error) {
    console.warn("[creta] page meta fallback:", error);
    return fallback;
  }
}

export async function ingestDocxBuffer(buffer: Buffer): Promise<IngestResult> {
  const { value: rawHtml } = await mammoth.convertToHtml({ buffer });
  const html = cleanDocumentHtml(cleanText(rawHtml));
  const fullText = htmlToPlainText(html);

  if (!fullText.trim()) {
    throw new EmptyDocumentError(
      "Il documento sembra vuoto o non contiene testo leggibile."
    );
  }

  const structure = splitChapters(html);
  const chunks = buildChunks(structure, MAX_CHUNK_CHARS);
  const groups = buildCallGroups(chunks, MAX_CHUNK_CHARS);
  const hasKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const coverText = htmlToPlainText(structure.coverHtml);
  const tally: Tally = { llmCalls: 0 };

  let mergedPage: PageDesign["page"] | null = null;
  const groupResults = await mapWithConcurrency(
    groups,
    CONCURRENCY,
    async (group, index) => {
      // the first call also produces the page header from the cover
      const wantMeta = index === 0 && hasKey;
      const result = await runGroup(group, wantMeta, coverText, hasKey, tally);
      if (result.page) mergedPage = result.page;
      return result.perChunk;
    }
  );
  const results = groupResults.flat();

  const page =
    mergedPage ?? (await buildMeta(coverText, fullText, hasKey, tally));

  // Reduce step: a continuation chunk that starts mid-section has no real
  // heading of its own, so the model titles its opening section with the
  // chapter name — merge those blocks into the previous section instead of
  // showing a duplicate chapter-titled section.
  const sections: Sections = [];
  results.forEach((result, index) => {
    const chunk = chunks[index];
    result.sections.forEach((section, sectionIndex) => {
      const previous = sections[sections.length - 1];
      const isContinuation =
        sectionIndex === 0 &&
        chunk.part > 0 &&
        section.title.trim().toLowerCase() === chunk.chapter.trim().toLowerCase() &&
        previous?.chapter === chunk.chapter;
      if (isContinuation) {
        previous.blocks.push(...section.blocks);
      } else {
        sections.push(section);
      }
    });
  });
  const llmChunks = results.filter((result) => result.viaLlm).length;

  const design: PageDesign = {
    version: 2,
    page,
    sections:
      sections.length > 0
        ? sections
        : [
            {
              title: "Contenuto",
              blocks: [{ type: "paragraph", text: fullText }],
            },
          ],
  };

  return {
    design,
    engine: llmChunks > 0 ? "gemini" : "fallback",
    report: {
      chunks: chunks.length,
      llmCalls: tally.llmCalls,
      llmChunks,
      fallbackChunks: chunks.length - llmChunks,
      coverage: results.map((result) => result.coverage),
    },
  };
}
