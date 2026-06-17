import Link from "next/link";
import type { PageDesign, PageDesignBlock } from "@/lib/schema";
import { Reveal } from "./Reveal";
import { InlineText } from "./InlineText";
import { CodeCard } from "./CodeCard";
import { ExtractChapterButton } from "./ExtractChapterButton";
import { EditDocButton } from "./EditDocButton";
import { tryFormatJson } from "@/lib/jsonText";
import { sectionAnchor } from "@/lib/anchors";
import { SectionNav } from "./SectionNav";
import { RelatedDocsButton } from "./RelatedDocsButton";
import { AttachmentManager } from "./AttachmentManager";
import { ChapterRail } from "./ChapterRail";
import { SectionEditButton } from "./SectionEditButton";

/** Metadati libreria di un documento correlato, risolti dalla pagina a partire
    dagli slug salvati: i documenti eliminati spariscono senza errori. */
export type RelatedDocMeta = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  sectionCount: number;
  readingMinutes: number;
};

/* ── Icone inline senza dipendenze ──────────────────────────── */

type IconProps = { className?: string };

const I = {
  info: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" />
    </svg>
  ),
  warning: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  success: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="m5 12.5 4 4 10-10" />
    </svg>
  ),
  chevron: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  spark: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  ),
  quote: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={p.className}>
      <path d="M7.5 6C5 6 3 8 3 10.5S5 15 7.5 15c.2 0 .4 0 .6-.05C7.4 16.5 6 17.7 4 18.2L4.7 21c3.9-1 6.3-4 6.3-8.2V10.5C11 8 9 6 7.5 6Zm9 0C14 6 12 8 12 10.5S14 15 16.5 15c.2 0 .4 0 .6-.05-.7 1.6-2.1 2.8-4.1 3.3l.7 2.75c3.9-1 6.3-4 6.3-8.2V10.5C20 8 18 6 16.5 6Z" />
    </svg>
  ),
};

/* ── Blocchi primitivi ──────────────────────────────────────── */

function BlockHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2.5 font-display text-xl font-bold text-navy-900">
      <span className="creta-badge-grad h-5 w-1 rounded-full" />
      {children}
    </h3>
  );
}

function ParagraphBlock({ text }: { text: string }) {
  const json = tryFormatJson(text);
  if (json) return <CodeCard title="JSON" code={json} />;

  return (
    <p className="text-[1.02rem] leading-8 text-navy-700 whitespace-pre-wrap break-words">
      <InlineText text={text} />
    </p>
  );
}

