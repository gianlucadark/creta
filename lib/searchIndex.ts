import {
  PageDesignSchema,
  DocumentTreeSchema,
  sanitizePageDesign,
  type PageDesign,
  type PageDesignBlock,
} from "./schema";
import { sectionAnchor } from "./anchors";
import { listPageFiles, readPageRaw } from "./pagesStore";

/* Indice full-text server-only sullo store dei documenti. Viene costruito
   pigramente e tenuto in cache di modulo, con chiave basata su elenco file e
   mtime: ogni request paga una scansione dello store e rilegge i JSON solo
   quando cambiano. Nessun database: lo store JSON e' il database. */

export type LibraryDoc = {
  slug: string;
  title: string;
  summary: string;
  eyebrow: string;
  sectionCount: number;
  chapterCount: number;
  readingMinutes: number;
  displayDate: string;
  mtime: number;
};

type SectionEntry = {
  slug: string;
  docTitle: string;
  title: string;
  chapter?: string;
  anchor: string;
  /** Testo semplice della sezione, senza markup inline. */
  text: string;
};

type LibraryIndex = { docs: LibraryDoc[]; sections: SectionEntry[] };

export type SectionHit = {
  slug: string;
  docTitle: string;
  title: string;
  chapter?: string;
  anchor: string;
  snippet: string;
};

export type SearchResponse = {
  query: string;
  docs: Pick<
    LibraryDoc,
    "slug" | "title" | "eyebrow" | "summary" | "sectionCount" | "readingMinutes"
  >[];
  sections: SectionHit[];
};

const WPM = 200;

