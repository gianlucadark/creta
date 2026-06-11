import { z } from "zod";

const PageHeroBlock = z.object({
  component: z.literal("PageHero"),
  props: z.object({
    title: z.string(),
    intro: z.string(),
  }),
});

const SectionBlock = z.object({
  component: z.literal("Section"),
  props: z.object({
    heading: z.string(),
    body: z.string(),
  }),
});

const SubSectionBlock = z.object({
  component: z.literal("SubSection"),
  props: z.object({
    heading: z.string(),
    body: z.string(),
  }),
});

const RuleCalloutBlock = z.object({
  component: z.literal("RuleCallout"),
  props: z.object({
    rule: z.string(),
    description: z.string().optional(),
  }),
});

const AlertBannerBlock = z.object({
  component: z.literal("AlertBanner"),
  props: z.object({
    message: z.string(),
    detail: z.string().optional(),
  }),
});

const ProhibitionListBlock = z.object({
  component: z.literal("ProhibitionList"),
  props: z.object({
    title: z.string().optional(),
    items: z.array(z.string()),
  }),
});

const StepFlowBlock = z.object({
  component: z.literal("StepFlow"),
  props: z.object({
    title: z.string().optional(),
    steps: z.array(
      z.object({
        label: z.string(),
        description: z.string(),
      })
    ),
  }),
});

const KeyFactsBlock = z.object({
  component: z.literal("KeyFacts"),
  props: z.object({
    title: z.string().optional(),
    facts: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    ),
  }),
});

const DefinitionListBlock = z.object({
  component: z.literal("DefinitionList"),
  props: z.object({
    title: z.string().optional(),
    items: z.array(
      z.object({
        term: z.string(),
        definition: z.string(),
      })
    ),
  }),
});

const SummaryBoxBlock = z.object({
  component: z.literal("SummaryBox"),
  props: z.object({
    text: z.string(),
  }),
});

const CodeBlockBlock = z.object({
  component: z.literal("CodeBlock"),
  props: z.object({
    title: z.string().optional(),
    code: z.string(),
  }),
});

