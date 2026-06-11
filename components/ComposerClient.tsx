"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComposerDoc } from "@/app/componi/page";

type Selection = {
  slug: string;
  docTitle: string;
  chapter?: string;
};

function selectionKey(s: Selection) {
  return `${s.slug}::${s.chapter ?? ""}`;
}

export function ComposerClient({ docs }: { docs: ComposerDoc[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedKeys = new Set(selection.map(selectionKey));

  function toggle(item: Selection) {
    const key = selectionKey(item);
    setSelection((current) =>
      current.some((s) => selectionKey(s) === key)
        ? current.filter((s) => selectionKey(s) !== key)
        : [...current, item]
    );
  }

  function move(position: number, delta: number) {
    setSelection((current) => {
      const target = position + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[position], next[target]] = [next[target], next[position]];
      return next;
    });
  }

  async function create() {
    if (!title.trim()) {
      setError("Dai un titolo al nuovo documento.");
      return;
    }
    if (selection.length === 0) {
      setError("Seleziona almeno un capitolo o documento.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary: summary.trim() || undefined,
          items: selection.map((s) => ({ slug: s.slug, chapter: s.chapter })),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        slug?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.slug) {
        setError(json?.error ?? "Composizione non riuscita.");
        return;
      }
      router.push(`/${json.slug}`);
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setCreating(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-navy-200 bg-surface px-3.5 py-2.5 text-sm text-navy-900 outline-none transition focus:border-gold-400 focus:bg-white";
  const labelClass =
    "mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.16em] text-navy-400";

  return (
    <div className="creta-grid-bg min-h-screen text-navy-900">
      {/* Navigazione */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/94 px-4 py-3 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="creta-badge-grad grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-white shadow-sm shadow-navy-900/20">
              C
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Creta</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-1.5 text-sm font-medium text-white transition hover:border-white/70"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Indietro
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-navy-400">
          Composer
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
          Componi un nuovo documento
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-navy-500">
          Scegli capitoli da documenti esistenti e uniscili in un nuovo documento.
          Il contenuto resta identico all&apos;originale: cambia solo la composizione.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_24rem]">
          {/* Colonna sinistra: sorgenti */}
          <section className="space-y-4">
            {docs.length === 0 ? (
              <p className="rounded-[1.75rem] border border-dashed border-navy-200 bg-white px-5 py-12 text-center text-navy-500">
                Nessun documento disponibile. Carica prima un .docx dalla home.
              </p>
            ) : (
              docs.map((doc) => (
                <div
                  key={doc.slug}
                  className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-lg font-bold text-navy-950">
                      {doc.title}
                    </h2>
                    <span className="shrink-0 text-xs font-medium text-navy-400">
                      {doc.sectionCount} sezioni
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {(doc.chapters.length > 0
                      ? doc.chapters.map((chapter) => ({
                          slug: doc.slug,
                          docTitle: doc.title,
                          chapter,
                        }))
                      : [{ slug: doc.slug, docTitle: doc.title, chapter: undefined }]
                    ).map((item) => {
                      const checked = selectedKeys.has(selectionKey(item));
                      return (
                        <li key={selectionKey(item)}>
                          <label
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                              checked
                                ? "border-gold-400 bg-gold-50"
                                : "border-navy-100 bg-surface hover:border-navy-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(item)}
                              className="h-4 w-4 accent-gold-500"
                            />
                            <span className="font-medium text-navy-900">
                              {item.chapter ?? "Intero documento"}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </section>

          {/* Colonna destra: composizione */}
          <section className="h-fit space-y-5 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm lg:sticky lg:top-20">
            <div>
              <label className={labelClass}>Titolo del nuovo documento</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Guida AI — estratto operativo"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Descrizione (opzionale)</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="Se vuota, viene ripresa dal primo capitolo."
                className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <label className={labelClass}>
                Contenuto ({selection.length})
              </label>
              {selection.length === 0 ? (
                <p className="rounded-xl border border-dashed border-navy-200 bg-surface px-4 py-6 text-center text-sm text-navy-400">
                  Seleziona i capitoli dalla colonna a sinistra.
                </p>
              ) : (
                <ul className="space-y-2">
                  {selection.map((item, position) => (
                    <li
                      key={selectionKey(item)}
                      className="flex items-center gap-3 rounded-xl border border-navy-100 bg-surface px-3.5 py-2.5"
                    >
                      <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-navy-300">
                        {position + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.6rem] font-bold uppercase tracking-[0.14em] text-gold-600">
                          {item.docTitle}
                        </span>
                        <span className="block truncate text-sm font-medium text-navy-900">
                          {item.chapter ?? "Intero documento"}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <button
                          onClick={() => move(position, -1)}
                          disabled={position === 0}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-navy-100 bg-white text-navy-400 transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-30"
                          aria-label="Sposta su"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => move(position, 1)}
                          disabled={position === selection.length - 1}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-navy-100 bg-white text-navy-400 transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-30"
                          aria-label="Sposta giù"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => toggle(item)}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-navy-100 bg-white text-navy-300 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          aria-label="Rimuovi"
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {error}
              </div>
            )}

            <button
              onClick={() => void create()}
              disabled={creating}
              className="creta-badge-grad w-full rounded-full px-5 py-3 text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {creating ? "Creazione…" : "Crea documento"}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
