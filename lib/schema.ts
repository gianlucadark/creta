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

/* `title` resta opzionale: Gemini a volte emette elementi solo testuali e
   un'etichetta mancante non deve invalidare, quindi appiattire, il blocco. */
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

/* Scheda di coppie etichetta→valore (ruolo→sezione, campo→contenuto, termine→
   definizione). Resa verticale, senza scroll orizzontale: è la casa naturale
   delle righe "label: value" e dei record che altrimenti diventano tabelle a
   due colonne ripetute. */
const SpecBlock = z.object({
  type: z.literal("spec"),
  title: z.string().optional(),
  items: z.array(z.object({ term: z.string(), definition: z.string() })),
});

/* Confronto a due colonne contrapposte (Consentito/Vietato, Prima/Dopo,
   Pro/Contro). Ogni lato ha un titolo e una lista di voci. */
const CompareBlock = z.object({
  type: z.literal("compare"),
  title: z.string().optional(),
  left: z.object({ heading: z.string(), items: z.array(z.string()) }),
  right: z.object({ heading: z.string(), items: z.array(z.string()) }),
});

/* Immagine estratta dal documento sorgente. `src` è una URL prodotta
   dall'ingest (Vercel Blob pubblico o /creta-assets in locale), non testo
   verbatim: il blocco viene ancorato deterministicamente, mai generato dal
   LLM. `caption`, quando presente, viene dall'alt-text dell'immagine in Word. */