const TableBlock = z.object({
  component: z.literal("Table"),
  props: z.object({
    title: z.string().optional(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
});

const RawTextBlock = z.object({
  component: z.literal("RawText"),
  props: z.object({
    text: z.string(),
  }),
});

export const BlockSchema = z.discriminatedUnion("component", [
  PageHeroBlock,
  SectionBlock,
  SubSectionBlock,
  RuleCalloutBlock,
  AlertBannerBlock,
  ProhibitionListBlock,
  StepFlowBlock,
  KeyFactsBlock,
  DefinitionListBlock,
  SummaryBoxBlock,
  CodeBlockBlock,
  TableBlock,
  RawTextBlock,
]);

export const DocumentTreeSchema = z.object({
  blocks: z.array(BlockSchema),
});

const ParagraphBlock = z.object({
  type: z.literal("paragraph"),
  text: z.string(),
});

const CalloutBlock = z.object({
  type: z.literal("callout"),
  tone: z.enum(["info", "warning", "success"]).default("info"),
  title: z.string().optional(),
  text: z.string(),
});

/* Items keep `title` optional: Gemini occasionally emits text-only items
   and a missing label must not invalidate (and thus flatten) the block. */
const TitledItem = z.object({
  title: z.string().optional(),
  text: z.string(),
});

const StepsBlock = z.object({
  type: z.literal("steps"),
  title: z.string().optional(),
  items: z.array(TitledItem),
});

const TableDesignBlock = z.object({
  type: z.literal("table"),
  title: z.string().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

const CodeDesignBlock = z.object({
  type: z.literal("code"),
  title: z.string().optional(),
  code: z.string(),
});

const CardsBlock = z.object({
  type: z.literal("cards"),
  title: z.string().optional(),
  items: z.array(TitledItem),
});

const StatsBlock = z.object({
  type: z.literal("stats"),
  title: z.string().optional(),
  items: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      hint: z.string().optional(),
    })
  ),
});

const QuoteBlock = z.object({
  type: z.literal("quote"),
  text: z.string(),
  attribution: z.string().optional(),
});

const TimelineBlock = z.object({
  type: z.literal("timeline"),
  title: z.string().optional(),
  items: z.array(TitledItem),
});

const AccordionBlock = z.object({
  type: z.literal("accordion"),
  title: z.string().optional(),
  items: z.array(z.object({ title: z.string(), text: z.string() })),
});

const ChecklistBlock = z.object({
  type: z.literal("checklist"),
  title: z.string().optional(),
  items: z.array(z.string()),
});

const ListBlock = z.object({
  type: z.literal("list"),
  title: z.string().optional(),
  items: z.array(z.string()),
});

const FeatureBlock = z.object({
  type: z.literal("feature"),
  title: z.string().optional(),
  items: z.array(TitledItem),
});

export const PageDesignBlockSchema = z.discriminatedUnion("type", [
  ParagraphBlock,
  CalloutBlock,
  StepsBlock,
  TableDesignBlock,
  CodeDesignBlock,
  CardsBlock,
  StatsBlock,
  QuoteBlock,
  TimelineBlock,
  AccordionBlock,
  ChecklistBlock,
  ListBlock,
  FeatureBlock,
]);

export const PageDesignSchema = z.object({
  version: z.literal(2),
  page: z.object({
    title: z.string(),
    eyebrow: z.string().optional(),
    summary: z.string(),
    audience: z.string().optional(),
    /** Set when the document was extracted from a chapter of another
        document; rendered as an "Estratto da" backlink. */
    source: z
      .object({ slug: z.string(), title: z.string() })
      .optional(),
  }),
  sections: z.array(
    z.object({
      title: z.string(),
      intro: z.string().optional(),
      /** Main-chapter (h1) title this section belongs to; set by the ingest
          pipeline, used by the renderer to group the TOC and label sections. */
      chapter: z.string().optional(),
      blocks: z.array(PageDesignBlockSchema),
    })
  ),
  /** Markdown source of a document written in the app (/scrivi). Its
      presence marks the document as text-editable (re-generable). Must be
      declared here: the PATCH/extract routes round-trip the JSON through
      this schema, and Zod strips undeclared keys. */
  authoring: z
    .object({
      mode: z.literal("markdown"),
      chapters: z.array(z.object({ title: z.string(), markdown: z.string() })),
      updatedAt: z.string(),
    })
    .optional(),
  /** Slugs of hand-picked related documents, rendered as cards at the
      bottom of the page ("Vedi anche"). Declared here for the same reason
      as `authoring`: mutation routes round-trip the JSON through this
      schema, and Zod strips undeclared keys. */
  related: z.array(z.string()).optional(),
});

export const StoredPageSchema = z.union([PageDesignSchema, DocumentTreeSchema]);

export const GeneratedBlockSchema = z
  .object({
    component: z.string().optional(),
    props: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const GeneratedDocumentTreeSchema = z.object({
  blocks: z.array(GeneratedBlockSchema),
});

function collectText(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectText);
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectText);
  }
  return [];
}

function getString(props: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function getStringArray(props: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = props[key];
    if (Array.isArray(value)) {
      const items = value.filter(
        (item): item is string => typeof item === "string" && Boolean(item.trim())
      );
      if (items.length) return items;
    }
  }
  return [];
}

function coerceGeneratedBlock(block: z.infer<typeof GeneratedBlockSchema>) {
  const props = block.props ?? {};
  const component = block.component?.toLowerCase().replace(/[^a-z]/g, "");

  if (!component) return block;

  if (["title", "pagehero", "hero", "pagetitle"].includes(component)) {
    const title = getString(props, ["title", "heading", "text", "name"]);
    const intro = getString(props, ["intro", "body", "subtitle", "description"]);
    if (title) return { component: "PageHero", props: { title, intro } };
  }

  if (["heading", "section", "chapter"].includes(component)) {
    const heading = getString(props, ["heading", "title", "text", "name"]);
    const body = getString(props, ["body", "content", "description"]);
    if (heading) return { component: "Section", props: { heading, body } };
  }

  if (["subheading", "subsection"].includes(component)) {
    const heading = getString(props, ["heading", "title", "text", "name"]);
    const body = getString(props, ["body", "content", "description"]);
    if (heading) return { component: "SubSection", props: { heading, body } };
  }

  if (["warning", "alert", "notice", "deadline"].includes(component)) {
    const message = getString(props, ["message", "text", "body", "title"]);
    const detail = getString(props, ["detail", "description"]);
    if (message) return { component: "AlertBanner", props: { message, detail } };
  }

  if (["procedure", "steps", "stepflow"].includes(component)) {
    const items = getStringArray(props, ["steps", "items"]);
    if (items.length) {
      return {
        component: "StepFlow",
        props: {
          title: getString(props, ["title", "heading"]) || undefined,
          steps: items.map((item, index) => ({
            label: String(index + 1),
            description: item,
          })),
        },
      };
    }
  }

  if (["prohibition", "prohibitions", "prohibitionlist"].includes(component)) {
    const items = getStringArray(props, ["items", "prohibitions"]);
    if (items.length) {
      return {
        component: "ProhibitionList",
        props: { title: getString(props, ["title", "heading"]) || undefined, items },
      };
    }
  }

  if (["paragraph", "text", "rawtext"].includes(component)) {
    const text = getString(props, ["text", "body", "content"]);
    if (text) return { component: "RawText", props: { text } };
  }

  if (["code", "codeblock", "command", "commands", "json"].includes(component)) {
    const code = getString(props, ["code", "text", "body", "content"]);
    if (code) {
      return {
        component: "CodeBlock",
        props: { title: getString(props, ["title", "heading"]) || undefined, code },
      };
    }
  }

  if (["table", "datatable"].includes(component)) {
    const headers = getStringArray(props, ["headers", "columns"]);
    const rows = props.rows;
    if (
      headers.length &&
      Array.isArray(rows) &&
      rows.every(
        (row): row is string[] =>
          Array.isArray(row) && row.every((cell) => typeof cell === "string")
      )
    ) {
      return {
        component: "Table",
        props: {
          title: getString(props, ["title", "heading"]) || undefined,
          headers,
          rows,
        },
      };
    }
  }

  return block;
}

export function normalizeGeneratedBlocks(
  blocks: z.infer<typeof GeneratedBlockSchema>[],
  fallbackText: string
): Block[] {
  const normalized = blocks.flatMap((block, index) => {
    const coerced = coerceGeneratedBlock(block);
    const parsed = BlockSchema.safeParse(coerced);
    if (parsed.success) return [parsed.data];

    const text = collectText(block.props).join("\n\n").trim();
    if (!text) {
      console.warn(`[creta] block ${index} scartato:`, parsed.error.format());
      return [];
    }

    console.warn(
      `[creta] block ${index} convertito in RawText:`,
      parsed.error.format()
    );
    return [{ component: "RawText", props: { text } } satisfies Block];
  });

  if (normalized.length > 0) return normalized;
  return [{ component: "RawText", props: { text: fallbackText } }];
}

/* ── Inline-HTML sanitizer ───────────────────────────────────────
   The ingest LLM receives HTML and must translate inline tags into the
   light verbatim markup (**bold**, `code`). When it copies tags into the
   JSON strings instead ("<strong>Ruolo</strong>"), the renderer would
   print them literally. This converts stray inline HTML to the native
   markup deterministically: at ingest (normalizeDesignSections) and at
   read (pagesStore.readPageDesign), so already-stored documents heal
   without re-ingest. Text content is never rewritten, only the markup. */

export function stripInlineHtml(text: string): string {
  if (!text.includes("<") && !text.includes("&")) return text;
  let out = text;

  out = out.replace(
    /<(strong|b)(?:\s[^<>]*)?>([\s\S]*?)<\/\1\s*>/gi,
    (_match, _tag, inner: string) => {
      const trimmed = inner.trim();
      // keep surrounding spaces outside the ** so "**x** y" stays valid
      return trimmed ? inner.replace(trimmed, `**${trimmed}**`) : inner;
    }
  );

  out = out.replace(
    /<code(?:\s[^<>]*)?>([\s\S]*?)<\/code\s*>/gi,
    (_match, inner: string) => {
      const trimmed = inner.trim();
      return trimmed && !trimmed.includes("`") ? `\`${trimmed}\`` : inner;
    }
  );

  out = out.replace(
    /<a\s[^<>]*href="(https?:\/\/[^"]+)"[^<>]*>([\s\S]*?)<\/a\s*>/gi,
    (_match, href: string, inner: string) => {
      const label = inner.trim();
      if (!label) return href;
      return label === href ? inner : `${inner} (${href})`;
    }
  );

  out = out.replace(/<br\s*\/?>/gi, "\n");
  // em/i/u/span/li/…: drop the tags, keep the verbatim words
  out = out.replace(/<\/?[a-zA-Z][^<>]*>/g, "");

  return out
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&(?:#0?39|apos);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function deepMapStrings<T>(value: T, fn: (text: string) => string): T {
  if (typeof value === "string") return fn(value) as T;
  if (Array.isArray(value)) {
    return value.map((item) => deepMapStrings(item, fn)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, deepMapStrings(item, fn)])
    ) as T;
  }
  return value;
}

