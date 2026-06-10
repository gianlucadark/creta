"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { PageDesign } from "@/lib/schema";

type SectionMeta = { title: string; chapter?: string };

type Tab = "details" | "sections";

export function EditDocButton({
  slug,
  page,
  sections,
}: {
  slug: string;
  page: PageDesign["page"];
  sections: SectionMeta[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("details");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(page.title);
  const [eyebrow, setEyebrow] = useState(page.eyebrow ?? "");
  const [summary, setSummary] = useState(page.summary);
  const [audience, setAudience] = useState(page.audience ?? "");
  /* Current display order as indices into the original sections array. */
  const [order, setOrder] = useState(() => sections.map((_, i) => i));
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  function reset() {
    setTitle(page.title);
    setEyebrow(page.eyebrow ?? "");
    setSummary(page.summary);
    setAudience(page.audience ?? "");
    setOrder(sections.map((_, i) => i));
    setError(null);
    setTab("details");
  }

  function close() {
    if (saving) return;
    setOpen(false);
    reset();
  }

  function move(position: number, delta: number) {
    setOrder((current) => {
      const target = position + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[position], next[target]] = [next[target], next[position]];
      return next;
    });
  }

  function dropOn(position: number) {
    if (dragFrom === null || dragFrom === position) return;
    setOrder((current) => {
      const next = [...current];
      const [moved] = next.splice(dragFrom, 1);
      next.splice(position, 0, moved);
      return next;
    });
    setDragFrom(null);
  }

  async function save() {
    if (!title.trim() || !summary.trim()) {
      setError("Titolo e descrizione non possono essere vuoti.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: { title, eyebrow, summary, audience },
          order,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "Salvataggio non riuscito.");
        return;
      }
      setOpen(false);
      setTab("details");
      router.refresh();
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-navy-200 bg-surface px-4 py-3 text-[0.95rem] text-navy-900 outline-none transition focus:border-gold-400 focus:bg-white";
  const labelClass =
    "mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-navy-400";

  const modal =
    open && typeof document !== "undefined" ? (
      createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-navy-900/65 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-doc-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
            <div className="flex items-start justify-between gap-4 border-b border-navy-100 px-5 py-5 sm:px-7 sm:py-6">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-600">
                  Documento
                </p>
                <h2
                  id="edit-doc-title"
                  className="mt-1 break-words font-display text-2xl font-bold leading-tight text-navy-900 sm:text-3xl"
                >
                  Modifica contenuti e ordine
                </h2>
                <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-navy-500">
                  {page.title}
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
              <div className="flex w-full rounded-full bg-surface p-1 sm:w-fit">
                {(
                  [
                    ["details", "Dettagli"],
                    ["sections", "Sezioni"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`min-h-9 flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition sm:flex-none ${
                      tab === key
                        ? "bg-navy-950 text-white shadow-sm"
                        : "text-navy-500 hover:text-gold-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {tab === "details" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <label className={labelClass}>Titolo</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Etichetta</label>
                    <input
                      value={eyebrow}
                      onChange={(e) => setEyebrow(e.target.value)}
                      placeholder="Documento"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Destinatari</label>
                    <input
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      placeholder="Es. Tutto il team"
                      className={inputClass}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className={labelClass}>Descrizione</label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={6}
                      className={`${inputClass} min-h-36 resize-y leading-7`}
                    />
                  </div>
                </div>
              ) : (
                <ul className="grid gap-2.5">
                  {order.map((sectionIndex, position) => {
                    const section = sections[sectionIndex];
                    return (
                      <li
                        key={sectionIndex}
                        draggable
                        onDragStart={() => setDragFrom(position)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => dropOn(position)}
                        onDragEnd={() => setDragFrom(null)}
                        className={`grid cursor-grab grid-cols-[2.2rem_1fr_auto] items-center gap-3 rounded-xl border bg-surface px-3 py-3 transition sm:grid-cols-[3rem_1fr_auto] sm:px-4 ${
                          dragFrom === position
                            ? "border-gold-400 opacity-60"
                            : "border-navy-100 hover:border-navy-200"
                        }`}
                      >
                        <span className="text-sm font-bold tabular-nums text-navy-300">
                          {String(position + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          {section.chapter && (
                            <span className="block break-words text-[0.62rem] font-bold uppercase tracking-[0.14em] text-gold-600">
                              {section.chapter}
                            </span>
                          )}
                          <span className="mt-0.5 block break-words text-[0.95rem] font-medium leading-6 text-navy-900">
                            {section.title}
                          </span>
                        </span>
                        <span className="flex shrink-0 gap-1">
                          <button
                            onClick={() => move(position, -1)}
                            disabled={position === 0}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-navy-100 bg-white text-navy-400 transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-30"
                            aria-label="Sposta su"
                          >
                            &uarr;
                          </button>
                          <button
                            onClick={() => move(position, 1)}
                            disabled={position === order.length - 1}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-navy-100 bg-white text-navy-400 transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-30"
                            aria-label="Sposta giu"
                          >
                            &darr;
                          </button>
                        </span>
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

            <div className="flex flex-col-reverse gap-3 border-t border-navy-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
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
                {saving ? "Salvataggio..." : "Salva"}
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
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-1.5 text-sm font-medium text-white transition hover:border-white/70"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M12 20h9M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
        </svg>
        Modifica
      </button>
      {modal}
    </>
  );
}
