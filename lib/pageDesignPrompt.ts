/* Prompts for the chunked PageDesign v2 ingest. The document is split into
   one chunk per main chapter (lib/docxHtml.ts) and chunks are mapped by
   parallel LLM calls, so the model never has to compress to fit the output
   window — completeness is enforced per chapter and verified afterwards
   with lib/coverage.ts.

   To spend fewer calls, small adjacent whole chapters can share one call
   (chapterCount > 1) and the first call can also produce the page header
   (withMeta) — chapterSystemPrompt() assembles the right system prompt for
   each combination. */

const TEXT_FIDELITY = `
TEXT FIDELITY (NON-NEGOTIABLE)
- You are an ARRANGER, not an editor or a writer. Your only freedom is choosing which block each piece of content goes into and how to group it. You may NOT invent, rephrase, summarise, shorten, translate, or omit any of the document's text.
- Copy every sentence, phrase, value, number, label, command, URL, API key, file path, and configuration snippet VERBATIM into the block fields, character for character.
- Account for ALL of the chunk's content. Every sentence of the source must appear somewhere in the output. Nothing may be silently dropped. When in doubt about which block fits, use a "paragraph" block rather than discarding text.
- NEVER split a "label: value" pair and keep only the label. If a line reads "Il risultato deve essere: true", the field must contain the WHOLE thing — including "true". Expected results, return values, file names and settings after a colon must never be truncated.
- A value may appear in the source on its OWN line, separate from the phrase that introduces it (e.g. "Il risultato deve essere:" followed by "True"). Re-attach such orphan values to the introducing phrase. NEVER drop a short standalone line just because it is short or styled.
- The ONLY things you may remove: page numbers, running headers/footers, and document metadata. Everything else stays.
- The input is HTML: its tags are STRUCTURE, never text. NEVER copy an HTML tag or entity into any output string. Translate inline markup instead: <strong>/<b> → **bold**, <code> → \`backticks\`, <em>/<i>/<span> → keep only the words (drop the tags), &amp;/&lt;/&gt;/&nbsp; → the literal character. A string like "<strong>Ruolo (R):</strong> testo" must become "**Ruolo (R):** testo".
- IGNORE every <img> tag: images are handled separately and re-inserted automatically. Never copy an image URL or "src" into any field, and never emit an image block.`.trim();

