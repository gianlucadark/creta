/* Deterministic HTML → PageDesign sections converter. Used as the
   guaranteed-coverage fallback: whenever the LLM mapping of a chunk fails
   or drops content, the chunk is rebuilt from its own HTML so the page
   always contains the full document. No LLM involved. */

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { PageDesign, PageDesignBlock } from "./schema";

type Section = PageDesign["sections"][number];

/** Inline HTML → light verbatim markup (`**bold**`, link text + URL). */
function inlineText($: cheerio.CheerioAPI, node: AnyNode): string {
  if (node.type === "text") return node.data ?? "";
  if (!("tagName" in node)) return "";

  const tag = node.tagName?.toLowerCase();
  const inner = $(node)
    .contents()
    .toArray()
    .map((child) => inlineText($, child))
    .join("");

  if (tag === "br") return "\n";
  if (tag === "strong" || tag === "b") {
    const trimmed = inner.trim();
    return trimmed ? inner.replace(trimmed, `**${trimmed}**`) : inner;
  }
  if (tag === "a") {
    const href = $(node).attr("href") ?? "";
    const text = inner.trim();
    if (/^https?:\/\//.test(href) && text && text !== href) {
      return `${inner} (${href})`;
    }
    return inner;
  }
  return inner;
}

function elementText($: cheerio.CheerioAPI, el: AnyNode): string {
  return inlineText($, el).replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

function listItems($: cheerio.CheerioAPI, listEl: AnyNode): string[] {
  return $(listEl)
    .children("li")
    .toArray()
    .map((li) => elementText($, li))
    .filter(Boolean);
}

function tableBlock($: cheerio.CheerioAPI, tableEl: AnyNode): PageDesignBlock | null {
  const rows = $(tableEl)
    .find("tr")
    .toArray()
    .map((tr) =>
      $(tr)
        .children("td, th")
        .toArray()
        .map((cell) => elementText($, cell))
    )
    .filter((cells) => cells.some(Boolean));

  if (rows.length === 0) return null;
  if (rows.length === 1) {
    return { type: "paragraph", text: rows[0].join(" — ") };
  }
  return { type: "table", headers: rows[0], rows: rows.slice(1) };
}

/** Convert a cleaned HTML fragment into renderable sections. h2/h3 start a
    new section; everything else becomes the most fitting verbatim block. */
export function sectionsFromHtml(html: string, fallbackTitle: string): Section[] {
  const $ = cheerio.load(html, null, false);
  const sections: Section[] = [];
  let current: Section | null = null;

  function ensure(): Section {
    if (!current) {
      current = { title: fallbackTitle, blocks: [] };
      sections.push(current);
    }
    return current;
  }

  for (const el of $.root().children().toArray()) {
    const tag = "tagName" in el ? el.tagName?.toLowerCase() : undefined;
    if (!tag) continue;

    if (tag === "h1") continue; // chapter title is carried by section.chapter

    if (tag === "h2" || tag === "h3") {
      const title = $(el).text().replace(/\s+/g, " ").trim();
      current = { title: title || fallbackTitle, blocks: [] };
      sections.push(current);
      continue;
    }

    if (/^h[4-6]$/.test(tag)) {
      const text = elementText($, el);
      if (text) ensure().blocks.push({ type: "paragraph", text: `**${text}**` });
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const items = listItems($, el);
      if (items.length) ensure().blocks.push({ type: "list", items });
      continue;
    }

    if (tag === "table") {
      const block = tableBlock($, el);
      if (block) ensure().blocks.push(block);
      continue;
    }

    if (tag === "pre") {
      // raw .text(): elementText would collapse the code's whitespace
      const code = $(el).text().replace(/\s+$/, "");
      if (code.trim()) ensure().blocks.push({ type: "code", code });
      continue;
    }

    const text = elementText($, el);
    if (text) ensure().blocks.push({ type: "paragraph", text });
  }

  return sections.filter((section) => section.blocks.length > 0);
}
