"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PageDesign, PageDesignBlock } from "@/lib/schema";
import { renderDesignBlock } from "./PageDesignRenderer";
import { InlineText } from "./InlineText";

/* ── Modello slide ───────────────────────────────────────────
   Il deck deriva in modo deterministico dal design salvato:
   copertina -> divisori capitolo -> una o piu' slide per sezione -> fine.
   Le sezioni pesanti vengono divise su piu' slide per restare leggibili;
   il peso per blocco e' una stima grezza dell'altezza. */

type SectionSlide = {
  kind: "section";
  title: string;
  intro?: string;
  chapter?: string;
  /** Numero sezione nel documento, base 1. */
  number: number;
  part: number;
  parts: number;
  blocks: PageDesignBlock[];
};

type Slide =
  | { kind: "cover" }
  | { kind: "chapter"; title: string; number: number; count: number }
  | SectionSlide
  | { kind: "end" };

const SLIDE_BUDGET = 6;

function blockWeight(block: PageDesignBlock): number {
  switch (block.type) {
    case "paragraph":
      return Math.max(1, Math.ceil(block.text.length / 420));
    case "callout":
      return 1;
    case "quote":
    case "stats":
      return 2;
    case "code":
      return Math.max(2, Math.ceil(block.code.split("\n").length / 8));
    case "table":
      return Math.max(2, Math.ceil(block.rows.length / 3));
    case "checklist":
    case "list":
      return Math.max(1, Math.ceil(block.items.length / 4));
    case "steps":
    case "timeline":
    case "cards":
    case "feature":
    case "accordion":
      return Math.max(2, Math.ceil(block.items.length / 2));
  }
}

function splitBlocks(blocks: PageDesignBlock[]): PageDesignBlock[][] {
  const chunks: PageDesignBlock[][] = [];
  let current: PageDesignBlock[] = [];
  let weight = 0;
  for (const block of blocks) {
    const w = blockWeight(block);
    if (current.length > 0 && weight + w > SLIDE_BUDGET) {
      chunks.push(current);
      current = [];
      weight = 0;
    }
    current.push(block);
    weight += w;
  }
  if (current.length > 0) chunks.push(current);
  return chunks.length > 0 ? chunks : [[]];
}

function buildSlides(design: PageDesign): Slide[] {
  const slides: Slide[] = [{ kind: "cover" }];
  const chapters = new Set(
    design.sections.map((s) => s.chapter).filter(Boolean)
  );
  const showChapters = chapters.size > 1;

  let lastChapter: string | undefined;
  let chapterNumber = 0;
  design.sections.forEach((section, index) => {
    if (showChapters && section.chapter && section.chapter !== lastChapter) {
      chapterNumber += 1;
      slides.push({
        kind: "chapter",
        title: section.chapter,
        number: chapterNumber,
        count: design.sections.filter((s) => s.chapter === section.chapter)
          .length,
      });
    }
    lastChapter = section.chapter;

    const chunks = splitBlocks(section.blocks);
    chunks.forEach((blocks, part) => {
      slides.push({
        kind: "section",
        title: section.title,
        intro: section.intro,
        chapter: showChapters ? section.chapter : undefined,
        number: index + 1,
        part: part + 1,
        parts: chunks.length,
        blocks,
      });
    });
  });

  slides.push({ kind: "end" });
  return slides;
}

/* ── Sequenza slide ──────────────────────────────────────────── */