function sanitizeBlock(block: PageDesignBlock): PageDesignBlock {
  // code bodies may legitimately contain HTML/entities — leave them verbatim
  if (block.type === "code") {
    return block.title ? { ...block, title: stripInlineHtml(block.title) } : block;
  }
  return deepMapStrings(block, stripInlineHtml);
}

function sanitizeSection(
  section: PageDesign["sections"][number]
): PageDesign["sections"][number] {
  return {
    ...section,
    title: stripInlineHtml(section.title),
    intro: section.intro ? stripInlineHtml(section.intro) : section.intro,
    chapter: section.chapter ? stripInlineHtml(section.chapter) : section.chapter,
    blocks: section.blocks.map(sanitizeBlock),
  };
}

/** Strip stray inline HTML from every rendered string of a stored design
    (the `authoring` markdown source and code bodies stay untouched). */
export function sanitizePageDesign(design: PageDesign): PageDesign {
  return {
    ...design,
    page: {
      ...design.page,
      title: stripInlineHtml(design.page.title),
      summary: stripInlineHtml(design.page.summary),
      eyebrow: design.page.eyebrow ? stripInlineHtml(design.page.eyebrow) : design.page.eyebrow,
      audience: design.page.audience ? stripInlineHtml(design.page.audience) : design.page.audience,
    },
    sections: design.sections.map(sanitizeSection),
  };
}