const BLOCK_CATALOG = `
BLOCK TYPES — choose deliberately.
EVERY block is a JSON object whose FIRST field is "type" (a string). The type name is the VALUE of "type" — it is NEVER used as a key. The other fields sit alongside "type" at the same level.
CORRECT:   { "type": "paragraph", "text": "…" }
CORRECT:   { "type": "checklist", "title": "Prerequisiti", "items": ["a", "b"] }
WRONG:     { "paragraph": "…" }                       ← never put the type name as a key
WRONG:     { "checklist": "Prerequisiti", "items": [] } ← "type" field is missing

The available types and their fields (alongside "type"):
- { "type": "paragraph", "text": string }                                  — connective prose. Use sparingly.
- { "type": "callout", "tone": "info"|"warning"|"success", "title"?: string, "text": string }
                                                       — a single warning, requirement, tip, or critical note. Use "warning" for risks/"do not" notes, "success" for confirmations/results, "info" otherwise.
- { "type": "steps", "title"?: string, "items": [{ "title": string, "text": string }] }       — an ordered procedure or workflow (do this, then this).
- { "type": "timeline", "title"?: string, "items": [{ "title": string, "text": string }] }       — chronological phases, milestones, or a sequence of events (not imperative actions).
- { "type": "checklist", "title"?: string, "items": [string] }                — requirements, prerequisites, or things to verify (a flat list of must-haves).
- { "type": "list", "title"?: string, "items": [string] }                     — a plain bulleted list of points that are neither requirements nor steps (options, examples, notes).
- { "type": "cards", "title"?: string, "items": [{ "title": string, "text": string }] }       — a compact set of related, NON-sequential concepts each with a short label + description.
- { "type": "feature", "title"?: string, "items": [{ "title": string, "text": string }] }       — highlight 3–6 capabilities, benefits, or key features (icon grid).
- { "type": "stats", "title"?: string, "items": [{ "value": string, "label": string, "hint"?: string }] }
                                                       — key figures/metrics. "value" is the number or short figure ("12", "99%", "3 GB"); "label" names it. Use whenever the document states notable numbers.
- { "type": "quote", "text": string, "attribution"?: string }                     — a single standout sentence, principle, motto, or definition worth emphasising as a pull quote.
- { "type": "spec", "title"?: string, "items": [{ "term": string, "definition": string }] }
                                                       — label→value pairs or a single record made of fields: role→section, field→content, term→definition, parameter→value. Use this INSTEAD of a two-column table whenever one column is a short label/field name and the other is its value. Also the right home for "label: value" lines.
- { "type": "compare", "title"?: string, "left": { "heading": string, "items": [string] }, "right": { "heading": string, "items": [string] } }
                                                       — two contrasted sides: allowed/forbidden (consentito/vietato), before/after, pros/cons, do/don't. Copy headings and items verbatim.
- { "type": "table", "title"?: string, "headers": [string], "rows": [[string]] }
                                                       — genuinely tabular data with 3+ columns, or a real data grid. Do NOT use a table for label→value records: use "spec" instead.
- { "type": "code", "title"?: string, "code": string }                           — commands, scripts, JSON, config, file contents, prompt templates, or terminal output. Copy verbatim.
- { "type": "accordion", "title"?: string, "items": [{ "title": string, "text": string }] }       — FAQs or a set of question/answer or term/explanation pairs that benefit from being collapsible.

INLINE FORMATTING
- Inside any "text"/"title"/"intro" field you MAY wrap short verbatim technical tokens — commands, file paths, file names, key names, flags, values like "True" — in single backticks (\`claude --version\`). The characters inside the backticks must stay verbatim; the backticks only mark them for monospace rendering.
- You MAY wrap a few genuinely critical words in **double asterisks** for bold. Use both sparingly; never use any other markdown.

GUIDANCE
- Pick the MOST EXPRESSIVE block for each piece of content. Plain paragraphs should be the minority — variety is what makes the page feel designed.
- If the document states key numbers, surface them as a "stats" block near the top of the relevant section. NEVER invent numbers: every "value" must appear verbatim in the document.
- Turn "do not / never / attention / must" notes into "callout" blocks with tone "warning".
- Turn numbered or sequential instructions into "steps".
- Turn prerequisite/requirement lists into "checklist"; other bullet lists into "list".
- Turn a memorable principle or one-line rule into a "quote".
- Use "feature" or "cards" to break dense conceptual lists into a scannable grid.
- Turn a record or a "label: value" / two-column "field/content" list into a "spec" block — NEVER a two-column table. Each "term" is the label (verbatim), each "definition" its value (verbatim, never truncated).
- Turn an allowed-vs-forbidden, before-vs-after, or pros-vs-cons contrast into a "compare" block.
- A multi-line command, script, config snippet, or reusable prompt template ALWAYS belongs in a "code" block, never inside a paragraph.
- Never leave a long undifferentiated wall of text in a single paragraph block — split it across the most fitting blocks.`.trim();

const STRUCTURE_RULES = `
- Every <h2> heading in the input MUST become its own section, in source order, with the heading text as the section "title" (verbatim; you may drop a leading outline number like "2.1."). NEVER merge two <h2> headings into one section and NEVER skip one.
- Content that appears before the first <h2> becomes an opening section. Title it with the FIRST heading at the start of the input (an <h3>/<h4>, verbatim) if there is one; only when the content starts with no heading at all, title it with the chapter name.
- <h3>/<h4> subsections must remain visible inside their section: carry the heading text (verbatim) as the "title" of the block(s) holding their content, in order. A subsection's content must never be folded invisibly into other text.
- If the chapter has NO <h2> headings, derive sections from its visible pseudo-headings (standalone bold lines such as "Template 1: …", or numbered list headings such as "Prompt Templates Cookbook") so the chapter still reads as a structured set of sections.
- The number of sections is dictated by the document's own headings — never by a target count.
- Each section may have a one-sentence "intro" ONLY if it is a verbatim sentence from this chapter (typically the paragraph right after the heading); in that case do not repeat it in the blocks. Otherwise omit "intro".`.trim();