export function PresentationClient({
  design,
  slug,
  initialSlide = 0,
}: {
  design: PageDesign;
  slug: string;
  initialSlide?: number;
}) {
  const router = useRouter();
  const slides = useMemo(() => buildSlides(design), [design]);
  const last = slides.length - 1;

  const [current, setCurrent] = useState(() =>
    Math.min(last, Math.max(0, initialSlide))
  );
  const [dir, setDir] = useState<1 | -1>(1);
  const [fullscreen, setFullscreen] = useState(false);

  const go = useCallback(
    (target: number) => {
      const next = Math.min(last, Math.max(0, target));
      if (next === current) return;
      setDir(next > current ? 1 : -1);
      setCurrent(next);
    },
    [current, last]
  );

  /* Mantiene ?slide=n condivisibile, base 1, senza sporcare la history. */
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("slide", String(current + 1));
    window.history.replaceState(null, "", url);
  }, [current]);

  useEffect(() => {
    function onChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          go(current + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          go(current - 1);
          break;
        case "Home":
          e.preventDefault();
          go(0);
          break;
        case "End":
          e.preventDefault();
          go(last);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          /* Il browser usa Esc per uscire prima dal fullscreen; solo una
             seconda pressione, fuori fullscreen, chiude la presentazione. */
          if (!document.fullscreenElement) router.push(`/${slug}`);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go, last, router, slug, toggleFullscreen]);

  const slide = slides[current];

  const context =
    slide.kind === "cover"
      ? "Copertina"
      : slide.kind === "chapter"
        ? `Capitolo ${String(slide.number).padStart(2, "0")}`
        : slide.kind === "end"
          ? "Fine"
          : slide.chapter
            ? `${slide.chapter} — ${slide.title}`
            : slide.title;

  const navButton =
    "grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-gold-400 hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:border-white/20 disabled:hover:text-white/80";

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden bg-navy-950 text-white">
      {/* Progresso */}
      <div className="h-0.5 shrink-0 bg-white/10">
        <div
          className="creta-progress-grad h-full transition-transform duration-300 ease-out"
          style={{
            transform: `scaleX(${(current + 1) / slides.length})`,
            transformOrigin: "left",
          }}
        />
      </div>

      {/* Barra superiore */}
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="creta-badge-grad grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-black text-white">
            C
          </span>
          <p className="truncate text-sm font-semibold text-white/70">
            {design.page.title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-xs font-semibold tabular-nums text-white/50">
            {String(current + 1).padStart(2, "0")} /{" "}
            {String(slides.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={
              fullscreen ? "Esci dallo schermo intero" : "Schermo intero"
            }
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/20 text-white/70 transition hover:border-white/60 hover:text-white"
          >
            {fullscreen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            )}
          </button>
          <Link
            href={`/${slug}`}
            className="flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-sm font-medium text-white/80 transition hover:border-white/60 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Chiudi
          </Link>
        </div>
      </header>

      {/* Area slide */}
      <main className="relative min-h-0 flex-1 px-3 pb-3 sm:px-6 sm:pb-4">
        <div
          key={current}
          className={`h-full ${
            dir === 1
              ? "animate-[creta-slide-fwd_420ms_cubic-bezier(0.22,1,0.36,1)_both]"
              : "animate-[creta-slide-back_420ms_cubic-bezier(0.22,1,0.36,1)_both]"
          }`}
        >
          {slide.kind === "cover" && (
            <CoverSlide design={design} slideCount={slides.length} />
          )}
          {slide.kind === "chapter" && <ChapterSlide slide={slide} />}
          {slide.kind === "section" && <SectionSlide slide={slide} />}
          {slide.kind === "end" && <EndSlide design={design} slug={slug} />}
        </div>
      </main>

      {/* Barra inferiore */}
      <footer className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/40">
          {context}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => go(current - 1)}
            disabled={current === 0}
            aria-label="Slide precedente"
            className={navButton}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            disabled={current === last}
            aria-label="Slide successiva"
            className={navButton}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ── Layout slide ────────────────────────────────────────────── */

function CoverSlide({
  design,
  slideCount,
}: {
  design: PageDesign;
  slideCount: number;
}) {
  return (
    <div className="creta-hero-bg relative flex h-full flex-col justify-center overflow-hidden rounded-[1.75rem] border border-white/10 px-6 py-8 sm:px-14">
      <div className="creta-grain pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="creta-scanline absolute inset-x-0 bottom-0 h-1" />
      <div className="relative">
        <p className="flex items-center gap-4 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-400">
          <span className="h-px w-10 bg-gold-400/60" />
          {design.page.eyebrow ?? "Documento"}
        </p>
        <h1 className="mt-6 max-w-5xl break-words font-display text-[clamp(2.2rem,6vw,4.8rem)] font-bold leading-[1.04]">
          {design.page.title}
        </h1>
        <p className="mt-6 max-w-3xl text-[1.02rem] leading-8 text-white/60">
          <InlineText text={design.page.summary} onDark />
        </p>
        <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/45">
          {design.page.audience && (
            <>
              <span>{design.page.audience}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span>{design.sections.length} sezioni</span>
          <span aria-hidden>·</span>
          <span>{slideCount} slide</span>
        </p>
      </div>
      <p className="absolute bottom-6 left-6 right-6 text-center font-mono text-[0.62rem] font-medium uppercase tracking-[0.2em] text-white/30 sm:left-14 sm:text-left">
        ← → per navigare · F schermo intero · Esc per uscire
      </p>
    </div>
  );
}

function ChapterSlide({
  slide,
}: {
  slide: Extract<Slide, { kind: "chapter" }>;
}) {
  return (
    <div className="creta-quote-grad relative flex h-full flex-col justify-center overflow-hidden rounded-[1.75rem] border border-white/10 px-6 py-8 sm:px-14">
      <div className="creta-grain pointer-events-none absolute inset-0 opacity-[0.05]" />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 bottom-[-0.18em] font-display text-[16rem] font-bold leading-none text-white/[0.06] sm:text-[24rem]"
      >
        {String(slide.number).padStart(2, "0")}
      </span>
      <div className="relative">
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-400">
          Capitolo {String(slide.number).padStart(2, "0")}
        </p>
        <h2 className="mt-5 max-w-4xl break-words font-display text-[clamp(2rem,5.5vw,4.2rem)] font-bold leading-[1.06]">
          {slide.title}
        </h2>
        <p className="mt-6 text-sm text-white/45">
          {slide.count} {slide.count === 1 ? "sezione" : "sezioni"}
        </p>
      </div>
      <div className="creta-scanline absolute inset-x-0 bottom-0 h-1" />
    </div>
  );
}

function SectionSlide({ slide }: { slide: SectionSlide }) {
  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden rounded-[1.75rem] bg-surface text-navy-900 lg:overflow-hidden">
      <div className="grid min-h-full gap-6 p-5 sm:p-8 lg:h-full lg:grid-cols-[17rem_1fr] lg:gap-10 lg:p-10">
        {/* Rail sezioni */}
        <div className="lg:flex lg:min-h-0 lg:flex-col">
          {slide.chapter && (
            <p className="mb-3 break-words text-[0.7rem] font-bold uppercase tracking-[0.18em] text-gold-600">
              {slide.chapter}
            </p>
          )}
          <div className="flex items-center gap-3">
            <p className="creta-stat-grad font-display text-6xl font-bold leading-none">
              {String(slide.number).padStart(2, "0")}
            </p>
            {slide.parts > 1 && (
              <span className="rounded-full bg-navy-100 px-3 py-1 font-mono text-[0.65rem] font-bold text-navy-500">
                {slide.part} / {slide.parts}
              </span>
            )}
          </div>
          <div className="creta-rule mt-4 h-0.5 w-16 rounded-full" />
          <h2 className="mt-4 break-words font-display text-3xl font-bold leading-tight text-navy-900 sm:text-4xl">
            {slide.title}
          </h2>
          {slide.intro && slide.part === 1 && (
            <p className="mt-3 text-sm leading-7 text-navy-600">
              <InlineText text={slide.intro} />
            </p>
          )}
        </div>

        {/* Contenuto */}
        <div className="min-w-0 space-y-6 lg:min-h-0 lg:overflow-y-auto lg:pr-2">
          {slide.blocks.length > 0 ? (
            slide.blocks.map((block, index) => (
              <div key={index}>{renderDesignBlock(block, index)}</div>
            ))
          ) : (
            <p className="text-sm italic text-navy-400">
              Questa sezione non ha contenuti.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EndSlide({ design, slug }: { design: PageDesign; slug: string }) {
  return (
    <div className="creta-hero-bg relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 px-6 text-center">
      <div className="creta-grain pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="relative">
        <span className="creta-badge-grad mx-auto grid h-14 w-14 place-items-center rounded-2xl text-xl font-black text-white shadow-lg shadow-navy-950/40">
          C
        </span>
        <h2 className="mt-7 font-display text-4xl font-bold sm:text-5xl">
          Fine.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/55">
          Hai presentato{" "}
          <span className="font-semibold text-white/85">
            {design.page.title}
          </span>
          . Ogni parola era quella del documento d&apos;origine.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/${slug}`}
            className="rounded-full bg-gold-400 px-6 py-3 text-sm font-semibold text-navy-950 transition hover:-translate-y-0.5 hover:bg-gold-300"
          >
            Torna al documento
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:border-white/70"
          >
            Tutti i documenti
          </Link>
        </div>
      </div>
      <div className="creta-scanline absolute inset-x-0 bottom-0 h-1" />
    </div>
  );
}
