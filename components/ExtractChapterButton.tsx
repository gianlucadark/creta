"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type State =
  | { phase: "idle" }
  | { phase: "confirming" }
  | { phase: "loading" }
  | { phase: "done"; newSlug: string; removed: boolean }
  | { phase: "error"; message: string };

export function ExtractChapterButton({
  slug,
  chapter,
  compact = false,
}: {
  slug: string;
  chapter: string;
  /** Smaller trigger for dense chapter controls. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "idle" });

  const isLoading = state.phase === "loading";
  const modalOpen = state.phase !== "idle";

  function close() {
    setState({ phase: "idle" });
  }

  async function extract(removeFromSource: boolean) {
    setState({ phase: "loading" });
    try {
      const res = await fetch(`/api/documents/${slug}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter, removeFromSource }),
      });
      const json = (await res.json().catch(() => null)) as {
        slug?: string;
        error?: string;
      } | null;

      if (!res.ok || !json?.slug) {
        setState({
          phase: "error",
          message: json?.error ?? "Estrazione non riuscita.",
        });
        return;
      }

      if (removeFromSource) router.refresh();
      setState({ phase: "done", newSlug: json.slug, removed: removeFromSource });
    } catch {
      setState({ phase: "error", message: "Errore di rete. Riprova." });
    }
  }

  const modal =
    modalOpen && typeof document !== "undefined" ? (
      createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-navy-900/65 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="extract-chapter-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) close();
          }}
        >
          <div className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
            <div className="flex items-start justify-between gap-4 border-b border-navy-100 px-5 py-5 sm:px-7 sm:py-6">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-600">
                  Nuovo documento
                </p>
                <h2
                  id="extract-chapter-title"
                  className="mt-1 max-w-2xl break-words font-display text-2xl font-bold leading-tight text-navy-900 sm:text-3xl"
                >
                  {chapter}
                </h2>
              </div>
              {!isLoading && (
                <button
                  onClick={close}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-navy-400 transition hover:bg-navy-100 hover:text-navy-900"
                  aria-label="Chiudi"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {state.phase === "loading" ? (
                <div className="space-y-4 rounded-xl border border-navy-100 bg-surface px-6 py-10 text-center">
                  <div className="creta-badge-grad mx-auto h-10 w-10 animate-pulse rounded-xl" />
                  <p className="font-semibold text-navy-900">
                    Creazione del documento...
                  </p>
                  <p className="break-words text-sm leading-6 text-navy-500">
                    {chapter}
                  </p>
                </div>
              ) : state.phase === "done" ? (
                <div className="space-y-4 rounded-xl border border-navy-100 bg-surface px-6 py-8 text-center">
                  <p className="break-words font-semibold text-navy-900">
                    &ldquo;{chapter}&rdquo; &egrave; ora un documento indipendente.
                  </p>
                  <p className="text-sm leading-6 text-navy-600">
                    {state.removed
                      ? "Il capitolo e stato rimosso da questo documento."
                      : "Il capitolo resta anche in questo documento."}{" "}
                    Lo trovi nella libreria in home.
                  </p>
                  <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      onClick={close}
                      className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-500"
                    >
                      Chiudi
                    </button>
                    <button
                      onClick={() => router.push(`/${state.newSlug}`)}
                      className="creta-badge-grad rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:-translate-y-0.5"
                    >
                      Apri nuovo documento
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <p className="max-w-2xl text-[0.98rem] leading-7 text-navy-600">
                    Questo capitolo diventer&agrave; un documento separato, visibile
                    nella libreria in home. Scegli cosa fare con la copia che si
                    trova qui.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      onClick={() => void extract(false)}
                      className="flex h-full items-start gap-4 rounded-xl border-2 border-navy-200 bg-surface px-5 py-5 text-left transition hover:border-gold-400 hover:bg-white"
                    >
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-100 text-navy-600">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4.5 w-4.5"
                        >
                          <rect x="9" y="9" width="12" height="12" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.95rem] font-semibold text-navy-900">
                          Duplica
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-navy-500">
                          Mantieni il capitolo in questo documento e copialo
                          anche nel nuovo.
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => void extract(true)}
                      className="flex h-full items-start gap-4 rounded-xl border-2 border-gold-300/70 bg-gold-50 px-5 py-5 text-left transition hover:border-gold-400"
                    >
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-400/25 text-gold-700">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4.5 w-4.5"
                        >
                          <path d="M14 3h7v7M21 3l-9 9M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
                        </svg>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.95rem] font-semibold text-navy-900">
                          Sposta
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-navy-500">
                          Rimuovi il capitolo da questo documento e lascialo
                          solo nel nuovo.
                        </span>
                      </span>
                    </button>
                  </div>
                  {state.phase === "error" && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                      {state.message}
                    </div>
                  )}
                </div>
              )}
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
        onClick={() => setState({ phase: "confirming" })}
        title="Crea un documento separato con questo capitolo"
        className={`flex shrink-0 items-center rounded-full bg-gold-400 font-semibold text-navy-950 transition hover:-translate-y-0.5 hover:bg-gold-300 ${
          compact
            ? "gap-1.5 px-3 py-1.5 text-xs shadow-sm shadow-navy-900/15"
            : "gap-2 px-4 py-2.5 text-sm shadow-md shadow-navy-900/25"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
        >
          <path d="M14 3h7v7M21 3l-9 9M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        </svg>
        Rendi indipendente
      </button>
      {modal}
    </>
  );
}
