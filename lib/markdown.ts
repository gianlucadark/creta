/* Light markdown → semantic HTML converter for documents written in the
   app (/scrivi). Produces the same HTML shape the docx pipeline emits
   (h1 = chapter, h2/h3 = sections, p/ul/ol/table/pre blocks) so authored
   text flows through the exact ingest pipeline used for .docx files.

   Inline notation (`code`, **bold**) is NOT converted: it passes through
   verbatim because it is already the pipeline's native light markup —
   the LLM prompt mandates it and InlineText renders it. Text content is
   only HTML-escaped, never rewritten. */

export type AuthoredChapter = { title: string; markdown: string };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^\s*[-*+]\s+(.*)$/;
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/;
const FENCE_RE = /^\s*```/;
/* GFM table separator: |---|:---:|--- (at least one dash run). */
const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => escapeHtml(cell.trim()));
}

/** Convert one chapter body. Headings are clamped to h2–h4: an emitted
    <h1> would create a phantom chapter in splitChapters. */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${paragraph.join(" ")}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((item) => `<li>${item}</li>`).join("");
      out.push(`<${list.tag}>${items}</${list.tag}>`);
      list = null;
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (FENCE_RE.test(line)) {
      flushAll();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE_RE.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      const body = code.join("\n").replace(/\s+$/, "");
      if (body.trim()) out.push(`<pre><code>${escapeHtml(body)}</code></pre>`);
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushAll();
      const text = escapeHtml(heading[2].trim());
      if (!text) continue;
      const level = Math.min(Math.max(heading[1].length, 2), 4);
      out.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      lines[i + 1].includes("-") &&
      TABLE_SEPARATOR_RE.test(lines[i + 1])
    ) {
      flushAll();
      const headers = tableCells(line);
      const rows: string[][] = [];
      i += 2; // skip the separator line
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(tableCells(lines[i]));
        i += 1;
      }
      i -= 1; // the for-loop increments past the last table row
      const headerHtml = headers.map((cell) => `<th>${cell}</th>`).join("");
      const rowsHtml = rows
        .map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
        .join("");
      out.push(`<table><tr>${headerHtml}</tr>${rowsHtml}</table>`);
      continue;
    }

    const bullet = BULLET_RE.exec(line);
    const ordered = bullet ? null : ORDERED_RE.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      const tag = bullet ? "ul" : "ol";
      const item = escapeHtml((bullet ?? ordered)![1].trim());
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [] };
      if (item) list.items.push(item);
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    flushList();
    paragraph.push(escapeHtml(line.trim()));
  }

  flushAll();
  return out.join("\n");
}

/** Whole authored document → semantic HTML: each chapter title becomes the
    <h1> that splitChapters/buildChunks use as the chapter boundary. */
export function authoredChaptersToHtml(chapters: AuthoredChapter[]): string {
  return chapters
    .map(
      (chapter) =>
        `<h1>${escapeHtml(chapter.title.trim())}</h1>\n${markdownToHtml(chapter.markdown)}`
    )
    .join("\n");
}
