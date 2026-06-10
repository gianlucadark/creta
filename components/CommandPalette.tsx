"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchResponse } from "@/lib/searchIndex";

/* Global ⌘K palette: full-text search across every document *and* every
   section, served by /api/search (the JSON store is the index — no DB).
   Mounted once in the root layout; other components open it by dispatching
   the "creta:palette" event. */

export const PALETTE_EVENT = "creta:palette";

export function openPalette() {
  window.dispatchEvent(new Event(PALETTE_EVENT));
}

type Item =
  | { kind: "doc"; doc: SearchResponse["docs"][number] }
  | { kind: "section"; section: SearchResponse["sections"][number] };

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const pattern = useMemo(() => {
    const escaped = terms.filter(Boolean).map(escapeRegExp);
    return escaped.length ? new RegExp(`(${escaped.join("|")})`, "gi") : null;
  }, [terms]);

  if (!pattern) return <>{text}</>;
  /* split keeps the single capture group at odd indices */
  return (
    <>
      {text.split(pattern).map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="rounded-[3px] bg-gold-200/80 px-0.5 text-navy-950">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* open/close triggers */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PALETTE_EVENT, onOpen);
    };
  }, []);

  /* lock scroll + focus while open */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = previous;
      cancelAnimationFrame(id);
    };
  }, [open]);

  /* debounced fetch */
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(
      () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
          .then((res) => (res.ok ? (res.json() as Promise<SearchResponse>) : null))
          .then((json) => {
            if (json) {
              setResults(json);
              setActive(0);
            }
          })
          .catch(() => {
            // aborted or offline: keep the previous list
          });
      },
      query ? 140 : 0
    );
    return () => clearTimeout(timer);
  }, [open, query]);

  const items: Item[] = useMemo(() => {
    if (!results) return [];
    return [
      ...results.docs.map((doc) => ({ kind: "doc" as const, doc })),
      ...results.sections.map((section) => ({ kind: "section" as const, section })),
    ];
  }, [results]);

  const terms = useMemo(
    () => (results?.query ?? "").trim().split(/\s+/).filter(Boolean),
    [results]
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(null);
  }, []);

  const go = useCallback(
    (item: Item) => {
      const href =
        item.kind === "doc"
          ? `/${item.doc.slug}`
          : `/${item.section.slug}#${item.section.anchor}`;
      close();
      router.push(href);
    },
    [close, router]
  );

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((value) => (items.length ? (value + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((value) =>
        items.length ? (value - 1 + items.length) % items.length : 0
      );
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      go(items[active]);
    }
  }

  /* keep the active row in view */
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-item="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const docCount = results?.docs.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-navy-950/55 px-4 pb-10 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Cerca nell'archivio"
    >
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-2xl shadow-navy-950/30">
        {/* input */}
        <div className="flex items-center gap-3 border-b border-navy-100 px-5 py-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 shrink-0 text-navy-400">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Cerca in tutti i documenti e le sezioni…"
            className="min-w-0 flex-1 bg-transparent text-[0.95rem] text-navy-900 placeholder:text-navy-400 outline-none"
            spellCheck={false}
          />
          <button
            onClick={close}
            className="rounded-md border border-navy-200 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase text-navy-400 transition hover:border-navy-300 hover:text-navy-600"
          >
            esc
          </button>
        </div>

        {/* results */}
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto overscroll-contain p-2">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-navy-400">
              {results === null
                ? "Ricerca in corso…"
                : query.trim()
                  ? `Nessun risultato per “${query.trim()}”.`
                  : "L'archivio è vuoto."}
            </p>
          ) : (
            <>
              {docCount > 0 && (
                <p className="px-3 pb-1 pt-2 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-navy-400">
                  Documenti
                </p>
              )}
              {items.map((item, index) => {
                const isActive = index === active;
                const rowClass = `block w-full cursor-pointer rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isActive ? "bg-navy-50" : "hover:bg-navy-50/60"
                }`;
                return (
                  <div key={index}>
                    {index === docCount && results && results.sections.length > 0 && (
                      <p className="px-3 pb-1 pt-3 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-navy-400">
                        Dentro le sezioni
                      </p>
                    )}
                    <button
                      type="button"
                      data-item={index}
                      className={rowClass}
                      onMouseMove={() => setActive(index)}
                      onClick={() => go(item)}
                    >
                      {item.kind === "doc" ? (
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate font-display text-[1.02rem] font-bold text-navy-950">
                              <Highlight text={item.doc.title} terms={terms} />
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-navy-500">
                              {item.doc.eyebrow} · {item.doc.sectionCount} sezioni ·{" "}
                              {item.doc.readingMinutes} min
                            </span>
                          </span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 shrink-0 self-center text-navy-400 transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`}>
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="block min-w-0">
                          <span className="block truncate text-[0.93rem] font-semibold text-navy-900">
                            <Highlight text={item.section.title} terms={terms} />
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[0.65rem] uppercase tracking-wide text-navy-400">
                            {item.section.docTitle}
                            {item.section.chapter ? ` — ${item.section.chapter}` : ""}
                          </span>
                          {item.section.snippet && (
                            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-navy-500">
                              <Highlight text={item.section.snippet} terms={terms} />
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center gap-4 border-t border-navy-100 bg-surface px-5 py-2.5 font-mono text-[0.62rem] uppercase tracking-wide text-navy-400">
          <span><kbd className="font-semibold text-navy-600">↑↓</kbd> naviga</span>
          <span><kbd className="font-semibold text-navy-600">↵</kbd> apri</span>
          <span><kbd className="font-semibold text-navy-600">esc</kbd> chiudi</span>
          <span className="ml-auto normal-case tracking-normal">Ricerca full-text locale</span>
        </div>
      </div>
    </div>
  );
}
