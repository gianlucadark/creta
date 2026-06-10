/* Deterministic pre-processing of the mammoth HTML before it reaches the
   LLM: strips the docx table of contents and footnote reference markers,
   then splits the document into one chunk per main chapter (h1). Oversized
   chapters are further split at h2 (then element) boundaries so every chunk
   stays small enough for a full-fidelity, verbatim LLM mapping. */

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export type DocChunk = {
  /** Verbatim h1 title of the chapter this chunk belongs to. */
  chapter: string;
  /** 0-based part index within the chapter (chapters can span chunks). */
  part: number;
  /** Total number of chunks the chapter was split into. */
  parts: number;
  html: string;
};

export type DocStructure = {
  /** Title-page content found before the first h1 (TOC already removed). */
  coverHtml: string;
  chapters: { title: string; html: string }[];
  /** Cleaned heading outline (h1–h4) of the whole document. */
  headings: { level: number; text: string }[];
};

const TOC_TITLE = /^(sommario|indice|table of contents)$/i;

/** Remove TOC paragraphs and footnote reference markers ("[1]", "↑"). */
export function cleanDocumentHtml(rawHtml: string): string {
  const $ = cheerio.load(rawHtml, null, false);

  $("a").each((_, el) => {
    const a = $(el);
    const href = a.attr("href") ?? "";
    if (href.startsWith("#_Toc")) {
      const p = a.closest("p");
      // a TOC line is a paragraph whose entire text is the anchor's text
      if (p.length && p.text().trim() === a.text().trim()) p.remove();
      else a.replaceWith(a.text());
    } else if (href.startsWith("#footnote-ref-")) {
      a.remove(); // "↑" backlink inside the footnote list
    } else if (href.startsWith("#footnote-")) {
      a.remove(); // superscript "[n]" marker in the body text
    }
  });

  $("p").each((_, el) => {
    const p = $(el);
    if (TOC_TITLE.test(p.text().trim())) p.remove();
  });

  return $.html();
}

function nodeText($: cheerio.CheerioAPI, el: AnyNode): string {
  return $(el).text().replace(/\s+/g, " ").trim();
}

/** Split the cleaned HTML into the title page and one entry per h1 chapter. */
export function splitChapters(cleanHtml: string): DocStructure {
  const $ = cheerio.load(cleanHtml, null, false);
  const headings: DocStructure["headings"] = [];
  const chapters: { title: string; htmlParts: string[] }[] = [];
  const coverParts: string[] = [];

  for (const el of $.root().children().toArray()) {
    const tag = "tagName" in el ? el.tagName?.toLowerCase() : undefined;
    const headingMatch = tag ? /^h([1-4])$/.exec(tag) : null;
    if (headingMatch) {
      headings.push({ level: Number(headingMatch[1]), text: nodeText($, el) });
    }

    if (tag === "h1") {
      chapters.push({ title: nodeText($, el), htmlParts: [$.html(el)] });
      continue;
    }

    const target = chapters.length
      ? chapters[chapters.length - 1].htmlParts
      : coverParts;
    target.push($.html(el));
  }

  return {
    coverHtml: coverParts.join(""),
    chapters: chapters.map((chapter) => ({
      title: chapter.title || "Documento",
      html: chapter.htmlParts.join(""),
    })),
    headings,
  };
}

/** Group consecutive top-level elements into pieces of at most maxChars.
    Pieces are packed as full as possible (fewer pieces → fewer LLM calls);
    when a piece overflows, the cut moves back to the last h2/h3 boundary so
    splits stay semantic, and a trailing fragment too small to be worth its
    own call is merged back into the previous piece. */
function splitElements(
  elements: { html: string; isBoundary: boolean }[],
  maxChars: number
): string[] {
  const pieces: string[] = [];
  let current: { html: string; isBoundary: boolean }[] = [];
  let currentLen = 0;

  const flush = (els: { html: string }[]) => {
    if (els.length) pieces.push(els.map((el) => el.html).join(""));
  };

  for (const el of elements) {
    if (currentLen > 0 && currentLen + el.html.length > maxChars) {
      let cut = current.length; // current.length = no boundary found
      for (let i = current.length - 1; i > 0; i -= 1) {
        if (current[i].isBoundary) {
          cut = i;
          break;
        }
      }
      const head = current.slice(0, cut);
      const headLen = head.reduce((n, e) => n + e.html.length, 0);
      if (cut < current.length && headLen >= maxChars / 4) {
        flush(head);
        current = current.slice(cut);
        currentLen -= headLen;
      } else {
        flush(current);
        current = [];
        currentLen = 0;
      }
    }
    current.push(el);
    currentLen += el.html.length;
  }
  flush(current);

  while (
    pieces.length > 1 &&
    pieces[pieces.length - 1].length < maxChars / 6 &&
    pieces[pieces.length - 2].length + pieces[pieces.length - 1].length <= maxChars
  ) {
    const tail = pieces.pop()!;
    pieces[pieces.length - 1] += tail;
  }

  return pieces;
}

function chapterToPieces(chapterHtml: string, maxChars: number): string[] {
  if (chapterHtml.length <= maxChars) return [chapterHtml];

  const $ = cheerio.load(chapterHtml, null, false);
  const elements = $.root()
    .children()
    .toArray()
    .map((el) => ({
      html: $.html(el),
      isBoundary:
        "tagName" in el && /^h[23]$/i.test(el.tagName ?? ""),
    }));

  // first try to break at h2/h3 boundaries; re-split any oversized piece
  // at plain element boundaries so no chunk can exceed the budget
  return splitElements(elements, maxChars).flatMap((piece) => {
    if (piece.length <= maxChars) return [piece];
    const $$ = cheerio.load(piece, null, false);
    const flat = $$.root()
      .children()
      .toArray()
      .map((el) => ({ html: $$.html(el), isBoundary: false }));
    return splitElements(flat, maxChars);
  });
}

/** Turn the chapter list into LLM-sized chunks (one call each). */
export function buildChunks(
  structure: DocStructure,
  maxChars: number
): DocChunk[] {
  const chunks: DocChunk[] = [];
  const source = structure.chapters.length
    ? structure.chapters
    : [{ title: "Documento", html: structure.coverHtml }];

  for (const chapter of source) {
    const pieces = chapterToPieces(chapter.html, maxChars);
    pieces.forEach((html, part) => {
      chunks.push({ chapter: chapter.title, part, parts: pieces.length, html });
    });
  }
  return chunks;
}

/** Plain text of an HTML fragment, one line per block element. */
export function htmlToPlainText(html: string): string {
  const $ = cheerio.load(html, null, false);
  const lines: string[] = [];
  $.root()
    .children()
    .each((_, el) => {
      // table cells and list items each become their own line
      const block = $(el);
      const leaves = block.find("p, li, td, th");
      if (leaves.length) {
        leaves.each((__, leaf) => {
          const inner = $(leaf);
          if (inner.find("p, li").length) return; // keep only leaf nodes
          const text = inner.text().replace(/\s+/g, " ").trim();
          if (text) lines.push(text);
        });
      } else {
        const text = block.text().replace(/\s+/g, " ").trim();
        if (text) lines.push(text);
      }
    });
  return lines.join("\n");
}
