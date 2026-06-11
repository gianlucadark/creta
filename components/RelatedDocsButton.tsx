"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { SearchResponse } from "@/lib/searchIndex";

type LibDoc = SearchResponse["docs"][number];

/* Cap shared with the PATCH route: keep the two in sync. */
const MAX_RELATED = 8;

/** Opens a picker over the whole library (served by /api/search with an
    empty query) and saves the chosen slugs via PATCH design.related. */
export function RelatedDocsButton({
  slug,
  selected,
}: {
  slug: string;
  selected: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<LibDoc[] | null>(null);
  const [picked, setPicked] = useState<string[]>(selected);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Load the library when the modal opens (fresh every time: the list
     changes with uploads/deletes elsewhere). openModal resets docs to null
     so this effect only fetches. */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/search?q=")
      .then((res) => (res.ok ? (res.json() as Promise<SearchResponse>) : null))
      .then((json) => {
        if (cancelled) return;
        if (!json) {
          setError("Impossibile caricare l'archivio. Riprova.");
          setDocs([]);
          return;
        }
        setDocs(json.docs.filter((doc) => doc.slug !== slug));
      })
      .catch(() => {
        if (!cancelled) {
          setError("Errore di rete. Riprova.");
          setDocs([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  function openModal() {
    setPicked(selected);
    setFilter("");
    setDocs(null);
    setError(null);
    setOpen(true);
  }

  function close() {
    if (saving) return;
    setOpen(false);
  }

  function toggle(docSlug: string) {
    setPicked((current) =>
      current.includes(docSlug)
        ? current.filter((s) => s !== docSlug)
        : current.length < MAX_RELATED
          ? [...current, docSlug]
          : current
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ related: picked }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "Salvataggio non riuscito.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  const needle = filter.trim().toLowerCase();
  const visible =
    docs === null
      ? null
      : needle
        ? docs.filter(
            (doc) =>
              doc.title.toLowerCase().includes(needle) ||
              doc.eyebrow.toLowerCase().includes(needle) ||
              doc.summary.toLowerCase().includes(needle)
          )
        : docs;

  const modal =
    open && typeof document !== "undefined" ? (
      createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-navy-900/65 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="related-docs-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
            <div className="flex items-start justify-between gap-4 border-b border-navy-100 px-5 py-5 sm:px-7 sm:py-6">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-600">
                  Vedi anche
                </p>
                <h2
                  id="related-docs-title"
                  className="mt-1 font-display text-2xl font-bold leading-tight text-navy-900 sm:text-3xl"
                >
                  Collega altri documenti
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500">
                  I documenti scelti compaiono come card in fondo alla pagina,
                  nell&apos;ordine in cui li selezioni (massimo {MAX_RELATED}).
                </p>
              </div>
              {!saving && (
                <button
                  onClick={close}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-navy-400 transition hover:bg-navy-100 hover:text-navy-900"
                  aria-label="Chiudi"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="border-b border-navy-100 px-5 py-3 sm:px-7">
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filtra i documenti…"
                  className="w-full rounded-full border border-navy-200 bg-surface py-2.5 pl-10 pr-4 text-sm text-navy-900 outline-none transition placeholder:text-navy-400 focus:border-gold-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">
              {visible === null ? (
                <p className="py-12 text-center text-sm text-navy-400">
                  Caricamento dell&apos;archivio…
                </p>
              ) : visible.length === 0 ? (
                <p className="py-12 text-center text-sm text-navy-400">
                  {needle
                    ? `Nessun documento corrisponde a “${filter.trim()}”.`
                    : "Non ci sono altri documenti da collegare."}
                </p>
              ) : (
                <ul className="grid gap-2.5">
                  {visible.map((doc) => {
                    const position = picked.indexOf(doc.slug);
                    const isPicked = position >= 0;
                    const atCap = !isPicked && picked.length >= MAX_RELATED;
                    return (
                      <li key={doc.slug}>
                        <button
                          type="button"
                          onClick={() => toggle(doc.slug)}
                          disabled={atCap}
                          className={`grid w-full grid-cols-[2.2rem_1fr_auto] items-center gap-3 rounded-xl border px-3 py-3 text-left transition sm:px-4 ${
                            isPicked
                              ? "border-gold-400 bg-gold-50"
                              : atCap
                                ? "border-navy-100 bg-surface opacity-45"
                                : "border-navy-100 bg-surface hover:border-navy-200"
                          }`}
                        >
                          <span
                            className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                              isPicked
                                ? "creta-badge-grad text-white"
                                : "border border-navy-200 text-navy-300"
                            }`}
                          >
                            {isPicked ? position + 1 : "+"}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[0.62rem] font-bold uppercase tracking-[0.14em] text-navy-400">
                              {doc.eyebrow}
                            </span>
                            <span className="mt-0.5 block break-words text-[0.95rem] font-semibold leading-6 text-navy-900">
                              {doc.title}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-[0.62rem] font-medium uppercase tracking-wide text-navy-400">
                            {doc.sectionCount} sez · {doc.readingMinutes} min
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {error && (
              <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mx-7">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse items-stretch gap-3 border-t border-navy-100 px-5 py-4 sm:flex-row sm:items-center sm:px-7">
              <span className="text-xs font-medium text-navy-400">
                {picked.length}/{MAX_RELATED} selezionati
              </span>
              <span className="hidden flex-1 sm:block" />
              <button
                onClick={close}
                disabled={saving}
                className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-500 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={() => void save()}
                disabled={saving}
                className="creta-badge-grad rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {saving ? "Salvataggio..." : "Salva collegamenti"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-600"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        {selected.length > 0 ? "Gestisci collegamenti" : "Collega documenti"}
      </button>
      {modal}
    </>
  );
}