/* ── Tolerant normalizer for the v2 PageDesign flow ──────────────
   Gemini does not reliably honour discriminated-union (anyOf) schemas,
   so it sometimes emits unknown block "type" values (e.g. "warning"
   instead of a "callout" with tone "warning"). With strict parsing a
   single bad block invalidates the whole document and the route falls
   back to the lossy deterministic design. Here we coerce known aliases
   and turn anything unrecognised into a paragraph built from its own
   text — so no content is ever dropped. */

const CALLOUT_WARNING = new Set([
  "warning", "alert", "danger", "caution", "attention", "attenzione", "important", "avviso",
]);
const CALLOUT_SUCCESS = new Set([
  "success", "result", "risultato", "confirmation", "conferma", "ok", "done",
]);
const CALLOUT_INFO = new Set([
  "info", "note", "nota", "tip", "notice", "callout", "hint",
]);

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

const LIST_ALIASES = new Set(["list", "bullets", "bulletlist", "ul", "unorderedlist", "itemlist", "points"]);
const CHECKLIST_ALIASES = new Set(["checklist", "requirements", "prerequisites", "prerequisiti", "requisiti", "todo"]);
const CODE_ALIASES = new Set(["code", "codeblock", "command", "commands", "snippet", "terminal", "script", "config", "json"]);
const QUOTE_ALIASES = new Set(["quote", "blockquote", "pullquote", "principle", "citazione"]);
const TITLED_ITEM_TYPES = new Set(["steps", "timeline", "cards", "feature", "accordion"]);

/** Coerce arbitrary item shapes (strings, alt key names) into { title?, text }. */
function normalizeTitledItems(raw: unknown): { title?: string; text: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === "string") {
      return item.trim() ? [{ text: item }] : [];
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const title = firstString(o.title, o.label, o.name, o.term, o.heading, o.step);
      const text = firstString(o.text, o.description, o.body, o.content, o.definition, o.detail, o.value);
      if (text) return [{ title, text }];
      if (title) return [{ text: title }];
    }
    return [];
  });
}

/** Coerce arbitrary item shapes into plain strings (for list/checklist). */
function normalizeStringItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === "string") return item.trim() ? [item] : [];
    const text = collectText(item).join(" — ").trim();
    return text ? [text] : [];
  });
}