/** Riduce la notazione inline leggera (`code`, **bold**) a testo semplice. */
function stripInline(text: string) {
  return text.replace(/[`*]/g, "");
}

function blockText(block: PageDesignBlock): string {
  switch (block.type) {
    case "paragraph":
      return block.text;
    case "callout":
      return [block.title, block.text].filter(Boolean).join(" ");
    case "code":
      return [block.title, block.code].filter(Boolean).join(" ");
    case "table":
      return [block.title, ...block.headers, ...block.rows.flat()]
        .filter(Boolean)
        .join(" ");
    case "quote":
      return [block.text, block.attribution].filter(Boolean).join(" ");
    case "stats":
      return [
        block.title,
        ...block.items.flatMap((item) => [item.value, item.label, item.hint]),
      ]
        .filter(Boolean)
        .join(" ");
    case "checklist":
    case "list":
      return [block.title, ...block.items].filter(Boolean).join(" ");
    case "steps":
    case "timeline":
    case "cards":
    case "feature":
    case "accordion":
      return [
        block.title,
        ...block.items.flatMap((item) => [item.title, item.text]),
      ]
        .filter(Boolean)
        .join(" ");
    case "image":
      return [block.alt, block.caption].filter(Boolean).join(" ");
  }
}

function wordCount(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function designReadingMinutes(design: PageDesign) {
  const words = design.sections.reduce(
    (sum, section) =>
      sum +
      wordCount(
        [section.title, section.intro ?? "", ...section.blocks.map(blockText)].join(" ")
      ),
    0
  );
  return Math.max(1, Math.round(words / WPM));
}

function formatDate(mtime: number) {
  return new Date(mtime).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Raccoglie ogni stringa annidata in un documento legacy v1. */
function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

let cache: { key: string; index: LibraryIndex } | null = null;

export async function getLibraryIndex(): Promise<LibraryIndex> {
  let files: { slug: string; mtime: number }[] = [];
  try {
    files = await listPageFiles();
  } catch {
    return { docs: [], sections: [] };
  }

  const key = files.map((f) => `${f.slug}:${f.mtime}`).join("|");
  if (cache && cache.key === key) return cache.index;

  const docs: LibraryDoc[] = [];
  const sections: SectionEntry[] = [];

  // Letture parallele: sul backend Blob ogni read e' una fetch di rete.
  const contents = await Promise.all(
    files.map((file) => readPageRaw(file.slug).catch(() => null))
  );

  for (const [i, file] of files.entries()) {
    const slug = file.slug;
    const raw = contents[i];
    if (raw === null) continue;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      continue;
    }

    const design = PageDesignSchema.safeParse(json);
    if (design.success) {
      const sanitized = sanitizePageDesign(design.data);
      const { page, sections: docSections } = sanitized;
      const chapters = new Set(
        docSections.map((s) => s.chapter).filter(Boolean)
      );
      docs.push({
        slug,
        title: page.title,
        summary: page.summary,
        eyebrow: page.eyebrow ?? "Documento",
        sectionCount: docSections.length,
        chapterCount: chapters.size,
        readingMinutes: designReadingMinutes(sanitized),
        displayDate: formatDate(file.mtime),
        mtime: file.mtime,
      });
      docSections.forEach((section, index) => {
        sections.push({
          slug,
          docTitle: page.title,
          title: section.title,
          chapter: section.chapter,
          anchor: sectionAnchor(section.title, index),
          text: stripInline(
            [section.intro ?? "", ...section.blocks.map(blockText)].join(" ")
          ),
        });
      });
      continue;
    }

    const legacy = DocumentTreeSchema.safeParse(json);
    if (legacy.success) {
      const hero = legacy.data.blocks.find((b) => b.component === "PageHero");
      const text = collectStrings(legacy.data).join(" ");
      docs.push({
        slug,
        title:
          hero && hero.component === "PageHero" ? hero.props.title : slug,
        summary:
          hero && hero.component === "PageHero" ? hero.props.intro : "",
        eyebrow: "Documento",
        sectionCount: legacy.data.blocks.length,
        chapterCount: 0,
        readingMinutes: Math.max(1, Math.round(wordCount(text) / WPM)),
        displayDate: formatDate(file.mtime),
        mtime: file.mtime,
      });
    }
  }

  docs.sort((a, b) => b.mtime - a.mtime);

  const index = { docs, sections };
  cache = { key, index };
  return index;
}

/* ── Ricerca ────────────────────────────────────────────────── */

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function makeSnippet(text: string, term: string, radius = 90) {
  const at = normalize(text).indexOf(term);
  if (at < 0) return text.slice(0, radius * 2).trimEnd() + (text.length > radius * 2 ? "…" : "");
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + term.length + radius);
  return (
    (start > 0 ? "…" : "") +
    text.slice(start, end).trim() +
    (end < text.length ? "…" : "")
  );
}

const pickDoc = (doc: LibraryDoc) => ({
  slug: doc.slug,
  title: doc.title,
  eyebrow: doc.eyebrow,
  summary: doc.summary,
  sectionCount: doc.sectionCount,
  readingMinutes: doc.readingMinutes,
});

export async function searchLibrary(
  rawQuery: string
): Promise<SearchResponse> {
  const { docs, sections } = await getLibraryIndex();
  const query = rawQuery.trim().slice(0, 120);
  const terms = normalize(query).split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return { query, docs: docs.map(pickDoc), sections: [] };
  }

  const docHits = docs.filter((doc) => {
    const haystack = normalize(`${doc.title} ${doc.eyebrow} ${doc.summary}`);
    return terms.every((term) => haystack.includes(term));
  });

  const sectionHits = sections
    .map((section) => {
      const inTitle = normalize(
        `${section.title} ${section.chapter ?? ""}`
      );
      const inText = normalize(section.text);
      let score = 0;
      for (const term of terms) {
        if (inTitle.includes(term)) score += 3;
        else if (inText.includes(term)) score += 1;
        else return null; // Ogni termine deve comparire almeno una volta.
      }
      return { section, score };
    })
    .filter((hit): hit is { section: SectionEntry; score: number } => hit !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ section }) => ({
      slug: section.slug,
      docTitle: section.docTitle,
      title: section.title,
      chapter: section.chapter,
      anchor: section.anchor,
      snippet: makeSnippet(section.text, terms[0]),
    }));

  return {
    query,
    docs: docHits.slice(0, 6).map(pickDoc),
    sections: sectionHits,
  };
}
