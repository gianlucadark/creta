"use client";

import { useEffect, useRef, useState } from "react";

type Group = {
  chapter?: string;
  items: { title: string; index: number }[];
};

const PANEL_WIDTH = 320;
const PANEL_MARGIN = 12;

function sectionAnchor(title: string, index: number) {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `sezione-${index + 1}`;
}

function scrollToSection(title: string, index: number) {
  const id = sectionAnchor(title, index);
  const el = document.getElementById(id);
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 108;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
}

export function ChapterNav({
  groups,
  heroHeight = 480,
}: {
  groups: Group[];
  heroHeight?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  /* the panel keeps rendering the last-opened group while it fades out */
  const [panelIndex, setPanelIndex] = useState(0);
  const [panelPos, setPanelPos] = useState({ left: PANEL_MARGIN, caret: PANEL_WIDTH / 2 });
  const [activeSectionIdx, setActiveSectionIdx] = useState(-1);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const chapterGroups = groups.filter((g) => g.chapter);
  const activeChapterIdx = chapterGroups.findIndex((group) =>
    group.items.some((item) => item.index === activeSectionIdx)
  );

  /* show/hide on scroll + track active section; page scroll closes the panel */
  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > heroHeight - 80);

      const sections = document.querySelectorAll<HTMLElement>("section[data-idx]");
      let active = -1;
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= 115) active = Number(el.dataset.idx);
      }
      setActiveSectionIdx(active);
      setOpenIndex(null);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [heroHeight]);

  /* close on outside click or Escape */
  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenIndex(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* keep the active chapter centered when the bar overflows horizontally */
  useEffect(() => {
    if (activeChapterIdx < 0) return;
    buttonRefs.current[activeChapterIdx]?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeChapterIdx]);

  if (chapterGroups.length < 2) return null;

  function open(index: number, anchor: HTMLElement) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const rect = anchor.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const left = Math.min(
      Math.max(center - PANEL_WIDTH / 2, PANEL_MARGIN),
      Math.max(PANEL_MARGIN, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN)
    );
    setPanelPos({
      left,
      caret: Math.min(Math.max(center - left, 20), PANEL_WIDTH - 20),
    });
    setPanelIndex(index);
    setOpenIndex(index);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenIndex(null), 160);
  }

  const panelGroup = chapterGroups[panelIndex];
  const isPanelOpen = openIndex !== null;

  return (
    <nav
      ref={navRef}
      aria-label="Capitoli del documento"
      className={`fixed inset-x-0 top-[54px] z-20 transition-[opacity,transform] duration-500 ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1 opacity-0"
      }`}
    >
      {/* Frosted bar */}
      <div className="border-b border-navy-100/60 bg-white/85 shadow-sm shadow-navy-900/5 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
          {/* w-max lets the row overflow naturally; min-w-full centers it when it fits */}
          <div className="mx-auto flex w-max min-w-full items-center justify-center">
            {chapterGroups.map((group, i) => {
              const isActive = i === activeChapterIdx;
              const isOpen = openIndex === i;

              return (
                <button
                  key={i}
                  ref={(el) => {
                    buttonRefs.current[i] = el;
                  }}
                  onMouseEnter={(e) => open(i, e.currentTarget)}
                  onMouseLeave={scheduleClose}
                  onClick={(e) =>
                    isOpen ? setOpenIndex(null) : open(i, e.currentTarget)
                  }
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-[0.82rem] font-medium transition-colors ${
                    isActive || isOpen
                      ? "text-navy-900"
                      : "text-navy-500 hover:text-navy-800"
                  }`}
                >
                  <span
                    className={`font-display text-[0.68rem] font-bold tabular-nums transition-colors ${
                      isActive ? "text-gold-500" : "text-navy-300"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="max-w-[12rem] truncate">{group.chapter}</span>
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-3 w-3 shrink-0 text-navy-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <path d="m4 6 4 4 4-4" />
                  </svg>

                  {/* active-chapter underline */}
                  <span
                    className={`creta-progress-grad absolute inset-x-4 bottom-0 h-[2px] rounded-full transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dropdown panel — sibling of the scrollable bar so it never gets clipped */}
      {panelGroup && (
        <div
          role="menu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          style={{ left: panelPos.left, width: PANEL_WIDTH }}
          className={`absolute top-full pt-2 transition-[opacity,transform] duration-200 ease-out ${
            isPanelOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1.5 opacity-0"
          }`}
        >
          {/* caret pointing at the chapter button */}
          <span
            style={{ left: panelPos.caret }}
            className="absolute top-[3px] h-3 w-3 -translate-x-1/2 rotate-45 rounded-[3px] bg-navy-700"
          />
          <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-2xl shadow-navy-950/15">
            {/* panel header */}
            <div className="creta-quote-grad px-5 py-3.5 text-white">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-gold-300">
                Capitolo {String(panelIndex + 1).padStart(2, "0")} ·{" "}
                {panelGroup.items.length}{" "}
                {panelGroup.items.length === 1 ? "sezione" : "sezioni"}
              </p>
              <p className="mt-1 truncate font-display text-[0.95rem] font-bold">
                {panelGroup.chapter}
              </p>
            </div>

            {/* section links */}
            <div className="max-h-[55vh] overflow-y-auto py-1.5">
              {panelGroup.items.map((item) => {
                const isItemActive = item.index === activeSectionIdx;
                const isRead = item.index < activeSectionIdx;
                return (
                  <button
                    key={item.index}
                    role="menuitem"
                    onClick={() => {
                      setOpenIndex(null);
                      scrollToSection(item.title, item.index);
                    }}
                    className={`relative flex w-full items-baseline gap-3 px-5 py-2.5 text-left text-sm transition-colors hover:bg-navy-50 ${
                      isItemActive
                        ? "bg-gold-50/70 font-semibold text-navy-900"
                        : "text-navy-600"
                    }`}
                  >
                    <span
                      className={`creta-progress-grad absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity ${
                        isItemActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span
                      className={`w-6 shrink-0 font-display text-xs font-bold tabular-nums ${
                        isItemActive
                          ? "text-gold-500"
                          : isRead
                            ? "text-navy-300"
                            : "text-gold-400/80"
                      }`}
                    >
                      {String(item.index + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-snug">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
