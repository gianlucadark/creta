/* Pre-elaborazione deterministica dell'HTML prodotto da mammoth prima del
   passaggio al LLM: rimuove indice e rimandi alle note del docx, poi divide
   il documento in un chunk per capitolo principale (h1). I capitoli troppo
   grandi vengono divisi su h2 e poi sui singoli elementi, cosi' ogni chunk
   resta abbastanza piccolo per una mappatura fedele e verbatim. */

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export type DocChunk = {
  /** Titolo h1 verbatim del capitolo a cui appartiene il chunk. */
  chapter: string;
  /** Indice della parte nel capitolo, base 0; un capitolo puo' occupare piu' chunk. */
  part: number;
  /** Numero totale di chunk in cui e' stato diviso il capitolo. */
  parts: number;
  html: string;
};

export type DocStructure = {
  /** Contenuto della copertina prima del primo h1, con indice gia' rimosso. */
  coverHtml: string;
  chapters: { title: string; html: string }[];
  /** Scaletta pulita degli heading h1-h4 dell'intero documento. */
  headings: { level: number; text: string }[];
};

const TOC_TITLE = /^(sommario|indice|table of contents)$/i;

/** Rimuove paragrafi dell'indice e marcatori delle note ("[1]", "↑"). */
export function cleanDocumentHtml(rawHtml: string): string {
  const $ = cheerio.load(rawHtml, null, false);

  $("a").each((_, el) => {
    const a = $(el);
    const href = a.attr("href") ?? "";
    if (href.startsWith("#_Toc")) {
      const p = a.closest("p");
      // Una riga dell'indice e' un paragrafo composto solo dal testo del link.
      if (p.length && p.text().trim() === a.text().trim()) p.remove();
      else a.replaceWith(a.text());
    } else if (href.startsWith("#footnote-ref-")) {
      a.remove(); // Backlink "↑" dentro l'elenco delle note.
    } else if (href.startsWith("#footnote-")) {
      a.remove(); // Marcatore apice "[n]" nel corpo del testo.
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

/** Divide l'HTML pulito in copertina e un elemento per capitolo h1. */
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

/** Raggruppa elementi top-level consecutivi in parti al massimo di maxChars.
    Le parti vengono riempite il piu' possibile per ridurre le chiamate LLM;
    quando una parte supera il limite, il taglio torna all'ultimo h2/h3 per
    restare semantico. Un frammento finale troppo piccolo viene riassorbito
    nella parte precedente. */
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
      let cut = current.length; // current.length indica che non esiste un confine utile.
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

  // Prima prova i confini h2/h3; se una parte resta troppo grande,
  // la ridivide sui singoli elementi per rispettare il budget.
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

/** Trasforma l'elenco dei capitoli in chunk dimensionati per il LLM. */
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

export type OutlineSegment = {
  /** Indice nell'ordine del documento, base 0 (stabile per la selezione). */
  index: number;
  title: string;
  /** Livello dell'heading che apre il segmento (1-4): capitolo, sezione, ... */
  level: number;
  /** Caratteri del solo contenuto diretto del nodo (escluse le sotto-sezioni). */
  charCount: number;
  /** Heading + contenuto fino all'intestazione successiva (di qualsiasi livello).
      Concatenando i nodi scelti in ordine si ricostruisce la gerarchia. */
  html: string;
};

export type DocOutline = {
  /** Contenuto prima della prima intestazione (copertina). */
  coverHtml: string;
  segments: OutlineSegment[];
};

/** Scaletta gerarchica del documento: un nodo per ogni intestazione (h1-h4),
    cosi' l'utente puo' scegliere sia i capitoli sia le sezioni. Ogni nodo porta
    solo il proprio contenuto diretto (fino all'intestazione successiva, di
    qualunque livello); le sotto-sezioni sono nodi a se'. Concatenando in ordine
    i nodi selezionati si riottiene l'HTML originale ridotto, con la nidificazione
    intatta. La gerarchia (chi e' figlio di chi) si deduce dai livelli. */
export function outlineDocument(cleanHtml: string): DocOutline {
  const $ = cheerio.load(cleanHtml, null, false);
  const children = $.root().children().toArray();

  const coverParts: string[] = [];
  const segments: { title: string; level: number; htmlParts: string[] }[] = [];

  for (const el of children) {
    const tag = "tagName" in el ? el.tagName?.toLowerCase() : undefined;
    const match = tag ? /^h([1-4])$/.exec(tag) : null;
    if (match) {
      segments.push({
        title: nodeText($, el),
        level: Number(match[1]),
        htmlParts: [$.html(el)],
      });
      continue;
    }
    const target = segments.length
      ? segments[segments.length - 1].htmlParts
      : coverParts;
    target.push($.html(el));
  }

  return {
    coverHtml: coverParts.join(""),
    segments: segments.map((segment, index) => {
      const html = segment.htmlParts.join("");
      return {
        index,
        title: segment.title || "Sezione",
        level: segment.level,
        charCount: htmlToPlainText(html).length,
        html,
      };
    }),
  };
}

/** Testo semplice di un frammento HTML, una riga per blocco. */
export function htmlToPlainText(html: string): string {
  const $ = cheerio.load(html, null, false);
  const lines: string[] = [];
  $.root()
    .children()
    .each((_, el) => {
      // Celle di tabella ed elementi di lista diventano righe separate.
      const block = $(el);
      const leaves = block.find("p, li, td, th");
      if (leaves.length) {
        leaves.each((__, leaf) => {
          const inner = $(leaf);
          if (inner.find("p, li").length) return; // Mantiene solo i nodi foglia.
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
