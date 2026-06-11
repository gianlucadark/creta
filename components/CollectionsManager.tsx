"use client";

import { useState } from "react";
import {
  MAX_COLLECTIONS,
  MAX_COLLECTION_TITLE,
  type DocCollection,
} from "@/lib/collections";
import type { PageMeta } from "@/app/page";

/* Pannello editor delle rubriche: lavora su una bozza locale della config
   completa e la salva in un colpo solo con PUT /api/collections. Un documento
   appartiene a una sola rubrica: spuntarlo qui lo sgancia da quella dove
   stava. */

type Draft = {
  /** Chiave locale stabile per React (le rubriche nuove non hanno ancora id). */
  key: string;
  id: string;
  title: string;
  slugs: string[];
};

let draftSeq = 0;

export function CollectionsManager({
  documents,
  collections,
  initialOpenId = null,
  onClose,
  onSaved,
}: {
  documents: PageMeta[];
  collections: DocCollection[];
  /** Rubrica da espandere all'apertura (es. dal menu di una pill). */
  initialOpenId?: string | null;
  onClose: () => void;
  onSaved: (collections: DocCollection[]) => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    collections.map((collection) => ({
      key: collection.id,
      id: collection.id,
      title: collection.title,
      slugs: collection.slugs.filter((slug) =>
        documents.some((doc) => doc.slug === slug)
      ),
    }))
  );
  /* La key di una rubrica esistente coincide col suo id. */
  const [openKey, setOpenKey] = useState<string | null>(initialOpenId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleByKey = new Map(drafts.map((d) => [d.key, d.title]));
  const homeOf = new Map(
    drafts.flatMap((d) => d.slugs.map((slug) => [slug, d.key] as const))
  );

  function addDraft() {
    const draft: Draft = { key: `new-${draftSeq++}`, id: "", title: "", slugs: [] };
    setDrafts((current) => [...current, draft]);
    setOpenKey(draft.key);
  }

  function renameDraft(key: string, title: string) {
    setDrafts((current) =>
      current.map((d) => (d.key === key ? { ...d, title } : d))
    );
  }

  function removeDraft(key: string) {
    setDrafts((current) => current.filter((d) => d.key !== key));
  }

  function moveDraft(key: string, delta: -1 | 1) {
    setDrafts((current) => {
      const from = current.findIndex((d) => d.key === key);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  /* Spunta/toglie un documento dalla rubrica `key`; se era altrove, lo sposta. */
  function toggleDoc(key: string, slug: string) {
    setDrafts((current) =>
      current.map((d) => {
        if (d.key === key) {
          return d.slugs.includes(slug)
            ? { ...d, slugs: d.slugs.filter((s) => s !== slug) }
            : { ...d, slugs: [...d.slugs, slug] };
        }
        return d.slugs.includes(slug)
          ? { ...d, slugs: d.slugs.filter((s) => s !== slug) }
          : d;
      })
    );
  }

  async function save() {
    const withDocs = drafts.filter((d) => d.title.trim() || d.slugs.length > 0);
    if (withDocs.some((d) => !d.title.trim())) {
      setError("Dai un titolo a ogni rubrica prima di salvare.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: 1,
          collections: withDocs.map((d) => ({
            id: d.id,
            title: d.title.trim(),
            slugs: d.slugs,
          })),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        collections?: DocCollection[];
      } | null;
      if (!res.ok || !json?.collections) {
        setError(json?.error ?? "Salvataggio non riuscito. Riprova.");
        return;
      }
      onSaved(json.collections);
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-navy-950/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collections-manager-title"
    >
      <div className="flex max-h-[85svh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-navy-950/20">
        <div className="border-b border-navy-900/10 px-6 py-5">
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-600">
            Organizza l&apos;archivio
          </p>
          <h2
            id="collections-manager-title"
            className="mt-1 font-display text-2xl font-bold leading-tight text-navy-950"
          >
            Rubriche
          </h2>
          <p className="mt-2 text-sm leading-6 text-navy-500">
            Crea le voci del menu e scegli quali documenti mostrare sotto
            ciascuna. La suddivisione è condivisa: la vedranno tutti.
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {drafts.length === 0 && (
            <p className="rounded-xl border border-dashed border-navy-900/20 px-4 py-6 text-center text-sm text-navy-500">
              Nessuna rubrica: l&apos;archivio resta un elenco unico. Creane
              una — ad esempio &ldquo;News&rdquo; — e assegnale i documenti.
            </p>
          )}

          {drafts.map((draft, index) => {
            const open = openKey === draft.key;
            return (
              <div
                key={draft.key}
                className="rounded-xl border border-navy-900/15 bg-surface/60"
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="w-7 shrink-0 text-center font-mono text-xs font-semibold text-navy-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => renameDraft(draft.key, e.target.value)}
                    placeholder="Titolo della rubrica…"
                    maxLength={MAX_COLLECTION_TITLE}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-display text-base font-bold text-navy-950 outline-none transition placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-navy-400 focus:border-gold-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setOpenKey(open ? null : draft.key)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wide transition ${
                      open
                        ? "border-gold-500 bg-gold-400/15 text-gold-700"
                        : "border-navy-900/15 text-navy-500 hover:border-gold-500 hover:text-gold-700"
                    }`}
                  >
                    {draft.slugs.length}{" "}
                    {draft.slugs.length === 1 ? "doc" : "docs"}
                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => moveDraft(draft.key, -1)}
                      disabled={index === 0}
                      aria-label="Sposta in su"
                      className="grid h-4 w-6 place-items-center text-navy-300 transition hover:text-navy-700 disabled:opacity-30"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="m18 15-6-6-6 6" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDraft(draft.key, 1)}
                      disabled={index === drafts.length - 1}
                      aria-label="Sposta in giù"
                      className="grid h-4 w-6 place-items-center text-navy-300 transition hover:text-navy-700 disabled:opacity-30"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDraft(draft.key)}
                    aria-label={`Elimina la rubrica ${draft.title || "senza titolo"}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-navy-300 transition hover:bg-red-50 hover:text-red-700"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {open && (
                  <ul className="border-t border-navy-900/10 px-3 py-2">
                    {documents.length === 0 && (
                      <li className="px-2 py-3 text-sm text-navy-500">
                        Non ci sono ancora documenti da assegnare.
                      </li>
                    )}
                    {documents.map((doc) => {
                      const homeKey = homeOf.get(doc.slug);
                      const checked = homeKey === draft.key;
                      const elsewhere =
                        homeKey !== undefined && homeKey !== draft.key
                          ? titleByKey.get(homeKey)?.trim()
                          : undefined;
                      return (
                        <li key={doc.slug}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDoc(draft.key, doc.slug)}
                              className="h-4 w-4 shrink-0 accent-gold-600"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900">
                              {doc.title}
                            </span>
                            {elsewhere && (
                              <span className="shrink-0 font-mono text-[0.6rem] font-semibold uppercase tracking-wide text-navy-400">
                                in {elsewhere || "altra rubrica"}
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}

          {drafts.length < MAX_COLLECTIONS && (
            <button
              type="button"
              onClick={addDraft}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-navy-900/25 px-4 py-3 text-sm font-semibold text-navy-600 transition hover:border-gold-500 hover:text-gold-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nuova rubrica
            </button>
          )}
        </div>

        <div className="border-t border-navy-900/10 px-6 py-4">
          {error && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:border-navy-300 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              )}
              Salva rubriche
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