const PAGE_FIELD = `"page": {
    "title": string,      // the document's real title, verbatim from the cover (without trailing subtitle lines)
    "eyebrow": string,    // a short category label you may author (e.g. "Linee Guida", "Documento Ufficiale 2026")
    "summary": string,    // 1–2 sentences drawn from the document's own wording — verbatim, not rewritten
    "audience"?: string   // who the document addresses, only if the document states it
  }`;

const META_RULES = `
PAGE HEADER
The input starts with a COVER block (the document's title page). Use it ONLY to fill the "page" object — the page header of the whole web page. NEVER map the COVER content into sections.
- "page.title" and "page.summary" must be copied from the document's own sentences, verbatim. Only "eyebrow" may be authored.`.trim();

/** System prompt for mapping one or more chapters in a single call,
    optionally also producing the page header from the cover. */
export function chapterSystemPrompt(
  chapterCount: number,
  withMeta: boolean
): string {
  const multi = chapterCount > 1;

  const intro = multi
    ? `You receive ${chapterCount} chapters of a longer DOCX document as semantic HTML, each delimited by an "=== CHAPTER i OF n: <title> ===" marker. Other chapters are processed separately — handle ONLY what you are given, completely. Transform EVERY chapter into web-page sections, applying all rules below to EACH chapter independently. Never move or merge content across chapters.`
    : `You receive ONE chapter of a longer DOCX document, as semantic HTML. Other chapters are processed separately — handle ONLY what you are given, completely. Transform this chapter into web-page sections.`;

  const sectionsShape = `[ { "title": string, "intro"?: string, "blocks": Block[] } ]`;
  const body = multi
    ? `"chapters": [ { "chapter": string, "sections": ${sectionsShape} } ]`
    : `"sections": ${sectionsShape}`;
  const shape = withMeta
    ? `{\n  ${PAGE_FIELD},\n  ${body}\n}`
    : `{\n  ${body}\n}`;

  const multiShapeRules = multi
    ? `\n- "chapters" must contain EXACTLY one entry per input chapter, in input order, with "chapter" set to the chapter title copied verbatim from its marker. Never merge, drop, or add entries.`
    : "";

  return [
    "You are a senior product designer and information architect.",
    "",
    intro,
    "",
    TEXT_FIDELITY,
    "",
    `STRUCTURE (NON-NEGOTIABLE${multi ? " — applies to EACH chapter" : ""})`,
    STRUCTURE_RULES,
    "",
    "OUTPUT SHAPE",
    shape + multiShapeRules,
    ...(withMeta ? ["", META_RULES] : []),
    "",
    BLOCK_CATALOG,
    "",
    "Output ONLY JSON that conforms to the shape above. No markdown fences, no commentary.",
  ].join("\n");
}

/** System prompt for one chapter chunk → { "sections": [...] }. */
export const CHAPTER_PROMPT = chapterSystemPrompt(1, false);

/** Standalone fallback prompt for the page header → { "page": {...} }.
    Used only when the merged first call did not return a valid header.
    Receives only the cover/title page and the opening of the document. */
export const PAGE_META_PROMPT = `
You are a senior product designer. You receive the cover (title page) and the opening lines of a DOCX document. Produce ONLY the page header object for its web page:

{
  ${PAGE_FIELD}
}

The summary must be copied from the document's own sentences. Only "eyebrow" may be authored. Output ONLY JSON, no commentary.
`.trim();
