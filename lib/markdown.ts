/* Convertitore da markdown leggero a HTML semantico per documenti scritti
   nell'app (/scrivi). Produce la stessa forma HTML della pipeline docx
   (h1 = capitolo, h2/h3 = sezioni, p/ul/ol/table/pre = blocchi), cosi' il
   testo scritto passa nello stesso ingest usato per i file .docx.

   La notazione inline (`code`, **bold**) NON viene convertita: passa verbatim
   perche' e' gia' il markup leggero nativo della pipeline, richiesto dal
   prompt LLM e renderizzato da InlineText. Il testo viene solo escapato in
   HTML, mai riscritto. */

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
/* Separatore tabella GFM: |---|:---:|---, con almeno una sequenza di trattini. */
const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => escapeHtml(cell.trim()));
}

/** Converte il corpo di un capitolo. Gli heading sono limitati a h2-h4:
    un <h1> emesso qui creerebbe un capitolo fantasma in splitChapters. */
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
      i += 2; // Salta la riga separatrice.
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(tableCells(lines[i]));
        i += 1;
      }
      i -= 1; // Il for incrementa oltre l'ultima riga della tabella.
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

/** Documento scritto nell'app -> HTML semantico: ogni titolo capitolo diventa
    l'<h1> usato da splitChapters/buildChunks come confine. */
export function authoredChaptersToHtml(chapters: AuthoredChapter[]): string {
  return chapters
    .map(
      (chapter) =>
        `<h1>${escapeHtml(chapter.title.trim())}</h1>\n${markdownToHtml(chapter.markdown)}`
    )
    .join("\n");
}