function coercePageDesignBlock(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const block = raw as Record<string, unknown>;
  const type = typeof block.type === "string" ? block.type.toLowerCase().trim() : "";

  // alias various single-note types onto the canonical "callout"
  if (CALLOUT_WARNING.has(type) || CALLOUT_SUCCESS.has(type) || CALLOUT_INFO.has(type)) {
    const tone = CALLOUT_WARNING.has(type)
      ? "warning"
      : CALLOUT_SUCCESS.has(type)
        ? "success"
        : "info";
    const text = firstString(block.text, block.message, block.body, block.description);
    if (text) {
      return {
        type: "callout",
        tone: typeof block.tone === "string" ? block.tone : tone,
        title: firstString(block.title),
        text,
      };
    }
  }

  if (type === "paragraph" || type === "text" || type === "prose") {
    const text = firstString(block.text, block.body, block.content);
    if (text) return { type: "paragraph", text };
  }

  if (LIST_ALIASES.has(type) || CHECKLIST_ALIASES.has(type)) {
    const items = normalizeStringItems(block.items ?? block.points ?? block.list);
    if (items.length) {
      return {
        type: CHECKLIST_ALIASES.has(type) ? "checklist" : "list",
        title: firstString(block.title, block.heading),
        items,
      };
    }
  }

  if (CODE_ALIASES.has(type)) {
    const code = firstString(block.code, block.text, block.content, block.body);
    if (code) {
      return { type: "code", title: firstString(block.title, block.heading), code };
    }
  }

  if (QUOTE_ALIASES.has(type)) {
    const text = firstString(block.text, block.quote, block.content);
    if (text) {
      return { type: "quote", text, attribution: firstString(block.attribution, block.author, block.source) };
    }
  }

  if (TITLED_ITEM_TYPES.has(type)) {
    const items = normalizeTitledItems(block.items ?? block.steps ?? block.entries);
    if (items.length) {
      // accordion entries need a clickable title; untitled items read better as cards
      const target = type === "accordion" && items.some((item) => !item.title) ? "cards" : type;
      return { type: target, title: firstString(block.title, block.heading), items };
    }
  }

  return block;
}

function normalizeBlocks(rawBlocks: unknown): PageDesignBlock[] {
  if (!Array.isArray(rawBlocks)) return [];
  return rawBlocks.flatMap((raw, index) => {
    const coerced = coercePageDesignBlock(raw);
    const parsed = PageDesignBlockSchema.safeParse(coerced);
    if (parsed.success) return [parsed.data];

    // salvage the block's own text, ignoring control fields like `type`/`tone`
    const salvageable = Object.fromEntries(
      Object.entries(raw && typeof raw === "object" ? raw : {}).filter(
        ([key]) => key !== "type" && key !== "tone"
      )
    );
    const text = collectText(salvageable).join("\n\n").trim();
    if (!text) {
      console.warn(`[creta] page block ${index} scartato (vuoto)`);
      return [];
    }
    console.warn(`[creta] page block ${index} convertito in paragraph`);
    return [{ type: "paragraph", text } satisfies PageDesignBlock];
  });
}

/** Tolerantly normalize a raw `sections` array (from a full-page or a
    per-chapter LLM response) into valid PageDesign sections. */
export function normalizeDesignSections(
  rawSections: unknown
): PageDesign["sections"] {
  if (!Array.isArray(rawSections)) return [];
  return rawSections
    .map((section) => {
      const s = (section ?? {}) as Record<string, unknown>;
      return sanitizeSection({
        title: firstString(s.title, s.heading) ?? "Sezione",
        intro: firstString(s.intro, s.summary),
        chapter: firstString(s.chapter),
        blocks: normalizeBlocks(s.blocks),
      });
    })
    .filter((section) => section.blocks.length > 0);
}

export function normalizePageDesign(
  raw: unknown,
  fallback: { title: string; summary: string }
): PageDesign | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const rawPage = (obj.page ?? {}) as Record<string, unknown>;
  const sections = normalizeDesignSections(obj.sections);

  if (sections.length === 0) return null;

  return {
    version: 2,
    page: {
      title: firstString(rawPage.title, rawPage.heading) ?? fallback.title,
      eyebrow: firstString(rawPage.eyebrow, rawPage.category),
      summary: firstString(rawPage.summary, rawPage.intro, rawPage.description) ?? fallback.summary,
      audience: firstString(rawPage.audience),
    },
    sections,
  };
}

export type Block = z.infer<typeof BlockSchema>;
export type DocumentTree = z.infer<typeof DocumentTreeSchema>;
export type PageDesign = z.infer<typeof PageDesignSchema>;
export type PageDesignBlock = z.infer<typeof PageDesignBlockSchema>;
export type StoredPage = z.infer<typeof StoredPageSchema>;
