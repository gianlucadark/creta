/* Pipeline map-reduce di ingest per PageDesign v2.

   L'HTML del docx viene diviso in un chunk per capitolo principale, con
   ulteriori suddivisioni per capitoli troppo grandi. I chunk vengono mappati
   in sezioni con chiamate LLM parallele e ogni risultato passa da un controllo
   di copertura testuale. Se la mappatura fallisce o perde contenuto, il chunk
   viene ritentato e poi ricostruito in modo deterministico dal proprio HTML:
   la pagina finale contiene sempre tutto il documento, capitolo per capitolo.

   Per ridurre le chiamate senza perdere garanzie:
   - capitoli interi consecutivi che rientrano nel budget condividono una
     chiamata multi-capitolo; se un capitolo del gruppo non supera la copertura,
     viene rieseguito con il trattamento completo a capitolo singolo
   - la prima chiamata produce anche la testata della pagina dalla copertina;
     PAGE_META_PROMPT resta solo come fallback */

import mammoth from "mammoth";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { GEMINI_MODEL } from "./config";
import { chapterSystemPrompt, PAGE_META_PROMPT } from "./pageDesignPrompt";
import { extractJson } from "./extractJson";
import {
  normalizeDesignSections,
  sanitizePageDesign,
  type PageDesign,
} from "./schema";
import {
  buildChunks,
  cleanDocumentHtml,
  htmlToPlainText,
  outlineDocument,
  splitChapters,
  type DocChunk,
} from "./docxHtml";
import { imagesFromHtml, sectionsFromHtml } from "./htmlDesign";
import { coverageRatio, designText } from "./coverage";
import { authoredChaptersToHtml, type AuthoredChapter } from "./markdown";
import { storeImage } from "./assetsStore";

const MAX_CHUNK_CHARS = 18_000;
const MIN_COVERAGE = 0.8;
const MAX_OUTPUT_TOKENS = 32_000;
const LLM_ATTEMPTS = 2;
const CONCURRENCY = 4;

export class EmptyDocumentError extends Error {}

