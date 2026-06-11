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

/* ── Icons (inline, no dependency) ──────────────────────────── */

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

/* ── Primitive blocks ───────────────────────────────────────── */

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
      bg: "bg-surface-dark/50",
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
                <th key={index} className="px-5 py-3.5 font-semibold tracking-wide">
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

/* ── Block dispatcher ───────────────────────────────────────── */

function renderDesignBlock(block: PageDesignBlock, index: number) {
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
  }
}

/* ── Page shell ─────────────────────────────────────────────── */

/* Group consecutive sections under their main-chapter (h1) title, so the
   TOC and the section rail mirror the document's own hierarchy. */
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

export function PageDesignRenderer({ design, slug }: { design: PageDesign; slug: string }) {
  const chapterGroups = groupByChapter(design.sections);
  const showChapters = chapterGroups.filter((group) => group.chapter).length > 1;
  const navItems = design.sections.map((section, index) => ({
    anchor: sectionAnchor(section.title, index),
    title: section.title,
    chapter: section.chapter,
  }));

  return (
    <article className="bg-white">
      <SectionNav items={navItems} showChapters={showChapters} />
      {/* Hero */}
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

      {/* Body */}
      <div className="creta-grid-bg">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14 lg:px-6">
        <div className="space-y-12 sm:space-y-16">
          {chapterGroups.map((group, groupIndex) => {
            const chapterNumber = chapterGroups
              .slice(0, groupIndex + 1)
              .filter((g) => g.chapter).length;
            return (
              <div key={groupIndex} className="space-y-6 sm:space-y-8">
                {/* Chapter band: marks the parent <h1> chapter of the cards below */}
                {showChapters && group.chapter && (
                  <Reveal>
                    <div className="relative overflow-hidden rounded-[1.5rem] bg-navy-950 px-6 py-7 text-white shadow-lg shadow-navy-950/15 sm:px-8 sm:py-8">
                      <div className="creta-grain pointer-events-none absolute inset-0 opacity-[0.05]" />
                      <div className="creta-scanline absolute inset-x-0 bottom-0 h-0.5" />
                      <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
                        <div className="min-w-0">
                          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-gold-400">
                            Capitolo {String(chapterNumber).padStart(2, "0")}
                            <span className="ml-3 normal-case tracking-normal text-white/40">
                              {group.items.length}{" "}
                              {group.items.length === 1 ? "sezione" : "sezioni"}
                            </span>
                          </p>
                          <h2 className="mt-2.5 font-display text-2xl font-bold leading-tight sm:text-3xl">
                            {group.chapter}
                          </h2>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                )}

                <div className={`space-y-6 sm:space-y-8 ${showChapters && group.chapter ? "sm:ml-5 sm:border-l-2 sm:border-navy-100 sm:pl-6" : ""}`}>
                  {group.items.map(({ index }) => {
                    const section = design.sections[index];
                    return (
                      <section
                        key={index}
                        id={sectionAnchor(section.title, index)}
                        data-idx={index}
                        className="grid scroll-mt-32 gap-6 rounded-[1.5rem] border border-navy-100 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-[16rem_1fr] lg:gap-10"
                      >
                        <div className="lg:sticky lg:top-24 lg:self-start">
                          <Reveal>
                            {showChapters && section.chapter && (
                              <div className="mb-4 space-y-2.5">
                                <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-gold-600">
                                  {section.chapter}
                                </p>
                                <ExtractChapterButton
                                  slug={slug}
                                  chapter={section.chapter}
                                  compact
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <p className="creta-stat-grad font-display text-5xl font-bold leading-none">
                                {String(index + 1).padStart(2, "0")}
                              </p>
                              <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-navy-500">
                                sezione
                              </span>
                            </div>
                            <div className="creta-rule mt-4 h-0.5 w-16 rounded-full" />
                            <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-navy-900">
                              {section.title}
                            </h3>
                            {section.intro && (
                              <p className="mt-3 text-sm leading-7 text-navy-600">
                                <InlineText text={section.intro} />
                              </p>
                            )}
                          </Reveal>
                        </div>

                        <div className="min-w-0 space-y-7">
                          {section.blocks.map((block, blockIndex) => (
                            <Reveal key={blockIndex} delay={Math.min(blockIndex, 4) * 70}>
                              {renderDesignBlock(block, blockIndex)}
                            </Reveal>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {/* Footer */}
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