function CalloutBlock({
  title,
  text,
  tone,
}: {
  title?: string;
  text: string;
  tone: "info" | "warning" | "success";
}) {
  const theme = {
    info: {
      ring: "border-navy-200",
      bg: "bg-surface-dark",
      chip: "bg-navy-900 text-white",
      Icon: I.info,
    },
    warning: {
      ring: "border-gold-300",
      bg: "bg-gold-50",
      chip: "creta-badge-grad text-white",
      Icon: I.warning,
    },
    success: {
      ring: "border-emerald-300",
      bg: "bg-emerald-50",
      chip: "bg-emerald-600 text-white",
      Icon: I.success,
    },
  }[tone];

  const { Icon } = theme;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${theme.ring} ${theme.bg} px-5 py-4 shadow-sm`}
    >
      <div className="flex gap-3.5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${theme.chip}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          {title && (
            <p className="mb-1 text-sm font-bold uppercase tracking-wide text-navy-900 break-words">
              {title}
            </p>
          )}
          <p className="text-[0.95rem] leading-7 text-navy-700 break-words">
            <InlineText text={text} />
          </p>
        </div>
      </div>
    </div>
  );
}

function StepsBlock({
  title,
  items,
}: {
  title?: string;
  items: { title?: string; text: string }[];
}) {
  return (
    <div className="space-y-5">
      {title && <BlockHeading>{title}</BlockHeading>}
      <ol className="relative space-y-4 before:absolute before:left-5 before:top-3 before:bottom-3 before:w-px before:bg-navy-200">
        {items.map((item, index) => (
          <li key={index} className="relative grid gap-4 sm:grid-cols-[2.5rem_1fr]">
            <span className="creta-num-grad z-10 grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white shadow-md shadow-navy-900/30 ring-4 ring-white">
              {index + 1}
            </span>
            <div className="min-w-0 rounded-2xl border border-navy-200 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-md">
              {item.title && (
                <p className="font-semibold text-navy-900 break-words">
                  <InlineText text={item.title} />
                </p>
              )}
              <p className={`text-[0.95rem] leading-7 text-navy-700 break-words ${item.title ? "mt-1" : ""}`}>
                <InlineText text={item.text} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TimelineBlock({
  title,
  items,
}: {
  title?: string;
  items: { title?: string; text: string }[];
}) {
  return (
    <div className="space-y-5">
      {title && <BlockHeading>{title}</BlockHeading>}
      <ol className="relative ml-1 space-y-6 border-l-2 border-dashed border-navy-200 pl-7">
        {items.map((item, index) => (
          <li key={index} className="relative">
            <span className="creta-badge-grad absolute -left-[2.32rem] top-1 grid h-5 w-5 place-items-center rounded-full ring-4 ring-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            {item.title && (
              <p className="font-display text-lg font-semibold text-navy-900">
                {item.title}
              </p>
            )}
            <p className={`text-[0.95rem] leading-7 text-navy-700 ${item.title ? "mt-1" : ""}`}>
              <InlineText text={item.text} />
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TableBlock({
  title,
  headers,
  rows,
}: {
  title?: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-sm">
      {title && (
        <div className="border-b border-navy-200 bg-surface-dark px-5 py-3">
          <p className="text-sm font-semibold text-navy-900">{title}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="creta-quote-grad text-white">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className="px-5 py-3.5 font-semibold tracking-wide"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="odd:bg-white even:bg-surface/60 transition-colors hover:bg-navy-50"
              >
                {headers.map((_, cellIndex) => (
                  <td key={cellIndex} className="px-5 py-3 text-navy-700">
                    <InlineText text={row[cellIndex] ?? ""} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CardsBlock({
  title,
  items,
}: {
  title?: string;
  items: { title?: string; text: string }[];
}) {
  return (
    <div className="space-y-5">
      {title && <BlockHeading>{title}</BlockHeading>}
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="group relative overflow-hidden rounded-2xl border border-navy-200 bg-white px-5 py-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-gold-300 hover:shadow-lg hover:shadow-navy-900/10"
          >
            <div className="creta-rule absolute inset-x-0 top-0 h-0.5 scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
            <span className="font-display text-sm font-bold text-gold-500">
              {String(index + 1).padStart(2, "0")}
            </span>
            {item.title && (
              <p className="mt-1.5 font-semibold text-navy-900">{item.title}</p>
            )}
            <p className="mt-1 text-[0.95rem] leading-7 text-navy-700">
              <InlineText text={item.text} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureBlock({
  title,
  items,
}: {
  title?: string;
  items: { title?: string; text: string }[];
}) {
  return (
    <div className="space-y-5">
      {title && <BlockHeading>{title}</BlockHeading>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="group rounded-2xl border border-navy-200 bg-white px-5 py-5 shadow-sm transition hover:-translate-y-1 hover:border-gold-300 hover:shadow-md"
          >
            <span className="creta-badge-grad mb-3 grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm shadow-navy-900/30 transition-transform group-hover:scale-110">
              <I.spark className="h-5 w-5" />
            </span>
            {item.title && <p className="font-semibold text-navy-900">{item.title}</p>}
            <p className="mt-1 text-[0.95rem] leading-7 text-navy-700">
              <InlineText text={item.text} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecBlock({
  title,
  items,
}: {
  title?: string;
  items: { term: string; definition: string }[];
}) {
  return (
    <div className="space-y-5">
      {title && <BlockHeading>{title}</BlockHeading>}
      <dl className="divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-sm">
        {items.map((item, index) => (
          <div
            key={index}
            className="grid gap-1 px-5 py-3.5 transition-colors hover:bg-surface/60 sm:grid-cols-[minmax(8rem,13rem)_1fr] sm:gap-5"
          >
            <dt className="font-semibold leading-7 text-navy-900 break-words">
              <InlineText text={item.term} />
            </dt>
            <dd className="min-w-0 text-[0.95rem] leading-7 text-navy-700 break-words">
              <InlineText text={item.definition} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CompareBlock({
  title,
  left,
  right,
}: {
  title?: string;
  left: { heading: string; items: string[] };
  right: { heading: string; items: string[] };
}) {
  const sides = [
    { side: left, accent: "border-navy-200", dot: "bg-navy-400", label: "text-navy-900" },
    { side: right, accent: "border-gold-300", dot: "creta-badge-grad", label: "text-gold-700" },
  ];
  return (
    <div className="space-y-5">
      {title && <BlockHeading>{title}</BlockHeading>}
      <div className="grid gap-4 sm:grid-cols-2">
        {sides.map(({ side, accent, dot, label }, index) => (
          <div
            key={index}
            className={`rounded-2xl border ${accent} bg-white px-5 py-5 shadow-sm`}
          >
            <p className={`mb-3 font-display text-base font-bold ${label} break-words`}>
              <InlineText text={side.heading} />
            </p>
            <ul className="space-y-2.5">
              {side.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-3">
                  <span className={`mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                  <span className="text-[0.95rem] leading-7 text-navy-700 break-words">
                    <InlineText text={item} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsBlock({
  title,
  items,
}: {
  title?: string;
  items: { value: string; label: string; hint?: string }[];
}) {
  return (
    <div className="space-y-5">
      {title && <BlockHeading>{title}</BlockHeading>}
      <div
        className="grid gap-px overflow-hidden rounded-2xl border border-navy-200 bg-navy-200"
        style={{
          gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item, index) => (
          <div key={index} className="bg-surface px-5 py-6 text-center sm:px-6">
            <p className="creta-stat-grad font-display text-4xl font-bold leading-none sm:text-5xl">
              {item.value}
            </p>
            <p className="mt-2 text-sm font-semibold text-navy-900">
              {item.label}
            </p>
            {item.hint && (
              <p className="mt-1 text-xs leading-5 text-navy-500">{item.hint}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistBlock({
  title,
  items,
}: {
  title?: string;
  items: string[];
}) {
  return (
    <div className="space-y-5">
      {title && <BlockHeading>{title}</BlockHeading>}
      <ul className="grid gap-2.5">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-3 rounded-xl border border-navy-200 bg-white px-4 py-3 shadow-sm transition hover:border-gold-300"
          >
            <span className="creta-badge-grad mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white">
              <I.check className="h-3.5 w-3.5" />
            </span>
            <span className="text-[0.95rem] leading-7 text-navy-700">
              <InlineText text={item} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListBlock({ title, items }: { title?: string; items: string[] }) {
  return (
    <div className="space-y-5">
      {title && <BlockHeading>{title}</BlockHeading>}
      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="creta-badge-grad mt-[0.72rem] h-1.5 w-1.5 shrink-0 rounded-full" />
            <span className="text-[1.02rem] leading-8 text-navy-700">
              <InlineText text={item} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuoteBlock({
  text,
  attribution,
}: {
  text: string;
  attribution?: string;
}) {
  return (
    <figure className="creta-quote-grad relative overflow-hidden rounded-3xl px-7 py-8 text-white shadow-xl shadow-navy-950/20 sm:px-9 sm:py-10">
      <I.quote className="absolute -right-2 -top-3 h-24 w-24 text-white/10" />
      <blockquote className="relative font-display text-xl font-medium leading-9 sm:text-2xl">
        {text}
      </blockquote>
      {attribution && (
        <figcaption className="relative mt-4 flex items-center gap-2 text-sm font-medium text-gold-300">
          <span className="h-px w-7 bg-gold-300/60" />
          {attribution}
        </figcaption>
      )}
    </figure>
  );
}

function AccordionBlock({
  title,
  items,
}: {
  title?: string;
  items: { title: string; text: string }[];
}) {
  return (
    <div className="space-y-5">
      {title && <BlockHeading>{title}</BlockHeading>}
      <div className="divide-y divide-navy-200 overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-sm">
        {items.map((item, index) => {
          const json = tryFormatJson(item.text);
          return (
            <details key={index} className="group px-5 [&>summary_svg]:open:rotate-180">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-navy-900 transition hover:text-gold-500">
                {item.title}
                <I.chevron className="h-5 w-5 shrink-0 text-gold-500 transition-transform duration-300" />
              </summary>
              {json ? (
                <div className="pb-4">
                  <CodeCard title="JSON" code={json} />
                </div>
              ) : (
                <p className="pb-4 text-[0.95rem] leading-7 text-navy-700">
                  <InlineText text={item.text} />
                </p>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
}

function ImageBlock({
  src,
  alt,
  caption,
}: {
  src: string;
  alt?: string;
  caption?: string;
}) {
  return (
    <figure className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-sm">
      {/* URL arbitraria dallo store (Blob pubblico o /creta-assets), inclusi
          SVG: <img> nativo evita la config domini di next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? caption ?? ""}
        loading="lazy"
        className="block h-auto w-full"
      />
      {caption && (
        <figcaption className="border-t border-navy-100 px-5 py-3 text-sm leading-6 text-navy-500">
          <InlineText text={caption} />
        </figcaption>
      )}
    </figure>
  );
}

function CtaBlock({
  title,
  text,
  label,
  href,
}: {
  title?: string;
  text?: string;
  label: string;
  href: string;
}) {
  const external = /^https?:\/\//i.test(href);
  return (
    <div className="creta-cta-band flex flex-col items-start gap-4 rounded-2xl border border-gold-200 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {title && (
          <p className="font-display text-xl font-bold leading-tight text-navy-900">
            {title}
          </p>
        )}
        {text && (
          <p className={`text-[0.98rem] leading-7 text-navy-600 ${title ? "mt-1" : ""}`}>
            <InlineText text={text} />
          </p>
        )}
      </div>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="creta-cta-grad inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md shadow-navy-900/15 transition hover:-translate-y-0.5"
      >
        {label}
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    </div>
  );
}

/* ── Dispatcher dei blocchi ─────────────────────────────────── */

export function renderDesignBlock(block: PageDesignBlock, index: number) {
  switch (block.type) {
    case "paragraph":
      return <ParagraphBlock key={index} text={block.text} />;
    case "callout":
      return (
        <CalloutBlock key={index} tone={block.tone} title={block.title} text={block.text} />
      );
    case "steps":
      return <StepsBlock key={index} title={block.title} items={block.items} />;
    case "timeline":
      return <TimelineBlock key={index} title={block.title} items={block.items} />;
    case "table":
      return (
        <TableBlock key={index} title={block.title} headers={block.headers} rows={block.rows} />
      );
    case "code":
      return <CodeCard key={index} title={block.title} code={block.code} />;
    case "cards":
      return <CardsBlock key={index} title={block.title} items={block.items} />;
    case "feature":
      return <FeatureBlock key={index} title={block.title} items={block.items} />;
    case "spec":
      return <SpecBlock key={index} title={block.title} items={block.items} />;
    case "compare":
      return (
        <CompareBlock key={index} title={block.title} left={block.left} right={block.right} />
      );
    case "stats":
      return <StatsBlock key={index} title={block.title} items={block.items} />;
    case "checklist":
      return <ChecklistBlock key={index} title={block.title} items={block.items} />;
    case "list":
      return <ListBlock key={index} title={block.title} items={block.items} />;
    case "quote":
      return <QuoteBlock key={index} text={block.text} attribution={block.attribution} />;
    case "accordion":
      return <AccordionBlock key={index} title={block.title} items={block.items} />;
    case "image":
      return (
        <ImageBlock key={index} src={block.src} alt={block.alt} caption={block.caption} />
      );
    case "cta":
      return (
        <CtaBlock key={index} title={block.title} text={block.text} label={block.label} href={block.href} />
      );
  }
}

/* ── Struttura pagina ───────────────────────────────────────── */

/* Raggruppa le sezioni consecutive sotto il titolo del capitolo h1, cosi'
   indice e rail rispecchiano la gerarchia del documento sorgente. */
function groupByChapter(sections: PageDesign["sections"]) {
  const groups: { chapter?: string; items: { title: string; index: number }[] }[] = [];
  sections.forEach((section, index) => {
    const last = groups[groups.length - 1];
    if (!last || last.chapter !== section.chapter) {
      groups.push({ chapter: section.chapter, items: [] });
    }
    groups[groups.length - 1].items.push({ title: section.title, index });
  });
  return groups;
}

/* Blocchi "larghi": griglie e momenti visivi che escono dalla colonna di
   lettura per dare il ritmo da landing. Il testo di scorrimento (paragrafi,
   liste, callout, steps…) resta invece nella colonna stretta, leggibile. */
const WIDE_BLOCKS = new Set<PageDesignBlock["type"]>([
  "cards",
  "feature",
  "stats",
  "quote",
  "table",
  "compare",
]);

/* Sezione in stile landing: intestazione centrata con numero filigrana dietro,
   poi i blocchi in colonna di lettura stretta; i blocchi larghi sfondano ai
   lati (lg:-mx-24) restando dentro la banda. */
function LandingSection({
  section,
  index,
  slug,
  editable,
}: {
  section: PageDesign["sections"][number];
  index: number;
  slug: string;
  editable: boolean;
}) {
  return (
    <section
      id={sectionAnchor(section.title, index)}
      data-idx={index}
      className="group/section relative scroll-mt-32"
    >
      <span
        aria-hidden
        className="creta-section-thread absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 lg:block"
      />
      <Reveal className="relative text-center">
        {/* Numero filigrana: grande e tenue, dietro all'intestazione */}
        <span
          aria-hidden
          className="creta-section-watermark pointer-events-none absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-[60%] select-none font-display text-[7rem] font-black leading-none sm:text-[10rem]"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="relative">
          <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.3em] text-gold-600">
            Sezione {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mx-auto mt-2 max-w-3xl break-words font-display text-3xl font-bold leading-tight text-navy-900 sm:text-4xl">
            {section.title}
          </h3>
          <div className="creta-rule mx-auto mt-4 h-0.5 w-12 rounded-full" />
          {section.intro && (
            <p className="mx-auto mt-5 max-w-2xl text-[1.02rem] leading-8 text-navy-600">
              <InlineText text={section.intro} />
            </p>
          )}
          {editable && (
            <div className="mt-5 flex justify-center">
              <SectionEditButton
                slug={slug}
                sectionIndex={index}
                section={{
                  title: section.title,
                  intro: section.intro,
                  blocks: section.blocks,
                }}
              />
            </div>
          )}
        </div>
      </Reveal>

      <div className="creta-reading-column relative mx-auto mt-10 max-w-3xl space-y-8 sm:mt-12">
        {section.blocks.map((block, blockIndex) => (
          <Reveal
            key={blockIndex}
            delay={Math.min(blockIndex, 4) * 70}
            className={WIDE_BLOCKS.has(block.type) ? "lg:-mx-24" : ""}
          >
            {renderDesignBlock(block, blockIndex)}
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* Intestazione di capitolo centrata, in apertura di ogni banda. Sostituisce la
   spina laterale sticky: l'orientamento "in quale capitolo sono" resta affidato
   a SectionNav (scrollspy in testa). */
function ChapterHeader({
  chapter,
  number,
  count,
  slug,
}: {
  chapter: string;
  number: number;
  count: number;
  slug: string;
}) {
  return (
    <Reveal className="mb-16 text-center sm:mb-24">
      <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.32em] text-gold-600">
        Capitolo {String(number).padStart(2, "0")}
      </p>
      <h2 className="mx-auto mt-3 max-w-3xl break-words font-display text-4xl font-bold leading-tight text-navy-950 sm:text-5xl">
        {chapter}
      </h2>
      <div className="creta-rule mx-auto mt-5 h-0.5 w-16 rounded-full" />
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-navy-400">
        <span>
          {count} {count === 1 ? "sezione" : "sezioni"}
        </span>
        <ExtractChapterButton slug={slug} chapter={chapter} compact />
      </div>
    </Reveal>
  );
}

export function PageDesignRenderer({
  design,
  slug,
  related = [],
}: {
  design: PageDesign;
  slug: string;
  related?: RelatedDocMeta[];
}) {
  const chapterGroups = groupByChapter(design.sections);
  const showChapters = chapterGroups.filter((group) => group.chapter).length > 1;
  /* I documenti scritti in /scrivi hanno la sorgente markdown come verita': si
     modificano da li', non per-sezione, per non divergere alla rigenerazione. */
  const editable = !design.authoring;
  const navItems = design.sections.map((section, index) => ({
    anchor: sectionAnchor(section.title, index),
    title: section.title,
    chapter: section.chapter,
  }));

  return (
    <article className="bg-white">
      <SectionNav items={navItems} showChapters={showChapters} />
      {/* Testata hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="creta-grain pointer-events-none absolute inset-0 opacity-[0.05]" />

        <div className="relative mx-auto max-w-5xl px-6 pb-16 pt-28 sm:pb-20 sm:pt-36">
          <Reveal>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-gold-400">
              {design.page.eyebrow ?? "Documento"}
            </p>
            {design.page.source && (
              <p className="-mt-3 mb-5 text-sm text-white/45">
                Estratto da{" "}
                <Link
                  href={`/${design.page.source.slug}`}
                  className="font-medium text-white/70 underline decoration-white/30 underline-offset-4 transition hover:text-gold-300"
                >
                  {design.page.source.title}
                </Link>
              </p>
            )}
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="max-w-4xl break-words font-display text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-6xl"
              style={{ viewTransitionName: `doc-title-${slug}` }}
            >
              {design.page.title}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-3xl text-[1.05rem] leading-8 text-white/60">
              <InlineText text={design.page.summary} onDark />
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-7 flex flex-col gap-3 text-sm text-white/45 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                {design.page.audience && (
                  <>
                    <span className="break-words">{design.page.audience}</span>
                    <span aria-hidden>·</span>
                  </>
                )}
                <span>{design.sections.length} sezioni</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href={`/${slug}/presenta`}
                  className="flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-1.5 text-sm font-medium text-white transition hover:border-white/70"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M2 3h20" />
                    <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
                    <path d="m7 21 5-5 5 5" />
                  </svg>
                  Presenta
                </Link>
                <EditDocButton
                  slug={slug}
                  page={design.page}
                  sections={design.sections.map((s) => ({
                    title: s.title,
                    chapter: s.chapter,
                  }))}
                />
                {design.authoring && (
                  <Link
                    href={`/scrivi?slug=${slug}`}
                    className="flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-1.5 text-sm font-medium text-white transition hover:border-white/70"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                    Modifica testo
                  </Link>
                )}
              </div>
            </div>
          </Reveal>
        </div>

        <div className="creta-scanline absolute inset-x-0 bottom-0 h-1" />
      </section>

      {/* Corpo — bande full-width alternate, stile landing */}
      <div>
        {chapterGroups.map((group, groupIndex) => {
          const chapter = group.chapter;
          const sections = group.items.map(({ index }) => (
            <LandingSection
              key={index}
              section={design.sections[index]}
              index={index}
              slug={slug}
              editable={editable}
            />
          ));

          const hasHeader = showChapters && Boolean(chapter);
          const chapterNumber = chapterGroups
            .slice(0, groupIndex + 1)
            .filter((g) => g.chapter).length;

          /* Bande alternate: bianco pulito ↔ griglia testurizzata, per dare
             battito da landing senza mettere sfondi arbitrari sotto i blocchi
             (che sono pensati per fondo chiaro). */
          const band =
            groupIndex % 2 === 0
              ? "creta-paper-band"
              : "creta-grid-bg creta-grid-band";

          return (
            <section key={groupIndex} className={`relative ${band}`}>
              {hasHeader && chapter && (
                <ChapterRail
                  number={chapterNumber}
                  chapter={chapter}
                  slug={slug}
                />
              )}
              <div className="relative z-10 mx-auto max-w-5xl px-5 py-16 sm:py-24 lg:px-6">
                {hasHeader && chapter && (
                  <ChapterHeader
                    chapter={chapter}
                    number={chapterNumber}
                    count={group.items.length}
                    slug={slug}
                  />
                )}
                <div className="space-y-20 sm:space-y-28">{sections}</div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Allegati scaricabili (script, documenti) caricati a mano */}
      <section className="border-t border-navy-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:py-14 lg:px-6">
          <AttachmentManager slug={slug} attachments={design.attachments ?? []} />
        </div>
      </section>

      {/* Documenti correlati scelti a mano e salvati in design.related */}
      <section className="border-t border-navy-200/70 bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:py-14 lg:px-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div>
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
                Vedi anche
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-navy-950">
                Altri documenti utili
              </h2>
            </div>
            <RelatedDocsButton slug={slug} selected={design.related ?? []} />
          </div>

          {related.length > 0 ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/${doc.slug}`}
                  transitionTypes={["nav-forward"]}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-navy-200 bg-white px-5 py-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-gold-300 hover:shadow-lg hover:shadow-navy-900/10"
                >
                  <div className="creta-rule absolute inset-x-0 top-0 h-0.5 scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
                  <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-navy-400">
                    {doc.eyebrow}
                  </p>
                  <p className="mt-2 font-display text-xl font-bold leading-tight text-navy-950 transition-colors group-hover:text-navy-700">
                    {doc.title}
                  </p>
                  {doc.summary && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-navy-500">
                      {doc.summary}
                    </p>
                  )}
                  <p className="mt-auto flex items-center gap-2.5 pt-4 font-mono text-[0.65rem] font-medium uppercase tracking-wide text-navy-400">
                    <span>{doc.sectionCount} sezioni</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-navy-300" />
                    <span>{doc.readingMinutes} min</span>
                    <span className="ml-auto grid h-7 w-7 place-items-center rounded-full border border-navy-200 text-navy-400 transition group-hover:border-gold-400 group-hover:text-gold-600">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-7 rounded-2xl border border-dashed border-navy-300/60 bg-white px-6 py-10 text-center text-sm leading-7 text-navy-500 shadow-sm">
              Nessun collegamento ancora. Usa{" "}
              <span className="font-semibold text-navy-700">“Collega documenti”</span>{" "}
              per suggerire le prossime letture in fondo a questa pagina.
            </p>
          )}
        </div>
      </section>

      {/* Piè di pagina */}
      <footer className="border-t border-navy-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-navy-500 sm:flex-row lg:px-6">
          <p className="flex items-center gap-2.5">
            <span className="creta-badge-grad grid h-7 w-7 place-items-center rounded-lg text-xs font-black text-white">
              C
            </span>
            Pagina generata con Creta dal documento sorgente
          </p>
          <Link
            href="/"
            className="rounded-full border border-navy-200 px-4 py-2 font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-500"
          >
            Tutti i documenti
          </Link>
        </div>
      </footer>
    </article>
  );
}