export type IngestReport = {
  chunks: number;
  /** Chiamate Gemini effettive: gruppi, recuperi e fallback dei metadati. */
  llmCalls: number;
  llmChunks: number;
  fallbackChunks: number;
  /** Copertura finale per chunk, da 0 a 1, nell'ordine del documento. */
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

/** Pianifica le chiamate LLM: una per chunk, tranne i capitoli interi
    consecutivi abbastanza piccoli da condividere il budget in una chiamata
    multi-capitolo. */
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
      // Le parti di un capitolo diviso mantengono una chiamata ciascuna:
      // il merge delle continuazioni dipende dal prompt a capitolo singolo.
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

/** Sezioni grezze per chunk da una risposta anche multi-capitolo.
    Un'assegnazione errata viene intercettata dal controllo di copertura. */
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

  // Percorso a copertura garantita: ricostruisce il chunk dal suo HTML.
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

/** Una chiamata LLM per gruppo: singolo chunk con testata pagina o lotto di
    capitoli piccoli. I capitoli che falliscono la copertura passano al
    trattamento completo a capitolo singolo. */
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

/** Chiamata dedicata per la testata, usata solo se la prima chiamata unificata
    non restituisce metadati validi. */
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

/** Segmento selezionabile prima della generazione (vedi outlineDocument). */
export type OutlineEntry = {
  index: number;
  title: string;
  level: number;
  charCount: number;
};

export type DocxOutline = {
  segments: OutlineEntry[];
  /** True se c'e' testo di copertina prima del primo segmento. */
  hasCover: boolean;
};

/** Passo 1 del flusso a due tempi: converte il docx e ne estrae la scaletta
    dei segmenti selezionabili senza alcuna chiamata LLM, cosi' l'utente puo'
    scegliere cosa importare prima della generazione (costosa). */
export async function analyzeDocxBuffer(buffer: Buffer): Promise<DocxOutline> {
  const { value: rawHtml } = await mammoth.convertToHtml({ buffer });
  const html = cleanDocumentHtml(cleanText(rawHtml));

  if (!htmlToPlainText(html).trim()) {
    throw new EmptyDocumentError(
      "Il documento sembra vuoto o non contiene testo leggibile."
    );
  }

  const outline = outlineDocument(html);
  return {
    segments: outline.segments.map(({ index, title, level, charCount }) => ({
      index,
      title,
      level,
      charCount,
    })),
    hasCover: Boolean(htmlToPlainText(outline.coverHtml).trim()),
  };
}

export type IngestOptions = {
  /** Indici dei segmenti da importare (gli altri vengono scartati). Assente
      o vuoto => tutto il documento. La copertina e' sempre inclusa. */
  segmentIndices?: number[];
  /** Slug del documento: serve a estrarre le immagini incorporate verso lo
      store (images/<slug>/...). Senza slug le immagini restano inline base64 e
      vengono ignorate, come prima. */
  slug?: string;
};

/** Converte il docx in HTML estraendo le immagini incorporate verso lo store:
    ogni <img> riceve una URL corta al posto del base64, così l'HTML che va al
    chunking/LLM resta leggero. Un upload fallito non blocca l'ingest: l'immagine
    viene semplicemente omessa (src vuoto, scartato a valle). */
async function docxToHtml(buffer: Buffer, slug?: string): Promise<string> {
  const convertImage = slug
    ? mammoth.images.imgElement(async (image) => {
        try {
          const data = await image.readAsBuffer();
          return { src: await storeImage(slug, data, image.contentType) };
        } catch (error) {
          console.warn(`[creta] immagine non salvata (slug "${slug}"):`, error);
          return { src: "" };
        }
      })
    : undefined;
  const { value: rawHtml } = await mammoth.convertToHtml({ buffer }, { convertImage });
  return cleanDocumentHtml(cleanText(rawHtml));
}

export async function ingestDocxBuffer(
  buffer: Buffer,
  options?: IngestOptions
): Promise<IngestResult> {
  const html = await docxToHtml(buffer, options?.slug);

  const indices = options?.segmentIndices;
  if (indices && indices.length > 0) {
    const outline = outlineDocument(html);
    const keep = new Set(indices);
    const selected = outline.segments.filter((segment) =>
      keep.has(segment.index)
    );
    // Ricostruisce l'HTML coi soli segmenti scelti + copertina: re-parsato da
    // designFromHtml riproduce esattamente la struttura originale ridotta.
    const filteredHtml =
      outline.coverHtml + selected.map((segment) => segment.html).join("");
    return designFromHtml(filteredHtml);
  }

  return designFromHtml(html);
}

export type AuthoredInput = {
  title: string;
  summary: string;
  eyebrow?: string;
  chapters: AuthoredChapter[];
};

/** Ingest di un documento scritto nell'app: i capitoli markdown diventano lo
    stesso HTML semantico del percorso docx. Titolo e sommario forniti
    dall'utente precompilano la testata e saltano il passaggio meta del LLM. */
export async function ingestAuthoredDocument(
  input: AuthoredInput
): Promise<IngestResult> {
  const html = authoredChaptersToHtml(input.chapters);
  const page: PageDesign["page"] = {
    title: input.title.trim(),
    summary: input.summary.trim(),
    eyebrow: input.eyebrow?.trim() || "Documento",
  };
  return designFromHtml(html, { page });
}

/** Nucleo della pipeline condiviso tra docx e documenti scritti nell'app:
    entra HTML semantico pulito, esce PageDesign. Con testata preimpostata
    ogni chiamata produce solo sezioni, senza inferenza dei metadati. */
export async function designFromHtml(
  html: string,
  preset?: { page: PageDesign["page"] }
): Promise<IngestResult> {
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

  const wantMetaFirst = !preset && hasKey;
  let mergedPage: PageDesign["page"] | null = null;
  const groupResults = await mapWithConcurrency(
    groups,
    CONCURRENCY,
    async (group, index) => {
      // La prima chiamata produce anche la testata partendo dalla copertina.
      const wantMeta = index === 0 && wantMetaFirst;
      const result = await runGroup(group, wantMeta, coverText, hasKey, tally);
      if (result.page) mergedPage = result.page;
      return result.perChunk;
    }
  );
  const results = groupResults.flat();

  // Ancoraggio immagini: il modello mappa solo il testo, quindi per i chunk
  // passati dall'LLM riattacchiamo ogni <img> alla sezione (h2/h3) di
  // appartenenza, accodandola ai suoi blocchi. I chunk ricostruiti dal fallback
  // hanno già le immagini posizionate da sectionsFromHtml: si saltano per non
  // duplicarle. Avviene prima del reduce, così le continuazioni le trasportano.
  results.forEach((result, index) => {
    if (!result.viaLlm || result.sections.length === 0) return;
    const anchored = imagesFromHtml(chunks[index].html, chunks[index].chapter);
    if (anchored.length === 0) return;
    const norm = (value: string) => value.trim().toLowerCase();
    for (const { sectionTitle, block } of anchored) {
      const target =
        result.sections.find((section) => norm(section.title) === norm(sectionTitle)) ??
        result.sections[0];
      target.blocks.push(block);
    }
  });

  const page =
    preset?.page ??
    mergedPage ??
    (await buildMeta(coverText, fullText, hasKey, tally));

  // Reduce: un chunk di continuazione parte a meta' sezione e non ha un
  // heading proprio; il modello tende a intitolarlo come il capitolo. Quei
  // blocchi vanno fusi nella sezione precedente per evitare duplicati.
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

  // Le sezioni sono gia' sanificate da normalizeDesignSections; qui copriamo
  // anche la testata prodotta dal LLM e gli eventuali tag inline vaganti.
  const design: PageDesign = sanitizePageDesign({
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
  });

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