const ImageBlock = z.object({
  type: z.literal("image"),
  src: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

/* Invito all'azione: promuove un link presente nel documento a bottone in
   evidenza (es. "Scarica lo script", "Apri la console"). `label` e `href`
   sono VERBATIM dal documento (l'LLM non inventa URL); `title`/`text`
   opzionali introducono l'azione. */
const CtaBlock = z.object({
  type: z.literal("cta"),
  title: z.string().optional(),
  text: z.string().optional(),
  label: z.string(),
  href: z.string(),
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
  SpecBlock,
  CompareBlock,
  ImageBlock,
  CtaBlock,
]);

/* Allegato scaricabile: `href` è una URL prodotta dall'upload (mai testo
   verbatim, mai generata dall'LLM), `filename` il nome originale del file.
   `size` (byte) e `mime` sono informativi per la card di download. */
const AttachmentSchema = z.object({
  href: z.string(),
  filename: z.string(),
  label: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  mime: z.string().optional(),
});

export const PageDesignSchema = z.object({
  version: z.literal(2),
  page: z.object({
    title: z.string(),
    eyebrow: z.string().optional(),
    summary: z.string(),
    audience: z.string().optional(),
    /** Presente quando il documento nasce dall'estrazione di un capitolo;
        viene reso come backlink "Estratto da". */
    source: z
      .object({ slug: z.string(), title: z.string() })
      .optional(),
  }),
  sections: z.array(
    z.object({
      title: z.string(),
      intro: z.string().optional(),
      /** Titolo del capitolo h1 a cui appartiene la sezione; impostato
          dall'ingest e usato dal renderer per raggruppare indice e label. */
      chapter: z.string().optional(),
      blocks: z.array(PageDesignBlockSchema),
    })
  ),
  /** Sorgente markdown di un documento scritto nell'app (/scrivi). La sua
      presenza indica che il testo e' modificabile e rigenerabile. Deve stare
      nello schema: le route PATCH/extract fanno passare il JSON da qui e Zod
      rimuove le chiavi non dichiarate. */
  authoring: z
    .object({
      mode: z.literal("markdown"),
      chapters: z.array(z.object({ title: z.string(), markdown: z.string() })),
      updatedAt: z.string(),
    })
    .optional(),
  /** Slug dei documenti correlati scelti a mano, resi come card in fondo
      alla pagina ("Vedi anche"). Dichiarati qui per lo stesso motivo di
      `authoring`: le route di mutazione passano da questo schema e Zod
      rimuove le chiavi non dichiarate. */
  related: z.array(z.string()).optional(),
  /** File scaricabili allegati a mano in fondo alla pagina (es. script .ps1
      di installazione). Come le immagini, NON passano mai dall'LLM: vengono
      caricati nello store dei file e referenziati per URL (`href` =
      /api/files/<slug>/<name>). `filename` è il nome originale mostrato e usato
      per il download. Dichiarati qui per lo stesso motivo di `related`. */
  attachments: z.array(AttachmentSchema).optional(),
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

/* ── Sanitizzazione HTML inline ──────────────────────────────────
   Il LLM di ingest riceve HTML e deve tradurre i tag inline nel markup
   leggero verbatim (**bold**, `code`). Se invece copia i tag dentro le
   stringhe JSON ("<strong>Ruolo</strong>"), il renderer li mostrerebbe
   letteralmente. Qui convertiamo in modo deterministico l'HTML inline
   residuo nel markup nativo: durante l'ingest (normalizeDesignSections) e
   in lettura (pagesStore.readPageDesign), cosi' anche i documenti gia'
   salvati si correggono senza re-ingest. Il testo non viene mai riscritto,
   cambia solo il markup. */

export function stripInlineHtml(text: string): string {
  if (!text.includes("<") && !text.includes("&")) return text;
  let out = text;

  out = out.replace(
    /<(strong|b)(?:\s[^<>]*)?>([\s\S]*?)<\/\1\s*>/gi,
    (_match, _tag, inner: string) => {
      const trimmed = inner.trim();
      // Lascia gli spazi esterni fuori da **, cosi' "**x** y" resta valido.
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
  // em/i/u/span/li/...: rimuove i tag e conserva le parole verbatim.
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

/* Una tabella a due colonne la cui prima colonna è un'etichetta generica
   ("Campo", "Voce", "Field"…) non è dato tabellare ma un record: renderla come
   "spec" verticale evita lo scroll orizzontale e la ripetizione. Conservativo:
   non tocca le tabelle-mappatura reali (header[0] non generico). Gira in
   sanitize, quindi i documenti già salvati si aggiornano in lettura senza
   re-ingest. */
function tableToSpec(
  block: Extract<PageDesignBlock, { type: "table" }>
): Extract<PageDesignBlock, { type: "spec" }> | null {
  if (block.headers.length !== 2) return null;
  const label = (block.headers[0] ?? "").toLowerCase().replace(/[^a-zàèéìòù]/g, "");
  if (!SPEC_TABLE_LABELS.has(label)) return null;
  const items = block.rows
    .filter((row) => Array.isArray(row) && (row[0]?.trim() || row[1]?.trim()))
    .map((row) => ({ term: row[0] ?? "", definition: row[1] ?? "" }));
  if (!items.length) return null;
  return { type: "spec", title: block.title, items };
}

function sanitizeBlock(block: PageDesignBlock): PageDesignBlock {
  // I corpi code possono contenere HTML/entities legittimi: restano verbatim.
  if (block.type === "code") {
    return block.title ? { ...block, title: stripInlineHtml(block.title) } : block;
  }
  // Record a due colonne → spec verticale (upgrade deterministico in lettura).
  if (block.type === "table") {
    const spec = tableToSpec(block);
    if (spec) return deepMapStrings(spec, stripInlineHtml);
  }
  // `src` è una URL: non va passata da stripInlineHtml (i caratteri & nei query
  // verrebbero alterati). Solo alt e caption sono testo da sanificare.
  if (block.type === "image") {
    return {
      ...block,
      alt: block.alt ? stripInlineHtml(block.alt) : block.alt,
      caption: block.caption ? stripInlineHtml(block.caption) : block.caption,
    };
  }
  // `href` è una URL: come image.src non va sanificata. Solo i testi mostrati.
  if (block.type === "cta") {
    return {
      ...block,
      title: block.title ? stripInlineHtml(block.title) : block.title,
      text: block.text ? stripInlineHtml(block.text) : block.text,
      label: stripInlineHtml(block.label),
    };
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

/** Rimuove HTML inline residuo da ogni stringa renderizzata del design
    salvato; sorgente markdown `authoring` e corpi code restano intatti. */
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

/* ── Normalizzatore tollerante per PageDesign v2 ────────────────
   Gemini non rispetta sempre gli schema discriminated-union (anyOf) e a
   volte emette valori "type" non previsti, per esempio "warning" invece di
   "callout" con tone "warning". Con parsing rigido un singolo blocco errato
   invaliderebbe tutto il documento e la route finirebbe sul design
   deterministico piu' povero. Qui forziamo gli alias noti e trasformiamo cio'
   che non riconosciamo in un paragrafo costruito dal suo testo, senza perdere
   contenuto. */

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
const SPEC_ALIASES = new Set([
  "spec", "specs", "specsheet", "specification", "definitionlist", "definitions",
  "keyvalue", "keyvalues", "fields", "record", "properties", "attributes", "glossary",
  "metadata", "details", "fieldlist", "datasheet",
]);
const COMPARE_ALIASES = new Set([
  "compare", "comparison", "versus", "vs", "dosanddonts", "dosdonts", "prosandcons",
  "proscons", "beforeafter", "consentitovietato", "twocolumns", "twosided",
]);

/* Header (prima colonna) generici che segnalano una tabella-record da rendere
   come "spec" verticale anziché tabella a due colonne ripetuta. */
const SPEC_TABLE_LABELS = new Set([
  "campo", "voce", "attributo", "parametro", "proprietà", "proprieta", "elemento",
  "chiave", "caratteristica", "field", "key", "attribute", "property", "parameter",
]);

/** Converte forme arbitrarie di item in { title?, text }. */
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

/** Converte forme arbitrarie di item in { term, definition } per "spec". */
function normalizeSpecItems(raw: unknown): { term: string; definition: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const term = firstString(o.term, o.label, o.name, o.key, o.title, o.field, o.campo);
      const definition = firstString(
        o.definition, o.value, o.text, o.description, o.content, o.detail, o.contenuto
      );
      if (term && definition) return [{ term, definition }];
    }
    return [];
  });
}

/** Converte forme arbitrarie di item in stringhe semplici per list/checklist. */
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

  // Mappa diversi tipi di nota singola sul blocco canonico "callout".
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
      // Le accordion richiedono un titolo cliccabile; senza titolo rendono meglio come card.
      const target = type === "accordion" && items.some((item) => !item.title) ? "cards" : type;
      return { type: target, title: firstString(block.title, block.heading), items };
    }
  }

  if (SPEC_ALIASES.has(type)) {
    const items = normalizeSpecItems(block.items ?? block.fields ?? block.rows ?? block.entries);
    if (items.length) {
      return { type: "spec", title: firstString(block.title, block.heading), items };
    }
  }

  if (COMPARE_ALIASES.has(type)) {
    const rawLeft = (block.left ?? {}) as Record<string, unknown>;
    const rawRight = (block.right ?? {}) as Record<string, unknown>;
    const left = {
      heading: firstString(rawLeft.heading, rawLeft.title, rawLeft.label) ?? "",
      items: normalizeStringItems(rawLeft.items ?? rawLeft.points ?? rawLeft.list),
    };
    const right = {
      heading: firstString(rawRight.heading, rawRight.title, rawRight.label) ?? "",
      items: normalizeStringItems(rawRight.items ?? rawRight.points ?? rawRight.list),
    };
    if (left.items.length && right.items.length) {
      return { type: "compare", title: firstString(block.title, block.heading), left, right };
    }
  }

  if (type === "image" || type === "img" || type === "figure") {
    const src = firstString(block.src, block.url, block.href);
    if (src) {
      return {
        type: "image",
        src,
        alt: firstString(block.alt, block.altText, block.title),
        caption: firstString(block.caption, block.alt, block.altText),
      };
    }
  }

  if (CTA_ALIASES.has(type)) {
    const href = firstString(block.href, block.url, block.link);
    const label = firstString(block.label, block.text, block.cta, block.title);
    if (href && label) {
      return {
        type: "cta",
        title: firstString(block.title, block.heading),
        text: firstString(block.text, block.description, block.body),
        label,
        href,
      };
    }
    // Senza href non e' un'azione: lascia che il salvataggio lo renda testo.
  }

  return block;
}

const CTA_ALIASES = new Set([
  "cta", "button", "action", "link", "downloadbutton", "callto action", "calltoaction",
]);

export function normalizeBlocks(rawBlocks: unknown): PageDesignBlock[] {
  if (!Array.isArray(rawBlocks)) return [];
  return rawBlocks.flatMap((raw, index) => {
    const coerced = coercePageDesignBlock(raw);
    const parsed = PageDesignBlockSchema.safeParse(coerced);
    if (parsed.success) return [parsed.data];

    // Recupera il testo del blocco ignorando campi di controllo come `type` e `tone`.
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

/** Normalizza in modo tollerante un array `sections` grezzo, da risposta LLM
    full-page o per capitolo, in sezioni PageDesign valide. */
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
export type Attachment = z.infer<typeof AttachmentSchema>;
export type PageDesignBlock = z.infer<typeof PageDesignBlockSchema>;
export type StoredPage = z.infer<typeof StoredPageSchema>;
